-- 001_core.sql — Treadwell Assess foundation schema. Idempotent.
-- Factors: A=Dominance, B=Influence, C=Steadiness, D=Conscientiousness (public DISC model).

create extension if not exists pgcrypto;  -- gen_random_uuid

-- ── employers (auth lands in Phase 2; table exists now for FKs/audit) ─────────
create table if not exists users (
    id            uuid primary key default gen_random_uuid(),
    email         text not null unique,
    full_name     text,
    role          text not null default 'admin',          -- admin | viewer
    created_at    timestamptz not null default now()
);

-- ── jobs (a role being hired for) ─────────────────────────────────────────────
create table if not exists jobs (
    id                 uuid primary key default gen_random_uuid(),
    name               text not null,
    folder             text,
    status             text not null default 'open',       -- open | closed
    -- per-factor ideal range in sigma: {"A":{"low":0.5,"high":2.0}, "B":..., "C":..., "D":...}
    behavioral_target  jsonb,
    cognitive_target   integer,                            -- min scaled score (null = none)
    created_by         uuid references users(id) on delete set null,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

-- ── tokenized assessment links (candidates need no login) ────────────────────
create table if not exists assessment_links (
    id          uuid primary key default gen_random_uuid(),
    job_id      uuid not null references jobs(id) on delete cascade,
    token       text not null unique,
    expires_at  timestamptz,                               -- null = never expires
    created_at  timestamptz not null default now()
);
create index if not exists idx_links_job on assessment_links(job_id);

-- ── candidates ────────────────────────────────────────────────────────────────
create table if not exists candidates (
    id          uuid primary key default gen_random_uuid(),
    job_id      uuid not null references jobs(id) on delete cascade,
    link_id     uuid references assessment_links(id) on delete set null,
    full_name   text not null,
    email       text,
    bookmarked  boolean not null default false,
    created_at  timestamptz not null default now()
);
create index if not exists idx_candidates_job on candidates(job_id);

-- ── the ORIGINAL adjective bank (never PI's words) ───────────────────────────
create table if not exists adjectives (
    id         serial primary key,
    word       text not null unique,
    factor     text not null check (factor in ('A','B','C','D')),
    direction  smallint not null check (direction in (1,-1)),  -- +1 high-factor, -1 low-factor
    active     boolean not null default true
);

-- ── original reference profiles (matched by nearest ideal vector) ───────────
create table if not exists reference_profiles (
    id           serial primary key,
    slug         text not null unique,
    name         text not null,
    tagline      text not null,                -- one-line archetype descriptor
    description  text not null,                -- short paragraph (original copy)
    ideal_a      real not null,                -- ideal sigma vector
    ideal_b      real not null,
    ideal_c      real not null,
    ideal_d      real not null
);

-- ── behavioral results ───────────────────────────────────────────────────────
create table if not exists behavioral_results (
    id                    uuid primary key default gen_random_uuid(),
    candidate_id          uuid not null references candidates(id) on delete cascade,
    checklist1_word_ids   integer[] not null,   -- prompt 1: "how others expect you to act"
    checklist2_word_ids   integer[] not null,   -- prompt 2: "the real you"
    -- computed sigma per factor for each view: {"A":1.2,"B":-0.4,"C":0.1,"D":-1.0}
    self_scores           jsonb not null,       -- from checklist 2 (natural)
    self_concept_scores   jsonb not null,       -- from checklist 1 (adapting)
    synthesis_scores      jsonb not null,       -- mean of the two
    reference_profile_id  integer references reference_profiles(id) on delete set null,
    created_at            timestamptz not null default now()
);
create index if not exists idx_behavioral_candidate on behavioral_results(candidate_id);

-- ── original cognitive item bank + results (Phase 3 fills the bank) ──────────
create table if not exists cognitive_items (
    id         serial primary key,
    item_type  text not null check (item_type in ('numerical','verbal','abstract')),
    prompt     text not null,
    options    jsonb not null,                  -- ["a","b","c","d"]
    answer     smallint not null,               -- index into options
    active     boolean not null default true,
    is_sample  boolean not null default false
);

create table if not exists cognitive_results (
    id            uuid primary key default gen_random_uuid(),
    candidate_id  uuid not null references candidates(id) on delete cascade,
    answers       jsonb not null,               -- [{"item_id":1,"chosen":2}, ...]
    raw_score     integer not null,
    scaled_score  integer not null,
    status        text not null default 'complete',   -- complete | expired
    created_at    timestamptz not null default now()
);
create index if not exists idx_cognitive_candidate on cognitive_results(candidate_id);

-- ── updated_at trigger for jobs ───────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

do $$ begin
    if not exists (select 1 from pg_trigger where tgname = 'jobs_updated_at') then
        create trigger jobs_updated_at before update on jobs
            for each row execute function set_updated_at();
    end if;
end $$;
