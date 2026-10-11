# KangarooSplit — Data model (draft)

All objects in Postgres schema `kangaroosplit`. Only external reference: `auth.users(id)`.

Conventions: `uuid` primary keys, money as `integer` cents, `timestamptz` for instants, `date` for calendar days, English identifiers.

## Tables

### `members`
The two people. Gate for all access.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid PK | FK `auth.users` |
| display_name | text | |
| color | text | avatar colour |
| created_at | timestamptz | |

Rows inserted by hand. No insert policy for clients.

### `lists`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| icon | text | emoji |
| is_default | boolean | true for Household only; partial unique index where true |
| starts_on, ends_on | date null | optional, for trips |
| archived_at | timestamptz null | check: null when `is_default` |
| created_by, created_at | | |

### `list_default_shares`
Default split ratio per list.

| Column | Type | Notes |
|---|---|---|
| list_id | uuid | PK part, FK `lists` |
| user_id | uuid | PK part, FK `members` |
| weight | integer | e.g. 60 and 40; 1 and 1 = equal |

### `categories`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | pt-PT, unique |
| icon, color | text | |
| is_preset | boolean | seeded ones |
| archived_at | timestamptz null | hide without breaking old expenses |

### `expenses`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| list_id | uuid | FK `lists` |
| description | text | |
| amount_cents | integer | check > 0 |
| spent_on | date | |
| paid_by | uuid | FK `members` |
| category_id | uuid | FK `categories` |
| note | text null | |
| split_mode | enum | `equal`, `percent`, `exact`, `shares` |
| recurring_id | uuid null | FK `recurring_expenses` |
| occurrence_date | date null | unique with `recurring_id` → no duplicate generation |
| created_by, created_at | | |
| updated_by, updated_at | | |
| deleted_by, deleted_at | null | soft delete |

### `expense_shares`
What each person owes of an expense. One row per member per expense.

| Column | Type | Notes |
|---|---|---|
| expense_id | uuid | PK part, FK `expenses` on delete cascade |
| user_id | uuid | PK part, FK `members` |
| share_cents | integer | check >= 0; rows sum to `amount_cents` |
| input_value | numeric null | what user typed (percent or share count), so edit screen reopens as entered |

### `settlements`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| list_id | uuid | FK `lists` |
| from_user, to_user | uuid | FK `members`, check different |
| amount_cents | integer | check > 0 |
| settled_on | date | |
| batch_id | uuid null | same value on all rows created by one "settle all" |
| note | text null | |
| created_by, created_at | | |
| deleted_by, deleted_at | null | soft delete |

### `recurring_expenses`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| list_id, description, amount_cents, paid_by, category_id, note, split_mode | | template, same meaning as `expenses` |
| split_input | jsonb | per-user values used to compute shares on generation |
| frequency | enum | `weekly`, `monthly`, `yearly` |
| start_on | date | |
| end_on | date null | |
| paused_at | timestamptz null | |
| last_generated_on | date null | |
| created_by, created_at, updated_at | | |
| deleted_at | timestamptz null | |

Monthly rule on day 29–31: clamp to last day of shorter months.

### `activity`
Feed, and single trigger point for push.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| list_id | uuid | |
| actor_id | uuid | |
| action | enum | `expense_created`, `expense_updated`, `expense_deleted`, `expense_restored`, `settlement_created`, `settlement_deleted`, `list_created`, `list_archived` |
| entity_id | uuid | |
| snapshot | jsonb | description, amount, before/after for edits |
| created_at | timestamptz | |

Written only by DB triggers; clients read-only. Recurring-generated expenses log with a flag in `snapshot` so they can be batched or muted in push.

### `push_subscriptions`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | FK `members` |
| endpoint | text | unique |
| p256dh, auth | text | Web Push keys |
| enabled | boolean | |
| created_at | timestamptz | |

Policy: user reads and writes own rows only.

## Views

- `list_balances` (`security_invoker`): per list, per user: `paid − owed + settlements sent − settlements received`, ignoring soft-deleted rows. Positive = is owed money.

## Functions (RPC)

| Function | Purpose |
|---|---|
| `is_member()` | `security definer`; true if `auth.uid()` in `members`. Used by every policy |
| `save_expense(...)` | Insert or update expense + its shares in one transaction; validates shares sum to amount |
| `settle_all()` | Inserts one settlement per list with non-zero balance, shared `batch_id` |
| `generate_recurring()` | Creates due occurrences; `on conflict (recurring_id, occurrence_date) do nothing` |

## Security

- RLS enabled on every table
- Default policy: `using (kangaroosplit.is_member()) with check (kangaroosplit.is_member())`
- Exceptions: `members` and `activity` read-only for clients; `push_subscriptions` own rows only
- Schema usage granted to `authenticated` only, not `anon`

## Realtime

Added to `supabase_realtime` publication: `expenses`, `expense_shares`, `settlements`, `lists`, `list_default_shares`, `categories`, `recurring_expenses`, `activity`.

## Push flow

`activity` insert → database webhook → edge function `kangaroosplit-push` → Web Push to the other member's enabled subscriptions, text in pt-PT.

## Host project changes (one-off, additive)

1. Add `kangaroosplit` to exposed schemas (API settings)
2. Create two auth users if missing, insert into `members`
3. Set secrets `KANGAROOSPLIT_VAPID_PUBLIC_KEY`, `KANGAROOSPLIT_VAPID_PRIVATE_KEY`
