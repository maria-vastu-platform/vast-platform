-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES Table (Extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  name text,
  role text default 'student',
  avatar_url text,
  kohorte text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login timestamp with time zone
);

-- 1.5. TRIGGER FOR NEW USERS
-- Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. WEEKS (Modules) Table
create table if not exists public.weeks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  order_index integer not null default 0,
  available_from timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. DAYS (Lektionen) Table
create table if not exists public.days (
  id uuid default uuid_generate_v4() primary key,
  week_id uuid references public.weeks(id) on delete cascade not null,
  title text not null,
  description text,
  homework_description text,
  video_url text,
  rutube_url text,
  date timestamp with time zone,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. MATERIALS Table
create table if not exists public.materials (
  id uuid default uuid_generate_v4() primary key,
  week_id uuid references public.weeks(id) on delete cascade not null,
  day_id uuid references public.days(id) on delete cascade,
  title text not null,
  type text not null,
  url text not null,
  is_homework boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. USER PROGRESS Table
create table if not exists public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day_id uuid references public.days(id) on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, day_id)
);

-- 6. REVIEWS Table
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  review_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. LIBRARY ITEMS Table
create table if not exists public.library_items (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text not null,
  file_url text not null,
  description text,
  file_type text,
  is_master_file boolean default false,
  available_from timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. LIVE STREAMS Table
create table if not exists public.live_streams (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  date timestamp with time zone not null,
  video_url text,
  vimeo_url text,
  rutube_url text,
  audio_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. STREAM AUDIO Table
create table if not exists public.stream_audio (
  id uuid default uuid_generate_v4() primary key,
  stream_id uuid references public.live_streams(id) on delete cascade not null,
  audio_url text not null,
  duration text,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. STREAM COMMENTS Table
create table if not exists public.stream_comments (
  id uuid default uuid_generate_v4() primary key,
  stream_id uuid references public.live_streams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  "userName" text,
  "userAvatar" text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STORAGE BUCKETS SETUP
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('library_files', 'library_files', false, 52428800, null),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/*']),
  ('course-content', 'course-content', true, null, null)
on conflict (id) do update set 
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- PERMISSIVE RLS POLICIES FOR ALL TABLES (To be restricted later)
alter table public.profiles enable row level security;
create policy "Enable full access for all users" on public.profiles for all using (true) with check (true);

alter table public.weeks enable row level security;
create policy "Enable full access for all users" on public.weeks for all using (true) with check (true);

alter table public.days enable row level security;
create policy "Enable full access for all users" on public.days for all using (true) with check (true);

alter table public.materials enable row level security;
create policy "Enable full access for all users" on public.materials for all using (true) with check (true);

alter table public.user_progress enable row level security;
create policy "Enable full access for all users" on public.user_progress for all using (true) with check (true);

alter table public.reviews enable row level security;
create policy "Enable full access for all users" on public.reviews for all using (true) with check (true);

alter table public.library_items enable row level security;
create policy "Enable full access for all users" on public.library_items for all using (true) with check (true);

alter table public.live_streams enable row level security;
create policy "Enable full access for all users" on public.live_streams for all using (true) with check (true);

alter table public.stream_audio enable row level security;
create policy "Enable full access for all users" on public.stream_audio for all using (true) with check (true);

alter table public.stream_comments enable row level security;
create policy "Enable full access for all users" on public.stream_comments for all using (true) with check (true);

-- STORAGE SECURITY POLICIES
create policy "Public access to avatars" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Upload avatars" on storage.objects for insert with check ( bucket_id = 'avatars' );

create policy "Allowed to view library files" on storage.objects for select using ( bucket_id = 'library_files' );
create policy "Allowed to upload library files" on storage.objects for insert with check ( bucket_id = 'library_files' );

