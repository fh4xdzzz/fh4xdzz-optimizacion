-- Evaluate auth.uid() once per statement instead of once per candidate row.
-- The policy predicates remain otherwise unchanged.

do $migration$
declare
  policy_record record;
  alter_statement text;
begin
  for policy_record in
    select
      p.polname,
      n.nspname,
      c.relname,
      pg_get_expr(p.polqual, p.polrelid) as using_expression,
      pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not (c.relname = 'order_deliverables'
               and p.polname = 'Authorized users can view order deliverables')
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%auth.uid()%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%auth.uid()%'
      )
  loop
    alter_statement := format(
      'alter policy %I on %I.%I%s%s',
      policy_record.polname,
      policy_record.nspname,
      policy_record.relname,
      case
        when policy_record.using_expression is not null
          then ' using (' || replace(
            policy_record.using_expression,
            'auth.uid()',
            '(select auth.uid())'
          ) || ')'
        else ''
      end,
      case
        when policy_record.check_expression is not null
          then ' with check (' || replace(
            policy_record.check_expression,
            'auth.uid()',
            '(select auth.uid())'
          ) || ')'
        else ''
      end
    );

    execute alter_statement;
  end loop;
end
$migration$;

