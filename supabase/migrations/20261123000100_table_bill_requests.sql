alter table public.tcc_table_assistance_requests
 add column if not exists request_type text not null default 'staff'
 check (request_type in ('staff','bill'));
create index if not exists tcc_table_assistance_requests_type_status_created_idx
 on public.tcc_table_assistance_requests (request_type, status, created_at desc);
