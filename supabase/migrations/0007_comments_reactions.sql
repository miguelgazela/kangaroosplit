-- Comments and reactions on expenses.
--
-- Two parts, run separately in the SQL Editor (Part 1 first, on its own).

-- ---------------------------------------------------------------------------
-- Part 1: new activity types. A new enum value cannot be used in the same
-- transaction that adds it, which is why this runs on its own.
-- ---------------------------------------------------------------------------

alter type kangaroosplit.activity_action add value if not exists 'expense_commented';
alter type kangaroosplit.activity_action add value if not exists 'expense_reacted';

-- ---------------------------------------------------------------------------
-- Part 2: tables, policies, triggers. Safe to run again.
-- ---------------------------------------------------------------------------

begin;

-- One reaction per person per expense: tap sets, tap again removes (delete).
create table if not exists kangaroosplit.expense_reactions (
  expense_id uuid not null references kangaroosplit.expenses (id) on delete cascade,
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade default auth.uid(),
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (expense_id, user_id)
);

create table if not exists kangaroosplit.expense_comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references kangaroosplit.expenses (id) on delete cascade,
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists expense_comments_expense
  on kangaroosplit.expense_comments (expense_id, created_at);

-- When each person last opened an expense's detail: drives "por ler".
create table if not exists kangaroosplit.expense_reads (
  expense_id uuid not null references kangaroosplit.expenses (id) on delete cascade,
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade default auth.uid(),
  last_read_at timestamptz not null default now(),
  primary key (expense_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Privileges and row-level security
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  kangaroosplit.expense_reactions,
  kangaroosplit.expense_comments,
  kangaroosplit.expense_reads
to authenticated;
grant all on
  kangaroosplit.expense_reactions,
  kangaroosplit.expense_comments,
  kangaroosplit.expense_reads
to service_role;

alter table kangaroosplit.expense_reactions enable row level security;
alter table kangaroosplit.expense_comments enable row level security;
alter table kangaroosplit.expense_reads enable row level security;

-- Both people see everything; each writes only their own rows.
drop policy if exists expense_reactions_select on kangaroosplit.expense_reactions;
create policy expense_reactions_select on kangaroosplit.expense_reactions
  for select to authenticated using (kangaroosplit.is_member());
drop policy if exists expense_reactions_write on kangaroosplit.expense_reactions;
create policy expense_reactions_write on kangaroosplit.expense_reactions
  for all to authenticated
  using (user_id = (select auth.uid()) and kangaroosplit.is_member())
  with check (user_id = (select auth.uid()) and kangaroosplit.is_member());

-- Comments: no delete policy, soft delete (deleted_at) through update.
drop policy if exists expense_comments_select on kangaroosplit.expense_comments;
create policy expense_comments_select on kangaroosplit.expense_comments
  for select to authenticated using (kangaroosplit.is_member());
drop policy if exists expense_comments_insert on kangaroosplit.expense_comments;
create policy expense_comments_insert on kangaroosplit.expense_comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and kangaroosplit.is_member());
drop policy if exists expense_comments_update on kangaroosplit.expense_comments;
create policy expense_comments_update on kangaroosplit.expense_comments
  for update to authenticated
  using (user_id = (select auth.uid()) and kangaroosplit.is_member())
  with check (user_id = (select auth.uid()) and kangaroosplit.is_member());

-- Reads are private: each person sees only their own.
drop policy if exists expense_reads_own on kangaroosplit.expense_reads;
create policy expense_reads_own on kangaroosplit.expense_reads
  for all to authenticated
  using (user_id = (select auth.uid()) and kangaroosplit.is_member())
  with check (user_id = (select auth.uid()) and kangaroosplit.is_member());

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function kangaroosplit.tg_comments_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists expense_comments_audit on kangaroosplit.expense_comments;
create trigger expense_comments_audit
before update on kangaroosplit.expense_comments
for each row execute function kangaroosplit.tg_comments_audit();

-- A new comment shows up in the feed (and sends a push).
create or replace function kangaroosplit.tg_comments_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list uuid;
  v_description text;
begin
  select e.list_id, e.description into v_list, v_description
  from kangaroosplit.expenses e where e.id = new.expense_id;
  if v_list is null then
    return new;
  end if;

  insert into kangaroosplit.activity (list_id, actor_id, action, entity_id, snapshot)
  values (
    v_list, new.user_id, 'expense_commented', new.expense_id,
    jsonb_build_object('description', v_description, 'body', new.body, 'comment_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists expense_comments_activity on kangaroosplit.expense_comments;
create trigger expense_comments_activity
after insert on kangaroosplit.expense_comments
for each row execute function kangaroosplit.tg_comments_activity();

-- Setting or changing a reaction is logged; removing one is not.
create or replace function kangaroosplit.tg_reactions_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list uuid;
  v_description text;
begin
  if tg_op = 'UPDATE' and new.emoji = old.emoji then
    return new;
  end if;

  select e.list_id, e.description into v_list, v_description
  from kangaroosplit.expenses e where e.id = new.expense_id;
  if v_list is null then
    return new;
  end if;

  insert into kangaroosplit.activity (list_id, actor_id, action, entity_id, snapshot)
  values (
    v_list, new.user_id, 'expense_reacted', new.expense_id,
    jsonb_build_object('description', v_description, 'emoji', new.emoji)
  );
  return new;
end;
$$;

drop trigger if exists expense_reactions_activity on kangaroosplit.expense_reactions;
create trigger expense_reactions_activity
after insert or update on kangaroosplit.expense_reactions
for each row execute function kangaroosplit.tg_reactions_activity();

-- ---------------------------------------------------------------------------
-- Realtime, and the backup login (see 0003) can read the new tables too
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['expense_reactions', 'expense_comments', 'expense_reads'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'kangaroosplit' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table kangaroosplit.%I', t);
    end if;

    if exists (select 1 from pg_roles where rolname = 'kangaroosplit_backup') then
      execute format('grant select on kangaroosplit.%I to kangaroosplit_backup', t);
      execute format('drop policy if exists backup_read on kangaroosplit.%I', t);
      execute format(
        'create policy backup_read on kangaroosplit.%I for select to kangaroosplit_backup using (true)', t
      );
    end if;
  end loop;
end;
$$;

commit;
