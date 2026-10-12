-- Receipt photos: one optional photo per expense, kept in a private storage
-- bucket that only the two members can read or write.
--
-- Apply in the SQL Editor (make sure nothing is selected, so all of it runs).
-- Safe to run again.

begin;

-- Where the photo lives inside the bucket; null when there is none.
alter table kangaroosplit.expenses add column if not exists receipt_path text;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Private: files are reachable only through short-lived signed links.
-- Photos are shrunk to JPEG on the phone before upload, hence the limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kangaroosplit-receipts', 'kangaroosplit-receipts', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists kangaroosplit_receipts_select on storage.objects;
create policy kangaroosplit_receipts_select on storage.objects
  for select to authenticated
  using (bucket_id = 'kangaroosplit-receipts' and kangaroosplit.is_member());

drop policy if exists kangaroosplit_receipts_insert on storage.objects;
create policy kangaroosplit_receipts_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kangaroosplit-receipts' and kangaroosplit.is_member());

drop policy if exists kangaroosplit_receipts_delete on storage.objects;
create policy kangaroosplit_receipts_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'kangaroosplit-receipts' and kangaroosplit.is_member());

-- ---------------------------------------------------------------------------
-- save_expense, now also setting the receipt
-- ---------------------------------------------------------------------------

-- The old ten-argument version has to go, or the two would be ambiguous.
drop function if exists kangaroosplit.save_expense(
  uuid, uuid, text, integer, date, uuid, uuid, text, kangaroosplit.split_mode, jsonb
);

-- Insert (p_id null) or update an expense together with its shares.
-- p_shares: [{"user_id": uuid, "share_cents": int, "input_value": number|null}]
-- p_receipt_path: null leaves the receipt as it is (so a phone still running
-- an older version of the app cannot wipe it), '' removes it, anything else
-- sets it.
create or replace function kangaroosplit.save_expense(
  p_id uuid,
  p_list_id uuid,
  p_description text,
  p_amount_cents integer,
  p_spent_on date,
  p_paid_by uuid,
  p_category_id uuid,
  p_note text,
  p_split_mode kangaroosplit.split_mode,
  p_shares jsonb,
  p_receipt_path text default null
)
returns uuid
language plpgsql
set search_path = ''
as $save_expense$
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
      (list_id, description, amount_cents, spent_on, paid_by, category_id, note, split_mode, receipt_path)
    values
      (p_list_id, p_description, p_amount_cents, p_spent_on, p_paid_by, p_category_id, p_note, p_split_mode,
       nullif(p_receipt_path, ''))
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
        split_mode = p_split_mode,
        receipt_path = case
          when p_receipt_path is null then receipt_path
          else nullif(p_receipt_path, '')
        end
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
$save_expense$;

revoke execute on function kangaroosplit.save_expense(
  uuid, uuid, text, integer, date, uuid, uuid, text, kangaroosplit.split_mode, jsonb, text
) from public, anon;
grant execute on function kangaroosplit.save_expense(
  uuid, uuid, text, integer, date, uuid, uuid, text, kangaroosplit.split_mode, jsonb, text
) to authenticated, service_role;

commit;
