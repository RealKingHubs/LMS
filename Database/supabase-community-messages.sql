-- ---------------------------------------------------------------------------
-- RealKingHubs Academy backend tables and policies
-- Run this file in the Supabase SQL editor.
--
-- It now covers:
-- 1. Real admin authorization via Supabase Auth + RLS
-- 2. Community and announcement tables with admin-only destructive actions
-- 3. Shared track, curriculum, and learner-profile tables for the admin workspace
-- 4. Community attachment storage policies
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Admin access control
-- Admins authenticate with Supabase Auth, then RLS checks their email against
-- this table before allowing any admin-only action.
-- ---------------------------------------------------------------------------
create table if not exists public.lms_admin_users (
  email text primary key,
  display_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.lms_admin_users (email, display_name, is_active)
values ('ucking480@gmail.com', 'Odo Kingsley Uchenna', true)
on conflict (email) do update
set display_name = excluded.display_name,
    is_active = excluded.is_active,
    updated_at = now();

create or replace function public.is_lms_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lms_admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and is_active = true
  );
$$;

grant execute on function public.is_lms_admin() to anon, authenticated;

alter table public.lms_admin_users enable row level security;

drop policy if exists "Admin users admin read" on public.lms_admin_users;
create policy "Admin users admin read"
on public.lms_admin_users for select
to authenticated
using (public.is_lms_admin());

drop policy if exists "Admin users admin insert" on public.lms_admin_users;
create policy "Admin users admin insert"
on public.lms_admin_users for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Admin users admin update" on public.lms_admin_users;
create policy "Admin users admin update"
on public.lms_admin_users for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Admin users admin delete" on public.lms_admin_users;
create policy "Admin users admin delete"
on public.lms_admin_users for delete
to authenticated
using (public.is_lms_admin());

-- ---------------------------------------------------------------------------
-- Community room data
-- Learners can still read and post messages, but only authenticated admins can
-- delete them from the shared database.
-- ---------------------------------------------------------------------------
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
alter table public.community_messages enable row level security;

drop policy if exists "Community messages public read" on public.community_messages;
create policy "Community messages public read"
on public.community_messages for select
to anon, authenticated
using (true);

drop policy if exists "Community messages public insert" on public.community_messages;
create policy "Community messages public insert"
on public.community_messages for insert
to anon, authenticated
with check (
  coalesce(author_name, '') <> ''
  and coalesce(author_email, '') <> ''
  and coalesce(room, '') <> ''
  and coalesce(content, '') <> ''
);

drop policy if exists "Community messages admin delete" on public.community_messages;
create policy "Community messages admin delete"
on public.community_messages for delete
to authenticated
using (public.is_lms_admin());

-- ---------------------------------------------------------------------------
-- Announcements
-- Learners can read programme announcements. Only admins can publish or remove
-- them from the shared backend.
-- ---------------------------------------------------------------------------
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
alter table public.lms_announcements enable row level security;

drop policy if exists "Announcements public read" on public.lms_announcements;
create policy "Announcements public read"
on public.lms_announcements for select
to anon, authenticated
using (true);

drop policy if exists "Announcements admin insert" on public.lms_announcements;
create policy "Announcements admin insert"
on public.lms_announcements for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Announcements admin update" on public.lms_announcements;
create policy "Announcements admin update"
on public.lms_announcements for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Announcements admin delete" on public.lms_announcements;
create policy "Announcements admin delete"
on public.lms_announcements for delete
to authenticated
using (public.is_lms_admin());

-- ---------------------------------------------------------------------------
-- Track settings
-- These records let the admin change labels, summaries, outcomes, and whether
-- a track is enabled without editing the frontend code every time.
-- ---------------------------------------------------------------------------
create table if not exists public.lms_track_settings (
  id text primary key,
  label text not null,
  summary text not null default '',
  outcomes jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_by text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.lms_track_settings (id, label, summary, outcomes, is_enabled, sort_order)
values
  ('cloud-engineering', 'Cloud Engineering', 'Infrastructure, automation, operations, resilience, and production delivery.', '["Cloud foundations","Infrastructure as code","Containers and Kubernetes"]'::jsonb, true, 1),
  ('frontend-engineering', 'Frontend Engineering', 'Modern web interfaces, design systems, performance, testing, and deployment.', '["Accessible interfaces","React applications","Production delivery"]'::jsonb, true, 2),
  ('backend-engineering', 'Backend Engineering', 'Server-side systems, APIs, databases, security, testing, and deployment.', '["API design","Database engineering","Production backend systems"]'::jsonb, true, 3)
on conflict (id) do nothing;

create index if not exists lms_track_settings_sort_order_idx
  on public.lms_track_settings (sort_order asc, id asc);

alter table public.lms_track_settings enable row level security;

drop policy if exists "Track settings public read" on public.lms_track_settings;
create policy "Track settings public read"
on public.lms_track_settings for select
to anon, authenticated
using (true);

drop policy if exists "Track settings admin insert" on public.lms_track_settings;
create policy "Track settings admin insert"
on public.lms_track_settings for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Track settings admin update" on public.lms_track_settings;
create policy "Track settings admin update"
on public.lms_track_settings for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Track settings admin delete" on public.lms_track_settings;
create policy "Track settings admin delete"
on public.lms_track_settings for delete
to authenticated
using (public.is_lms_admin());

-- ---------------------------------------------------------------------------
-- Curriculum overrides
-- The base curriculum still lives in data.js, but these override tables let the
-- admin update month-level and week-level content from /uc-admin/.
-- ---------------------------------------------------------------------------
create table if not exists public.lms_curriculum_month_overrides (
  month_id text primary key,
  track_id text not null,
  semester_id text not null,
  label text not null default '',
  title text not null default '',
  summary text not null default '',
  phase text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists lms_curriculum_month_track_idx
  on public.lms_curriculum_month_overrides (track_id, semester_id, month_id);

alter table public.lms_curriculum_month_overrides enable row level security;

drop policy if exists "Month overrides public read" on public.lms_curriculum_month_overrides;
create policy "Month overrides public read"
on public.lms_curriculum_month_overrides for select
to anon, authenticated
using (true);

drop policy if exists "Month overrides admin insert" on public.lms_curriculum_month_overrides;
create policy "Month overrides admin insert"
on public.lms_curriculum_month_overrides for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Month overrides admin update" on public.lms_curriculum_month_overrides;
create policy "Month overrides admin update"
on public.lms_curriculum_month_overrides for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Month overrides admin delete" on public.lms_curriculum_month_overrides;
create policy "Month overrides admin delete"
on public.lms_curriculum_month_overrides for delete
to authenticated
using (public.is_lms_admin());

create table if not exists public.lms_curriculum_week_overrides (
  week_id text primary key,
  track_id text not null,
  semester_id text not null,
  month_id text not null,
  title text not null default '',
  objective text not null default '',
  type text not null default '',
  video_url text not null default '',
  resources jsonb not null default '[]'::jsonb,
  updated_by text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.lms_curriculum_week_overrides
  add column if not exists video_urls jsonb not null default '[]'::jsonb;

alter table public.lms_curriculum_week_overrides
  add column if not exists resource_items jsonb not null default '[]'::jsonb;

create index if not exists lms_curriculum_week_track_idx
  on public.lms_curriculum_week_overrides (track_id, semester_id, month_id, week_id);

alter table public.lms_curriculum_week_overrides enable row level security;

drop policy if exists "Week overrides public read" on public.lms_curriculum_week_overrides;
create policy "Week overrides public read"
on public.lms_curriculum_week_overrides for select
to anon, authenticated
using (true);

drop policy if exists "Week overrides admin insert" on public.lms_curriculum_week_overrides;
create policy "Week overrides admin insert"
on public.lms_curriculum_week_overrides for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Week overrides admin update" on public.lms_curriculum_week_overrides;
create policy "Week overrides admin update"
on public.lms_curriculum_week_overrides for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Week overrides admin delete" on public.lms_curriculum_week_overrides;
create policy "Week overrides admin delete"
on public.lms_curriculum_week_overrides for delete
to authenticated
using (public.is_lms_admin());

create table if not exists public.lms_semester_resources (
  track_id text not null,
  semester_id text not null,
  resource_links jsonb not null default '[]'::jsonb,
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  primary key (track_id, semester_id)
);

create index if not exists lms_semester_resources_track_idx
on public.lms_semester_resources (track_id, semester_id);

alter table public.lms_semester_resources enable row level security;

drop policy if exists "Semester resources public read" on public.lms_semester_resources;
create policy "Semester resources public read"
on public.lms_semester_resources for select
to anon, authenticated
using (true);

drop policy if exists "Semester resources admin insert" on public.lms_semester_resources;
create policy "Semester resources admin insert"
on public.lms_semester_resources for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Semester resources admin update" on public.lms_semester_resources;
create policy "Semester resources admin update"
on public.lms_semester_resources for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Semester resources admin delete" on public.lms_semester_resources;
create policy "Semester resources admin delete"
on public.lms_semester_resources for delete
to authenticated
using (public.is_lms_admin());

-- ---------------------------------------------------------------------------
-- Public learner profiles
-- These are non-sensitive learner records used for admin management and for
-- syncing learner-facing profile details into the LMS.
-- ---------------------------------------------------------------------------
create table if not exists public.lms_public_profiles (
  email text primary key,
  first_name text not null default '',
  last_name text not null default '',
  track_id text not null default '',
  timezone text not null default 'Africa/Lagos',
  headline text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  is_active boolean not null default true,
  managed_note text not null default '',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lms_public_profiles_track_active_idx
  on public.lms_public_profiles (track_id, is_active, updated_at desc);

alter table public.lms_public_profiles enable row level security;

drop policy if exists "Public profiles admin read" on public.lms_public_profiles;
create policy "Public profiles admin read"
on public.lms_public_profiles for select
to authenticated
using (public.is_lms_admin());

drop policy if exists "Public profiles admin insert" on public.lms_public_profiles;
create policy "Public profiles admin insert"
on public.lms_public_profiles for insert
to authenticated
with check (public.is_lms_admin());

drop policy if exists "Public profiles admin update" on public.lms_public_profiles;
create policy "Public profiles admin update"
on public.lms_public_profiles for update
to authenticated
using (public.is_lms_admin())
with check (public.is_lms_admin());

drop policy if exists "Public profiles admin delete" on public.lms_public_profiles;
create policy "Public profiles admin delete"
on public.lms_public_profiles for delete
to authenticated
using (public.is_lms_admin());

create or replace function public.get_lms_public_profile(profile_email text)
returns table (
  email text,
  first_name text,
  last_name text,
  track_id text,
  timezone text,
  headline text,
  bio text,
  avatar_url text,
  is_active boolean,
  managed_note text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.email,
    p.first_name,
    p.last_name,
    p.track_id,
    p.timezone,
    p.headline,
    p.bio,
    p.avatar_url,
    p.is_active,
    p.managed_note,
    p.updated_at
  from public.lms_public_profiles as p
  where lower(p.email) = lower(profile_email)
  limit 1;
$$;

grant execute on function public.get_lms_public_profile(text) to anon, authenticated;

create or replace function public.upsert_lms_public_profile(
  profile_email text,
  profile_first_name text,
  profile_last_name text,
  profile_track_id text,
  profile_timezone text,
  profile_headline text,
  profile_bio text,
  profile_avatar_url text,
  profile_last_seen_at timestamptz default null
)
returns table (
  email text,
  first_name text,
  last_name text,
  track_id text,
  timezone text,
  headline text,
  bio text,
  avatar_url text,
  is_active boolean,
  managed_note text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with upserted as (
    insert into public.lms_public_profiles as profile_record (
      email,
      first_name,
      last_name,
      track_id,
      timezone,
      headline,
      bio,
      avatar_url,
      last_seen_at,
      updated_at
    )
    values (
      lower(profile_email),
      coalesce(profile_first_name, ''),
      coalesce(profile_last_name, ''),
      coalesce(profile_track_id, ''),
      coalesce(profile_timezone, 'Africa/Lagos'),
      coalesce(profile_headline, ''),
      coalesce(profile_bio, ''),
      coalesce(profile_avatar_url, ''),
      profile_last_seen_at,
      now()
    )
    on conflict on constraint lms_public_profiles_pkey do update
    set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      track_id = case
        when coalesce(excluded.track_id, '') = '' then profile_record.track_id
        else excluded.track_id
      end,
      timezone = excluded.timezone,
      headline = excluded.headline,
      bio = excluded.bio,
      avatar_url = excluded.avatar_url,
      last_seen_at = coalesce(excluded.last_seen_at, profile_record.last_seen_at),
      updated_at = now()
    returning
      profile_record.email,
      profile_record.first_name,
      profile_record.last_name,
      profile_record.track_id,
      profile_record.timezone,
      profile_record.headline,
      profile_record.bio,
      profile_record.avatar_url,
      profile_record.is_active,
      profile_record.managed_note,
      profile_record.updated_at
  )
  select
    upserted.email,
    upserted.first_name,
    upserted.last_name,
    upserted.track_id,
    upserted.timezone,
    upserted.headline,
    upserted.bio,
    upserted.avatar_url,
    upserted.is_active,
    upserted.managed_note,
    upserted.updated_at
  from upserted;
$$;

grant execute on function public.upsert_lms_public_profile(text, text, text, text, text, text, text, text, timestamptz) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Community attachment storage
-- Learners can upload and read files, while delete/update is now restricted to
-- authenticated admins.
-- ---------------------------------------------------------------------------
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

drop policy if exists "Community attachments admin update" on storage.objects;
create policy "Community attachments admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'community-attachments' and public.is_lms_admin())
with check (bucket_id = 'community-attachments' and public.is_lms_admin());

drop policy if exists "Community attachments admin delete" on storage.objects;
create policy "Community attachments admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'community-attachments' and public.is_lms_admin());
