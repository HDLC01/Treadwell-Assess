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
- Candidate-facing flow is **tokenized-link only** (no login). Employer side gets auth
  (Google sign-in reuse — Phase 2; the API is open in local dev until then).
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
- `fit_calculator.py` — per factor: in target range = 1.0 else linear falloff over 1σ;
  average → 0–5 **Behavioral Fit** stars. Cognitive: score vs target → strong/moderate/low,
  or `expired` via the link.

## Run locally
- DB:       `docker compose up -d db`     (Postgres on 127.0.0.1:5434)
- Backend:  `cd backend && uv run uvicorn main:app --reload --port 8897`
  (migrations + seed run automatically on startup; seed is insert-only)
- Frontend: `cd frontend && npm run dev`  (Next.js on :3000, rewrites /api → :8897)
- Dev bootstrap seeds a demo job + assessment link token `demo` in development, so
  `GET /api/assess/demo` works immediately.

## Status / phases (per the approved plan)
1. ✅ Foundation: schema, seed (adjective bank + profiles), scoring engine, token flow
2. Employer side: auth, jobs CRUD, Job Target UI, Candidates table
3. Cognitive test (timed) + cognitive fit
4. Candidate detail + Download/Email PDF reports
5. Polish + deploy (Docker → nginx → certbot → assess.wetreadwell.com)
