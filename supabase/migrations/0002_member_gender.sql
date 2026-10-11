-- Portuguese puts a gendered article before a person's name
-- ("A Mara deve-te", "Pago pelo Miguel"), so the UI needs to know which to use.
--
-- Apply in SQL Editor, then set the right value for each member, e.g.:
--   update kangaroosplit.members set gender = 'f' where display_name = 'Mara';

alter table kangaroosplit.members
  add column gender text not null default 'm' check (gender in ('m', 'f'));
