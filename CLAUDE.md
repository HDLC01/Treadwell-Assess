# Treadwell Assess — CLAUDE.md

## What this is
A standalone hiring-assessment platform in the style of the Predictive Index: employers
define a **Job Target** (ideal ranges on four behavioral factors + a cognitive target),
send candidates a **tokenized assessment link** (no login), candidates take a
**Behavioral** assessment (free-choice adjective checklist, two prompts) and a timed
**Cognitive** test, and the employer reviews a **Candidates** dashboard (Behavioral Fit
stars, Reference Profile, pattern sparkline, Cognitive Fit) with per-candidate reports
and **Download/Email PDF reports**.

## HARD IP CONSTRAINT — original content only
The Predictive Index's 86-word adjective list, scoring weights, 17 reference-profile
names/descriptions, and cognitive items are **proprietary/trademarked. NEVER copy them.**
This product uses:
  - our ORIGINAL adjective bank (`backend/seed/data.py`) mapped to the public **DISC**
    model — factors A Dominance / B Influence / C Steadiness / D Conscientiousness
  - our OWN scoring (σ-style scores vs a calibratable baseline; see services/)
  - ORIGINAL reference-profile archetypes (Trailblazer, Catalyst, … — ours, not PI's)
  - an ORIGINAL cognitive item bank
UI shows: "Independent assessment — not affiliated with The Predictive Index."

## SEPARATE SYSTEM — hard boundary
Standalone project, own git repo, own subdomain, own dockerized Postgres, own containers
+ nginx server block. It does NOT import from or deploy with the other Treadwell systems
(proposal tool / news feed / roadmap / main app). Proven patterns may be COPIED, never
imported. Shares only the physical VPS (50.6.110.215).

- **Subdomain (target):** assess.wetreadwell.com  ·  **VPS dir (target):** /opt/treadwell-assess
- **Port map:** web (Next.js) `127.0.0.1:8896` · api (FastAPI) `127.0.0.1:8897` ·
  local-dev Postgres `127.0.0.1:5434`  (8888 proposal · 8890 newsfeed · 8892 roadmap ·
  8894 connector are taken)

## Golden rules
- **TEST LOCALLY FIRST.** Never push to GitHub or deploy to the VPS until it runs + passes
  local smoke tests AND Hanz has given the go-ahead.
- Candidate-facing flow is **tokenized-link only** (no login). Employer side has auth
  (Supabase Google sign-in, `@wetreadwell.com` only — reuses the proposal tool's shared
  Supabase project, AUTH ONLY; data stays in our Postgres). One `auth_gate` middleware
  gates every `/api/*` except the candidate flow (`/api/assess/*`), health, and
  `/api/public-config`. The gate is a **no-op until Supabase keys are set**, so the API
  stays open in local dev (`settings.auth_enabled`).
- Destructive actions need confirm dialogs; lists paginate at 25/page (house rules).

## Core model (Postgres)
- `jobs` — role being hired for; `behavioral_target` (per-factor low/high σ JSON for
  A/B/C/D), `cognitive_target` (min score). `assessment_links` — token + expiry per job.
- `candidates` — belongs to a job (name/email captured at start of assessment).
- `adjectives` — the original word bank (word, factor A|B|C|D, direction +1|-1).
- `behavioral_results` — selected word ids for checklist1 (expected/Self-Concept) and
  checklist2 (real you/Self) + computed σ per factor for self / self_concept / synthesis
  + matched `reference_profile_id`.
- `reference_profiles` — original archetypes; matched by nearest ideal factor vector.
- `cognitive_items` (original bank) / `cognitive_results` (raw, scaled, status).

## Scoring (backend/services/ — the heart; keep deterministic + calibratable)
- `behavioral_scorer.py` — per checklist, per factor: (+) words minus (−) words,
  normalized by selection volume → σ in [-3,+3]. Self = checklist2, Self-Concept =
  checklist1, Synthesis = mean. Constants in `config.py` (`SCORE_SCALE`), calibratable
  from real data later (ML).
- `profile_matcher.py` — nearest reference-profile ideal vector (Euclidean) on Synthesis.
- `cognitive_scorer.py` — picks the items a token administers (deterministic per-token
  shuffle, capped at `COGNITIVE_NUM_ITEMS`; rebuilt server-side on submit so the
  denominator can't be gamed), grades vs the hidden answer keys → raw (correct count)
  + scaled score on an original 0–`COGNITIVE_SCALE_MAX` normed scale (calibratable).
- `fit_calculator.py` — per factor: in target range = 1.0 else linear falloff over 1σ;
  average → 0–5 **Behavioral Fit** stars. Cognitive: scaled score vs target →
  strong/moderate/low (None when the job has no target); `expired` = timer ran out.

## Run locally
- DB:       `docker compose up -d db`     (Postgres on 127.0.0.1:5434)
- Backend:  `cd backend && uv run uvicorn main:app --reload --port 8897`
  (migrations + seed run automatically on startup; seed is insert-only)
- Frontend: `cd frontend && npm run dev`  (Next.js on :3000, rewrites /api → :8897)
- Dev bootstrap seeds a demo job + assessment link token `demo` in development, so
  `GET /api/assess/demo` works immediately.

## Status / phases (per the approved plan)
1. ✅ Foundation: schema, seed (adjective bank + profiles), scoring engine, token flow
2. ✅ Employer side: jobs CRUD, Job Target UI, Candidates table, **auth** (Supabase Google
   sign-in gate + `/api/me`; `auth_supabase.py`, `routers/auth.py`, frontend `lib/auth.tsx`
   / `RequireAuth` / `/login`; tested via `backend/auth_test.py`). Deploy TODO: add the
   `/hire` redirect URLs to the shared Supabase + Google OAuth config (Phase 5).
3. ✅ Cognitive test (timed) + cognitive fit: original 24-item bank (numerical/verbal/
   abstract), `GET/POST /assess/{token}/cognitive` (answer keys never leave the server),
   `cognitive_scorer.py`, timed one-question-at-a-time UI w/ auto-submit at zero. Admin
   policy: administered to **every** candidate (score captured even without a target).
   Config: `COGNITIVE_NUM_ITEMS=20`, `COGNITIVE_TIME_LIMIT_SEC=600`, `COGNITIVE_SCALE_MAX=30`.
   Tested via `backend/cognitive_test.py`.
4. ✅ Candidate detail + reports: per-candidate report page (`/hire/[jobId]/candidate/
   [candidateId]`) with a DISC radar (`RadarChart`), cognitive donut (`CognitiveGauge`),
   and a per-archetype emblem (`ArchetypeIcon` — 17 themed monoline SVG glyphs by slug,
   also shown on the dashboard table + candidate completion screen);
   `GET /candidates/{id}/report` (JSON), `/report.pdf` (fpdf2 via `report_pdf.py`, fetched
   as a blob WITH the bearer header), `POST /candidates/{id}/email` (`email_sender.py`,
   env-SMTP, graceful 503 until configured). Deploy TODO: set SMTP_* to enable live email.
5. ⏳ Polish + deploy (Docker → nginx → certbot → assess.wetreadwell.com)  ← NEXT

## Display convention — DISC letters
Internal factor keys stay **A/B/C/D** everywhere (DB JSON, scoring, `behavioral_target`),
but the UI + PDF show the public **DISC** letters: Dominance→**D**, Influence→**I**,
Steadiness→**S**, Conscientiousness→**C**. Map: `DISC_LETTER` (frontend `lib/api.ts`,
backend `report_pdf.py`). Never rename the keys — only the displayed letter.
