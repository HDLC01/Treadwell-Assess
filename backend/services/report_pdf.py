"""Candidate report PDF — built with fpdf2 (pure-Python, no system deps).

Renders the same story the on-screen report tells: Behavioral Fit, reference
profile, the A/B/C/D pattern (Self / Expected / Synthesis on a -3..+3 axis), and
Cognitive result. Core fonts only, so text is sanitized to latin-1.
"""

from __future__ import annotations

from typing import Optional

from fpdf import FPDF
from fpdf.enums import XPos, YPos

INK = (15, 23, 42)
SKY = (2, 132, 199)
SLATE = (100, 116, 139)
AMBER = (245, 158, 11)
TRACK = (226, 232, 240)
GREEN = (16, 185, 129)
VIOLET = (139, 92, 246)

# Internal keys A/B/C/D map to the public DISC letters shown to users.
DISC_LETTER = {"A": "D", "B": "I", "C": "S", "D": "C"}

LOW_HIGH = {
    "A": ("Collaborative", "Independent"),
    "B": ("Reserved", "Sociable"),
    "C": ("Fast-paced", "Steady"),
    "D": ("Flexible", "Precise"),
}


def _s(text: object) -> str:
    """Latin-1-safe text for the core PDF fonts."""
    return str("" if text is None else text).encode("latin-1", "replace").decode("latin-1")


class _Report(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*SKY)
        self.cell(0, 6, "TREADWELL ASSESS", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*TRACK)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(*SLATE)
        self.cell(0, 5, _s("Independent assessment - not affiliated with The Predictive Index."),
                  align="C")


def _section(pdf: _Report, title: str) -> None:
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*INK)
    pdf.cell(0, 7, _s(title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def _fit_bar(pdf: _Report, value: Optional[float]) -> None:
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*INK)
    label = f"{value:.1f} / 5.0" if value is not None else "Not assessed"
    pdf.cell(0, 6, _s(f"Behavioral Fit: {label}"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    if value is None:
        return
    x, y, w, h = pdf.l_margin, pdf.get_y(), 90, 4
    pdf.set_fill_color(*TRACK)
    pdf.rect(x, y, w, h, style="F")
    pdf.set_fill_color(*AMBER)
    pdf.rect(x, y, w * max(0.0, min(5.0, value)) / 5.0, h, style="F")
    pdf.ln(h + 2)


def _factor_row(pdf: _Report, f: dict) -> None:
    low, high = LOW_HIGH.get(f["factor"], ("", ""))
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(*INK)
    pdf.cell(0, 5.5, _s(f"({DISC_LETTER.get(f['factor'], f['factor'])}) {f['name']}"),
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 4.5, _s(f"{low}  <-  {high}     band: {f['band']}     synthesis sigma {f['synthesis']:+.2f}"),
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # axis -3..+3
    x, y, w, h = pdf.l_margin, pdf.get_y() + 1, 150, 4
    pdf.set_fill_color(*TRACK)
    pdf.rect(x, y, w, h, style="F")
    pdf.set_draw_color(180, 190, 200)
    mid = x + w / 2
    pdf.line(mid, y - 1, mid, y + h + 1)  # zero tick

    def px(sigma: float) -> float:
        return x + (max(-3.0, min(3.0, sigma)) + 3.0) / 6.0 * w

    # expected (hollow violet), self (green), synthesis (ink) markers
    pdf.set_draw_color(*VIOLET)
    pdf.ellipse(px(f["self_concept"]) - 1.4, y + h / 2 - 1.4, 2.8, 2.8, style="D")
    pdf.set_fill_color(*GREEN)
    pdf.ellipse(px(f["self"]) - 1.4, y + h / 2 - 1.4, 2.8, 2.8, style="F")
    pdf.set_fill_color(*INK)
    pdf.ellipse(px(f["synthesis"]) - 1.8, y + h / 2 - 1.8, 3.6, 3.6, style="F")
    pdf.ln(h + 3)


def build_report_pdf(report: dict) -> bytes:
    cand = report["candidate"]
    job = report["job"]
    beh = report.get("behavioral")
    cog = report.get("cognitive")

    pdf = _Report(format="Letter", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # title block
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*INK)
    pdf.cell(0, 9, _s(cand["full_name"]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*SLATE)
    line = f"Role: {job['name']}"
    if cand.get("email"):
        line += f"   |   {cand['email']}"
    if beh and beh.get("assessed_at"):
        line += f"   |   Completed {str(beh['assessed_at'])[:10]}"
    pdf.cell(0, 6, _s(line), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # behavioral
    if beh:
        _section(pdf, "Behavioral Fit")
        _fit_bar(pdf, beh.get("fit_stars"))

        prof = beh.get("reference_profile")
        if prof:
            _section(pdf, "Reference Profile")
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(*INK)
            pdf.cell(0, 6, _s(prof["name"]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Helvetica", "I", 9.5)
            pdf.set_text_color(*SKY)
            pdf.cell(0, 5, _s(prof["tagline"]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            if prof.get("description"):
                pdf.set_font("Helvetica", "", 9.5)
                pdf.set_text_color(*SLATE)
                pdf.multi_cell(0, 5, _s(prof["description"]))

        _section(pdf, "Behavioral Pattern")
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*SLATE)
        pdf.cell(0, 4.5, _s("Markers: filled = Synthesis,  green = Self (natural),  hollow = Expected at work"),
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(1)
        for f in beh["factors"]:
            _factor_row(pdf, f)
    else:
        _section(pdf, "Behavioral")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*SLATE)
        pdf.cell(0, 6, _s("Not completed yet."), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # cognitive
    _section(pdf, "Cognitive")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK)
    if cog:
        target = job.get("cognitive_target")
        fit = cog.get("fit")
        tgt = f" (target {target})" if target is not None else " (no target set)"
        fit_txt = f"   -   {fit} fit" if fit else ""
        pdf.cell(0, 6, _s(f"Scaled score: {cog['scaled_score']} / {job.get('scale_max', 30)}{tgt}{fit_txt}"),
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_text_color(*SLATE)
        pdf.set_font("Helvetica", "", 9)
        status = "timed out" if cog.get("status") == "expired" else "completed"
        pdf.cell(0, 5, _s(f"{cog['raw_score']} of {cog['num_items']} correct   |   {status}"),
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    else:
        pdf.set_text_color(*SLATE)
        pdf.cell(0, 6, _s("Not taken yet."), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    out = pdf.output()
    return bytes(out)
