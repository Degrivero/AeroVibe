-- Support: allow users to reply to their tickets (bidirectional support)
alter table public.support_requests
  add column if not exists user_replies text;
