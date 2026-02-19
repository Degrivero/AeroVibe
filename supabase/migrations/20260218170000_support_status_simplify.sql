-- Support: simplify status to new, pending, resolved (remove open, closed)
update public.support_requests
set status = case
  when status = 'open' then 'pending'
  when status = 'closed' then 'resolved'
  when status in ('new', 'pending', 'resolved') then status
  else 'pending'
end
where status is not null;
