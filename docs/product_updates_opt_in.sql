alter table public.suppliers
add column if not exists product_updates_opt_in boolean;

comment on column public.suppliers.product_updates_opt_in is
'Web app marketing preference: true=opted in, false=opted out, null=not asked yet.';
