-- A database login for the weekly backup job. It can read the `kangaroosplit`
-- schema and nothing else: no writes anywhere, and no grants on the other
-- app's tables, which share this project.
--
-- Two parts, run separately in the SQL Editor.

-- ---------------------------------------------------------------------------
-- Part 1: the login. Run once.
-- Replace CHANGE_ME with a long random password in the editor, not in this
-- file: it must not end up in git. To change it later:
--   alter role kangaroosplit_backup with password '...';
-- ---------------------------------------------------------------------------

create role kangaroosplit_backup with login password 'CHANGE_ME';

-- ---------------------------------------------------------------------------
-- Part 2: what it may read. Safe to run again.
-- ---------------------------------------------------------------------------

grant usage on schema kangaroosplit to kangaroosplit_backup;
grant select on all tables in schema kangaroosplit to kangaroosplit_backup;
-- Tables added by later migrations become readable too, though each still
-- needs its own `backup_read` policy like the ones below.
alter default privileges in schema kangaroosplit grant select on tables to kangaroosplit_backup;

-- Row-level security applies to this role like any other, so each table needs
-- a rule letting it read every row.
drop policy if exists backup_read on kangaroosplit.members;
create policy backup_read on kangaroosplit.members for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.lists;
create policy backup_read on kangaroosplit.lists for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.list_default_shares;
create policy backup_read on kangaroosplit.list_default_shares for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.categories;
create policy backup_read on kangaroosplit.categories for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.recurring_expenses;
create policy backup_read on kangaroosplit.recurring_expenses for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.expenses;
create policy backup_read on kangaroosplit.expenses for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.expense_shares;
create policy backup_read on kangaroosplit.expense_shares for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.settlements;
create policy backup_read on kangaroosplit.settlements for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.activity;
create policy backup_read on kangaroosplit.activity for select to kangaroosplit_backup using (true);
drop policy if exists backup_read on kangaroosplit.push_subscriptions;
create policy backup_read on kangaroosplit.push_subscriptions for select to kangaroosplit_backup using (true);
