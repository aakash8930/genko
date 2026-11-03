-- Initial learning schema, applied to the Sora Supabase project.
-- Content is public to read; learners may access only their own progress.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subject text not null,
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null check (position > 0),
  content jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  unique (course_id, position)
);
create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
create policy "Read published courses" on public.courses for select to anon, authenticated using (published);
create policy "Read published lessons in published courses" on public.lessons for select to anon, authenticated using (
  published and exists (select 1 from public.courses where courses.id = lessons.course_id and courses.published)
);
create policy "Read own progress" on public.lesson_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own progress" on public.lesson_progress for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.lessons where lessons.id = lesson_id)
);
create policy "Delete own progress" on public.lesson_progress for delete to authenticated using ((select auth.uid()) = user_id);
