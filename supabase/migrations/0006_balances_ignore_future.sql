-- Balances only count expenses already spent: `spent_on` is the day the money
-- left, so a later date means it has not happened yet. A future expense starts
-- counting by itself on its date; the view is evaluated at query time, so no
-- job is needed. "Acertar contas" settles from this view, so it follows too.
--
-- Same columns as before, so create or replace is enough and grants survive.
-- Apply: Supabase dashboard -> SQL Editor -> paste -> Run.

create or replace view kangaroosplit.list_balances
with (security_invoker = true)
as
select
  l.id as list_id,
  m.user_id,
  (
    coalesce((
      select sum(e.amount_cents) from kangaroosplit.expenses e
      where e.list_id = l.id and e.paid_by = m.user_id and e.deleted_at is null
        and e.spent_on <= (now() at time zone 'Europe/Lisbon')::date
    ), 0)
    - coalesce((
      select sum(s.share_cents)
      from kangaroosplit.expense_shares s
      join kangaroosplit.expenses e on e.id = s.expense_id
      where e.list_id = l.id and s.user_id = m.user_id and e.deleted_at is null
        and e.spent_on <= (now() at time zone 'Europe/Lisbon')::date
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
