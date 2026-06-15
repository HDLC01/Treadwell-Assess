"""Report PDF + email-sender unit tests (no server/DB). Run:
    ./.venv/Scripts/python.exe report_test.py
"""

from __future__ import annotations

from services import email_sender, report_pdf

FULL = {
    "candidate": {"id": "x", "full_name": "Adía O'Brien-Müller", "email": "a@x.io", "bookmarked": False},
    "job": {"id": "j", "name": "Site Lead", "behavioral_target": None,
            "cognitive_target": 20, "factor_names": {"A": "Dominance", "B": "Influence", "C": "Steadiness", "D": "Conscientiousness"},
            "scale_max": 30},
    "behavioral": {
        "assessed_at": "2026-06-16T00:00:00",
        "factors": [
            {"factor": "A", "name": "Dominance", "self": 1.8, "self_concept": 1.1, "synthesis": 1.45, "band": "Independent"},
            {"factor": "B", "name": "Influence", "self": 0.2, "self_concept": 0.4, "synthesis": 0.3, "band": "Sociable"},
            {"factor": "C", "name": "Steadiness", "self": -0.9, "self_concept": -0.7, "synthesis": -0.8, "band": "Fast-Paced"},
            {"factor": "D", "name": "Conscientiousness", "self": -1.0, "self_concept": -0.5, "synthesis": -0.75, "band": "Flexible"},
        ],
        "reference_profile": {"slug": "catalyst", "name": "Catalyst",
                              "tagline": "A driving force who rallies people around a goal.",
                              "description": "Energetic and persuasive; thrives on momentum and change."},
        "fit_stars": 4.5,
    },
    "cognitive": {"taken_at": "2026-06-16T00:05:00", "raw_score": 15, "scaled_score": 22,
                  "num_items": 20, "status": "complete", "fit": "strong"},
}

CASES = []
def case(fn):
    CASES.append(fn); return fn


@case
def full_report_is_valid_pdf():
    pdf = report_pdf.build_report_pdf(FULL)
    assert pdf[:4] == b"%PDF", pdf[:8]
    assert len(pdf) > 1000, len(pdf)


@case
def unicode_name_does_not_crash():
    # latin-1 sanitization must keep non-ASCII names from blowing up
    pdf = report_pdf.build_report_pdf(FULL)
    assert pdf[:4] == b"%PDF"


@case
def empty_results_still_render():
    minimal = {**FULL, "behavioral": None, "cognitive": None}
    pdf = report_pdf.build_report_pdf(minimal)
    assert pdf[:4] == b"%PDF"


@case
def email_unconfigured_raises_503():
    email_sender.settings.SMTP_HOST = ""
    email_sender.settings.SMTP_FROM = ""
    assert email_sender.is_configured() is False
    try:
        email_sender.send("x@y.z", "s", "b")
    except email_sender.EmailError as e:
        assert e.status == 503, e.status
        return
    raise AssertionError("expected EmailError(503)")


def main():
    for fn in CASES:
        fn()
        print(f"  PASS  {fn.__name__}")
    print(f"\n{len(CASES)}/{len(CASES)} report tests passed.")


if __name__ == "__main__":
    main()
