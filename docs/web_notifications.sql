alter table public.suppliers
add column if not exists web_notifications_read_at timestamptz;

comment on column public.suppliers.web_notifications_read_at is
'Last timestamp the supplier marked web signed-contract notifications as read.';
