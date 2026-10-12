-- A database login for the weekly backup job. It can read the `kangaroosplit`
-- schema and nothing else: no writes anywhere, and no grants on the other
-- app's tables, which share this project.
--
-- Apply in the SQL Editor. Replace CHANGE_ME with a long random password
-- there, in the editor, not in this file: it must not end up in git.
-- To change the password later:
--   alter role kangaroosplit_backup with password '...';

create role kangaroosplit_backup with login password 'CHANGE_ME';

grant usage on schema kangaroosplit to kangaroosplit_backup;
grant select on all tables in schema kangaroosplit to kangaroosplit_backup;
-- Tables added by later migrations become readable too.
alter default privileges in schema kangaroosplit grant select on tables to kangaroosplit_backup;

-- Row-level security applies to this role like any other, so each table needs
-- a rule letting it read every row.
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'kangaroosplit'
  loop
    execute format(
      'create policy backup_read on kangaroosplit.%I for select to kangaroosplit_backup using (true)', t
    );
  end loop;
end $$;
