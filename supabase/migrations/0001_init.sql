-- KangarooSplit: initial schema.
-- Everything lives in schema `kangaroosplit`; nothing here touches `public`
-- or project-wide auth settings (project is shared with another app).
--
-- Apply: Supabase dashboard -> SQL Editor -> paste -> Run.
-- Then: Settings -> API -> Exposed schemas -> add `kangaroosplit`.

begin;

create schema kangaroosplit;

grant usage on schema kangaroosplit to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type kangaroosplit.split_mode as enum ('equal', 'percent', 'exact', 'shares');
create type kangaroosplit.frequency as enum ('weekly', 'monthly', 'yearly');
create type kangaroosplit.activity_action as enum (
  'expense_created',
  'expense_updated',
  'expense_deleted',
  'expense_restored',
  'settlement_created',
  'settlement_deleted',
  'list_created',
  'list_archived'
);

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

create table kangaroosplit.members (
  user_id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (length(trim(display_name)) > 0),
  color text not null default '#2563eb',
  created_at timestamptz not null default now()
);

-- Gate used by every policy. Security definer so it can read `members`
-- regardless of the caller's own row-level access.
create function kangaroosplit.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from kangaroosplit.members where user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------

create table kangaroosplit.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  icon text not null default '🧾',
  is_default boolean not null default false,
  starts_on date,
  ends_on date,
  archived_at timestamptz,
  created_by uuid references kangaroosplit.members (user_id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint lists_default_never_archived check (not is_default or archived_at is null),
  constraint lists_date_range check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create unique index lists_single_default on kangaroosplit.lists (is_default) where is_default;

create table kangaroosplit.list_default_shares (
  list_id uuid not null references kangaroosplit.lists (id) on delete cascade,
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade,
  weight integer not null default 1 check (weight >= 0),
  primary key (list_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

create table kangaroosplit.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  icon text not null default '📦',
  color text not null default '#64748b',
  is_preset boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recurring expenses
-- ---------------------------------------------------------------------------

create table kangaroosplit.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references kangaroosplit.lists (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  amount_cents integer not null check (amount_cents > 0),
  paid_by uuid not null references kangaroosplit.members (user_id),
  category_id uuid not null references kangaroosplit.categories (id),
  note text,
  split_mode kangaroosplit.split_mode not null default 'equal',
  -- Same shape as save_expense's p_shares:
  -- [{"user_id": uuid, "share_cents": int, "input_value": number|null}]
  split_input jsonb not null check (jsonb_typeof(split_input) = 'array'),
  frequency kangaroosplit.frequency not null,
  start_on date not null,
  end_on date,
  paused_at timestamptz,
  last_generated_on date,
  created_by uuid references kangaroosplit.members (user_id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint recurring_date_range check (end_on is null or start_on <= end_on)
);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------

create table kangaroosplit.expenses (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references kangaroosplit.lists (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  amount_cents integer not null check (amount_cents > 0),
  spent_on date not null,
  paid_by uuid not null references kangaroosplit.members (user_id),
  category_id uuid not null references kangaroosplit.categories (id),
  note text,
  split_mode kangaroosplit.split_mode not null default 'equal',
  recurring_id uuid references kangaroosplit.recurring_expenses (id) on delete set null,
  occurrence_date date,
  created_by uuid references kangaroosplit.members (user_id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references kangaroosplit.members (user_id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references kangaroosplit.members (user_id),
  deleted_at timestamptz,
  -- Guards recurring generation: both phones opening at once cannot duplicate.
  constraint expenses_recurring_occurrence unique (recurring_id, occurrence_date)
);

create index expenses_list_spent_on on kangaroosplit.expenses (list_id, spent_on desc);
create index expenses_category on kangaroosplit.expenses (category_id);

create table kangaroosplit.expense_shares (
  expense_id uuid not null references kangaroosplit.expenses (id) on delete cascade,
  user_id uuid not null references kangaroosplit.members (user_id),
  share_cents integer not null check (share_cents >= 0),
  input_value numeric,
  primary key (expense_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Settlements
-- ---------------------------------------------------------------------------

create table kangaroosplit.settlements (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references kangaroosplit.lists (id) on delete cascade,
  from_user uuid not null references kangaroosplit.members (user_id),
  to_user uuid not null references kangaroosplit.members (user_id),
  amount_cents integer not null check (amount_cents > 0),
  settled_on date not null default (now() at time zone 'Europe/Lisbon')::date,
  batch_id uuid,
  note text,
  created_by uuid references kangaroosplit.members (user_id) default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_by uuid references kangaroosplit.members (user_id),
  deleted_at timestamptz,
  constraint settlements_distinct_users check (from_user <> to_user)
);

create index settlements_list on kangaroosplit.settlements (list_id, settled_on desc);

-- ---------------------------------------------------------------------------
-- Activity feed (written by triggers only)
-- ---------------------------------------------------------------------------

create table kangaroosplit.activity (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references kangaroosplit.lists (id) on delete cascade,
  actor_id uuid not null references kangaroosplit.members (user_id),
  action kangaroosplit.activity_action not null,
  entity_id uuid not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_list_created on kangaroosplit.activity (list_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Push subscriptions
-- ---------------------------------------------------------------------------

create table kangaroosplit.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers: default shares
-- ---------------------------------------------------------------------------

-- New list starts with the default (Household) list's ratio; equal if none.
create function kangaroosplit.tg_lists_seed_default_shares()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into kangaroosplit.list_default_shares (list_id, user_id, weight)
  select new.id, m.user_id, coalesce(d.weight, 1)
  from kangaroosplit.members m
  left join kangaroosplit.lists dl on dl.is_default and dl.id <> new.id
  left join kangaroosplit.list_default_shares d
    on d.list_id = dl.id and d.user_id = m.user_id
  on conflict do nothing;
  return new;
end;
$$;

create trigger lists_seed_default_shares
after insert on kangaroosplit.lists
for each row execute function kangaroosplit.tg_lists_seed_default_shares();

-- New member gets an equal weight in every existing list.
create function kangaroosplit.tg_members_seed_default_shares()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into kangaroosplit.list_default_shares (list_id, user_id, weight)
  select l.id, new.user_id, 1 from kangaroosplit.lists l
  on conflict do nothing;
  return new;
end;
$$;

create trigger members_seed_default_shares
after insert on kangaroosplit.members
for each row execute function kangaroosplit.tg_members_seed_default_shares();

-- Household can never be deleted.
create function kangaroosplit.tg_lists_protect_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    raise exception 'default list cannot be deleted';
  end if;
  return old;
end;
$$;

create trigger lists_protect_default
before delete on kangaroosplit.lists
for each row execute function kangaroosplit.tg_lists_protect_default();

-- ---------------------------------------------------------------------------
-- Triggers: audit columns
-- ---------------------------------------------------------------------------

create function kangaroosplit.tg_expenses_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := (select auth.uid());
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  end if;
  return new;
end;
$$;

create trigger expenses_audit
before update on kangaroosplit.expenses
for each row execute function kangaroosplit.tg_expenses_audit();

create function kangaroosplit.tg_settlements_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := (select auth.uid());
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  end if;
  return new;
end;
$$;

create trigger settlements_audit
before update on kangaroosplit.settlements
for each row execute function kangaroosplit.tg_settlements_audit();

-- Resuming a paused rule skips occurrences missed while paused.
create function kangaroosplit.tg_recurring_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if old.paused_at is not null and new.paused_at is null then
    new.last_generated_on := greatest(
      coalesce(new.last_generated_on, new.start_on - 1),
      (now() at time zone 'Europe/Lisbon')::date - 1
    );
  end if;
  return new;
end;
$$;

create trigger recurring_audit
before update on kangaroosplit.recurring_expenses
for each row execute function kangaroosplit.tg_recurring_audit();

-- ---------------------------------------------------------------------------
-- Triggers: activity feed
-- ---------------------------------------------------------------------------

create function kangaroosplit.tg_expenses_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_action kangaroosplit.activity_action;
  v_snapshot jsonb;
begin
  if v_actor is null then
    return new;
  end if;

  v_snapshot := jsonb_build_object(
    'description', new.description,
    'amount_cents', new.amount_cents,
    'paid_by', new.paid_by,
    'recurring', new.recurring_id is not null
  );

  if tg_op = 'INSERT' then
    v_action := 'expense_created';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_action := 'expense_deleted';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_action := 'expense_restored';
  else
    v_action := 'expense_updated';
    v_snapshot := v_snapshot || jsonb_build_object(
      'previous', jsonb_build_object(
        'description', old.description,
        'amount_cents', old.amount_cents,
        'paid_by', old.paid_by,
        'list_id', old.list_id
      )
    );
  end if;

  insert into kangaroosplit.activity (list_id, actor_id, action, entity_id, snapshot)
  values (new.list_id, v_actor, v_action, new.id, v_snapshot);
  return new;
end;
$$;

create trigger expenses_activity
after insert or update on kangaroosplit.expenses
for each row execute function kangaroosplit.tg_expenses_activity();

create function kangaroosplit.tg_settlements_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_action kangaroosplit.activity_action;
begin
  if v_actor is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'settlement_created';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_action := 'settlement_deleted';
  else
    return new;
  end if;

  insert into kangaroosplit.activity (list_id, actor_id, action, entity_id, snapshot)
  values (
    new.list_id, v_actor, v_action, new.id,
    jsonb_build_object(
      'amount_cents', new.amount_cents,
      'from_user', new.from_user,
      'to_user', new.to_user,
      'batch_id', new.batch_id
    )
  );
  return new;
end;
$$;

create trigger settlements_activity
after insert or update on kangaroosplit.settlements
for each row execute function kangaroosplit.tg_settlements_activity();

create function kangaroosplit.tg_lists_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_action kangaroosplit.activity_action;
begin
  if v_actor is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'list_created';
  elsif old.archived_at is null and new.archived_at is not null then
    v_action := 'list_archived';
  else
    return new;
  end if;

  insert into kangaroosplit.activity (list_id, actor_id, action, entity_id, snapshot)
  values (new.id, v_actor, v_action, new.id, jsonb_build_object('name', new.name, 'icon', new.icon));
  return new;
end;
$$;

create trigger lists_activity
after insert or update on kangaroosplit.lists
for each row execute function kangaroosplit.tg_lists_activity();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- Positive balance = this user is owed money in this list.
create view kangaroosplit.list_balances
with (security_invoker = true)
as
select
  l.id as list_id,
  m.user_id,
  (
    coalesce((
      select sum(e.amount_cents) from kangaroosplit.expenses e
      where e.list_id = l.id and e.paid_by = m.user_id and e.deleted_at is null
    ), 0)
    - coalesce((
      select sum(s.share_cents)
      from kangaroosplit.expense_shares s
      join kangaroosplit.expenses e on e.id = s.expense_id
      where e.list_id = l.id and s.user_id = m.user_id and e.deleted_at is null
    ), 0)
    + coalesce((
      select sum(t.amount_cents) from kangaroosplit.settlements t
      where t.list_id = l.id and t.from_user = m.user_id and t.deleted_at is null
    ), 0)
    - coalesce((
      select sum(t.amount_cents) from kangaroosplit.settlements t
      where t.list_id = l.id and t.to_user = m.user_id and t.deleted_at is null
    ), 0)
  )::integer as balance_cents
from kangaroosplit.lists l
cross join kangaroosplit.members m;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Insert (p_id null) or update an expense together with its shares.
-- p_shares: [{"user_id": uuid, "share_cents": int, "input_value": number|null}]
create function kangaroosplit.save_expense(
  p_id uuid,
  p_list_id uuid,
  p_description text,
  p_amount_cents integer,
  p_spent_on date,
  p_paid_by uuid,
  p_category_id uuid,
  p_note text,
  p_split_mode kangaroosplit.split_mode,
  p_shares jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_sum bigint;
begin
  if not kangaroosplit.is_member() then
    raise exception 'not a member';
  end if;

  select coalesce(sum((s ->> 'share_cents')::integer), 0)
  into v_sum
  from jsonb_array_elements(p_shares) s;

  if v_sum <> p_amount_cents then
    raise exception 'shares (%) do not sum to amount (%)', v_sum, p_amount_cents;
  end if;

  if v_id is null then
    insert into kangaroosplit.expenses
      (list_id, description, amount_cents, spent_on, paid_by, category_id, note, split_mode)
    values
      (p_list_id, p_description, p_amount_cents, p_spent_on, p_paid_by, p_category_id, p_note, p_split_mode)
    returning id into v_id;
  else
    update kangaroosplit.expenses
    set list_id = p_list_id,
        description = p_description,
        amount_cents = p_amount_cents,
        spent_on = p_spent_on,
        paid_by = p_paid_by,
        category_id = p_category_id,
        note = p_note,
        split_mode = p_split_mode
    where id = v_id and deleted_at is null;

    if not found then
      raise exception 'expense % not found', v_id;
    end if;

    delete from kangaroosplit.expense_shares where expense_id = v_id;
  end if;

  insert into kangaroosplit.expense_shares (expense_id, user_id, share_cents, input_value)
  select
    v_id,
    (s ->> 'user_id')::uuid,
    (s ->> 'share_cents')::integer,
    (s ->> 'input_value')::numeric
  from jsonb_array_elements(p_shares) s;

  return v_id;
end;
$$;

-- One settlement per list with a non-zero balance, linked by a shared batch_id.
-- Returns the batch id, or null when everything was already settled.
create function kangaroosplit.settle_all()
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_batch uuid := gen_random_uuid();
  v_count integer;
begin
  if not kangaroosplit.is_member() then
    raise exception 'not a member';
  end if;

  insert into kangaroosplit.settlements (list_id, from_user, to_user, amount_cents, batch_id)
  select b.list_id, b.user_id, o.user_id, -b.balance_cents, v_batch
  from kangaroosplit.list_balances b
  join kangaroosplit.members o on o.user_id <> b.user_id
  where b.balance_cents < 0;

  get diagnostics v_count = row_count;
  return case when v_count > 0 then v_batch end;
end;
$$;

-- Creates every recurring occurrence due up to p_today. Idempotent.
-- Returns number of expenses created.
create function kangaroosplit.generate_recurring(
  p_today date default (now() at time zone 'Europe/Lisbon')::date
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  r record;
  v_step interval;
  v_limit date;
  v_occurrence date;
  v_n integer;
  v_new_id uuid;
  v_created integer := 0;
begin
  if not kangaroosplit.is_member() then
    raise exception 'not a member';
  end if;

  for r in
    select * from kangaroosplit.recurring_expenses
    where deleted_at is null and paused_at is null and start_on <= p_today
  loop
    v_limit := least(p_today, coalesce(r.end_on, p_today));
    v_step := case r.frequency
      when 'weekly' then interval '1 week'
      when 'monthly' then interval '1 month'
      else interval '1 year'
    end;
    v_n := 0;

    loop
      -- Always offset from start_on, so day 31 clamps per month without drifting.
      v_occurrence := (r.start_on + v_n * v_step)::date;
      exit when v_occurrence > v_limit;

      if r.last_generated_on is null or v_occurrence > r.last_generated_on then
        v_new_id := null;

        insert into kangaroosplit.expenses
          (list_id, description, amount_cents, spent_on, paid_by, category_id, note,
           split_mode, recurring_id, occurrence_date)
        values
          (r.list_id, r.description, r.amount_cents, v_occurrence, r.paid_by, r.category_id, r.note,
           r.split_mode, r.id, v_occurrence)
        on conflict (recurring_id, occurrence_date) do nothing
        returning id into v_new_id;

        if v_new_id is not null then
          insert into kangaroosplit.expense_shares (expense_id, user_id, share_cents, input_value)
          select
            v_new_id,
            (s ->> 'user_id')::uuid,
            (s ->> 'share_cents')::integer,
            (s ->> 'input_value')::numeric
          from jsonb_array_elements(r.split_input) s;

          v_created := v_created + 1;
        end if;
      end if;

      v_n := v_n + 1;
    end loop;

    update kangaroosplit.recurring_expenses
    set last_generated_on = v_limit
    where id = r.id and (last_generated_on is null or last_generated_on < v_limit);
  end loop;

  return v_created;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema kangaroosplit to authenticated;
grant all on all tables in schema kangaroosplit to service_role;

revoke execute on all functions in schema kangaroosplit from public, anon;
grant execute on all functions in schema kangaroosplit to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table kangaroosplit.members enable row level security;
alter table kangaroosplit.lists enable row level security;
alter table kangaroosplit.list_default_shares enable row level security;
alter table kangaroosplit.categories enable row level security;
alter table kangaroosplit.recurring_expenses enable row level security;
alter table kangaroosplit.expenses enable row level security;
alter table kangaroosplit.expense_shares enable row level security;
alter table kangaroosplit.settlements enable row level security;
alter table kangaroosplit.activity enable row level security;
alter table kangaroosplit.push_subscriptions enable row level security;

-- Members: readable by members; each edits only own profile. Rows added by hand.
create policy members_select on kangaroosplit.members
  for select to authenticated using (kangaroosplit.is_member());
create policy members_update_own on kangaroosplit.members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy lists_all on kangaroosplit.lists
  for all to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

create policy list_default_shares_all on kangaroosplit.list_default_shares
  for all to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

create policy categories_all on kangaroosplit.categories
  for all to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

create policy recurring_expenses_all on kangaroosplit.recurring_expenses
  for all to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

-- Expenses and settlements: no delete policy, soft delete only.
create policy expenses_select on kangaroosplit.expenses
  for select to authenticated using (kangaroosplit.is_member());
create policy expenses_insert on kangaroosplit.expenses
  for insert to authenticated with check (kangaroosplit.is_member());
create policy expenses_update on kangaroosplit.expenses
  for update to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

create policy expense_shares_all on kangaroosplit.expense_shares
  for all to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

create policy settlements_select on kangaroosplit.settlements
  for select to authenticated using (kangaroosplit.is_member());
create policy settlements_insert on kangaroosplit.settlements
  for insert to authenticated with check (kangaroosplit.is_member());
create policy settlements_update on kangaroosplit.settlements
  for update to authenticated
  using (kangaroosplit.is_member()) with check (kangaroosplit.is_member());

-- Activity: read-only for clients; rows come from security definer triggers.
create policy activity_select on kangaroosplit.activity
  for select to authenticated using (kangaroosplit.is_member());

create policy push_subscriptions_own on kangaroosplit.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()) and kangaroosplit.is_member())
  with check (user_id = (select auth.uid()) and kangaroosplit.is_member());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  kangaroosplit.lists,
  kangaroosplit.list_default_shares,
  kangaroosplit.categories,
  kangaroosplit.recurring_expenses,
  kangaroosplit.expenses,
  kangaroosplit.expense_shares,
  kangaroosplit.settlements,
  kangaroosplit.activity;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into kangaroosplit.lists (name, icon, is_default, created_by)
values ('Casa', '🏠', true, null);

insert into kangaroosplit.categories (name, icon, color, is_preset) values
  ('Supermercado', '🛒', '#16a34a', true),
  ('Renda', '🏠', '#2563eb', true),
  ('Contas', '💡', '#ca8a04', true),
  ('Restaurantes', '🍽️', '#ea580c', true),
  ('Transportes', '🚗', '#0891b2', true),
  ('Viagens', '✈️', '#7c3aed', true),
  ('Saúde', '💊', '#dc2626', true),
  ('Lazer', '🎉', '#db2777', true),
  ('Outros', '📦', '#64748b', true);

commit;
