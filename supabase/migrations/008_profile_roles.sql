alter table profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));