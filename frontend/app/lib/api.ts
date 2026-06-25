// Client-side API helpers — same-origin /api (Next rewrites to the FastAPI backend).

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The auth provider pushes the current Supabase access token here so employer
// API calls carry `Authorization: Bearer …`. Candidate (/assess) routes are
// public, so the header is simply ignored there.
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const resp = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...auth, ...(init?.headers || {}) },
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail || detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(resp.status, detail);
  }
  return resp.json() as Promise<T>;
}

// ── types ──────────────────────────────────────────────────────────────────
export type Factor = "A" | "B" | "C" | "D";
export const FACTORS: Factor[] = ["A", "B", "C", "D"];

// Internal factor keys stay A/B/C/D (DB + scoring); the UI shows the public DISC
// letters: Dominance→D, Influence→I, Steadiness→S, Conscientiousness→C.
export const DISC_LETTER: Record<Factor, string> = { A: "D", B: "I", C: "S", D: "C" };

export interface FactorScore {
  factor: Factor;
  name: string;
  self: number;
  self_concept: number;
  synthesis: number;
  band: string;
}

export interface ReferenceProfile {
  slug: string;
  name: string;
  tagline: string;
  description?: string;
}

export interface AssessmentMeta {
  job_name: string;
  min_words: number;
  prompts: string[];
  words: { id: number; word: string }[];
}

export interface BehavioralResult {
  result_id: string;
  factors: FactorScore[];
  reference_profile: ReferenceProfile | null;
}

export interface CognitiveItem {
  id: number;
  item_type: "numerical" | "verbal" | "abstract";
  prompt: string;
  options: string[];
}

export interface CognitivePracticeItem extends CognitiveItem {
  answer: number; // practice items are unscored, so the key is sent for instant feedback
}

export interface CognitiveTest {
  time_limit_sec: number;
  num_items: number;
  items: CognitiveItem[];
  practice: CognitivePracticeItem[];
}

export interface CognitiveAnswer {
  item_id: number;
  chosen: number | null;
}

export interface CognitiveResult {
  ok: boolean;
  status: "complete" | "expired";
  num_items: number;
}

export type TargetRange = { low: number; high: number };
export type BehavioralTarget = Record<Factor, TargetRange>;

export interface JobSummary {
  id: string;
  name: string;
  folder: string | null;
  status: string;
  candidate_count: number;
  has_target: boolean;
  created_at: string;
}

export interface JobDetail {
  id: string;
  name: string;
  folder: string | null;
  status: string;
  behavioral_target: BehavioralTarget | null;
  cognitive_target: number | null;
  factor_names: Record<Factor, string>;
  key_characteristics: string[];
  matched_profiles: ReferenceProfile[];
  link_token: string | null;
  candidate_count: number;
}

export interface CandidateRow {
  id: string;
  full_name: string;
  email: string | null;
  bookmarked: boolean;
  behavioral_fit: number | null;
  profile_name: string | null;
  profile_slug: string | null;
  synthesis: Record<Factor, number> | null;
  assessed_at: string | null;
  cognitive_fit: string | null;
  cognitive_score: number | null;
  has_behavioral: boolean;
}

export interface CandidatesEnvelope {
  items: CandidateRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface BehavioralNarrative {
  summary: string;
  strongest: string[];
  strengths: string[];
  watch_outs: string[];
  working_with: string[];
  needs: string;
}

export interface BehavioralReportBlock {
  assessed_at: string;
  factors: FactorScore[];
  reference_profile: ReferenceProfile | null;
  fit_stars: number | null;
  narrative?: BehavioralNarrative;
}

export interface CognitiveReportBlock {
  taken_at: string;
  raw_score: number;
  scaled_score: number;
  num_items: number;
  status: "complete" | "expired";
  fit: string | null;
  interpretation?: string;
}

export interface CandidateReport {
  candidate: { id: string; full_name: string; email: string | null; bookmarked: boolean };
  job: {
    id: string;
    name: string;
    behavioral_target: BehavioralTarget | null;
    cognitive_target: number | null;
    factor_names: Record<Factor, string>;
    scale_max: number;
  };
  behavioral: BehavioralReportBlock | null;
  cognitive: CognitiveReportBlock | null;
}

// ── candidate flow ──────────────────────────────────────────────────────────
export const getAssessment = (token: string) => request<AssessmentMeta>(`/assess/${token}`);
export const startAssessment = (token: string, full_name: string, email: string) =>
  request<{ candidate_id: string }>(`/assess/${token}/start`, {
    method: "POST",
    body: JSON.stringify({ full_name, email: email || null }),
  });
export const submitBehavioral = (
  token: string,
  candidate_id: string,
  checklist1: number[],
  checklist2: number[],
) =>
  request<BehavioralResult>(`/assess/${token}/behavioral`, {
    method: "POST",
    body: JSON.stringify({
      candidate_id,
      checklist1_word_ids: checklist1,
      checklist2_word_ids: checklist2,
    }),
  });

export const getCognitive = (token: string, candidate_id: string) =>
  request<CognitiveTest>(`/assess/${token}/cognitive?candidate_id=${encodeURIComponent(candidate_id)}`);
export const submitCognitive = (
  token: string,
  candidate_id: string,
  answers: CognitiveAnswer[],
  expired: boolean,
) =>
  request<CognitiveResult>(`/assess/${token}/cognitive`, {
    method: "POST",
    body: JSON.stringify({ candidate_id, answers, expired }),
  });

// ── employer ────────────────────────────────────────────────────────────────
export const listJobs = () => request<{ jobs: JobSummary[] }>(`/jobs`);
export const createJob = (name: string, folder: string) =>
  request<{ id: string }>(`/jobs`, { method: "POST", body: JSON.stringify({ name, folder }) });
export const getJob = (id: string) => request<JobDetail>(`/jobs/${id}`);
export const updateJob = (id: string, patch: Partial<{ name: string; folder: string; status: string; behavioral_target: BehavioralTarget; cognitive_target: number | null }>) =>
  request<{ ok: boolean }>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
export const getOrCreateLink = (id: string) =>
  request<{ token: string }>(`/jobs/${id}/link`, { method: "POST" });
export const listCandidates = (id: string, params: { q?: string; min_fit?: number; page?: number }) => {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.min_fit != null) sp.set("min_fit", String(params.min_fit));
  if (params.page) sp.set("page", String(params.page));
  const qs = sp.toString();
  return request<CandidatesEnvelope>(`/jobs/${id}/candidates${qs ? `?${qs}` : ""}`);
};
export const patchCandidate = (id: string, patch: { bookmarked?: boolean }) =>
  request<{ ok: boolean }>(`/candidates/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
export const getCandidateReport = (id: string) =>
  request<CandidateReport>(`/candidates/${id}/report`);
export const emailReport = (id: string, to: string) =>
  request<{ ok: boolean; sent_to: string }>(`/candidates/${id}/email`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });

// PDF is binary + auth-gated, so fetch it as a blob WITH the bearer header
// (a plain <a href> download wouldn't carry the Authorization header).
export async function fetchReportPdf(id: string): Promise<Blob> {
  const auth: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const resp = await fetch(`/api/candidates/${id}/report.pdf`, { headers: auth });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      detail = (await resp.json()).detail || detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(resp.status, detail);
  }
  return resp.blob();
}
