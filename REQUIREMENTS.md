# KangarooSplit — Requirements (v1)

Expense-splitting PWA for two people. Splitwise-like, scoped to one couple.

## 1. Constraints

- Running cost: €0 (free tiers only)
- No Apple Developer account, no App Store, no native build
- Exactly 2 users
- Currency: EUR only
- Primary target: iPhone Safari, installed to home screen
- UI language: European Portuguese (pt-PT) only
- Supabase project shared with another existing app (free tier allows 2 projects, both used)

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Hosting | Static, free tier (Vercel or Cloudflare Pages) |
| PWA | Web app manifest + service worker (vite-plugin-pwa) |

## 3. Functional requirements

### 3.1 Accounts

- FR-1 Two accounts, both members of one shared space
- FR-2 Email + password sign-in, once per device; session persists long-term
- FR-3 Access limited to the two members via membership table + RLS. Project-wide sign-up setting must not be relied on, since auth is shared with the other app
- FR-4 Each user has display name and avatar/colour

### 3.2 Lists

- FR-5 Expenses belong to exactly one list
- FR-6 One permanent default list: **Household**. Cannot be deleted or archived
- FR-7 Create extra lists for specific topics (e.g. holiday, renovation): name, emoji/icon, optional date range
- FR-8 Each list has own balance, own activity feed, own stats
- FR-9 Each list has own default split ratio; new list starts with Household's ratio
- FR-10 Rename, archive, unarchive lists. Archived lists read-only, hidden from main view
- FR-11 Delete list only when empty, or with explicit confirmation
- FR-12 Move expense between lists
- FR-13 Home shows overall net balance across all active lists, plus per-list balances
- FR-14 App opens on Household; last-used list preselected when adding expense

### 3.3 Expenses

- FR-15 Add / edit / delete expense: amount, description, date, payer, category, list, optional note
- FR-16 Split modes: equal, percent, exact amounts
- FR-17 Split prefilled from list default ratio; overridable per expense
- FR-18 Show "created by" and "last edited by" with timestamps
- FR-19 Deletion is soft: row kept and flagged with `deleted_at`, excluded from balances and stats, shown in activity feed as deleted, restorable by either user

### 3.4 Balance and settling

- FR-20 Per-list net balance: who owes whom, single number
- FR-21 Settle up per list: record payment, full or partial
- FR-22 Settle all: one action, one real-world payment of the overall net amount; records a settlement in every list with non-zero balance so each ends at zero
- FR-23 Chronological activity feed per list: expenses, edits, deletions, settlements

### 3.5 Recurring expenses

- FR-24 Define recurring expense: same fields as expense, plus frequency (weekly / monthly / yearly) and start date, optional end date
- FR-25 Recurring expense belongs to a list
- FR-26 Generated client-side on app open: any occurrences due since last generation get created
- FR-27 Generation is idempotent — both phones opening at once must not create duplicates (unique constraint on recurring id + occurrence date)
- FR-28 Edit, pause, resume, delete recurring rule. Changes affect future occurrences only
- FR-29 Generated expenses are normal expenses, individually editable

### 3.6 Categories and stats

- FR-30 Preset categories (groceries, rent, utilities, eating out, transport, travel, health, fun, other) plus custom ones
- FR-31 Categories shared across all lists
- FR-32 Stats per list and across all lists: monthly total, by-category breakdown, each person's share, month-over-month trend
- FR-33 Filter expenses by category, payer, date range; search by description

### 3.7 Sync and offline

- FR-34 Change on one phone appears on the other within seconds while app is open (Supabase Realtime)
- FR-35 Offline: app launches and shows last synced data, read-only
- FR-36 Offline: write actions disabled with clear indicator; no write queue in v1
- FR-37 On reconnect, data refreshes automatically

### 3.8 Push notifications

- FR-38 Notify other user when expense added, edited, deleted, or settlement recorded
- FR-39 Web Push via service worker; sent by Supabase Edge Function triggered on DB change
- FR-40 In-app prompt to enable notifications (iOS requires user gesture and installed PWA)
- FR-41 Per-user on/off toggle
- FR-42 Tapping notification opens relevant list

## 4. Non-functional requirements

- NFR-1 Installable PWA: manifest, icons, splash screens, standalone display mode
- NFR-2 iOS-native feel: bottom tab bar, sheet-style modals, safe-area insets, no rubber-band glitches, no tap delay, no accidental zoom on input focus
- NFR-3 Light and dark mode, following system setting
- NFR-4 Add expense reachable in one tap from any main screen; complete flow in ≤3 taps plus typing
- NFR-5 Money stored as integer cents; no floating-point arithmetic
- NFR-6 Split rounding deterministic; shares always sum exactly to expense amount
- NFR-7 Row-level security: only the two members can read or write any data
- NFR-8 Cold start to usable under 2s on 4G with warm cache
- NFR-9 Requires iOS 16.4+ (web push support)
- NFR-10 All user-facing text in pt-PT (not pt-BR): UI, validation and error messages, push notifications, preset category names, auth screens
- NFR-11 pt-PT formatting: amounts as `1.234,56 €`, dates as `dd/MM/yyyy`, week starts Monday, comma as decimal separator on amount input
- NFR-12 Strings kept in one pt-PT resource file, not hardcoded in components
- NFR-13 Code, identifiers, DB names and comments in English
- NFR-14 All DB objects live in dedicated Postgres schema `kangaroosplit` (tables, views, functions, triggers, policies). Nothing in `public`
- NFR-15 Shared resources outside the schema carry a `kangaroosplit` prefix: edge functions, realtime channels, storage buckets, secrets
- NFR-16 No changes to the other app's schema, policies or project-wide auth settings
- NFR-17 `auth.users` is shared with the other app; app data references it by user id and never assumes every auth user is a member

## 5. Out of scope (v1)

- More than 2 users, per-list membership, debt simplification
- Multi-currency
- Offline writes / sync queue
- Receipt photos, scanning, itemization
- Bank or payment integrations
- Data export / import
- Widgets, Face ID lock

## 6. Open questions

1. Which of the two existing Supabase projects hosts this?
2. Does either of you already have an account in that project's auth (from the other app) under the email you'd use here?

## 7. Decisions log

- Settling: per list and settle all
- Auth: email + password
- Host project's other app uses Supabase Auth, so: no sign-up screen in this app. Both accounts created by hand in Supabase dashboard (auto-confirmed) and inserted into `members`. No dependency on email confirmation or email templates. Existing auth account with same email gets reused (same password as other app)
- No in-app password reset in v1; reset via dashboard
- Supabase inactivity pause: accepted, no keep-alive
- Project isolation: dedicated schema over table prefix
- UI follows `design/` (mockups from Claude Design); `design/README.md` overrides the brief, with these exceptions:
  - Profile photos: deferred to v2. v1 shows initials on the member's colour
  - Avatar colour: each member picks freely; no colour is blocked because the other person uses it
  - Category colours: taken from each category's colour in the database, not the six fixed chart colours
  - Pull-to-refresh: in v1
  - Editing conflicts: last write wins
- Portuguese name articles ("A Mara", "pelo Miguel") come from `members.gender` (migration 0002)
