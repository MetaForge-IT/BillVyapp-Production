"""Generate separate BillVyapp SMS and WhatsApp template requirement PDFs."""
from __future__ import annotations

from datetime import date
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent
SMS_OUT = ROOT
WA_OUT = ROOT.parent / "whatsapp-templates"
WA_OUT.mkdir(parents=True, exist_ok=True)

SAMPLES = {
    "salon": "BillVyapp",
    "name": "Priya Sharma",
    "otp": "482917",
    "mins": "10",
    "amount": "Rs.1,850",
    "invoice": "INV-2026-0842",
    "points": "450",
    "tier": "GOLD",
    "code": "SAVE20",
    "title": "Weekend Glow Offer",
    "discount": "20% OFF",
    "valid": "31-Aug-2026",
    "due": "20-Jul-2026",
    "date": "28-Jul-2026",
    "time": "11:30 AM",
    "service": "Hair Spa + Cut",
    "staff": "Ananya",
    "branch": "Koramangala",
    "link": "https://billvy.app/r/abc123",
}

# Shared business use-cases; channel-specific body/format applied per PDF set.
USE_CASES = [
    {
        "key": "otp",
        "name": "Login / Registration OTP",
        "priority": "P0 - Must have",
        "module": "Auth (LoginPage, registration verification)",
        "variables": ["{salon_name}", "{otp}", "{expires_minutes}"],
        "sms": {
            "id": "SMS-01",
            "category": "Authentication",
            "dlt_type": "Transactional / OTP",
            "char_limit": "160 (1 SMS segment preferred)",
            "body": (
                "{salon_name}: Your verification code is {otp}. "
                "Valid for {expires_minutes} minutes. Do not share this code."
            ),
            "source": "backend sms providers (Twilio/Textlocal OTP builders)",
            "notes": "MSG91 uses registered DLT OTP template_id + OTP API.",
        },
        "wa": {
            "id": "WA-01",
            "category": "AUTHENTICATION",
            "meta_category": "AUTHENTICATION",
            "template_name": "verification_otp",
            "language": "en",
            "body": (
                "Your verification code for {salon_name} is {otp}. "
                "Valid for {expires_minutes} minutes. Do not share this code."
            ),
            "source": "whatsapp.config otpTemplateName; Meta/360dialog providers",
            "notes": "Requires Meta AUTHENTICATION template approval before production.",
        },
    },
    {
        "key": "appt_confirm",
        "name": "Appointment Confirmation",
        "priority": "P0 - Must have",
        "module": "Appointments Notify; New Appointment",
        "variables": [
            "{customer_name}",
            "{salon_name}",
            "{date}",
            "{time}",
            "{service}",
            "{branch}",
        ],
        "sms": {
            "id": "SMS-02",
            "category": "Appointments",
            "dlt_type": "Service Implicit / Transactional",
            "char_limit": "160-320",
            "body": (
                "Dear {customer_name}, your appointment at {salon_name} is confirmed "
                "for {date} at {time} ({service}, {branch}). We look forward to seeing you!"
            ),
            "source": "Appointments.tsx NOTIFY_TEMPLATES[confirm]",
            "current_ui": (
                "Dear {customer_name}, your appointment at BillVyapp is confirmed. "
                "We look forward to seeing you!"
            ),
        },
        "wa": {
            "id": "WA-02",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "appointment_confirmation",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Your appointment at *{salon_name}* is confirmed.\n\n"
                "Date: {date}\nTime: {time}\nService: {service}\nBranch: {branch}\n\n"
                "We look forward to seeing you!"
            ),
            "source": "Appointments Notify modal (WhatsApp button)",
        },
    },
    {
        "key": "appt_reminder",
        "name": "Appointment Reminder",
        "priority": "P0 - Must have",
        "module": "Appointments Notify; automated reminder",
        "variables": ["{customer_name}", "{salon_name}", "{date}", "{time}"],
        "sms": {
            "id": "SMS-03",
            "category": "Appointments",
            "dlt_type": "Service Implicit / Transactional",
            "char_limit": "160-320",
            "body": (
                "Hi {customer_name}, reminder: your appointment at {salon_name} "
                "is on {date} at {time}. See you soon!"
            ),
            "source": "Appointments.tsx NOTIFY_TEMPLATES[reminder]",
            "current_ui": (
                "Hi {customer_name}, this is a friendly reminder about your upcoming "
                "appointment at BillVyapp. See you soon!"
            ),
        },
        "wa": {
            "id": "WA-03",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "appointment_reminder",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Friendly reminder from *{salon_name}*.\n\n"
                "Your appointment is on {date} at {time}.\n\n"
                "See you soon!"
            ),
            "source": "Appointments Notify; highest ROI for no-show reduction",
        },
    },
    {
        "key": "delay",
        "name": "Running Late / Delay",
        "priority": "P1",
        "module": "Appointments Notify modal",
        "variables": ["{customer_name}", "{salon_name}", "{delay_mins}"],
        "sms": {
            "id": "SMS-04",
            "category": "Appointments",
            "dlt_type": "Service Implicit",
            "char_limit": "160-320",
            "body": (
                "Hi {customer_name}, we are running about {delay_mins} minutes behind "
                "at {salon_name}. Thank you for your patience - we will see you shortly."
            ),
            "source": "Appointments.tsx NOTIFY_TEMPLATES[delay]",
        },
        "wa": {
            "id": "WA-04",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "appointment_delay",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "We are running about *{delay_mins} minutes* behind at {salon_name}.\n\n"
                "Thank you for your patience - we will see you shortly."
            ),
            "source": "Appointments.tsx delay template",
        },
    },
    {
        "key": "thanks",
        "name": "Thank You After Visit",
        "priority": "P1",
        "module": "Appointments Notify; post-checkout",
        "variables": ["{customer_name}", "{salon_name}"],
        "sms": {
            "id": "SMS-05",
            "category": "Appointments",
            "dlt_type": "Service Explicit / Promotional",
            "char_limit": "160-320",
            "body": (
                "Thank you for visiting {salon_name}, {customer_name}! "
                "We hope you loved your experience. Book again anytime."
            ),
            "source": "Appointments + CustomersCommModals Thank you",
        },
        "wa": {
            "id": "WA-05",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "visit_thank_you",
            "language": "en",
            "body": (
                "Thank you for visiting *{salon_name}*, {customer_name}!\n\n"
                "We hope you loved your experience. Book again anytime."
            ),
            "source": "Appointments / Customers thank-you flows",
        },
    },
    {
        "key": "upcoming",
        "name": "Upcoming Appointment (Customers)",
        "priority": "P1",
        "module": "Customers NotifyCustomerModal",
        "variables": ["{customer_name}", "{salon_name}"],
        "sms": {
            "id": "SMS-06",
            "category": "Customers",
            "dlt_type": "Service Implicit",
            "char_limit": "160-320",
            "body": (
                "Hi {customer_name}, your appointment at {salon_name} is coming up! "
                "Reply to confirm."
            ),
            "source": "CustomersCommModals Appointment template",
        },
        "wa": {
            "id": "WA-06",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "appointment_upcoming",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Your appointment at *{salon_name}* is coming up!\n\n"
                "Reply to confirm."
            ),
            "source": "CustomersCommModals",
        },
    },
    {
        "key": "loyalty",
        "name": "Loyalty Points Reminder",
        "priority": "P1",
        "module": "Customers Notify; Loyalty offer",
        "variables": ["{customer_name}", "{loyalty_points}", "{salon_name}"],
        "sms": {
            "id": "SMS-07",
            "category": "Customers / Loyalty",
            "dlt_type": "Promotional",
            "char_limit": "160-320",
            "body": (
                "Dear {customer_name}, you have {loyalty_points} loyalty points! "
                "Redeem them on your next visit at {salon_name}."
            ),
            "source": "CustomersCommModals Loyalty offer",
        },
        "wa": {
            "id": "WA-07",
            "category": "MARKETING",
            "meta_category": "MARKETING",
            "template_name": "loyalty_points_reminder",
            "language": "en",
            "body": (
                "Dear {customer_name},\n\n"
                "You have *{loyalty_points}* loyalty points at {salon_name}!\n\n"
                "Redeem them on your next visit."
            ),
            "source": "Customers loyalty notify",
        },
    },
    {
        "key": "membership",
        "name": "Membership / Member Offer",
        "priority": "P1",
        "module": "Customers openNotify default",
        "variables": [
            "{customer_name}",
            "{membership_tier}",
            "{salon_name}",
            "{loyalty_points}",
        ],
        "sms": {
            "id": "SMS-08",
            "category": "Customers / Loyalty",
            "dlt_type": "Promotional",
            "char_limit": "320",
            "body": (
                "Dear {customer_name}, thank you for being a valued {membership_tier} "
                "member at {salon_name}! Your loyalty points: {loyalty_points}. "
                "Book your next appointment today!"
            ),
            "source": "Customers.tsx openNotify default",
        },
        "wa": {
            "id": "WA-08",
            "category": "MARKETING",
            "meta_category": "MARKETING",
            "template_name": "membership_offer",
            "language": "en",
            "body": (
                "Dear {customer_name},\n\n"
                "Thank you for being a valued *{membership_tier}* member at {salon_name}!\n\n"
                "Loyalty points: {loyalty_points}\n\n"
                "Book your next appointment today!"
            ),
            "source": "Customers.tsx member offer",
        },
    },
    {
        "key": "birthday",
        "name": "Birthday Wish + Offer",
        "priority": "P1",
        "module": "Customers Birthday template",
        "variables": ["{customer_name}", "{discount}", "{salon_name}"],
        "sms": {
            "id": "SMS-09",
            "category": "Customers",
            "dlt_type": "Promotional",
            "char_limit": "160-320",
            "body": (
                "Happy Birthday {customer_name}! Enjoy a special {discount} "
                "on your next visit at {salon_name}."
            ),
            "source": "CustomersCommModals Birthday",
        },
        "wa": {
            "id": "WA-09",
            "category": "MARKETING",
            "meta_category": "MARKETING",
            "template_name": "birthday_offer",
            "language": "en",
            "body": (
                "Happy Birthday {customer_name}!\n\n"
                "Enjoy a special *{discount}* on your next visit at {salon_name}."
            ),
            "source": "Customers birthday template",
        },
    },
    {
        "key": "receipt",
        "name": "Payment Received Receipt",
        "priority": "P0 - Must have",
        "module": "Appointments receipt share; Finance receipts",
        "variables": ["{customer_name}", "{amount}", "{salon_name}", "{invoice_no}"],
        "sms": {
            "id": "SMS-10",
            "category": "Billing / Receipts",
            "dlt_type": "Transactional",
            "char_limit": "160",
            "body": (
                "Dear {customer_name}, {amount} received at {salon_name}. "
                "Invoice: {invoice_no}. Thank you!"
            ),
            "source": "Appointments.tsx receipt SMS share",
        },
        "wa": {
            "id": "WA-10",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "payment_receipt",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Your payment of *{amount}* at *{salon_name}* has been received.\n\n"
                "Invoice: {invoice_no}\n\n"
                "Thank you for visiting us!"
            ),
            "source": "Appointments.tsx receipt WhatsApp share",
        },
    },
    {
        "key": "pay_due",
        "name": "Payment Reminder (Due)",
        "priority": "P1",
        "module": "FinanceReceiptsModule Pending payments",
        "variables": [
            "{customer_name}",
            "{salon_name}",
            "{invoice_no}",
            "{amount}",
            "{due_date}",
        ],
        "sms": {
            "id": "SMS-11",
            "category": "Finance",
            "dlt_type": "Transactional / Service Implicit",
            "char_limit": "320",
            "body": (
                "Hi {customer_name}, friendly reminder from {salon_name}. "
                "Invoice {invoice_no} has outstanding balance of {amount} "
                "(due {due_date}). Please visit us or reply to settle. Thank you."
            ),
            "source": "FinanceReceiptsModule defaultPaymentReminder",
        },
        "wa": {
            "id": "WA-11",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "payment_due_reminder",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Friendly reminder from *{salon_name}*.\n\n"
                "Invoice {invoice_no} has an outstanding balance of *{amount}* "
                "(due {due_date}).\n\n"
                "Please visit us or reply to settle. Thank you."
            ),
            "source": "FinanceReceiptsModule WhatsApp reminder",
        },
    },
    {
        "key": "pay_overdue",
        "name": "Payment Reminder (Overdue)",
        "priority": "P1",
        "module": "FinanceReceiptsModule Pending payments",
        "variables": [
            "{customer_name}",
            "{amount}",
            "{invoice_no}",
            "{salon_name}",
            "{due_date}",
        ],
        "sms": {
            "id": "SMS-12",
            "category": "Finance",
            "dlt_type": "Transactional / Service Implicit",
            "char_limit": "320",
            "body": (
                "Hi {customer_name}, your payment of {amount} for invoice {invoice_no} "
                "at {salon_name} was due on {due_date}. Please contact us to arrange "
                "payment at your earliest convenience. Thank you."
            ),
            "source": "FinanceReceiptsModule overdue reminder",
        },
        "wa": {
            "id": "WA-12",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "payment_overdue_reminder",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Your payment of *{amount}* for invoice {invoice_no} at {salon_name} "
                "was due on {due_date}.\n\n"
                "Please contact us to arrange payment at your earliest convenience.\n\n"
                "Thank you."
            ),
            "source": "FinanceReceiptsModule overdue WhatsApp",
        },
    },
    {
        "key": "coupon",
        "name": "Coupon Send (Single / Bulk)",
        "priority": "P1",
        "module": "CouponsSection; Customers SendCouponModal",
        "variables": [
            "{customer_name}",
            "{salon_name}",
            "{coupon_code}",
            "{discount}",
            "{valid_till}",
            "{title}",
        ],
        "sms": {
            "id": "SMS-13",
            "category": "Coupons / Promotions",
            "dlt_type": "Promotional",
            "char_limit": "160-320",
            "body": (
                "Hi {customer_name}! Exclusive offer from {salon_name}: use code "
                "{coupon_code} for {discount} ({title}). Valid till {valid_till}. T&Cs apply."
            ),
            "source": "Recommended production SMS body",
            "notes": "Requires promotional DLT sender ID in India.",
        },
        "wa": {
            "id": "WA-13",
            "category": "MARKETING",
            "meta_category": "MARKETING",
            "template_name": "coupon_offer",
            "language": "en",
            "body": (
                "Hi {customer_name}!\n\n"
                "Exclusive offer from *{salon_name}*:\n\n"
                "Code: *{coupon_code}*\nOffer: {discount}\n{title}\n"
                "Valid till: {valid_till}\n\n"
                "T&Cs apply."
            ),
            "source": "Coupons / Customers coupon send",
        },
    },
    {
        "key": "feedback",
        "name": "Request Feedback / Review",
        "priority": "P2",
        "module": "Feedback Request modal",
        "variables": ["{customer_name}", "{salon_name}", "{feedback_link}"],
        "sms": {
            "id": "SMS-14",
            "category": "Feedback",
            "dlt_type": "Service Explicit / Promotional",
            "char_limit": "160-320",
            "body": (
                "Hi {customer_name}, thank you for visiting {salon_name}! "
                "Please share your feedback: {feedback_link}"
            ),
            "source": "Feedback.tsx channel picker",
        },
        "wa": {
            "id": "WA-14",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "feedback_request",
            "language": "en",
            "body": (
                "Hi {customer_name},\n\n"
                "Thank you for visiting *{salon_name}*!\n\n"
                "Please share your feedback:\n{feedback_link}"
            ),
            "source": "Feedback.tsx WhatsApp request",
        },
    },
    {
        "key": "booking",
        "name": "New Appointment Booking Notify",
        "priority": "P0 - Must have",
        "module": "NewAppointmentModal notifyMethod",
        "variables": [
            "{customer_name}",
            "{salon_name}",
            "{date}",
            "{time}",
            "{service}",
            "{staff}",
            "{branch}",
        ],
        "sms": {
            "id": "SMS-15",
            "category": "Appointments",
            "dlt_type": "Transactional",
            "char_limit": "160-320",
            "body": (
                "Dear {customer_name}, booking confirmed at {salon_name} on {date} "
                "{time} for {service} with {staff} ({branch}). See you soon!"
            ),
            "source": "NewAppointmentModal - recommended production body",
        },
        "wa": {
            "id": "WA-15",
            "category": "UTILITY",
            "meta_category": "UTILITY",
            "template_name": "booking_confirmed",
            "language": "en",
            "body": (
                "Dear {customer_name},\n\n"
                "Booking confirmed at *{salon_name}*.\n\n"
                "Date: {date}\nTime: {time}\nService: {service}\n"
                "With: {staff}\nBranch: {branch}\n\n"
                "See you soon!"
            ),
            "source": "NewAppointmentModal WhatsApp notify",
        },
    },
]


def fill(text: str) -> str:
    mapping = {
        "{salon_name}": SAMPLES["salon"],
        "{customer_name}": SAMPLES["name"],
        "{otp}": SAMPLES["otp"],
        "{expires_minutes}": SAMPLES["mins"],
        "{amount}": SAMPLES["amount"],
        "{invoice_no}": SAMPLES["invoice"],
        "{loyalty_points}": SAMPLES["points"],
        "{membership_tier}": SAMPLES["tier"],
        "{coupon_code}": SAMPLES["code"],
        "{discount}": SAMPLES["discount"],
        "{valid_till}": SAMPLES["valid"],
        "{due_date}": SAMPLES["due"],
        "{date}": SAMPLES["date"],
        "{time}": SAMPLES["time"],
        "{service}": SAMPLES["service"],
        "{staff}": SAMPLES["staff"],
        "{branch}": SAMPLES["branch"],
        "{feedback_link}": SAMPLES["link"],
        "{title}": SAMPLES["title"],
        "{delay_mins}": "15",
    }
    out = text
    for key, value in mapping.items():
        out = out.replace(key, value)
    return out.replace("BillVyapp", SAMPLES["salon"])


def to_dlt(body: str, variables: list[str]) -> str:
    out = body
    for var in variables:
        inner = var.strip("{}")
        out = out.replace(var, "{#" + inner + "#}")
    return out


def to_meta_vars(body: str, variables: list[str]) -> str:
    """Show body with {{1}}, {{2}} style Meta placeholders in variable order."""
    out = body
    for i, var in enumerate(variables, start=1):
        out = out.replace(var, "{{" + str(i) + "}}")
    return out


class Doc(FPDF):
    def __init__(self, brand_line: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.brand_line = brand_line

    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(17, 17, 24)
        self.cell(0, 6, self.brand_line, align="L")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(154, 154, 154)
        self.cell(
            0,
            6,
            f"Confidential  |  {date.today().isoformat()}",
            align="R",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.set_draw_color(212, 175, 55)
        self.set_line_width(0.4)
        self.line(10, self.get_y() + 1, 200, self.get_y() + 1)
        self.ln(6)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(154, 154, 154)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")

    def h2(self, text: str) -> None:
        self.ln(2)
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(17, 17, 24)
        self.multi_cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def h3(self, text: str) -> None:
        self.ln(1)
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(184, 150, 46)
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(0.5)

    def body_text(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 5.2, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def bullet(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 5.2, f"  -  {text}", new_x="LMARGIN", new_y="NEXT")

    def kv(self, key: str, value: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(107, 107, 107)
        self.cell(42, 5, key)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5, value, new_x="LMARGIN", new_y="NEXT")

    def box(self, title: str, text: str, fill=(250, 249, 247)) -> None:
        self.set_fill_color(*fill)
        self.set_draw_color(212, 175, 55)
        x = self.l_margin
        w = self.epw
        self.set_font("Courier", "", 8.5)
        lines = self.multi_cell(w - 6, 4.8, text, dry_run=True, output="LINES")
        height = 8 + len(lines) * 4.8 + 4
        if self.get_y() + height > self.h - 20:
            self.add_page()
        y0 = self.get_y()
        self.rect(x, y0, w, height, style="DF")
        self.set_xy(x + 3, y0 + 2)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(154, 125, 32)
        self.cell(0, 4, title)
        self.set_xy(x + 3, y0 + 7)
        self.set_font("Courier", "", 8.5)
        self.set_text_color(17, 17, 24)
        self.multi_cell(w - 6, 4.8, text, new_x="LMARGIN", new_y="NEXT")
        self.set_y(y0 + height + 2)
        self.set_x(self.l_margin)

    def cover(self, title: str, subtitle: str, channel: str) -> None:
        self.set_fill_color(17, 17, 24)
        self.rect(0, 0, 210, 78, "F")
        self.set_xy(14, 16)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(212, 175, 55)
        self.cell(0, 6, f"BILLVYAPP  |  {channel} TEMPLATES ONLY")
        self.set_xy(14, 28)
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(255, 255, 255)
        self.multi_cell(180, 9, title, new_x="LMARGIN", new_y="NEXT")
        self.set_xy(14, 56)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(200, 200, 200)
        self.multi_cell(
            180,
            5,
            f"{subtitle}  |  {date.today().isoformat()}",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.set_y(88)


def sms_rows():
    rows = []
    for uc in USE_CASES:
        row = {
            "name": uc["name"],
            "priority": uc["priority"],
            "module": uc["module"],
            "variables": uc["variables"],
            **uc["sms"],
        }
        rows.append(row)
    return rows


def wa_rows():
    rows = []
    for uc in USE_CASES:
        row = {
            "name": uc["name"],
            "priority": uc["priority"],
            "module": uc["module"],
            "variables": uc["variables"],
            **uc["wa"],
        }
        rows.append(row)
    return rows


def safe_output(pdf: FPDF, path: Path) -> Path:
    try:
        pdf.output(path)
        return path
    except PermissionError:
        alt = path.with_name(path.stem + "-NEW" + path.suffix)
        pdf.output(alt)
        print(f"WARNING: {path.name} is locked (close it in the viewer). Wrote {alt.name} instead.")
        return alt


def build_sms_catalog() -> Path:
    pdf = Doc("BillVyapp - SMS Template Requirements", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.cover(
        "SMS Template Catalog",
        "SMS channel only - MSG91 / Twilio / Textlocal / India DLT",
        "SMS",
    )
    templates = sms_rows()

    pdf.h2("1. Scope")
    pdf.body_text(
        "This PDF covers SMS templates only. WhatsApp templates are documented in a "
        "separate set under docs/whatsapp-templates/."
    )
    pdf.h2("2. SMS integration notes")
    for item in [
        "Provider: MSG91 recommended for India (DLT). Twilio/Textlocal also supported.",
        "Enable with SMS_ENABLED=true and provider credentials in backend .env.",
        "OTP (SMS-01) is P0 and should be wired for login/registration first.",
        "Free-form staff notify is OK in UI drafts; auto-sends must use approved DLT text.",
        "Do not mix WhatsApp formatting (*bold*, newlines) into SMS DLT bodies.",
    ]:
        pdf.bullet(item)

    pdf.h2("3. Template index")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(17, 17, 24)
    pdf.set_text_color(212, 175, 55)
    cols = [18, 40, 76, 28, 28]
    for i, header in enumerate(["ID", "Category", "Template", "Priority", "DLT type"]):
        pdf.cell(cols[i], 7, header, border=0, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for i, t in enumerate(templates):
        if pdf.get_y() > 270:
            pdf.add_page()
        pdf.set_fill_color(*((250, 249, 247) if i % 2 == 0 else (255, 255, 255)))
        pdf.set_text_color(30, 30, 30)
        row = [
            t["id"],
            t["category"][:20],
            t["name"][:40],
            t["priority"].split("-")[0].strip()[:10],
            t["dlt_type"].split("/")[0].strip()[:14],
        ]
        for j, val in enumerate(row):
            pdf.cell(cols[j], 6, val, border=0, fill=True)
        pdf.ln()

    pdf.add_page()
    pdf.h2("4. SMS template specifications")
    for t in templates:
        if pdf.get_y() > 195:
            pdf.add_page()
        pdf.h3(f"{t['id']}  |  {t['name']}")
        pdf.kv("Priority", t["priority"])
        pdf.kv("Category", t["category"])
        pdf.kv("Module / UI", t["module"])
        pdf.kv("Channel", "SMS only")
        pdf.kv("DLT category", t["dlt_type"])
        pdf.kv("Length target", t["char_limit"])
        pdf.kv("Variables", ", ".join(t["variables"]))
        pdf.kv("Code source", t["source"])
        if t.get("notes"):
            pdf.kv("Notes", t["notes"])
        if t.get("current_ui"):
            pdf.box("CURRENT UI COPY", fill(t["current_ui"]), fill=(255, 251, 235))
        pdf.box("SMS / DLT TEMPLATE BODY", t["body"], fill=(245, 248, 255))
        filled = fill(t["body"])
        pdf.box("SAMPLE FILLED SMS", filled, fill=(240, 253, 244))
        segments = (len(filled) - 1) // 160 + 1
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(154, 154, 154)
        pdf.cell(0, 4, f"Filled length: {len(filled)} chars (~{segments} SMS segment(s))")
        pdf.ln(6)

    pdf.add_page()
    pdf.h2("5. Suggested SMS .env keys")
    pdf.box(
        "CONFIG",
        "\n".join(
            [
                "SMS_ENABLED=true",
                "SMS_PROVIDER=msg91",
                "SMS_MSG91_AUTH_KEY=...",
                "SMS_OTP_TEMPLATE_ID=<SMS-01>",
                "SMS_TEMPLATE_APPT_CONFIRM=<SMS-02>",
                "SMS_TEMPLATE_APPT_REMINDER=<SMS-03>",
                "SMS_TEMPLATE_RECEIPT=<SMS-10>",
                "SMS_TEMPLATE_PAYMENT_DUE=<SMS-11>",
                "SMS_TEMPLATE_COUPON=<SMS-13>",
                "SMS_TEMPLATE_FEEDBACK=<SMS-14>",
                "SMS_DEFAULT_COUNTRY_CODE=91",
                "VERIFICATION_CHANNELS=email,sms",
            ]
        ),
        fill=(245, 245, 248),
    )

    out = SMS_OUT / "BillVyapp-SMS-Templates-Complete.pdf"
    return safe_output(pdf, out)


def build_sms_dlt() -> Path:
    pdf = Doc("BillVyapp - SMS DLT Submission Pack", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.cover(
        "SMS DLT Submission Pack",
        "SMS only - copy-paste bodies for India DLT / MSG91",
        "SMS",
    )
    pdf.body_text(
        "Use {#var#} syntax below when submitting to DLT / MSG91. "
        "This pack does not include WhatsApp templates."
    )
    for t in sms_rows():
        if pdf.get_y() > 245:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(17, 17, 24)
        pdf.set_x(pdf.l_margin)
        pdf.cell(
            0,
            6,
            f"{t['id']} | {t['name']} | {t['dlt_type']}",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.box("DLT BODY", to_dlt(t["body"], t["variables"]), fill=(250, 249, 247))
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(107, 107, 107)
        pdf.multi_cell(0, 4, "Variables: " + ", ".join(t["variables"]), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    out = SMS_OUT / "BillVyapp-SMS-DLT-Submission-Pack.pdf"
    return safe_output(pdf, out)


def build_sms_matrix() -> Path:
    pdf = Doc("BillVyapp - SMS Requirements Matrix", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.cover(
        "SMS Requirements Matrix",
        "SMS channel only - rollout phases and priorities",
        "SMS",
    )
    by_id = {t["id"]: t for t in sms_rows()}

    pdf.h2("Phase 1 - Enable first")
    for tid in ["SMS-01", "SMS-02", "SMS-03", "SMS-10", "SMS-15"]:
        t = by_id[tid]
        pdf.bullet(f"{tid} {t['name']} - {t['module']}")

    pdf.h2("Phase 2 - Retention / finance")
    for tid in ["SMS-04", "SMS-05", "SMS-06", "SMS-11", "SMS-12", "SMS-14"]:
        t = by_id[tid]
        pdf.bullet(f"{tid} {t['name']}")

    pdf.h2("Phase 3 - Promotional SMS (promo DLT header)")
    for tid in ["SMS-07", "SMS-08", "SMS-09", "SMS-13"]:
        t = by_id[tid]
        pdf.bullet(f"{tid} {t['name']}")

    pdf.h2("SMS channel rules")
    for item in [
        "OTP / auth -> SMS (primary until WhatsApp AUTH template approved separately)",
        "Keep SMS bodies single-segment where possible (especially receipts and OTP)",
        "Promotional templates need separate promo sender ID in India",
        "Backend: SMS_ENABLED + SMS_PROVIDER + template IDs",
    ]:
        pdf.bullet(item)

    pdf.h2("Current SMS status in app")
    for item in [
        "Providers coded: Twilio, MSG91, Textlocal",
        "SMS_ENABLED=false by default",
        "Many UI Send SMS actions are simulated or open device sms: links",
        "Login UI says SMS OTP; wire SMS-01 for real delivery",
    ]:
        pdf.bullet(item)

    out = SMS_OUT / "BillVyapp-SMS-Requirements-Matrix.pdf"
    return safe_output(pdf, out)


def build_wa_catalog() -> Path:
    pdf = Doc("BillVyapp - WhatsApp Template Requirements", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.cover(
        "WhatsApp Template Catalog",
        "WhatsApp channel only - Meta Cloud API / Twilio / 360dialog",
        "WHATSAPP",
    )
    templates = wa_rows()

    pdf.h2("1. Scope")
    pdf.body_text(
        "This PDF covers WhatsApp Business templates only. SMS / DLT templates are in "
        "docs/sms-templates/."
    )
    pdf.h2("2. WhatsApp integration notes")
    for item in [
        "Provider: Meta Cloud API recommended (also Twilio WhatsApp, 360dialog).",
        "Enable with WHATSAPP_ENABLED=true and Meta token + phone_number_id.",
        "Business-initiated messages outside the 24h window require approved templates.",
        "Meta categories: AUTHENTICATION, UTILITY, MARKETING.",
        "Prefer WhatsApp for reminders, coupons, feedback; use SMS as fallback.",
        "OTP WhatsApp (WA-01) only after AUTHENTICATION template is approved.",
    ]:
        pdf.bullet(item)

    pdf.h2("3. Template index")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(17, 17, 24)
    pdf.set_text_color(212, 175, 55)
    cols = [16, 34, 70, 26, 44]
    for i, header in enumerate(["ID", "Meta cat.", "Template", "Priority", "Template name"]):
        pdf.cell(cols[i], 7, header, border=0, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for i, t in enumerate(templates):
        if pdf.get_y() > 270:
            pdf.add_page()
        pdf.set_fill_color(*((250, 249, 247) if i % 2 == 0 else (255, 255, 255)))
        pdf.set_text_color(30, 30, 30)
        row = [
            t["id"],
            t["meta_category"][:16],
            t["name"][:38],
            t["priority"].split("-")[0].strip()[:10],
            t["template_name"][:24],
        ]
        for j, val in enumerate(row):
            pdf.cell(cols[j], 6, val, border=0, fill=True)
        pdf.ln()

    pdf.add_page()
    pdf.h2("4. WhatsApp template specifications")
    for t in templates:
        if pdf.get_y() > 185:
            pdf.add_page()
        pdf.h3(f"{t['id']}  |  {t['name']}")
        pdf.kv("Priority", t["priority"])
        pdf.kv("Meta category", t["meta_category"])
        pdf.kv("Template name", t["template_name"])
        pdf.kv("Language", t.get("language", "en"))
        pdf.kv("Module / UI", t["module"])
        pdf.kv("Channel", "WhatsApp only")
        pdf.kv("Variables", ", ".join(t["variables"]))
        pdf.kv("Code source", t["source"])
        if t.get("notes"):
            pdf.kv("Notes", t["notes"])
        pdf.box("WHATSAPP MESSAGE BODY", t["body"], fill=(236, 253, 245))
        pdf.box(
            "META PLACEHOLDER BODY ({{n}})",
            to_meta_vars(t["body"], t["variables"]),
            fill=(245, 248, 255),
        )
        pdf.box("SAMPLE FILLED MESSAGE", fill(t["body"]), fill=(255, 251, 235))
        pdf.ln(2)

    pdf.add_page()
    pdf.h2("5. Suggested WhatsApp .env keys")
    pdf.box(
        "CONFIG",
        "\n".join(
            [
                "WHATSAPP_ENABLED=true",
                "WHATSAPP_PROVIDER=meta",
                "WHATSAPP_ACCESS_TOKEN=...",
                "WHATSAPP_PHONE_NUMBER_ID=...",
                "WHATSAPP_BUSINESS_ACCOUNT_ID=...",
                "WHATSAPP_API_VERSION=v21.0",
                "WHATSAPP_OTP_TEMPLATE_NAME=verification_otp",
                "WHATSAPP_OTP_TEMPLATE_LANGUAGE=en",
            ]
        ),
        fill=(245, 245, 248),
    )

    out = WA_OUT / "BillVyapp-WhatsApp-Templates-Complete.pdf"
    return safe_output(pdf, out)


def build_wa_meta_pack() -> Path:
    pdf = Doc("BillVyapp - WhatsApp Meta Submission Pack", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.cover(
        "WhatsApp Meta Submission Pack",
        "WhatsApp only - template names, categories, bodies for Meta approval",
        "WHATSAPP",
    )
    pdf.body_text(
        "Submit each template in Meta Business Manager / WhatsApp Manager. "
        "Use {{1}}, {{2}} placeholders in the order listed. SMS DLT packs are separate."
    )
    for t in wa_rows():
        if pdf.get_y() > 230:
            pdf.add_page()
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(17, 17, 24)
        pdf.set_x(pdf.l_margin)
        pdf.cell(
            0,
            6,
            f"{t['id']} | {t['template_name']} | {t['meta_category']}",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.kv("Display name", t["name"])
        pdf.kv("Language", t.get("language", "en"))
        pdf.kv("Variable order", ", ".join(f"{{{{{i}}}}}= {v}" for i, v in enumerate(t["variables"], 1)))
        pdf.box(
            "BODY FOR META",
            to_meta_vars(t["body"], t["variables"]),
            fill=(236, 253, 245),
        )
        pdf.ln(2)

    out = WA_OUT / "BillVyapp-WhatsApp-Meta-Submission-Pack.pdf"
    return safe_output(pdf, out)


def build_wa_matrix() -> Path:
    pdf = Doc("BillVyapp - WhatsApp Requirements Matrix", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.cover(
        "WhatsApp Requirements Matrix",
        "WhatsApp channel only - rollout phases and priorities",
        "WHATSAPP",
    )
    by_id = {t["id"]: t for t in wa_rows()}

    pdf.h2("Phase 1 - Enable first")
    for tid in ["WA-02", "WA-03", "WA-10", "WA-15"]:
        t = by_id[tid]
        pdf.bullet(f"{tid} {t['name']} ({t['template_name']})")
    pdf.bullet("WA-01 verification_otp - only after AUTHENTICATION approval")

    pdf.h2("Phase 2 - Retention / finance")
    for tid in ["WA-04", "WA-05", "WA-06", "WA-11", "WA-12", "WA-14"]:
        t = by_id[tid]
        pdf.bullet(f"{tid} {t['name']}")

    pdf.h2("Phase 3 - Marketing templates")
    for tid in ["WA-07", "WA-08", "WA-09", "WA-13"]:
        t = by_id[tid]
        pdf.bullet(f"{tid} {t['name']} - MARKETING category")

    pdf.h2("WhatsApp channel rules")
    for item in [
        "Reminders, coupons, feedback -> WhatsApp primary",
        "Outside 24h customer-care window -> approved template required",
        "MARKETING templates may have higher rejection/cost - keep copy clean",
        "Fallback to SMS when WhatsApp delivery fails or number has no WA",
    ]:
        pdf.bullet(item)

    pdf.h2("Current WhatsApp status in app")
    for item in [
        "Providers coded: Meta, Twilio WhatsApp, 360dialog",
        "WHATSAPP_ENABLED=false by default",
        "Many UI WhatsApp actions open wa.me or show simulated success",
        "OTP WhatsApp path exists in NotificationService when channel enabled",
    ]:
        pdf.bullet(item)

    out = WA_OUT / "BillVyapp-WhatsApp-Requirements-Matrix.pdf"
    return safe_output(pdf, out)


def cleanup_old_combined() -> None:
    old = SMS_OUT / "BillVyapp-SMS-WhatsApp-Requirements-Matrix.pdf"
    if old.exists():
        old.unlink()
        print(f"Removed combined PDF: {old}")


def main() -> None:
    cleanup_old_combined()
    paths = [
        build_sms_catalog(),
        build_sms_dlt(),
        build_sms_matrix(),
        build_wa_catalog(),
        build_wa_meta_pack(),
        build_wa_matrix(),
    ]
    for path in paths:
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
