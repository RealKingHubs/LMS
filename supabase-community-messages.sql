create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  author_name text not null,
  author_email text not null,
  room text not null default 'community',
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.community_messages add column if not exists room text not null default 'community';
alter table public.community_messages add column if not exists author_email text not null default '';

create index if not exists community_messages_room_created_at_idx
  on public.community_messages (room, created_at desc);

alter table public.community_messages replica identity full;

alter table public.community_messages disable row level security;
