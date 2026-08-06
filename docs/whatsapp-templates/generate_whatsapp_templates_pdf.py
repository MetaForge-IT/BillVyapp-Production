"""
Generate Starr Kuts / BillVyapp WhatsApp Business message templates PDF.

Run:
  python docs/whatsapp-templates/generate_whatsapp_templates_pdf.py
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "BillVyapp-WhatsApp-Message-Templates.pdf"
BRAND = "Starr Kuts"

TEMPLATES = [
    {
        "id": "WA-01",
        "name": "Login / Registration OTP",
        "template_name": "starrkuts_login_otp",
        "category": "AUTHENTICATION",
        "body": f"{BRAND}: Your verification code is {{{{1}}}}. Valid for {{{{2}}}} minutes. Do not share this code.",
        "vars": [("{{1}}", "OTP", "482917"), ("{{2}}", "Expiry minutes", "10")],
        "sms": "SMS-01",
    },
    {
        "id": "WA-02",
        "name": "Appointment Confirmation",
        "template_name": "starrkuts_appt_confirm",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, your appointment with {BRAND} is confirmed for {{{{1}}}} at {{{{2}}}}. "
            f"For assistance, contact {{{{3}}}}. Thank you. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Date", "03-Aug-2026"),
            ("{{2}}", "Time", "11:30 AM"),
            ("{{3}}", "Salon phone", "9876543210"),
        ],
        "sms": "SMS-02",
    },
    {
        "id": "WA-03",
        "name": "Appointment Reminder",
        "template_name": "starrkuts_appt_reminder",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, this is a reminder that your appointment with {BRAND} is scheduled on "
            f"{{{{1}}}} at {{{{2}}}}. We look forward to serving you. - {BRAND}"
        ),
        "vars": [("{{1}}", "Date", "03-Aug-2026"), ("{{2}}", "Time", "11:30 AM")],
        "sms": "SMS-03",
    },
    {
        "id": "WA-04",
        "name": "Running Late / Delay",
        "template_name": "starrkuts_appt_delay",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, {BRAND} regrets to inform you that your appointment is delayed by "
            f"approximately {{{{1}}}}. We apologize for the inconvenience and appreciate your patience. - {BRAND}"
        ),
        "vars": [("{{1}}", "Delay duration", "15 minutes")],
        "sms": "SMS-04",
    },
    {
        "id": "WA-05",
        "name": "Thank You After Visit",
        "template_name": "starrkuts_thank_you_visit",
        "category": "MARKETING",
        "body": (
            f"Dear Customer, thank you for visiting {BRAND} today. We appreciate your trust and "
            f"look forward to serving you again. - {BRAND}"
        ),
        "vars": [],
        "sms": "SMS-05",
    },
    {
        "id": "WA-06",
        "name": "Upcoming Appointment",
        "template_name": "starrkuts_appt_upcoming",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, your upcoming appointment with {BRAND} is on {{{{1}}}} at {{{{2}}}}. "
            f"Please arrive {{{{3}}}} minutes early. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Date", "03-Aug-2026"),
            ("{{2}}", "Time", "11:30 AM"),
            ("{{3}}", "Arrive-early minutes", "10"),
        ],
        "sms": "SMS-06",
    },
    {
        "id": "WA-07",
        "name": "Loyalty Points Reminder",
        "template_name": "starrkuts_loyalty_points",
        "category": "MARKETING",
        "body": (
            f"Dear Customer, you have {{{{1}}}} loyalty points available in your account. "
            f"Redeem them before {{{{2}}}}. Thank you for choosing {BRAND}."
        ),
        "vars": [("{{1}}", "Points", "450"), ("{{2}}", "Expiry date", "31-Dec-2026")],
        "sms": "SMS-07",
    },
    {
        "id": "WA-08",
        "name": "Membership / Member Offer",
        "template_name": "starrkuts_member_offer",
        "category": "MARKETING",
        "body": (
            f"Dear Customer, enjoy an exclusive member offer of {{{{1}}}} valid until {{{{2}}}}. "
            f"Visit {BRAND} to redeem your benefit. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Offer details", "20 percent OFF services"),
            ("{{2}}", "Expiry date", "31-Aug-2026"),
        ],
        "sms": "SMS-08",
    },
    {
        "id": "WA-09",
        "name": "Birthday Wish + Offer",
        "template_name": "starrkuts_birthday_offer",
        "category": "MARKETING",
        "body": (
            f"Happy Birthday, {{{{1}}}}! Wishing you a wonderful year ahead. Enjoy our special offer: "
            f"{{{{2}}}}, valid until {{{{3}}}}. Team {BRAND}."
        ),
        "vars": [
            ("{{1}}", "Customer name", "Priya Sharma"),
            ("{{2}}", "Offer details", "20 percent OFF"),
            ("{{3}}", "Expiry date", "31-Aug-2026"),
        ],
        "sms": "SMS-09",
    },
    {
        "id": "WA-10",
        "name": "Payment Received Receipt",
        "template_name": "starrkuts_payment_received",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, {BRAND} has received your payment of Rs.{{{{1}}}} against Invoice "
            f"{{{{2}}}} on {{{{3}}}}. Thank you for your payment. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Amount", "1850"),
            ("{{2}}", "Invoice number", "INV-2026-0842"),
            ("{{3}}", "Payment date", "03-Aug-2026"),
        ],
        "sms": "SMS-10",
    },
    {
        "id": "WA-11",
        "name": "Payment Reminder (Due)",
        "template_name": "starrkuts_payment_due",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, a payment of Rs.{{{{1}}}} for Invoice {{{{2}}}} at {BRAND} is due on "
            f"{{{{3}}}}. Kindly make the payment to avoid any inconvenience. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Amount", "1850"),
            ("{{2}}", "Invoice number", "INV-2026-0842"),
            ("{{3}}", "Due date", "20-Jul-2026"),
        ],
        "sms": "SMS-11",
    },
    {
        "id": "WA-12",
        "name": "Payment Reminder (Overdue)",
        "template_name": "starrkuts_payment_overdue",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, your payment of Rs.{{{{1}}}} for Invoice {{{{2}}}} at {BRAND} is overdue "
            f"since {{{{3}}}}. Kindly clear the outstanding amount at the earliest. Thank you. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Amount", "1850"),
            ("{{2}}", "Invoice number", "INV-2026-0842"),
            ("{{3}}", "Due date", "20-Jul-2026"),
        ],
        "sms": "SMS-12",
    },
    {
        "id": "WA-13",
        "name": "Coupon Send",
        "template_name": "starrkuts_coupon_send",
        "category": "MARKETING",
        "body": (
            f"Dear Customer, your coupon code {{{{1}}}} is worth {{{{2}}}} and is valid until {{{{3}}}}. "
            f"Redeem it at {BRAND}."
        ),
        "vars": [
            ("{{1}}", "Coupon code", "SAVE20"),
            ("{{2}}", "Offer details", "20 percent OFF"),
            ("{{3}}", "Expiry date", "31-Aug-2026"),
        ],
        "sms": "SMS-13",
    },
    {
        "id": "WA-14",
        "name": "Request Feedback / Review",
        "template_name": "starrkuts_feedback_request",
        "category": "UTILITY",
        "body": (
            f"Dear Customer, thank you for choosing {BRAND}. Please share your feedback here: {{{{1}}}}. "
            f"Your opinion helps us improve. - {BRAND}"
        ),
        "vars": [("{{1}}", "Feedback URL", "https://billvy.app/r/abc123")],
        "sms": "SMS-14",
    },
    {
        "id": "WA-15",
        "name": "Staff - New Appointment Booking",
        "template_name": "starrkuts_staff_new_booking",
        "category": "UTILITY",
        "body": (
            f"Dear {{{{1}}}}, a new appointment at {BRAND} has been booked by {{{{2}}}} for "
            f"{{{{3}}}} at {{{{4}}}}. Please review your schedule. - {BRAND}"
        ),
        "vars": [
            ("{{1}}", "Staff name", "Ananya"),
            ("{{2}}", "Customer name", "Priya Sharma"),
            ("{{3}}", "Date", "03-Aug-2026"),
            ("{{4}}", "Time", "11:30 AM"),
        ],
        "sms": "SMS-15",
    },
]


class Pdf(FPDF):
    def header(self) -> None:
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(40, 40, 40)
        self.cell(0, 6, f"{BRAND} / BillVyapp - WhatsApp Business Message Templates", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(212, 175, 55)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Generated {date.today().isoformat()}  |  Page {self.page_no()}/{{nb}}", align="C")


def add_title(pdf: Pdf, text: str, size: int = 16) -> None:
    pdf.set_font("Helvetica", "B", size)
    pdf.set_text_color(17, 17, 24)
    pdf.multi_cell(0, 8, text)
    pdf.ln(1)


def add_para(pdf: Pdf, text: str, bold: bool = False, size: int = 10) -> None:
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 5, text)
    pdf.ln(1)


def add_label_value(pdf: Pdf, label: str, value: str) -> None:
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(38, 5, f"{label}:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(17, 17, 24)
    pdf.cell(0, 5, value, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(0.5)


def add_body_box(pdf: Pdf, body: str) -> None:
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 5, "Body", new_x="LMARGIN", new_y="NEXT")
    pdf.set_fill_color(250, 248, 242)
    pdf.set_draw_color(212, 175, 55)
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(17, 17, 24)
    pdf.multi_cell(0, 5, body, border=1, fill=True)
    pdf.ln(2)


def build() -> Path:
    pdf = Pdf()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    add_title(pdf, f"{BRAND} / BillVyapp")
    add_title(pdf, "WhatsApp Business Message Templates (WA-01 to WA-15)", 13)
    add_para(
        pdf,
        "Brand is hardcoded as Starr Kuts in every template. Variables use Meta positional "
        "format {{1}}, {{2}}, ... Submit in WhatsApp Manager. Language: en / en_IN.",
    )
    add_para(
        pdf,
        "Categories: AUTHENTICATION (OTP) | UTILITY (appointments/payments) | MARKETING (offers).",
        bold=True,
    )

    pdf.ln(2)
    add_title(pdf, "Index", 12)
    for t in TEMPLATES:
        add_para(pdf, f"{t['id']}  |  {t['name']}  |  {t['category']}  |  {t['template_name']}  |  twin {t['sms']}", size=9)

    for t in TEMPLATES:
        pdf.add_page()
        add_title(pdf, f"{t['id']} - {t['name']}", 14)
        add_label_value(pdf, "Template name", t["template_name"])
        add_label_value(pdf, "Meta category", t["category"])
        add_label_value(pdf, "SMS twin", t["sms"])
        pdf.ln(1)
        add_body_box(pdf, t["body"])
        if t["vars"]:
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(90, 90, 90)
            pdf.cell(0, 5, "Variables / sample values", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_fill_color(245, 245, 245)
            pdf.cell(28, 6, "Token", border=1, fill=True)
            pdf.cell(55, 6, "Meaning", border=1, fill=True)
            pdf.cell(0, 6, "Sample", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 8)
            for token, meaning, sample in t["vars"]:
                pdf.cell(28, 6, token, border=1)
                pdf.cell(55, 6, meaning, border=1)
                pdf.cell(0, 6, sample, border=1, new_x="LMARGIN", new_y="NEXT")
        else:
            add_para(pdf, "No variables.", size=9)
        pdf.ln(3)
        add_para(
            pdf,
            "Submit checklist: brand plain text present | examples filled | sequential variables | "
            "correct Meta category.",
            size=8,
        )

    pdf.add_page()
    add_title(pdf, "BillVyapp event -> template", 13)
    mapping = [
        ("Login / signup OTP", "starrkuts_login_otp"),
        ("Appointment confirmed", "starrkuts_appt_confirm"),
        ("Appointment reminder", "starrkuts_appt_reminder"),
        ("Delay notice", "starrkuts_appt_delay"),
        ("Visit complete thank-you", "starrkuts_thank_you_visit"),
        ("Upcoming appointment", "starrkuts_appt_upcoming"),
        ("Loyalty nudge", "starrkuts_loyalty_points"),
        ("Member offer", "starrkuts_member_offer"),
        ("Birthday campaign", "starrkuts_birthday_offer"),
        ("Payment success", "starrkuts_payment_received"),
        ("Payment due", "starrkuts_payment_due"),
        ("Payment overdue", "starrkuts_payment_overdue"),
        ("Coupon send", "starrkuts_coupon_send"),
        ("Feedback request", "starrkuts_feedback_request"),
        ("Staff new booking", "starrkuts_staff_new_booking"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(245, 245, 245)
    pdf.cell(95, 6, "App event", border=1, fill=True)
    pdf.cell(0, 6, "Template name", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8)
    for event, name in mapping:
        pdf.cell(95, 6, event, border=1)
        pdf.cell(0, 6, name, border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    add_para(
        pdf,
        "Also see: WHATSAPP-MESSAGE-TEMPLATES.md, WhatsApp-Message-Templates-Submit.csv, "
        "WhatsMark-Contact-Import-Template.csv",
        size=8,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
