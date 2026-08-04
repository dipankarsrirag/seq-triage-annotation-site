# Triage Acuity Annotation Site

A small web app for two clinicians to independently annotate ESI acuity on a
sample of 50 simulated nurse-patient triage conversations, with a
defer-or-commit checkpoint flow (k = 4, 8, 12, 16, 20, 24 utterances) followed
by a full-conversation review.

## How the exercise works

For each conversation, the clinician sees the transcript grow in chunks of
4 combined nurse+patient utterances. At every chunk they either:

- **Defer** to see more of the conversation, or
- **Commit** an ESI 1-5 acuity label.

Once they commit (or defer all the way through), they see the **entire**
conversation and are asked if they'd like to change their answer. If they
change it, they must click the specific patient line that changed their mind.

Ground truth acuity and all model metadata are bundled in the data file for
later analysis but are never shown in the UI.

## One-time setup

### 1. Regenerate the sample (already done, only needed if you want a different sample)

```bash
cd ..   # repo root
python3 scripts/sample_conversations.py
```

This writes `annotation-site/data/sample_conversations.json` (50 conversations,
10 per ground-truth acuity level, seed 42).

### 2. Create a Supabase project

1. Go to https://supabase.com and create a free project.
2. Open the SQL editor and run the contents of `supabase/schema.sql`.
3. Under Project Settings > API, copy the **Project URL** and the **anon public key**.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `NEXT_PUBLIC_CLINICIANS` — comma-separated names of the two clinicians, e.g.
  `Dr. Alice Smith,Dr. Bob Lee`. These are the only two identities the app
  will let someone pick from on the landing page.

### 4. Install and run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000, pick a clinician name, and walk through a
conversation to confirm everything works before deploying.

### 5. Deploy to Vercel

1. Push this repo to GitHub (if not already).
2. Go to https://vercel.com, "New Project", import the repo, and set the
   **root directory** to `annotation-site`.
3. Add the same three environment variables from `.env.local` in the Vercel
   project settings.
4. Deploy. Share the resulting URL with the two clinicians.

## Data & privacy notes

- The Supabase table `annotations` uses a permissive row-level-security
  policy (`using (true)`) since this is a small trusted two-person tool
  behind an unlisted URL, not a public product. Anyone with the URL and the
  anon key could read or write rows. Don't reuse this policy for anything
  more sensitive.
- There is no real authentication — a clinician "logs in" by picking their
  name from the fixed list in `NEXT_PUBLIC_CLINICIANS`. This is enough to
  key their annotations and support resuming a session (their progress is
  looked up in Supabase by name), but it does not prevent someone from
  picking the other clinician's name.

## Analyzing results

Query the `annotations` table directly in Supabase (or export via `pg_dump` /
the table editor's CSV export). Each row has:

- `committed_at_k` — the checkpoint at which they first committed a label
  (null if they deferred through the whole conversation)
- `deferred_ks` — which checkpoints they deferred at
- `initial_acuity` / `final_acuity` — first commit vs. final answer
- `changed`, `change_turn`, `change_utterance_text` — whether/where they
  changed their mind after seeing the full conversation

Join `conversation_id` back against `data/sample_conversations.json` (which
also includes `ground_truth_acuity`) to score accuracy.
