// Hand-written to mirror supabase/migrations. Keep in sync when the schema changes.

export type SplitMode = 'equal' | 'percent' | 'exact' | 'shares'
export type Frequency = 'weekly' | 'monthly' | 'yearly'
export type ActivityAction =
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'expense_restored'
  | 'settlement_created'
  | 'settlement_deleted'
  | 'list_created'
  | 'list_archived'
  | 'expense_commented'
  | 'expense_reacted'

// One person's part of an expense. `input_value` keeps what was typed
// (percent or share count) so the editor can reopen as entered.
export type ShareInput = {
  user_id: string
  share_cents: number
  input_value: number | null
}

export type Gender = 'm' | 'f'

export type Member = {
  user_id: string
  display_name: string
  color: string
  // Optional until migration 0002 has been applied.
  gender?: Gender
  created_at: string
}

export type List = {
  id: string
  name: string
  icon: string
  is_default: boolean
  starts_on: string | null
  ends_on: string | null
  archived_at: string | null
  created_by: string | null
  created_at: string
}

export type ListDefaultShare = {
  list_id: string
  user_id: string
  weight: number
}

export type Category = {
  id: string
  name: string
  icon: string
  color: string
  is_preset: boolean
  archived_at: string | null
  created_at: string
}

export type RecurringExpense = {
  id: string
  list_id: string
  description: string
  amount_cents: number
  paid_by: string
  category_id: string
  note: string | null
  split_mode: SplitMode
  split_input: ShareInput[]
  frequency: Frequency
  start_on: string
  end_on: string | null
  paused_at: string | null
  last_generated_on: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Expense = {
  id: string
  list_id: string
  description: string
  amount_cents: number
  spent_on: string
  paid_by: string
  category_id: string
  note: string | null
  split_mode: SplitMode
  recurring_id: string | null
  occurrence_date: string | null
  // Path of the receipt photo in storage. Absent until migration 0004 is applied.
  receipt_path?: string | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
  deleted_by: string | null
  deleted_at: string | null
}

export type ExpenseShare = {
  expense_id: string
  user_id: string
  share_cents: number
  input_value: number | null
}

export type ExpenseWithShares = Expense & { expense_shares: ExpenseShare[] }

export type Settlement = {
  id: string
  list_id: string
  from_user: string
  to_user: string
  amount_cents: number
  settled_on: string
  batch_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
  deleted_by: string | null
  deleted_at: string | null
}

export type ExpenseReaction = {
  expense_id: string
  user_id: string
  emoji: string
  created_at: string
}

export type ExpenseComment = {
  id: string
  expense_id: string
  user_id: string
  body: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

// When a person last opened an expense's detail (their own rows only).
export type ExpenseRead = {
  expense_id: string
  user_id: string
  last_read_at: string
}

export type ActivitySnapshot = {
  description?: string
  amount_cents?: number
  paid_by?: string
  recurring?: boolean
  previous?: {
    description: string
    amount_cents: number
    paid_by: string
    list_id: string
  }
  from_user?: string
  to_user?: string
  batch_id?: string | null
  name?: string
  icon?: string
  // Comments and reactions.
  body?: string
  emoji?: string
}

export type Activity = {
  id: string
  list_id: string
  actor_id: string
  action: ActivityAction
  entity_id: string
  snapshot: ActivitySnapshot
  created_at: string
}

export type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  enabled: boolean
  created_at: string
}

export type ListBalance = {
  list_id: string
  user_id: string
  balance_cents: number
}

type Table<Row, Required extends keyof Row, Relationships = []> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: Relationships
}

export type Database = {
  kangaroosplit: {
    Tables: {
      members: Table<Member, 'user_id' | 'display_name'>
      lists: Table<List, 'name'>
      list_default_shares: Table<ListDefaultShare, 'list_id' | 'user_id'>
      categories: Table<Category, 'name'>
      recurring_expenses: Table<
        RecurringExpense,
        | 'list_id'
        | 'description'
        | 'amount_cents'
        | 'paid_by'
        | 'category_id'
        | 'split_input'
        | 'frequency'
        | 'start_on'
      >
      expenses: Table<
        Expense,
        'list_id' | 'description' | 'amount_cents' | 'spent_on' | 'paid_by' | 'category_id'
      >
      expense_shares: Table<
        ExpenseShare,
        'expense_id' | 'user_id' | 'share_cents',
        [
          {
            foreignKeyName: 'expense_shares_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
        ]
      >
      settlements: Table<Settlement, 'list_id' | 'from_user' | 'to_user' | 'amount_cents'>
      activity: Table<Activity, 'list_id' | 'actor_id' | 'action' | 'entity_id'>
      expense_reactions: Table<ExpenseReaction, 'expense_id' | 'emoji'>
      expense_comments: Table<ExpenseComment, 'expense_id' | 'body'>
      expense_reads: Table<ExpenseRead, 'expense_id'>
      push_subscriptions: Table<PushSubscriptionRow, 'endpoint' | 'p256dh' | 'auth'>
    }
    Views: {
      list_balances: {
        Row: ListBalance
        Relationships: []
      }
    }
    Functions: {
      is_member: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      save_expense: {
        Args: {
          p_id: string | null
          p_list_id: string
          p_description: string
          p_amount_cents: number
          p_spent_on: string
          p_paid_by: string
          p_category_id: string
          p_note: string | null
          p_split_mode: SplitMode
          p_shares: ShareInput[]
          p_receipt_path?: string
        }
        Returns: string
      }
      settle_all: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      generate_recurring: {
        Args: { p_today?: string }
        Returns: number
      }
    }
    Enums: {
      split_mode: SplitMode
      frequency: Frequency
      activity_action: ActivityAction
    }
    CompositeTypes: Record<string, never>
  }
}
