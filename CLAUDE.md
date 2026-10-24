# Treadwell Assess — CLAUDE.md

## What this is

A standalone hiring-assessment platform. Employers define a Job Target, issue a
tokenized candidate link, and review behavioral/cognitive reports. Candidates do not
need a login; the employer experience is restricted to authorized Treadwell staff.

This project is independent of all other Treadwell systems: its own repository, Postgres
database, web/API containers, nginx config, and `assess.wetreadwell.com` target. Do not
import sibling source code. Copy a proven pattern only after adapting it locally.

## Non-negotiable IP and interpretation rules

- Do **not** copy Predictive Index adjective lists, item banks, scoring weights,
  reference-profile names/descriptions, or branded language.
- The product uses its own adjective bank, original reference archetypes, original
  cognitive questions, and deterministic/calibratable scoring mapped to the public DISC
  model. It must remain visibly independent and unaffiliated with Predictive Index.
- Internal keys are `A/B/C/D`; they stay stable in storage and scoring. The UI/PDF show
  the public DISC labels D/I/S/C. Do not rename stored factor keys to presentation labels.
- Results are sensitive. Never add a feature that ranks or compares multiple candidates'
  private assessment results.

## Current implementation — verified from source on 2026-07-22

- Backend: FastAPI + Postgres 16, migrations `001_core` through `004_candidate_skills_
  software`, original data seed, and deterministic behavioral/cognitive/fit services.
- Frontend: Next.js 16 App Router + React 19 + Tailwind v4.
- Employer auth: shared Treadwell Supabase Google sign-in, domain-gated to
  `@wetreadwell.com`. The API's `auth_gate` bypasses only candidate assessment routes,
  health, and public configuration. Auth is deliberately a no-op in unconfigured local
  development.
- Candidate route: `/a/[token]`; token lifecycle is served by `/api/assess/{token}`.
- Employer UI: jobs, candidates, reports, reference profiles, notifications, and a
  floating assistant. Candidate reports additionally have public-share route scaffolding
  under `/r/[candidateId]`; preserve authorization and privacy checks when using it.
- Candidate self-reported `skills` and `software` are JSON arrays (migration 004), edited
  as chips during intake and surfaced in staff views.

## Core model and scoring

| Area | Contract |
|---|---|
| Jobs and links | `jobs` hold behavioral ranges and optional cognitive target; `assessment_links` hold expiring tokens. |
| Candidate flow | `candidates` capture identity; behavioral results store two adjective selections plus self, self-concept, synthesis, and reference profile. |
| Cognitive | Item answer keys never leave the server. The server reconstructs deterministic per-token item order and scoring on submission. |
| Behavioral fit | Each factor is fully matched in target range, then falls off linearly over one sigma. Mean factor score becomes 0–5 stars. |
| Cognitive fit | Original raw score maps to a configurable scale; fit is strong/moderate/low or absent if the job has no target. |
| Reports | JSON report, FPDF2 PDF, and optional SMTP delivery. Email remains a graceful 503 until `SMTP_*` is configured. |

`backend/services/behavioral_scorer.py`, `cognitive_scorer.py`, `profile_matcher.py`,
and `fit_calculator.py` are the scoring core. Keep them deterministic, transparent, and
calibratable; do not move scoring authority to the browser or an LLM.

## Admin AI assistant privacy boundary

`backend/routers/assistant.py` calls local `claude -p` only for authorized employers.
It builds a data-minimized context:

- Aggregate job/candidate status and a status-only roster are allowed.
- Full results may be loaded only when a request names exactly one candidate.
- Results must never be ranked or compared across candidates.
- Free text is scrubbed and fenced as untrusted data; candidate-result turns are redacted
  from model-visible follow-up history to preserve the one-candidate invariant.
- Conversations are owner-scoped in Postgres and paginated at 25.

Do not weaken these controls for convenience or prompt changes.

## Code map

| Location | Responsibility |
|---|---|
| `backend/main.py`, `config.py`, `db.py` | App boot, auth gate, settings, DB connection/lifecycle. |
| `backend/routers/assessment.py` | Public token, behavioral, and timed cognitive flow. |
| `backend/routers/jobs.py` | Employer jobs, links, candidates, reports, notifications, and report email. |
| `backend/routers/assistant.py` | Privacy-bounded staff analysis chat. |
| `backend/seed/data.py` | Original adjectives, cognitive items, and reference profiles. |
| `frontend/app/a/` | Candidate assessment UX. |
| `frontend/app/hire/`, `candidates/`, `reference/` | Employer dashboards and reports. |
| `frontend/app/components/` | Charts, reference icons, confirm dialog, assistant panel, and auth UI. |

## Local development and verification

```powershell
# project root
docker compose up -d db

cd backend
uv run uvicorn main:app --reload --port 8897

cd ..\frontend
npm run dev
npm run lint
```

Development startup applies migrations and runs insert-only seed data. The dev bootstrap
provides the `demo` assessment token when configured for development. Useful focused
backend checks are `auth_test.py`, `cognitive_test.py`, `report_test.py`, and
`smoke_test.py`.

## Deploy and working rules

- Production topology is web `127.0.0.1:8896`, API `127.0.0.1:8897`, and internal
  Postgres. nginx sends `/` to Next.js and `/api` to FastAPI. `ops/README.md` is the
  operational command reference.
- Deploy images with the repository's off-box `deploy/ship.sh`; do not casually build on
  the constrained VPS. Deployment still requires local smoke tests and Hanz's approval.
- Keep secrets out of git: Postgres credentials, Supabase settings, Claude credentials,
  SMTP credentials, and VPS details belong only in private environment configuration.
- Destructive actions use confirmation dialogs; all lists paginate at 25.
