-- Compras v2: a photo can replace the emoji of a shopping item.
--
-- Apply in the SQL Editor (make sure nothing is selected, so all of it runs).
-- Safe to run again. Everything lives in schema `kangaroosplit`; the bucket is
-- prefixed `kangaroosplit-` because the Supabase project is shared.

begin;

-- Where the photo lives inside the bucket; null when the item uses its emoji.
alter table kangaroosplit.shopping_items add column if not exists image_path text
  check (image_path is null or length(image_path) between 1 and 120);

-- The history remembers the photo too, so a name comes back with its picture
-- ("Habituais" and the suggestions).
alter table kangaroosplit.shopping_history add column if not exists image_path text
  check (image_path is null or length(image_path) between 1 and 120);

-- ---------------------------------------------------------------------------
-- Storage: private, only the two members can read or write.
-- The app shrinks every photo to a 256 px square (WebP, or JPEG where the
-- phone cannot encode WebP), hence the small limit.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kangaroosplit-shopping', 'kangaroosplit-shopping', false, 524288, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

drop policy if exists kangaroosplit_shopping_select on storage.objects;
create policy kangaroosplit_shopping_select on storage.objects
  for select to authenticated
  using (bucket_id = 'kangaroosplit-shopping' and kangaroosplit.is_member());

drop policy if exists kangaroosplit_shopping_insert on storage.objects;
create policy kangaroosplit_shopping_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kangaroosplit-shopping' and kangaroosplit.is_member());

drop policy if exists kangaroosplit_shopping_delete on storage.objects;
create policy kangaroosplit_shopping_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'kangaroosplit-shopping' and kangaroosplit.is_member());

-- ---------------------------------------------------------------------------
-- The history trigger (see 0008), now also remembering the photo.
-- ---------------------------------------------------------------------------

create or replace function kangaroosplit.tg_shopping_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $tg_shopping_history$
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
    (name_key, name, emoji, image_path, section, times_bought, last_bought_at)
  values (
    new.name_key, new.name, new.emoji, new.image_path, new.section,
    greatest(v_delta, 0),
    case when v_delta > 0 then now() end
  )
  on conflict (name_key) do update set
    name = excluded.name,
    emoji = excluded.emoji,
    image_path = excluded.image_path,
    section = excluded.section,
    times_bought = greatest(h.times_bought + v_delta, 0),
    last_bought_at = case when v_delta > 0 then now() else h.last_bought_at end;

  return new;
end;
$tg_shopping_history$;

commit;

-- Verify (run after the commit; expect one row with `true` in each column):
-- select
--   exists (select 1 from information_schema.columns
--           where table_schema = 'kangaroosplit' and table_name = 'shopping_items' and column_name = 'image_path') as items_column,
--   exists (select 1 from information_schema.columns
--           where table_schema = 'kangaroosplit' and table_name = 'shopping_history' and column_name = 'image_path') as history_column,
--   exists (select 1 from storage.buckets where id = 'kangaroosplit-shopping') as bucket;
