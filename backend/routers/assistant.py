"""Admin AI assistant — answers plain-language questions about the hiring data
and gives quick summaries, via the local `claude -p` CLI.

PRIVACY: the model is fed only aggregates + a roster (names/role/status, NO
results). Individual RESULTS enter the context ONLY when the question names a
single candidate — never a comparable set — so the "results never shown
alongside others" rule holds structurally, not just by instruction. Gated by the
employer auth middleware (@wetreadwell.com) like the rest of /api/*.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from db import connect
from routers.jobs import _build_report
from services import claude_cli

router = APIRouter(tags=["assistant"])

SYSTEM = (
    "You are the assistant inside Treadwell Assess, a hiring-assessment tool, helping an "
    "authorized hiring admin. Answer ONLY from the DATA block provided; if it doesn't cover "
    "the question, say so briefly. Be concise, practical, and skimmable (short sentences or "
    "bullets).\n\n"
    "HARD PRIVACY RULE: never rank or compare candidates' assessment RESULTS against each "
    "other. The roster you get has status only — no scores. If asked to rank/compare candidates "
    "by fit or score, explain that results are private to each candidate and tell them to open "
    "that candidate's report. The ONE exception: if a 'SELECTED CANDIDATE' section with full "
    "results is present, you may summarize that single person.\n\n"
    "Treadwell Assess is an independent tool, not affiliated with The Predictive Index."
)


class AskBody(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


def _format_candidate(rep: dict) -> str:
    c = rep["candidate"]
    b = rep.get("behavioral")
    cog = rep.get("cognitive")
    parts = [f"Name: {c['full_name']} | Role: {rep['job']['name']}"]
    if b:
        prof = b.get("reference_profile") or {}
        parts.append(f"Behavioral fit: {b.get('fit_stars')} / 5 stars")
        if prof:
            parts.append(f"Reference profile: {prof.get('name')} — {prof.get('tagline')}")
        parts.append(
            "Factors (sigma): "
            + ", ".join(f"{f['name']} {f['synthesis']:+}" for f in b["factors"])
        )
        narr = b.get("narrative") or {}
        if narr.get("summary"):
            parts.append("Summary: " + narr["summary"])
    else:
        parts.append("Behavioral: not completed yet.")
    if cog:
        parts.append(
            f"Cognitive: scaled {cog.get('scaled_score')} (fit: {cog.get('fit')}, {cog.get('status')})"
        )
    return "\n".join(parts)


def _build_context(conn, question: str) -> str:
    lines: list[str] = ["JOBS:"]
    for j in conn.execute(text(
        "select j.id, j.name, (j.behavioral_target is not null) as has_target, j.cognitive_target, "
        "  (select count(*) from candidates c where c.job_id = j.id) as total, "
        "  (select count(*) from candidates c where c.job_id = j.id and exists "
        "     (select 1 from behavioral_results b where b.candidate_id = c.id)) as completed "
        "from jobs j order by j.created_at desc"
    )).mappings().all():
        total, done = j["total"], j["completed"]
        ct = j["cognitive_target"]
        lines.append(
            f"- {j['name']}: {total} candidate(s), {done} completed, {total - done} in progress; "
            f"behavioral target {'set' if j['has_target'] else 'NOT set'}; "
            f"cognitive target {ct if ct is not None else 'none'}"
        )

    roster = conn.execute(text(
        "select c.full_name, j.name as job_name, "
        "  exists (select 1 from behavioral_results b where b.candidate_id = c.id) as completed "
        "from candidates c join jobs j on j.id = c.job_id "
        "order by c.created_at desc limit 100"
    )).mappings().all()
    lines.append("\nCANDIDATE ROSTER (status only — NO results):")
    for r in roster:
        lines.append(f"- {r['full_name']} — {r['job_name']} — {'Completed' if r['completed'] else 'In progress'}")

    agg = conn.execute(text(
        "select "
        "  (select count(*) from candidates) as total_candidates, "
        "  (select count(distinct candidate_id) from behavioral_results) as total_completed, "
        "  (select count(*) from behavioral_results where created_at > now() - interval '7 days') as week_completed"
    )).mappings().first()
    lines.append(
        f"\nTOTALS: {agg['total_candidates']} candidates overall, {agg['total_completed']} completed; "
        f"{agg['week_completed']} completed in the last 7 days."
    )

    # Individual results ONLY when the question names exactly one candidate.
    q = question.lower()
    named = {r["full_name"] for r in roster if r["full_name"] and r["full_name"].lower() in q}
    if len(named) == 1:
        name = next(iter(named))
        row = conn.execute(
            text("select id from candidates where lower(full_name) = :n order by created_at desc limit 1"),
            {"n": name.lower()},
        ).first()
        if row:
            rep = _build_report(conn, str(row[0]))
            if rep:
                lines.append("\nSELECTED CANDIDATE (full results — you may summarize this one person):")
                lines.append(_format_candidate(rep))
    return "\n".join(lines)


@router.post("/assistant")
def ask_assistant(body: AskBody):
    with connect() as conn:
        context = _build_context(conn, body.question)
    user_prompt = f"DATA:\n{context}\n\nADMIN QUESTION: {body.question}\n\nAnswer concisely from the data above."
    try:
        answer = claude_cli.call_claude(user_prompt, SYSTEM, timeout=90)
    except claude_cli.ClaudeCLIError as exc:
        raise HTTPException(status_code=503, detail=f"The assistant is unavailable right now ({str(exc)[:160]}).")
    return {"answer": answer or "I couldn't generate a response — try rephrasing."}
