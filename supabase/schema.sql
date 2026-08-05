-- Run this once in the Supabase SQL editor for your project.

create table if not exists annotations (
  id bigint generated always as identity primary key,
  clinician text not null,
  conversation_id text not null,
  total_utterances int,             -- capped conversation length (denominator for the *_pct columns)
  committed_at_k int,               -- null if forced full-reveal commit (deferred through all views)
  committed_at_pct int,             -- committed_at_k as a percentage of total_utterances; null alongside committed_at_k
  deferred_ks int[] not null default '{}',
  deferred_pcts int[] not null default '{}',  -- deferred_ks as percentages of total_utterances, same order
  initial_acuity int,               -- null if forced full-reveal commit
  final_acuity int not null,
  changed boolean not null default false,
  change_turn int,                  -- 1-indexed position among nurse/patient utterances (not the raw dialogue "turn" field, which is shared by a nurse/patient exchange pair)
  change_pct int,                   -- change_turn as a percentage of total_utterances
  change_utterance_text text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (clinician, conversation_id)
);

-- Safe to re-run against an existing table (e.g. the already-deployed
-- project): adds the absolute/percentage logging columns if missing.
alter table annotations add column if not exists total_utterances int;
alter table annotations add column if not exists committed_at_pct int;
alter table annotations add column if not exists deferred_pcts int[] not null default '{}';
alter table annotations add column if not exists change_pct int;

alter table annotations enable row level security;

-- Permissive policy: this is a small, trusted, two-clinician tool behind an
-- unlisted URL. There is no real per-user auth, so anyone with the anon key
-- (i.e. anyone with the deployed URL) can read/write all rows. Do not use
-- this policy for anything beyond this internal exercise.
create policy "anon full access" on annotations
  for all
  using (true)
  with check (true);
