create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null,
  event_type text not null,
  delivery_status text not null check (delivery_status in ('received', 'processed', 'ignored', 'error')),
  supplier_user_id uuid null,
  error_message text null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_billing_webhook_events_provider_event
  on public.billing_webhook_events(provider, event_id);

create index if not exists idx_billing_webhook_events_created_at
  on public.billing_webhook_events(created_at desc);

alter table public.billing_webhook_events enable row level security;

-- Admin/service-role access only. End-users should not read raw webhook payloads.
drop policy if exists billing_webhook_events_no_public_access on public.billing_webhook_events;
create policy billing_webhook_events_no_public_access
on public.billing_webhook_events
for all
using (false)
with check (false);
