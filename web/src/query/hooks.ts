import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchActivity } from '../data/activity'
import {
  createCategory,
  fetchCategories,
  setCategoryArchived,
  updateCategory,
  type CategoryInput,
} from '../data/categories'
import { fetchExpenses, moveExpense, saveExpense, setExpenseDeleted, type ExpenseInput } from '../data/expenses'
import {
  createList,
  deleteList,
  fetchDefaultShares,
  fetchLists,
  setDefaultShares,
  setListArchived,
  updateList,
  type ListInput,
  type Weight,
} from '../data/lists'
import { fetchMembers, updateMember } from '../data/members'
import {
  addComment,
  editComment,
  fetchComments,
  fetchReactions,
  fetchReads,
  markRead,
  setCommentDeleted,
  setReaction,
} from '../data/social'
import {
  createRecurring,
  deleteRecurring,
  fetchRecurring,
  setRecurringPaused,
  updateRecurring,
  type RecurringInput,
} from '../data/recurring'
import {
  createSettlement,
  fetchBalances,
  fetchSettlements,
  setSettlementDeleted,
  settleAll,
  type SettlementInput,
} from '../data/settlements'
import type { Member } from '../lib/database.types'
import { isOnline, OfflineError } from '../lib/online'
import { receiptLink } from '../lib/receipts'
import { keysByTable, queryKeys } from './keys'

type TableName = keyof typeof keysByTable

// ---------------------------------------------------------------------------
// Queries. Enabled only once signed in; data comes from cache when offline.
// ---------------------------------------------------------------------------

function useSignedIn(): boolean {
  return useAuth().session !== null
}

export function useMembers() {
  return useQuery({ queryKey: queryKeys.members, queryFn: fetchMembers, enabled: useSignedIn() })
}

export function useLists() {
  return useQuery({ queryKey: queryKeys.lists, queryFn: fetchLists, enabled: useSignedIn() })
}

export function useDefaultShares() {
  return useQuery({ queryKey: queryKeys.defaultShares, queryFn: fetchDefaultShares, enabled: useSignedIn() })
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: fetchCategories, enabled: useSignedIn() })
}

export function useExpenses() {
  return useQuery({ queryKey: queryKeys.expenses, queryFn: fetchExpenses, enabled: useSignedIn() })
}

export function useSettlements() {
  return useQuery({ queryKey: queryKeys.settlements, queryFn: fetchSettlements, enabled: useSignedIn() })
}

export function useBalances() {
  return useQuery({ queryKey: queryKeys.balances, queryFn: fetchBalances, enabled: useSignedIn() })
}

export function useRecurring() {
  return useQuery({ queryKey: queryKeys.recurring, queryFn: fetchRecurring, enabled: useSignedIn() })
}

export function useReactions() {
  return useQuery({ queryKey: queryKeys.reactions, queryFn: fetchReactions, enabled: useSignedIn() })
}

export function useComments() {
  return useQuery({ queryKey: queryKeys.comments, queryFn: fetchComments, enabled: useSignedIn() })
}

export function useReads() {
  return useQuery({ queryKey: queryKeys.reads, queryFn: fetchReads, enabled: useSignedIn() })
}

export function useActivity() {
  return useQuery({ queryKey: queryKeys.activity, queryFn: () => fetchActivity(), enabled: useSignedIn() })
}

// A temporary link to a receipt photo, refreshed before it expires.
export function useReceiptLink(path: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.receipt, path],
    queryFn: () => receiptLink(path!),
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 45,
    gcTime: 1000 * 60 * 50,
  })
}

export type CurrentMember = {
  // 'notMember': signed in with an account that is not one of the two members
  // (auth is shared with another app).
  status: 'loading' | 'ready' | 'notMember'
  me: Member | null
  partner: Member | null
}

export function useCurrentMember(): CurrentMember {
  const { session } = useAuth()
  const { data: members } = useMembers()

  if (!session || !members) return { status: 'loading', me: null, partner: null }

  const me = members.find((member) => member.user_id === session.user.id) ?? null
  const partner = members.find((member) => member.user_id !== session.user.id) ?? null
  return { status: me ? 'ready' : 'notMember', me, partner }
}

// ---------------------------------------------------------------------------
// Mutations. Refused when offline; refresh affected queries when done.
// ---------------------------------------------------------------------------

function useWrite<TInput, TResult>(write: (input: TInput) => Promise<TResult>, tables: TableName[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => {
      if (!isOnline()) throw new OfflineError()
      return write(input)
    },
    onSettled: () => {
      const keys = new Set(tables.flatMap((table) => keysByTable[table] ?? []))
      // The database logs every write, so the feed is always affected too.
      keys.add(queryKeys.activity)
      return Promise.all([...keys].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
  })
}

export function useUpdateProfile() {
  return useWrite(
    ({ userId, ...patch }: { userId: string; display_name?: string; color?: string }) =>
      updateMember(userId, patch),
    ['members'],
  )
}

export function useCreateList() {
  return useWrite(
    ({ input, weights }: { input: ListInput; weights?: Weight[] }) => createList(input, weights),
    ['lists', 'list_default_shares'],
  )
}

export function useUpdateList() {
  return useWrite(
    ({ id, patch }: { id: string; patch: Partial<ListInput> }) => updateList(id, patch),
    ['lists'],
  )
}

export function useSetDefaultShares() {
  return useWrite(
    ({ listId, weights }: { listId: string; weights: Weight[] }) => setDefaultShares(listId, weights),
    ['list_default_shares'],
  )
}

export function useSetListArchived() {
  return useWrite(
    ({ id, archived }: { id: string; archived: boolean }) => setListArchived(id, archived),
    ['lists'],
  )
}

export function useDeleteList() {
  return useWrite((id: string) => deleteList(id), ['lists', 'expenses', 'settlements', 'recurring_expenses'])
}

export function useCreateCategory() {
  return useWrite((input: CategoryInput) => createCategory(input), ['categories'])
}

export function useUpdateCategory() {
  return useWrite(
    ({ id, patch }: { id: string; patch: Partial<CategoryInput> }) => updateCategory(id, patch),
    ['categories'],
  )
}

export function useSetCategoryArchived() {
  return useWrite(
    ({ id, archived }: { id: string; archived: boolean }) => setCategoryArchived(id, archived),
    ['categories'],
  )
}

export function useSaveExpense() {
  return useWrite((input: ExpenseInput) => saveExpense(input), ['expenses'])
}

export function useSetExpenseDeleted() {
  return useWrite(
    ({ id, deleted }: { id: string; deleted: boolean }) => setExpenseDeleted(id, deleted),
    ['expenses'],
  )
}

export function useSetReaction() {
  return useWrite(setReaction, ['expense_reactions'])
}

export function useAddComment() {
  return useWrite(addComment, ['expense_comments'])
}

export function useEditComment() {
  return useWrite(editComment, ['expense_comments'])
}

export function useSetCommentDeleted() {
  return useWrite(setCommentDeleted, ['expense_comments'])
}

export function useMarkRead() {
  return useWrite(markRead, ['expense_reads'])
}

export function useMoveExpense() {
  return useWrite(({ id, listId }: { id: string; listId: string }) => moveExpense(id, listId), ['expenses'])
}

export function useCreateSettlement() {
  return useWrite((input: SettlementInput) => createSettlement(input), ['settlements'])
}

export function useSetSettlementDeleted() {
  return useWrite(
    ({ id, deleted }: { id: string; deleted: boolean }) => setSettlementDeleted(id, deleted),
    ['settlements'],
  )
}

export function useSettleAll() {
  return useWrite<void, string | null>(() => settleAll(), ['settlements'])
}

export function useCreateRecurring() {
  return useWrite((input: RecurringInput) => createRecurring(input), ['recurring_expenses'])
}

export function useUpdateRecurring() {
  return useWrite(
    ({ id, input }: { id: string; input: RecurringInput }) => updateRecurring(id, input),
    ['recurring_expenses'],
  )
}

export function useSetRecurringPaused() {
  return useWrite(
    ({ id, paused }: { id: string; paused: boolean }) => setRecurringPaused(id, paused),
    ['recurring_expenses'],
  )
}

export function useDeleteRecurring() {
  return useWrite((id: string) => deleteRecurring(id), ['recurring_expenses'])
}
