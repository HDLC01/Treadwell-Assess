"""Employer API — jobs, Job Targets, assessment links, and the candidates table.

NOTE: open in local dev; employer auth (Google sign-in) gates this before deploy.
"""

from __future__ import annotations

import json
import secrets
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import text

from config import settings
from db import connect
from services import email_sender, narrative, report_pdf
from services.behavioral_scorer import FACTOR_NAMES, band_label
from services.fit_calculator import behavioral_fit_stars, cognitive_fit
from services.profile_matcher import match_profiles_for_target
from services.target_helpers import key_characteristics

router = APIRouter(tags=["jobs"])

_FACTORS = ("A", "B", "C", "D")


class JobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    folder: Optional[str] = Field(default=None, max_length=200)


class JobUpdate(BaseModel):
    name: Optional[str] = None
    folder: Optional[str] = None
    status: Optional[str] = None
    behavioral_target: Optional[Dict] = None
    cognitive_target: Optional[int] = None


class CandidatePatch(BaseModel):
    bookmarked: Optional[bool] = None


def _validate_target(target: Dict) -> Dict:
    """Normalize a behavioral target: all four factors, low<=high, clamped to [-3,3]."""
    clean: Dict = {}
    for f in _FACTORS:
        rng = target.get(f)
        if not isinstance(rng, dict) or "low" not in rng or "high" not in rng:
            raise HTTPException(status_code=422, detail=f"behavioral_target missing factor {f}")
        low = max(-3.0, min(3.0, float(rng["low"])))
        high = max(-3.0, min(3.0, float(rng["high"])))
        if low > high:
            low, high = high, low
        clean[f] = {"low": round(low, 2), "high": round(high, 2)}
    return clean


def _load_profiles(conn):
    return [dict(p) for p in conn.execute(
        text("select id, slug, name, tagline, description, ideal_a, ideal_b, ideal_c, ideal_d "
             "from reference_profiles")
    ).mappings().all()]


def _job_payload(conn, job) -> Dict:
    target = job["behavioral_target"]
    if isinstance(target, str):
        target = json.loads(target)
    link = conn.execute(
        text("select token, expires_at from assessment_links where job_id = :j "
             "order by created_at desc limit 1"),
        {"j": job["id"]},
    ).mappings().first()
    profiles = match_profiles_for_target(target, _load_profiles(conn)) if target else []
    counts = conn.execute(
        text("select count(*) as total from candidates where job_id = :j"), {"j": job["id"]}
    ).mappings().first()
    return {
        "id": str(job["id"]),
        "name": job["name"],
        "folder": job["folder"],
        "status": job["status"],
        "behavioral_target": target,
        "cognitive_target": job["cognitive_target"],
        "factor_names": FACTOR_NAMES,
        "key_characteristics": key_characteristics(target),
        "matched_profiles": [
            {"slug": p["slug"], "name": p["name"], "tagline": p["tagline"]} for p in profiles
        ],
        "link_token": link["token"] if link else None,
        "candidate_count": counts["total"],
        "created_at": str(job["created_at"]),
    }


# ─── jobs ─────────────────────────────────────────────────────────────────────
@router.get("/jobs")
def list_jobs():
    with connect() as conn:
        rows = conn.execute(text(
            "select j.id, j.name, j.folder, j.status, j.created_at, "
            "  (select count(*) from candidates c where c.job_id = j.id) as candidate_count, "
            "  (j.behavioral_target is not null) as has_target "
            "from jobs j order by j.created_at desc"
        )).mappings().all()
    return {"jobs": [
        {"id": str(r["id"]), "name": r["name"], "folder": r["folder"], "status": r["status"],
         "candidate_count": r["candidate_count"], "has_target": r["has_target"],
         "created_at": str(r["created_at"])}
        for r in rows
    ]}


@router.post("/jobs")
def create_job(body: JobCreate):
    with connect() as conn:
        row = conn.execute(
            text("insert into jobs (name, folder) values (:n, :f) returning id"),
            {"n": body.name.strip(), "f": (body.folder or "").strip() or None},
        ).first()
    return {"id": str(row[0])}


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    with connect() as conn:
        job = conn.execute(
            text("select id, name, folder, status, behavioral_target, cognitive_target, created_at "
                 "from jobs where id = :j"),
            {"j": job_id},
        ).mappings().first()
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        return _job_payload(conn, job)


@router.patch("/jobs/{job_id}")
def update_job(job_id: str, body: JobUpdate):
    fields = body.model_dump(exclude_unset=True)
    if "behavioral_target" in fields and fields["behavioral_target"] is not None:
        fields["behavioral_target"] = json.dumps(_validate_target(fields["behavioral_target"]))
    if "status" in fields and fields["status"] not in (None, "open", "closed"):
        raise HTTPException(status_code=422, detail="status must be open|closed")
    if not fields:
        return {"ok": True}
    sets = ", ".join(f"{k} = :{k}" for k in fields)
    fields["job_id"] = job_id
    with connect() as conn:
        res = conn.execute(text(f"update jobs set {sets} where id = :job_id"), fields)
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


@router.post("/jobs/{job_id}/link")
def get_or_create_link(job_id: str):
    """The shareable assessment link token for a job (reuses the latest if present)."""
    with connect() as conn:
        job = conn.execute(text("select id from jobs where id = :j"), {"j": job_id}).first()
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        link = conn.execute(
            text("select token from assessment_links where job_id = :j "
                 "and (expires_at is null or expires_at > now()) "
                 "order by created_at desc limit 1"),
            {"j": job_id},
        ).first()
        if link:
            return {"token": link[0], "created": False}
        token = secrets.token_urlsafe(9)
        conn.execute(
            text("insert into assessment_links (job_id, token) values (:j, :t)"),
            {"j": job_id, "t": token},
        )
    return {"token": token, "created": True}


# ─── candidates table ─────────────────────────────────────────────────────────
@router.get("/jobs/{job_id}/candidates")
def list_candidates(
    job_id: str,
    q: Optional[str] = Query(None),
    min_fit: Optional[float] = Query(None, ge=0, le=5),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    with connect() as conn:
        job = conn.execute(
            text("select behavioral_target, cognitive_target from jobs where id = :j"),
            {"j": job_id},
        ).mappings().first()
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")
        target = job["behavioral_target"]
        if isinstance(target, str):
            target = json.loads(target)

        rows = conn.execute(text(
            "select c.id, c.full_name, c.email, c.bookmarked, c.created_at, "
            "       br.synthesis_scores, br.self_scores, br.self_concept_scores, "
            "       br.created_at as assessed_at, "
            "       rp.name as profile_name, rp.slug as profile_slug, "
            "       cr.scaled_score as cognitive_score, cr.status as cognitive_status, "
            "       l.expires_at as link_expires_at "
            "from candidates c "
            "left join lateral (select * from behavioral_results b where b.candidate_id = c.id "
            "                   order by b.created_at desc limit 1) br on true "
            "left join reference_profiles rp on rp.id = br.reference_profile_id "
            "left join lateral (select * from cognitive_results x where x.candidate_id = c.id "
            "                   order by x.created_at desc limit 1) cr on true "
            "left join assessment_links l on l.id = c.link_id "
            "where c.job_id = :j "
            "order by c.created_at desc"
        ), {"j": job_id}).mappings().all()

    items = []
    for r in rows:
        synthesis = r["synthesis_scores"]
        if isinstance(synthesis, str):
            synthesis = json.loads(synthesis)
        stars = behavioral_fit_stars(synthesis, target) if synthesis else None
        cog = cognitive_fit(r["cognitive_score"], job["cognitive_target"])
        items.append({
            "id": str(r["id"]),
            "full_name": r["full_name"],
            "email": r["email"],
            "bookmarked": r["bookmarked"],
            "behavioral_fit": stars,
            "profile_name": r["profile_name"],
            "profile_slug": r["profile_slug"],
            "synthesis": synthesis,
            "assessed_at": str(r["assessed_at"]) if r["assessed_at"] else None,
            "cognitive_fit": cog,
            "cognitive_score": r["cognitive_score"],
            "has_behavioral": synthesis is not None,
        })

    # filter + paginate in memory (counts are small; SQL pagination can come later)
    if q:
        needle = q.lower().strip()
        items = [i for i in items
                 if needle in i["full_name"].lower() or needle in (i["email"] or "").lower()]
    if min_fit is not None:
        items = [i for i in items if (i["behavioral_fit"] or 0) >= min_fit]

    total = len(items)
    start = (page - 1) * page_size
    return {
        "items": items[start:start + page_size],
        "page": page, "page_size": page_size, "total": total,
        "total_pages": (total + page_size - 1) // page_size if page_size else 0,
    }


@router.patch("/candidates/{candidate_id}")
def patch_candidate(candidate_id: str, body: CandidatePatch):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        return {"ok": True}
    with connect() as conn:
        res = conn.execute(
            text("update candidates set bookmarked = :b where id = :c"),
            {"b": bool(fields.get("bookmarked")), "c": candidate_id},
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Candidate not found")
    return {"ok": True}


# ─── candidate report (detail / PDF / email) ──────────────────────────────────
class EmailBody(BaseModel):
    to: str = Field(min_length=3, max_length=320)


def _build_report(conn, candidate_id: str) -> Optional[Dict]:
    """Assemble the full per-candidate report used by the detail page, PDF, and email."""
    cand = conn.execute(text(
        "select c.id, c.full_name, c.email, c.bookmarked, c.created_at, "
        "       j.id as job_id, j.name as job_name, j.behavioral_target, j.cognitive_target "
        "from candidates c join jobs j on j.id = c.job_id where c.id = :c"
    ), {"c": candidate_id}).mappings().first()
    if cand is None:
        return None

    target = cand["behavioral_target"]
    if isinstance(target, str):
        target = json.loads(target)

    # behavioral (latest)
    behavioral = None
    br = conn.execute(text(
        "select self_scores, self_concept_scores, synthesis_scores, reference_profile_id, created_at "
        "from behavioral_results where candidate_id = :c order by created_at desc limit 1"
    ), {"c": candidate_id}).mappings().first()
    if br:
        def _p(v):
            return json.loads(v) if isinstance(v, str) else v
        self_s, self_c, syn = _p(br["self_scores"]), _p(br["self_concept_scores"]), _p(br["synthesis_scores"])
        factors = [
            {"factor": f, "name": FACTOR_NAMES[f],
             "self": self_s[f], "self_concept": self_c[f], "synthesis": syn[f],
             "band": band_label(f, syn[f])}
            for f in ("A", "B", "C", "D")
        ]
        profile = None
        if br["reference_profile_id"] is not None:
            p = conn.execute(text(
                "select slug, name, tagline, description from reference_profiles where id = :i"
            ), {"i": br["reference_profile_id"]}).mappings().first()
            if p:
                profile = dict(p)
        behavioral = {
            "assessed_at": str(br["created_at"]),
            "factors": factors,
            "reference_profile": profile,
            "fit_stars": behavioral_fit_stars(syn, target),
        }

    # cognitive (latest)
    cognitive = None
    cr = conn.execute(text(
        "select answers, raw_score, scaled_score, status, created_at "
        "from cognitive_results where candidate_id = :c order by created_at desc limit 1"
    ), {"c": candidate_id}).mappings().first()
    if cr:
        answers = cr["answers"]
        if isinstance(answers, str):
            answers = json.loads(answers)
        cognitive = {
            "taken_at": str(cr["created_at"]),
            "raw_score": cr["raw_score"],
            "scaled_score": cr["scaled_score"],
            "num_items": len(answers) if answers else 0,
            "status": cr["status"],
            "fit": cognitive_fit(cr["scaled_score"], cand["cognitive_target"]),
        }

    if behavioral:
        behavioral["narrative"] = narrative.behavioral_narrative(
            behavioral["factors"], behavioral["reference_profile"]
        )
    if cognitive:
        cognitive["interpretation"] = narrative.cognitive_narrative(
            cognitive, cand["cognitive_target"], settings.COGNITIVE_SCALE_MAX
        )

    return {
        "candidate": {
            "id": str(cand["id"]), "full_name": cand["full_name"],
            "email": cand["email"], "bookmarked": cand["bookmarked"],
        },
        "job": {
            "id": str(cand["job_id"]), "name": cand["job_name"],
            "behavioral_target": target, "cognitive_target": cand["cognitive_target"],
            "factor_names": FACTOR_NAMES, "scale_max": settings.COGNITIVE_SCALE_MAX,
        },
        "behavioral": behavioral,
        "cognitive": cognitive,
    }


def _pdf_filename(full_name: str) -> str:
    safe = "".join(ch if ch.isalnum() else "-" for ch in full_name).strip("-") or "candidate"
    return f"treadwell-report-{safe}.pdf"


@router.get("/candidates/{candidate_id}/report")
def candidate_report(candidate_id: str):
    with connect() as conn:
        report = _build_report(conn, candidate_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return report


@router.get("/candidates/{candidate_id}/report.pdf")
def candidate_report_pdf(candidate_id: str):
    with connect() as conn:
        report = _build_report(conn, candidate_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    pdf = report_pdf.build_report_pdf(report)
    fname = _pdf_filename(report["candidate"]["full_name"])
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/candidates/{candidate_id}/email")
def email_candidate_report(candidate_id: str, body: EmailBody):
    to = body.to.strip()
    if "@" not in to:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    with connect() as conn:
        report = _build_report(conn, candidate_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Candidate not found")

    name = report["candidate"]["full_name"]
    pdf = report_pdf.build_report_pdf(report)
    try:
        email_sender.send(
            to=to,
            subject=f"Assessment report — {name} ({report['job']['name']})",
            body_text=(
                f"Attached is the Treadwell Assess report for {name} "
                f"(role: {report['job']['name']}).\n\n"
                "Independent assessment - not affiliated with The Predictive Index."
            ),
            attachments=[(_pdf_filename(name), pdf, "application/pdf")],
        )
    except email_sender.EmailError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail)
    return {"ok": True, "sent_to": to}
