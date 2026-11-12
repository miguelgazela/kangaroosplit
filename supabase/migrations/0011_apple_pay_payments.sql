-- Automatic payments from Apple Pay ("Por classificar"). Safe to run again.
--
-- An iOS Shortcuts automation ("Transação") posts each Apple Pay payment to the
-- edge function `kangaroosplit-payments`. The payment arrives here as a draft
-- (`pending_payments`); the person picks a list and a category and it becomes a
-- normal expense through `save_expense`. Drafts are private to the person whose
-- phone sent them. Nothing here writes to the activity feed until the draft is
-- turned into an expense.

begin;

-- ---------------------------------------------------------------------------
-- Personal key used by the shortcut. Only the hash is stored; the plain key is
-- shown once, when it is created. No client policy: reached through the two
-- functions below and by the edge function (service role).
-- ---------------------------------------------------------------------------

create table if not exists kangaroosplit.payment_tokens (
  user_id uuid primary key references kangaroosplit.members (user_id) on delete cascade,
  token_hash text not null unique,
  -- Last 4 characters of the key, so the screen can show "ks_••••7f3a".
  hint text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table kangaroosplit.payment_tokens enable row level security;
grant all on kangaroosplit.payment_tokens to service_role;

-- ---------------------------------------------------------------------------
-- Drafts
-- ---------------------------------------------------------------------------

create table if not exists kangaroosplit.pending_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade,
  -- As Wallet sent it, and the cleaned-up name shown in the app.
  merchant_raw text not null check (length(merchant_raw) between 1 and 200),
  merchant text not null check (length(merchant) between 1 and 80),
  -- Name without case, accents and extra spaces. The rules match on it.
  merchant_key text not null check (length(merchant_key) between 1 and 80),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  paid_at timestamptz not null default now(),
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  status text not null default 'pending' check (status in ('pending', 'added', 'ignored')),
  expense_id uuid references kangaroosplit.expenses (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists pending_payments_open
  on kangaroosplit.pending_payments (user_id, paid_at desc)
  where status = 'pending';

-- What each merchant became last time: category and list.
create table if not exists kangaroosplit.merchant_rules (
  user_id uuid not null references kangaroosplit.members (user_id) on delete cascade default auth.uid(),
  merchant_key text not null check (length(merchant_key) between 1 and 80),
  merchant text not null,
  category_id uuid not null references kangaroosplit.categories (id) on delete cascade,
  list_id uuid not null references kangaroosplit.lists (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);

-- Drafts are created by the edge function only (service role).
grant select, update on kangaroosplit.pending_payments to authenticated;
grant select, insert, update, delete on kangaroosplit.merchant_rules to authenticated;
grant all on kangaroosplit.pending_payments, kangaroosplit.merchant_rules to service_role;

alter table kangaroosplit.pending_payments enable row level security;
alter table kangaroosplit.merchant_rules enable row level security;

drop policy if exists pending_payments_own on kangaroosplit.pending_payments;
create policy pending_payments_own on kangaroosplit.pending_payments
  for all to authenticated
  using (kangaroosplit.is_member() and user_id = auth.uid())
  with check (kangaroosplit.is_member() and user_id = auth.uid());

drop policy if exists merchant_rules_own on kangaroosplit.merchant_rules;
create policy merchant_rules_own on kangaroosplit.merchant_rules
  for all to authenticated
  using (kangaroosplit.is_member() and user_id = auth.uid())
  with check (kangaroosplit.is_member() and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Key management
-- ---------------------------------------------------------------------------

-- Creates a new key (replacing the old one) and returns it. The only time the
-- plain key exists outside the person's clipboard.
create or replace function kangaroosplit.create_payment_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not kangaroosplit.is_member() then
    raise exception 'not a member';
  end if;

  v_token := 'ks_' || encode(extensions.gen_random_bytes(24), 'hex');

  insert into kangaroosplit.payment_tokens as p (user_id, token_hash, hint, created_at, last_used_at)
  values (
    auth.uid(),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    right(v_token, 4),
    now(),
    null
  )
  on conflict (user_id) do update set
    token_hash = excluded.token_hash,
    hint = excluded.hint,
    created_at = excluded.created_at,
    last_used_at = null;

  return v_token;
end;
$$;

-- {"hint": "7f3a", "created_at": ..., "last_used_at": ...} or null when there is no key.
create or replace function kangaroosplit.payment_token_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(s)
  from (
    select hint, created_at, last_used_at
    from kangaroosplit.payment_tokens
    where user_id = auth.uid() and kangaroosplit.is_member()
  ) s;
$$;

revoke all on function kangaroosplit.create_payment_token() from public;
revoke all on function kangaroosplit.payment_token_status() from public;
grant execute on function kangaroosplit.create_payment_token() to authenticated;
grant execute on function kangaroosplit.payment_token_status() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (a new draft shows up on the phone at once) and the backup login
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['pending_payments', 'merchant_rules'] loop
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
