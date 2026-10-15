-- Shared shopping list (Compras tab). Safe to run again.
--
-- It does not create expenses and writes nothing to the activity feed, so no
-- push is sent for it.

begin;

create table if not exists kangaroosplit.shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  -- Name without case, accents and extra spaces; set by the app. Used to find
  -- duplicates and to match the history.
  name_key text not null check (length(name_key) between 1 and 80),
  emoji text not null default '🛒' check (length(emoji) between 1 and 16),
  section text not null default 'outros' check (
    section in (
      'frutas', 'padaria', 'laticinios', 'talho', 'mercearia',
      'congelados', 'bebidas', 'limpeza', 'higiene', 'outros'
    )
  ),
  quantity integer not null default 1 check (quantity >= 1),
  note text check (note is null or length(note) <= 120),
  added_by uuid not null references kangaroosplit.members (user_id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  checked_by uuid references kangaroosplit.members (user_id) on delete set null
);

create index if not exists shopping_items_open
  on kangaroosplit.shopping_items (section, created_at)
  where checked_at is null;

-- What has been bought before: feeds the "Habituais" chips, the suggestions,
-- and remembers the section and emoji the user chose for a name.
create table if not exists kangaroosplit.shopping_history (
  name_key text primary key check (length(name_key) between 1 and 80),
  name text not null,
  emoji text not null default '🛒',
  section text not null default 'outros',
  times_bought integer not null default 0 check (times_bought >= 0),
  last_bought_at timestamptz
);

grant select, insert, update, delete on
  kangaroosplit.shopping_items,
  kangaroosplit.shopping_history
to authenticated;
grant all on
  kangaroosplit.shopping_items,
  kangaroosplit.shopping_history
to service_role;

alter table kangaroosplit.shopping_items enable row level security;
alter table kangaroosplit.shopping_history enable row level security;

-- Shared between the two people: both read and write everything.
drop policy if exists shopping_items_all on kangaroosplit.shopping_items;
create policy shopping_items_all on kangaroosplit.shopping_items
  for all to authenticated
  using (kangaroosplit.is_member())
  with check (kangaroosplit.is_member());

drop policy if exists shopping_history_all on kangaroosplit.shopping_history;
create policy shopping_history_all on kangaroosplit.shopping_history
  for all to authenticated
  using (kangaroosplit.is_member())
  with check (kangaroosplit.is_member());

-- ---------------------------------------------------------------------------
-- Keeps the history in step with the list: remembers the emoji and section of
-- every name, and counts a purchase when an item is ticked (and uncounts it
-- when it is unticked, so tick, untick and undo stay consistent).
-- ---------------------------------------------------------------------------

create or replace function kangaroosplit.tg_shopping_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta integer := 0;
begin
  if tg_op = 'UPDATE' then
    if old.checked_at is null and new.checked_at is not null then
      v_delta := 1;
    elsif old.checked_at is not null and new.checked_at is null then
      v_delta := -1;
    end if;
  end if;
  -- An insert never counts, even when ticked: "Anular" after clearing the cart
  -- puts back rows that were counted when they were ticked.

  insert into kangaroosplit.shopping_history as h
    (name_key, name, emoji, section, times_bought, last_bought_at)
  values (
    new.name_key, new.name, new.emoji, new.section,
    greatest(v_delta, 0),
    case when v_delta > 0 then now() end
  )
  on conflict (name_key) do update set
    name = excluded.name,
    emoji = excluded.emoji,
    section = excluded.section,
    times_bought = greatest(h.times_bought + v_delta, 0),
    last_bought_at = case when v_delta > 0 then now() else h.last_bought_at end;

  return new;
end;
$$;

drop trigger if exists shopping_items_history on kangaroosplit.shopping_items;
create trigger shopping_items_history
after insert or update on kangaroosplit.shopping_items
for each row execute function kangaroosplit.tg_shopping_history();

-- "Limpar carrinho": removes every ticked item in one go.
create or replace function kangaroosplit.clear_shopping_cart()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not kangaroosplit.is_member() then
    raise exception 'not a member';
  end if;
  delete from kangaroosplit.shopping_items where checked_at is not null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function kangaroosplit.clear_shopping_cart() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime, and the backup login (see 0003) can read the new tables too
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['shopping_items', 'shopping_history'] loop
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
