-- Run this once in the Supabase SQL editor for your project.

create table if not exists annotations (
  id bigint generated always as identity primary key,
  clinician text not null,
  conversation_id text not null,
  committed_at_k int,               -- null if forced full-reveal commit (deferred through all views)
  deferred_ks int[] not null default '{}',
  initial_acuity int,               -- null if forced full-reveal commit
  final_acuity int not null,
  changed boolean not null default false,
  change_turn int,                  -- 1-indexed position among nurse/patient utterances (not the raw dialogue "turn" field, which is shared by a nurse/patient exchange pair)
  change_utterance_text text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (clinician, conversation_id)
);

alter table annotations enable row level security;

-- Permissive policy: this is a small, trusted, two-clinician tool behind an
-- unlisted URL. There is no real per-user auth, so anyone with the anon key
-- (i.e. anyone with the deployed URL) can read/write all rows. Do not use
-- this policy for anything beyond this internal exercise.
create policy "anon full access" on annotations
  for all
  using (true)
  with check (true);
