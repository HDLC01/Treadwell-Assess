// Client-side API helpers — same-origin /api (Next rewrites to the FastAPI backend).

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
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
