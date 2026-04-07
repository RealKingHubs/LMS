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

create table if not exists public.lms_announcements (
  id bigint generated always as identity primary key,
  track_id text not null,
  title text not null,
  body text not null,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lms_announcements_track_created_at_idx
  on public.lms_announcements (track_id, created_at desc);

alter table public.lms_announcements replica identity full;

alter table public.lms_announcements disable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('community-attachments', 'community-attachments', true, 2147483648)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Community attachments public read" on storage.objects;
create policy "Community attachments public read"
on storage.objects for select
to public
using (bucket_id = 'community-attachments');

drop policy if exists "Community attachments public insert" on storage.objects;
create policy "Community attachments public insert"
on storage.objects for insert
to public
with check (bucket_id = 'community-attachments');

drop policy if exists "Community attachments public update" on storage.objects;
create policy "Community attachments public update"
on storage.objects for update
to public
using (bucket_id = 'community-attachments')
with check (bucket_id = 'community-attachments');

drop policy if exists "Community attachments public delete" on storage.objects;
create policy "Community attachments public delete"
on storage.objects for delete
to public
using (bucket_id = 'community-attachments');
