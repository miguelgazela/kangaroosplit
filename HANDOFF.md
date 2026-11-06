# KangarooSplit: handoff

Written 2026-11-06 for a Claude session with no prior context. It was compiled from 12 earlier Claude Code sessions (11 Oct to 30 Oct 2026), the repo, and `git log`/`git status`. It complements, and does not replace, the existing docs:

| File | What it holds |
|---|---|
| `CLAUDE.md` | Rules for any session: follow `design/`, pt-PT UI, **bump the changelog on every push** |
| `REQUIREMENTS.md` | v1 requirements (FR/NFR numbers), constraints, decisions log |
| `DATA_MODEL.md` | Postgres schema `kangaroosplit` (tables, RLS, functions) |
| `DESIGN_BRIEF.md` | Original design brief (where it differs, `design/README.md` wins) |
| `design/README.md` | Screen map, design decisions, mascot, what's-new rules (source of truth for UI) |
| `design/REVISAO_DESIGN_2026-10.md` | Spec of the Oct 2026 design review (already implemented as 1.10.0) |
| `design/tokens.css` | Colour/radius/type tokens |

Conversation language with the owner is mostly pt-PT (some sessions in English). Read "User preferences" at the bottom before doing anything.

---

## 1. Product

Expense-splitting PWA for exactly two people, Miguel (owner, `miguel.gazela@gmail.com`) and his partner Mara. Splitwise replacement scoped to one couple. UI is European Portuguese (pt-PT), addressing the viewer as "tu" and naming the other person ("A Mara paga-te", "Pagas 20,00 € à Mara"). EUR only, money stored as integer cents.

Feature set today (app version 1.10.0):
- Lists (default "Casa", extra lists such as "Palma 2026", archive), each with its own default split ratio (Casa is 68/32, ordered Miguel/Mara; any whole number allowed).
- Expenses: equal / percentage / exact amount (the "by shares" mode was removed, see section 5), categories with colours, notes, soft delete + restore, duplicate, filter/search, receipt photo, comments and emoji reactions, per-category top-3 description suggestions on open, quick-details card.
- Settle up (full, partial, "settle all"), undo payments (soft delete).
- Recurring expenses (generated client-side on app open, idempotent).
- Activity feed (pushed screen opened from the bell on Início), push notifications (Web Push), shared shopping list (Compras tab, realtime), statistics (month/year, category drill-down, calendar with future recurring expenses, skeleton loading), year in review "O vosso 2026" (stories player, shown 24 Dec to 31 Jan), monthly email report, CSV export, changelog + "O que há de novo" sheet, mascot "Guru" (3D images), per-user accent colour (7 colours), full-screen offline notice, home-screen shortcut route `/nova`.
- Weekly database backup to a private GitHub repo.

## 2. Stack, run, deploy

- Frontend: React 19 + Vite 8 + TypeScript 6 + Tailwind 4 + React Router 7 + TanStack Query (persisted) in `web/`. PWA via vite-plugin-pwa. Lint: oxlint. Tests: vitest (about 100 tests). Commands from `web/`: `npm run dev`, `npm run build` (runs `tsc -b`), `npm run lint`, `npm test`. `npm run test:live` hits the REAL database and creates real expenses: it pushes notifications to Mara. Do not run it without warning the owner.
- Dev servers: `.claude/launch.json` defines `web` (port 5173). The working tree also has a second entry `web-5174` (uncommitted, see section 6) because parallel Claude sessions each need their own port.
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions, Storage). The Supabase project is **shared with the owner's other apps** (IBA, trip planner), on the free tier. Therefore: everything lives in schema `kangaroosplit`; shared resources are prefixed `kangaroosplit-`/`KANGAROOSPLIT_`; never change project-wide auth settings (Site URL, sign-up). `public` is now empty by design (see Supabase cleanup).
- Env: `web/.env` (public values only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`) is committed on purpose. `web/.env.local` (owner's test login for `test:live`, gitignored) and `supabase/.secrets.local` (VAPID private key, webhook secret) are gitignored. Never print or commit them. Open item: the owner was offered to blank `web/.env.local` and had not confirmed.
- Edge Functions (`supabase/functions/`): `kangaroosplit-push` (activity insert webhook, sends Web Push, pt-PT messages; relative URLs like `/lista/<id>?despesa=<id>`) and `kangaroosplit-monthly-report` (HTML email via Resend, scheduled with pg_cron). "Verify JWT" must be OFF for both; they check `x-webhook-secret` instead. Secrets: `KANGAROOSPLIT_VAPID_PUBLIC_KEY`, `..._VAPID_PRIVATE_KEY`, `..._VAPID_SUBJECT`, `..._WEBHOOK_SECRET`, `..._RESEND_API_KEY`, `..._REPORT_FROM`.
- **Functions and migrations are NOT deployed by CI.** The owner pastes SQL into the Supabase SQL Editor and pastes function code into Edge Functions > Deploy updates (and re-checks Verify JWT is still off). Claude has no DB access from the sandbox. Workflow every time: write migration in `supabase/migrations/`, tell the owner exactly what to run and in what order, wait for "done", then verify (often via the browser pane on localhost with the owner's logged-in session, or SQL verify queries). Migrations 0001 to 0010 exist; 0001 to 0010 are all applied in production per the sessions (0010 applied and verified).
- SQL Editor gotchas learned the hard way: if text is highlighted, only the selection runs (caused an "unterminated dollar-quoted string" error on migration 0003; the file was rewritten without `$$` blocks). `alter type ... add value` must run in its own statement before the rest (0007 split into Part 1 / Part 2). "Run without RLS" warning is expected for scripts that create temp tables.
- Hosting: Vercel, project `kangaroosplit`, root directory `web`, "include files outside root" ON (the app imports `design/tokens.css`). **Every push to `main` auto-deploys to production.** `web/vercel.json` rewrites SPA routes and sets no-cache on `sw.js`, `push-sw.js`, `registerSW.js`, `manifest.webmanifest`.
- Custom domain: `kangaroosplit.miguelgazela.com` (set up 29 Oct). In Vercel the domain was added, and in Cloudflare (DNS for `miguelgazela.com`) a CNAME `kangaroosplit` pointing to the project-specific target Vercel displays (`...vercel-dns-017.com`, not the generic `cname.vercel-dns.com`), proxy status DNS only (grey cloud). Vercel showed both domains as Valid. `kangaroosplit.vercel.app` still works (the owner could set a Vercel redirect; unclear whether he did). Nothing in the code is hard-coded to either origin (push URLs are relative, the report email has no app links). Consequence of an origin change: installed PWAs and push subscriptions are per-origin, so reinstall from Safari and re-enable notifications. The owner did this ("Done").
- Git: remote `git@github-personal:miguelgazela/kangaroosplit.git` (private). The owner has two SSH profiles: `github.com` (work, Mindera) and `github-personal`. Commits in this repo must use `miguel.gazela@gmail.com` (set per repo, plus a global `includeIf` for `github-personal` remotes). `gh` CLI is logged into the WORK account only and cannot reach this repo; use plain `git` over SSH. Work directly on `main` (no PR flow); the owner asks "commit and push" explicitly each time.

## 3. Session-by-session summary

Dates are session dates. Ordering is roughly chronological by when the work happened, not by list order.

### 3.1 "Splitwise iOS app" (from 11 Oct, 667 messages): the original build and v1 launch
- Built v1 from `REQUIREMENTS.md`: all screens, push, icons, Vercel + Supabase. First commit `9d0cf21`, re-authored to the personal Gmail before the first push.
- Deploy steps: Vercel root dir `web`; push backend via secrets + function + database webhook on `kangaroosplit.activity` insert (Webhooks moved under Integrations in the dashboard). Push worked first try on both iPhones.
- Mara's account: the owner "invited" her from the dashboard; the link pointed to the project's default Site URL (localhost) and the user could not be deleted because she is a member with data (deliberate FK protection). Fix: set her password directly in SQL via `crypt()`; no invite/email flow. Rule: accounts are created by hand with auto-confirm; no sign-up screen; no in-app password change (still missing).
- Accent colour per user (commit `f14435b`): derived tokens for light and dark. Yellow darkened to `#A16207` for contrast. Red clashes with error/destructive meaning (known, accepted).
- Data import: the owner dropped an HTML export of Splitwise into `tmp/` (gitignored). Claude wrote idempotent import SQL (`tmp/import_splitwise.sql`: 160 expenses, 19 payments, Casa balance 13,40 € Mara owes Miguel; 179 activity rows backdated; push trigger disabled inside the transaction so 179 notifications were not sent) and `tmp/import_palma.sql` (new list "Palma 2026", 21 expenses, 8 payments, balance 0). Mapping decisions: expenses where "other person owes nothing" imported as payer 100 %; categories guessed by keyword where Splitwise had none. Both ran fine.
- Bugs found on the real phone: keyboard shifted the Nova lista sheet (cause: autofocus during the slide-up animation; fix: removed autofocus on list/category sheets, plus a snap-back when the keyboard closes; confirmed fixed). Recurring "start date" not selectable: it was hidden behind the keypad view (cause A, confirmed). New recurring now opens on the full form; keypad view gained a "Data e mais" / "Frequência e datas" chip. Member order flipped after a password change (both rows created in the same instant): fixed by pinning order and a one-line SQL to nudge `created_at`.
- Features after use: description autocomplete with remembered category, CSV export (semicolon, comma decimals, Excel-pt friendly), duplicate expense, undo for payments, pagination (decision: fetch everything once, only render in pages of 40, because stats, search, suggestions, export and offline view need full history), stats Mês/Ano switch + category drill-down + tappable bars, receipts (migration 0004, private bucket `kangaroosplit-receipts`, JPEG shrunk to 1600 px, signed URLs 1 h, one photo per expense, not in backups), weekly backup, Guru mascot (first as SVG).
- Rejected: **offline writes** ("forget offline use, just show a warning"): the app shows a full-screen "Sem ligação" notice instead. Also rejected earlier: profile photos, multi-currency, >2 users, bank integrations, receipt scanning, in-app subtraction of personal items from a split (the owner interrupted and said remove only "Partes").
- Backup: GitHub Action in repo `miguelgazela/private` (workflow `kangaroosplit-backup.yml`, dump to `kangaroosplit/kangaroosplit.sql`, Mondays 03:17 UTC, refuses to overwrite with an empty dump). Uses a dedicated read-only Postgres login `kangaroosplit_backup` (migration 0003) through the **Session pooler, port 5432** (not 6543, not direct) with secret `KANGAROOSPLIT_BACKUP_DATABASE_URL`. First run failed with "password authentication failed"; fix was a hex-only password (`openssl rand -hex 24`), set via `alter role`, updated in the secret, and waiting a few minutes for the pooler cache. Verified dump (10 tables, 182 expenses). Restore never tested. Dump includes `push_subscriptions`.

### 3.2 "Divisão de despesas com exclusão" (12 Oct, commit `102185d`)
- Owner asked to remove the "Partes" split mode and (separately) to add a quick way to subtract a personal item from an expense. He then said to do only the removal and drop the subtraction ("esquece o resto"). Done: editor shows Igual / Percentagem / Valor exato. Old `shares` rows open as exact amounts; enum value `shares` kept in DB for legacy rows; no migration. The "subtract personal item" idea is NOT built and was explicitly dropped, though the original need (exclude a personal amount from the split) is a plausible future ask. Mockup `DespesaPartes` kept but marked ignored in `design/README.md`.

### 3.3 "Monthly email with usage analysis" (14 Oct) and its continuation
- Monthly report (migration 0005, function `kangaroosplit-monthly-report`, commit `37b0ec1`): purple header (total, count, % vs previous month), who paid, categories, per list, top 5 expenses, settlements + current balance, usage block. Sent by Resend from the owner's domain; `to` in a test body filters by member email. Scheduled with pg_cron on the 1st at 08:00 UTC (first real send 1 Nov for October). The owner first ran the migration with the `CHANGE_ME` webhook secret left in; fixed with `cron.alter_job`. The secret lives inside `cron.job.command`, so it is only ever pasted in the dashboard. Verify the 1 Nov run (see TODOs).
- Fixes: future-dated expenses excluded from balances (migration 0006, commit `127adc5`); pt-PT wording fixes in the email (`1a4f440`: "A Mara deve-te", not "pagou tu").
- Brainstormed features; owner picked only comments/reactions and the home-screen shortcut. Shortcut `/nova` (commit `ceb7e11`): opens the add-expense sheet. **iOS ignores manifest `shortcuts`**; workaround is a second home-screen icon of `/nova` or the Shortcuts app "Open URL" (untested on the owner's iOS whether it opens the installed PWA). An optional "Atalho" card in Definições was offered, not built.
- Comments and reactions (commit `98cb4e5`, migration 0007): designed by the owner in Claude Design first, then built. Reactions: one per person, six emojis. Comments 1 to 500 chars, edit/delete own, "editado". Long-press menus, unread comment count, activity + push entries ("A Mara comentou...", "reagiu com ❤️"). Live deploy order was: SQL Part 1, SQL Part 2, redeploy `kangaroosplit-push`, then push to `main`.

### 3.4 "Claude RC" sessions (15 Oct and 17 Oct, remote-controlled from the phone)
Naming note: "RC" = Remote Control. Both are feature/design-sync sessions driven by the owner from his phone.
- 15 Oct: shared shopping list "Compras" (commit `26b0694`, migration 0008: `shopping_items`, `shopping_history`, trigger counting purchases on tick/untick, `clear_shopping_cart()`; realtime; no activity/push; offline not supported). Tab bar is Início · Compras · ＋ · Estatísticas · Definições; Atividade became a pushed screen from a bell with a badge. Bell badge uses `localStorage` "last seen" per device (so counts are device-local; known limitation). Statistics calendar (`ef96342`), changelog screen (`a3a0012`, 1.2.0), last-expenses on the Casa card (1.3.0).
- 17 Oct: quick-details card + category colour + per-list recurring row (1.4.0), "O que há de novo" sheet and keeping the chosen colour on cold launch (1.5.0), immersive Início header with parallax (1.6.0, built then **reverted**: see below), per-category top-3 description suggestions on open (1.6.0, commit `2c344e3`).
- Rejected and why: the immersive Início header (gradient reaching under the status bar). On iOS the status bar is white/opaque by default because `apple-mobile-web-app-status-bar-style` is `default`. Making it coloured requires `black-translucent` app-wide (iOS reads it only at install, white clock everywhere, would need coloured strips on every screen, and cannot be done per page). The owner chose to revert to 1.5.0 visuals and keep only the "single-colour amounts" change, shipped as 1.5.1 (`90d5c5b`). The 1.6.0 header design remained in the old `design/README.md` and mockups for a while.
- Open from this session: category follows what you type; after picking a category by hand then typing "co", the category switched to Outros. Not investigated whether manual picks should win.

### 3.5 "Easter eggs para a namorada" (19 Oct): Guru 3D
- Generated 3D poses of the mascot with Higgsfield (image generation + background removal; credit-limited, plan Starter). Poses: `normal`, `ola`, `vazio`, `sucesso`, `dormir`, later `compras` (empty cart). WebP in `web/public/guru/` and `design/assets/guru/`; extras (Zs, sparkles, coins) drawn over in SVG/CSS so they can animate. Commits `328b9c9` (1.7.0), `a382aea` (1.7.1, normal pose + empty-cart pose for Compras).
- Bug found by testing: the WebPs were not in the service-worker precache, so the offline screen (which shows `dormir`) had no image offline. Fixed in `vite.config.ts`.
- Decisions: a regenerated solid-panel cart was abandoned ("keep the current image", wire-cart image kept even though its dark-mode edges are slightly speckled). The cut-out of a stray coin in `sucesso` was done locally. The owner wants design files kept in sync for Claude Design: the artifact only updates via the `/design-sync` command in an interactive session, which Claude cannot start itself. The title mentions "easter eggs" because the owner wanted hidden surprises for his partner; the Guru and in-app delight (reaction pop and sparks, "Contas acertadas!" pose) are what exists. No separate hidden easter-egg feature is in the repo beyond that.

### 3.6 "Limpeza base de dados Supabase" (19 Oct): shared-project hygiene
- Goal: stop other apps polluting `public` and make each app live in its own schema: `kangaroosplit` (unchanged), `iba` and `trip_planner` (these two live in OTHER repos: `iba/` and `trip-planner-ai/` under `~/Developer`, not here). Procedure: migration moving tables to the new schema with temporary `security_invoker` views left in `public` for rollback, add the schemas to Data API "Exposed schemas", deploy the app code, verify, then drop the views. Done and confirmed; `public` ended empty.
- Mistake worth remembering: a button text Claude had prefilled ("Já corri as duas migrações") was sent back as if it were the owner's message; Claude assumed the migrations had run and pushed code that pointed at schemas that did not exist yet. Lesson: never treat prefilled button text as a user statement; confirm manual DB steps. (A memory note was saved.)
- Side effect found: IBA's `handle_new_user` trigger created an IBA profile for every new auth user, including Mara's account. Fixed in the IBA repo: trigger now acts only if `raw_user_meta_data->>'app' = 'iba'` (migration `004_profile_trigger_iba_only.sql`), and IBA sign-up passes `app: "iba"`. Stray profile for the KangarooSplit-only user was deleted. Apply order: push IBA code first, then run the SQL.

### 3.7 "Atualização de designs" (24 Oct): icon and design sync
- New 3D app icon (variant 3 of 4 generated with Higgsfield; 1024 master in `design/icon-1024.png`; all sizes with `sips`; maskable icon reuses the same file because content already fits the safe zone; `favicon.svg` left flat on purpose because the 3D one is unreadable at 16 px). Commits `5cc578c` (1.8.0). Loading skeletons for Lista and Estatísticas (`d036188`, 1.7.2).
- Dark-mode icon: a web app cannot ship a dark home-screen icon on iOS (forums, no API). The old icon's dark appearance came from iOS auto-generating it from flat shapes on a solid background. Uncertain how iOS handles the new gradient 3D icon. If it looks bad, make a variant with a flat solid violet background. The owner had not reported back.
- The same session discussed the custom domain (continued in 3.9).

### 3.8 "KangarooSplit design 2026 implementation" (25 Oct, 392 messages)
- Implemented the owner's design review (`design/REVISAO_DESIGN_2026-10.md`, committed as the first commit of the batch): global tokens in `web/src/theme/` (`colors.ts` with the spec's `mix()` function, `tokens.css`), then 10 screens in order: Início, Acertar contas (adds partial payment state and "Pagamento registado"), Lista, Nova despesa, Despesa detalhe (reaction pop+sparks animation, haptics, disabled with `prefers-reduced-motion`), Compras ("Remover comprados" + "registar o talão" prompt), Atividade (badge colours by type), Definições ("A tua cor" with seven colours; the other person's colour is disabled), Iniciar sessão (Guru with name, clearer error), Estatísticas (heat from user colour, coin dots, no payer dots). 12 commits, 1.10.0 with three highlights, pushed as `13b8342..535279a`.
- Decisions made without asking: "Remover comprados" shows an inline line with "Anular" instead of a toast (toast was hidden under the "Compras feitas?" card); "Acertar tudo" has no Data row because `settle_all` takes no date; extra copy written for paying the other person ("Pagaste 50,00 € à Mara."); no camera badge in Definições (app has no profile photo); "Esqueci-me da palavra-passe" is a button with no destination (TODO in code).
- Migration 0009 (category palette) updated 4 of 6 preset colours; "Casa" was the old "Renda" under a new name, so migration 0010 (`update ... set color = '#5B6474' where name = 'Casa'`) was added and applied and verified on screen. Colour of Reparações, Saúde, Lazer unchanged (not in spec palette; Lazer pink is close to Outros pink).
- Not verified by Claude: login screen (needs sign-out; simulator Safari showed "Sem ligação" because the sandbox sim has no network), partial settlement flow, "Compras feitas?" card, reaction animation, colour change in Definições. Owner to test on phone.
- Uses a dedicated iOS Simulator named `kangaroosplit` for this worktree (UDID in the gitignored `.claude/local-simulator`). The owner's global rules forbid relying on the default simulator and installing into other sessions' sims.

### 3.9 "Year-in-review feature" (25 Oct), commit `13b8342`, 1.9.0
- "O vosso 2026": 9 stories following `ResumoAno.dc.html` (story with no data is skipped: no reactions, settlements, or repeat restaurant). Tap/hold/swipe-down navigation, auto-advance 6 s unless reduced motion/keyboard/VoiceOver, share as 1080×1920 PNG (Web Share or download). All computed on-device from already loaded data (`web/src/lib/yearSummary.ts`, 16 tests), no DB change.
- Visibility: Início card and Estatísticas row from 24 Dec to 31 Jan and only with at least 20 expenses in the year. The route `/resumo/2026` works any time (no date check). Dev only: `localStorage ks.devToday` fakes the date (stripped from production builds). No Christmas theme built (mockup prop `festive` exists). The 1.9.0 entry has no highlights, so no what's-new sheet (users cannot reach it until December).
- Wording written by Claude (not in mockups): most-expensive-month line, frequency lines ("Quase duas por semana!"), settlement lines. In `web/src/i18n/pt.ts` under `yearReview`.
- Bugs fixed during the build: "Supermercado" wrapped across two lines; Guru overlapped the total on the share image.
- Decision: no temporary in-app entry point before December; use `https://kangaroosplit.miguelgazela.com/resumo/2026` in Safari to preview.

### 3.10 "Custom domain link setup" (29 Oct)
See section 2 (custom domain). Verified nothing needed changing in the push function (relative URLs), monthly report (no links), or `KANGAROOSPLIT_VAPID_SUBJECT` (just a contact).

### 3.11 "Acesso ao artifact com design" (30 Oct): design explorations only
- Claude Design canvas: published artifact "KangarooSplit UI" (`https://claude.ai/artifact/5PWVtjbYQQmTZugLfcN16X`). Using the `ui-ux-pro-max` skill, Claude appended two new rows of explorations to that canvas: "Compras: nova exploração" (5 screens: interactive Compras, A escrever, Editar artigo, Vazia, Sem rede) and "Início: nova exploração" (Início interactive with Casa expander, Quites, A carregar, Sem ligação).
- Key proposals (NOT implemented in `web/`, the owner had not picked): add field above the tab bar with suggestions opening upward; "Habituais" as a horizontal row; progress card "3 de 9 no carrinho"; bought items stay in place, sections auto-collapse when fully bought; Início balance card shows "Gasto em conjunto" and "A tua parte" (60 % in sample data), a "Renda amanhã" next-recurring line, Casa and other lists merged into one card, "Quites" state. Note the Compras proposal dropped the "register the receipt after Remover comprados" prompt that 1.10.0 added; the owner was asked and did not answer. Sample data in the mockups is invented.
- Nothing was run or visually tested by Claude in those explorations.

## 4. Current state

- Branch `main`. HEAD is `23c56f4` ("Add migration 0010: give the Casa category the Renda colour"). `origin/main` is at `535279a` (1.10.0). Production runs 1.10.0.
- **Unpushed commit: `23c56f4`** (adds `supabase/migrations/0010_casa_category_colour.sql`; the SQL is already applied in prod and confirmed). It has no app change and no changelog entry, so it can go out with the next push. The owner said it "pode ir com o próximo push".
- **Uncommitted: `.claude/launch.json`** only. It adds a `web-5174` dev server (port 5174) and reformats the existing one. This is the owner's/another session's local tweak; every session so far has deliberately left it out of commits. Don't commit it unless asked.
- Untracked/ignored but present: `tmp/` (Splitwise export HTML/txt, import SQL, DB inventory SQL; contains personal data, gitignored), `web/.env.local`, `supabase/.secrets.local`, `.claude/local-simulator`.
- Verified working in production by the owner or Claude: push on both phones, accent colour, backup, receipts backend, imports, migrations 0001 to 0010, custom domain, category colours.
- Tests: about 102 pass, `tsc` and build clean at 1.10.0, oxlint has one old warning in `ListDetail.tsx`.

## 5. Decisions and WHY (cross-cutting)

- **Free only, no native app**: PWA on iPhone Safari, Vercel + Supabase free tier. Supabase may pause on inactivity; accepted, no keep-alive.
- **Dedicated schema + prefixes**: Supabase project is shared; protects the other apps and lets `public` stay empty.
- **No sign-up flow, no email templates**: auth is shared with other apps; accounts made by hand; password changes via SQL (`update auth.users set encrypted_password = extensions.crypt(...)`).
- **Last write wins** on edit conflicts. **Soft delete** everywhere (restore from Atividade).
- **Balances ignore future-dated expenses** (migration 0006) so a scheduled expense does not change today's balance; Início shows a note like "A 27 out, A Mara deve-te mais...".
- **Fetch everything, paginate the render** (not server paging): stats/search/suggestions/export need all rows.
- **Ratios are always written Miguel / Mara**; member order pinned in code (`created_at` plus tiebreaker).
- **Accent colour is per user and per device**, stored locally so the first paint is already correct; login uses violet; app icon stays violet.
- **Status bar stays default (white/grey)**: see 3.4 for why the immersive header was reverted.
- **Changelog discipline**: bump `web/src/data/changelog.ts` on every push (version, date, pt-PT changes). Add `highlights` only for user-visible features, otherwise no what's-new sheet.
- **Design source of truth**: `design/`. Owner iterates in Claude Design; Claude imports spec/mockups. New design work often needs the owner to run `/design-sync` himself.

## 6. Bugs and gotchas to remember

- iOS: keyboard can shift the page when a field autofocuses during a sheet animation; avoid autofocus in sheets. Date inputs use an invisible native input overlaid on the row and explicitly call `showPicker`.
- iOS PWA updates apply on the NEXT launch: tell the owner to fully close and reopen twice. The owner often checks colour/icon changes only after that.
- iOS caches the home-screen icon: re-add the app to see a new one.
- `localStorage`/dev-only date override `ks.devToday` exists in the browser pane for the year-in-review.
- The sandbox cannot sign in (it does not enter the owner's password). Browser-pane checks work only because the dev server on localhost already holds the owner's session. Avoid actions that create real data in production without asking; there is only one production database (no staging). Tests of writes were done with a throwaway account/data designed not to trigger push.
- Anything that inserts into `kangaroosplit.activity` fires the push webhook (about 179 notifications for the import). Disable the trigger inside a transaction when backfilling.
- New auth users used to get an IBA profile (fixed in IBA repo, see 3.6).
- Dump/backup does not include receipt files, only DB rows.
- The 1.5.1 revert left `design/README.md` and `Main.dc.html` describing the immersive header for a while; check `design/README.md` is current before relying on its Início description (the 1.10.0 review redid Início, so the review spec is newer).

## 7. Open TODOs

Owner-facing / unverified:
1. Push `23c56f4` with the next change (include a changelog entry only if the push carries something user-visible).
2. Check the first scheduled monthly email on 1 Nov (covers October): `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 3;` plus the Edge Function logs. Do this now, it is already past 1 Nov. Confirm the cron command no longer contains `CHANGE_ME`.
3. Owner to test on phone: partial settlement + "Pagamento registado", "Compras feitas?" card, reaction animation, colour change in Definições, login screen, offline screen, dark-mode appearance of the new home-screen icon.
4. Blank `web/.env.local` (contains the owner's real login for `test:live`). Offer again.
5. Decide whether `kangaroosplit.vercel.app` should redirect to the custom domain.
6. Restore from the backup into a scratch project has never been tested.

Product/code:
7. "Esqueci-me da palavra-passe" on login is a dead button (TODO in code). In-app password change is still missing (SQL only).
8. Category-follows-typed-text vs manual category pick conflict (see 3.4).
9. Known earlier gaps: "Acertar tudo" is always dated today (`settle_all` has no date), split line on list detail truncates names at 375 px (may have been fixed by the 1.10.0 redesign; recheck), non-member login never tested.
10. Decide on the 30 Oct design explorations (Compras and Início) and then implement the chosen parts in `web/`; reconcile the dropped "register receipt after Remover comprados" prompt.
11. Year in review: nothing visible until 24 Dec; consider testing with `ks.devToday` before then and think about a festive theme. Add `highlights` when it becomes reachable if a sheet is wanted.
12. Optional ideas the owner liked or deferred: "Atalho" card for the iOS home-screen shortcut, expense subtraction in the keypad (dropped), category budgets/templates/reminders (declined), exclude `push_subscriptions` from backup, delete orphaned receipts when a list is deleted, in-app receipts in backup.
13. Test data from early testing ("Compras 500 €", "Continente 60 €", "Férias Natal") may still be in Casa/Atividade; the owner said to leave it for now. Wipe SQL was drafted in the session (deletes activity, settlements, expenses, recurring, non-default lists; irreversible) and must not run without explicit confirmation. Since real data (Splitwise import) now exists, a blanket wipe would destroy it.

## 8. User preferences (Miguel)

- Global instruction file (`~/.claude/CLAUDE.md`) asks for terse "caveman" replies: no filler, no pleasantries, fragments fine. In practice many project sessions were answered in full prose, but short and structured is welcome. Code and technical terms stay exact. Reply language follows the owner: pt-PT when he writes Portuguese, English when he writes English.
- Orchestrator/worker approach: delegate token-heavy or parallel work to subagents (Haiku for mechanical work, Sonnet when errors are costly), do small things inline.
- Always ask before committing and pushing; he says "commit and push" or "faz push" explicitly. Pushes to `main` go live on Vercel immediately. Do not include `.claude/launch.json` or `design/` files in a commit unless he agrees (the design folder is his Claude Design output; several sessions left it out until asked). Commit design and code separately when both change.
- He prefers to be told exactly what to run in the Supabase dashboard, in order, with an expected result and a verify query. Never ask him to paste secrets in chat; passwords and webhook secrets are only typed in the dashboard.
- He wants honesty about what was NOT verified (phone-only behaviours, anything needing production data). Say it plainly.
- Do not touch production data for testing without asking; he is still using the app with his partner. Avoid actions that send push notifications to Mara.
- Do not assume manual steps happened. Confirm.
- UI text pt-PT, "tu" voice, European formatting (`1.234,56 €`, `dd/MM/yyyy`, week starts Monday).
- He steers by short corrections ("keep the current image", "only remove Partes"). Respect scope cuts immediately.
- Simulator rule (global): never use the default iOS Simulator; use the one in `.claude/local-simulator`, pass its UDID explicitly, one sim per ticket/worktree, check free disk before creating anything.
- Git identity: personal Gmail for this repo; do not use the Mindera work email or the work `gh` login here.
