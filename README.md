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
- `AUTH_USERS` — **server-only** (do not prefix with `NEXT_PUBLIC_`), a JSON
  array of login accounts, e.g.:
  ```json
  [
    {"username": "clinician1", "password": "...", "displayName": "Dr. Alice Smith", "role": "clinician"},
    {"username": "clinician2", "password": "...", "displayName": "Dr. Bob Lee", "role": "clinician"},
    {"username": "admin", "password": "...", "role": "admin", "displayName": "Admin (test)"}
  ]
  ```
  `displayName` is what gets stored as the `clinician` value in Supabase and
  shown in the UI. `role` is `"clinician"` or `"admin"`.
- `SESSION_SECRET` — **server-only**, a random secret used to sign session
  cookies. Generate one with `openssl rand -hex 32`.

### 4. Install and run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000, sign in with one of the accounts from
`AUTH_USERS`, and walk through a conversation to confirm everything works
before deploying.

### 5. Deploy to Vercel

1. Push this repo to GitHub (if not already).
2. Go to https://vercel.com, "New Project", import the repo. Framework
   preset must be **Next.js** (Vercel should auto-detect this from
   `package.json`/`next.config.js` at the repo root).
3. Add the same four environment variables from `.env.local` in the Vercel
   project settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `AUTH_USERS`, `SESSION_SECRET`).
4. Deploy. Share the resulting URL and each clinician's own username/password
   with them individually.

## Authentication & admin mode

Sign-in is username/password (checked against `AUTH_USERS`), not a plain
name picker. On success the server sets a signed, `httpOnly` session cookie
(HMAC-SHA256 over the user's role/display name, verified on every request to
`/annotate` and `/admin` by `middleware.ts`). There's no user database or
password hashing — this is a lightweight gate appropriate for a small,
short-lived internal exercise, not a general-purpose auth system.

The `admin` role gets:
- Its own login that goes through the exact same annotation flow at
  `/annotate`, saved under a separate `displayName` (e.g. "Admin (test)") so
  test runs never mix with real clinician rows.
- A dashboard at `/admin` showing each clinician's completed count out of 50,
  a full table of all saved annotations, and a **Reset progress** button per
  clinician (deletes all of that clinician's rows after a confirmation
  prompt) — useful for re-running a test pass without touching Supabase
  directly.

## Data & privacy notes

- The Supabase table `annotations` uses a permissive row-level-security
  policy (`using (true)`) since this is a small trusted tool behind an
  unlisted URL, not a public product. Anyone with the Supabase URL and the
  anon key could read or write rows directly (bypassing the app's login
  entirely). Don't reuse this policy for anything more sensitive.
- Session cookies are signed but not encrypted — don't put anything
  sensitive in `AUTH_USERS` beyond what you're comfortable having readable
  server-side (it's never sent to the client).

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
