"""
Generate BillVyapp User Manual (Manager & Admin) as PDF.

Run:
  python docs/user-manual/generate_user_manual_pdf.py
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "BillVyapp-Manager-Admin-User-Manual.pdf"
APP = "BillVyapp"
CLIENT = "The Starr Kuts"
GOLD = (212, 175, 55)
DARK = (17, 17, 24)
MUTED = (90, 90, 90)
BODY = (40, 40, 40)
LIGHT_BG = (250, 248, 242)


class ManualPDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*DARK)
        self.cell(0, 6, f"{APP} User Manual  |  Manager & Admin", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*GOLD)
        self.set_line_width(0.5)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(5)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(
            0,
            8,
            f"{CLIENT}   |   {APP}   |   {date.today().isoformat()}   |   Page {self.page_no()}/{{nb}}",
            align="C",
        )


def h1(pdf: ManualPDF, text: str) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 8, text)
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.6)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.l_margin + 40, y)
    pdf.ln(4)


def h2(pdf: ManualPDF, text: str) -> None:
    pdf.ln(1)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 7, text)
    pdf.ln(1)


def h3(pdf: ManualPDF, text: str) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 6, text)
    pdf.ln(0.5)


def para(pdf: ManualPDF, text: str, size: int = 10) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", size)
    pdf.set_text_color(*BODY)
    pdf.multi_cell(0, 5.2, text)
    pdf.ln(1.5)


def bold_para(pdf: ManualPDF, text: str, size: int = 10) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", size)
    pdf.set_text_color(*BODY)
    pdf.multi_cell(0, 5.2, text)
    pdf.ln(1)


def bullet(pdf: ManualPDF, text: str, indent: float = 4) -> None:
    x = pdf.l_margin
    pdf.set_xy(x + indent, pdf.get_y())
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*BODY)
    pdf.multi_cell(pdf.w - pdf.r_margin - x - indent, 5.2, f"-  {text}")
    pdf.ln(0.4)


def step(pdf: ManualPDF, num: int, text: str) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*DARK)
    pdf.cell(10, 5.5, f"{num}.")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*BODY)
    pdf.multi_cell(0, 5.5, text)
    pdf.ln(0.6)


def callout(pdf: ManualPDF, title: str, text: str) -> None:
    x = pdf.l_margin
    w = pdf.w - pdf.l_margin - pdf.r_margin
    y0 = pdf.get_y()
    pdf.set_xy(x + 3, y0 + 2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(w - 6, 5, title)
    pdf.set_x(x + 3)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*BODY)
    pdf.multi_cell(w - 6, 4.8, text)
    y1 = pdf.get_y() + 2
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.6)
    pdf.line(x, y0, x, y1)
    pdf.set_y(y1)
    pdf.ln(3)


def table(pdf: ManualPDF, headers: list[str], rows: list[list[str]], col_widths: list[float] | None = None) -> None:
    usable = pdf.w - pdf.l_margin - pdf.r_margin
    if col_widths is None:
        col_widths = [usable / len(headers)] * len(headers)
    # header
    pdf.set_fill_color(17, 17, 24)
    pdf.set_text_color(212, 175, 55)
    pdf.set_font("Helvetica", "B", 8)
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 7, f" {h}", border=0, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*BODY)
    fill = False
    for row in rows:
        if pdf.get_y() > pdf.h - 28:
            pdf.add_page()
            pdf.set_fill_color(17, 17, 24)
            pdf.set_text_color(212, 175, 55)
            pdf.set_font("Helvetica", "B", 8)
            for i, h in enumerate(headers):
                pdf.cell(col_widths[i], 7, f" {h}", border=0, fill=True)
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*BODY)
        # row height from tallest cell
        line_h = 4.5
        max_lines = 1
        for i, cell in enumerate(row):
            lines = pdf.multi_cell(col_widths[i], line_h, f" {cell}", dry_run=True, output="LINES")
            max_lines = max(max_lines, len(lines))
        row_h = max(line_h * max_lines + 2, 7)
        y = pdf.get_y()
        x = pdf.l_margin
        if fill:
            pdf.set_fill_color(248, 246, 240)
        else:
            pdf.set_fill_color(255, 255, 255)
        for i, cell in enumerate(row):
            pdf.set_xy(x, y)
            pdf.rect(x, y, col_widths[i], row_h, style="F")
            pdf.set_xy(x, y + 1)
            pdf.multi_cell(col_widths[i], line_h, f" {cell}")
            x += col_widths[i]
        pdf.set_y(y + row_h)
        fill = not fill
    pdf.ln(3)


def ensure_space(pdf: ManualPDF, h: float = 40) -> None:
    if pdf.get_y() > pdf.h - h:
        pdf.add_page()


def cover(pdf: ManualPDF) -> None:
    pdf.add_page()
    pdf.ln(36)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*GOLD)
    pdf.cell(0, 8, APP.upper(), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 12, "User Manual", align="C")
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 8, "For Managers & Admins", align="C")
    pdf.ln(6)
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.8)
    mid = pdf.w / 2
    pdf.line(mid - 30, pdf.get_y(), mid + 30, pdf.get_y())
    pdf.ln(10)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 8, CLIENT, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(
        0,
        6,
        "Salon billing, customers, appointments & operations",
        align="C",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(18)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*BODY)
    pdf.multi_cell(
        0,
        5.5,
        "This guide explains how to sign in, navigate the app, and complete everyday tasks "
        "such as walk-in billing, customer management, expenses, services, inventory, and revenue reports.\n\n"
        f"Document date: {date.today().strftime('%d %B %Y')}\n"
        "Audience: Salon Manager   |   Salon Admin",
        align="C",
    )
    pdf.ln(20)
    callout(
        pdf,
        "Tip",
        "Keep this PDF handy during training. Most screens are reached from the left sidebar. "
        "Menus you see depend on whether you signed in as Manager or Admin.",
    )


def toc(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "Contents")
    items = [
        "1. Getting started (login & session)",
        "2. Who sees what (Manager vs Admin)",
        "3. Navigation map",
        "4. Dashboard",
        "5. Walk-in Billing (Manager)",
        "6. Appointments (Manager)",
        "7. Customers",
        "8. Services & bulk upload",
        "9. Expenses",
        "10. Revenue Report (Admin)",
        "11. Inventory",
        "12. Notifications, Profile & Help",
        "13. Quick day-one checklists",
        "14. Troubleshooting",
    ]
    for item in items:
        para(pdf, item, size=11)


def section_login(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "1. Getting started")
    h2(pdf, "Sign in")
    step(pdf, 1, "Open the application login page.")
    step(pdf, 2, "Enter your email or mobile number, and your password.")
    step(pdf, 3, "Submit. You will usually receive a 6-digit OTP on your registered phone.")
    step(pdf, 4, "Enter the OTP. You can request a new code after about 60 seconds.")
    step(pdf, 5, "On success you land on the Dashboard (or the page you were trying to open).")
    callout(
        pdf,
        "Forgot password?",
        "Use Forgot password on the login screen. Follow the email link (valid for about 1 hour) "
        "to set a new password, then sign in again.",
    )
    h2(pdf, "Session & security")
    bullet(pdf, "Your session is restored automatically when you refresh the browser.")
    bullet(pdf, "If your session expires, you are asked to sign in again. Use the same login + OTP flow.")
    bullet(pdf, "Sign out from your profile menu when you leave a shared computer.")
    bullet(pdf, "Never share your OTP or password with anyone.")


def section_roles(pdf: ManualPDF) -> None:
    ensure_space(pdf, 60)
    pdf.add_page()
    h1(pdf, "2. Who sees what")
    para(
        pdf,
        "BillVyapp shows different menus for Manager and Admin so each role focuses on the right work.",
    )
    table(
        pdf,
        ["Area", "Manager", "Admin"],
        [
            ["Dashboard", "Operations view (schedule, floor, stock alerts)", "Revenue & franchise overview"],
            ["Billing (Walk-in)", "Yes", "No (redirects to Dashboard)"],
            ["Appointments", "Yes", "No"],
            ["Customers", "Yes", "Yes"],
            ["Services", "Yes (add / categories / bulk upload)", "Yes (mostly view)"],
            ["Expenses", "Yes (create; request delete)", "Yes (create; approve/reject delete)"],
            ["Revenue Report", "No", "Yes"],
            ["Inventory", "Yes (incl. Direct Bill)", "Yes (view / manage stock)"],
            ["Notifications / Profile / Help", "Yes", "Yes"],
        ],
        [48, 72, 70],
    )
    callout(
        pdf,
        "Note",
        "A separate Super Admin console exists for platform staff. Salon Managers and Admins do not use it.",
    )


def section_nav(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "3. Navigation map")
    para(pdf, "Use the left sidebar. Items marked * appear only for that role.")
    table(
        pdf,
        ["Menu", "Purpose"],
        [
            ["Dashboard", "Today's snapshot and shortcuts"],
            ["Billing *Manager", "Walk-in checkout: services, customer, pay"],
            ["Appointments *Manager", "Bookings, walk-ins list, new appointments"],
            ["Customers", "Customer list, filters, loyalty, history"],
            ["Services", "Service catalog, packages, coupons"],
            ["Revenue Report *Admin", "Sales receipts, refunds, pending, advances"],
            ["Expenses", "Log and track salon expenses"],
            ["Inventory", "Stock, vendors, orders, movement log"],
        ],
        [55, 135],
    )
    h3(pdf, "Also available from the profile / bell menu")
    bullet(pdf, "Notifications - alerts for appointments, payments, inventory, system")
    bullet(pdf, "My Profile - your name, contact, role, salon")
    bullet(pdf, "Help & Support - FAQs and contact options")
    bullet(pdf, "Sign Out")


def section_dashboard(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "4. Dashboard")
    h2(pdf, "Manager dashboard")
    para(pdf, "Focuses on floor operations for today.")
    bullet(pdf, "Quick Actions: New Walk-in, New Appointment, Add Customer, View Schedule")
    bullet(pdf, "KPIs: today's appointments, walk-ins, on the floor, pending bills, new customers, satisfaction, stock alerts")
    bullet(pdf, "Panels: today's schedule, floor status, low stock, recent feedback, critical alerts")
    h2(pdf, "Admin dashboard")
    para(pdf, "Focuses on revenue and franchise/shop oversight.")
    bullet(pdf, "Revenue KPIs and weekly charts / top services")
    bullet(pdf, "Franchise / shop panel: shop details and creating manager accounts for shops")
    bullet(pdf, "Today's schedule and critical alerts")


def section_billing(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "5. Walk-in Billing (Manager)")
    para(
        pdf,
        "Path: Sidebar -> Billing. Complete three columns in order: Services -> Customer -> Bill.",
    )
    h2(pdf, "Step A - Services")
    step(pdf, 1, "Search and select one or more services from the catalog.")
    step(pdf, 2, "Adjust quantities if needed. At least one service is required to continue.")
    h2(pdf, "Step B - Customer")
    step(pdf, 1, "Enter the customer's 10-digit mobile number (+91). The app looks up existing customers automatically.")
    step(pdf, 2, "If found: name and gender are filled; membership tier may show as a badge.")
    step(pdf, 3, "If new: enter full name and select gender (Male / Female / Other).")
    step(pdf, 4, "Optional: enter Stylist name (saved with the visit).")
    h2(pdf, "Step C - Bill & pay")
    step(pdf, 1, "Review the bill summary and duration estimate.")
    step(pdf, 2, "Apply coupon, loyalty redeem, or % / flat discount (with reason) if needed.")
    step(pdf, 3, "Choose payment method: Cash, Card, or UPI.")
    step(pdf, 4, "Tap Pay to complete checkout, or Confirm without pay to leave a pending balance.")
    h2(pdf, "After payment")
    bullet(pdf, "A success receipt appears. You can share via SMS or WhatsApp.")
    bullet(pdf, "Star rating (1-5) is optional. Tap Done with or without selecting stars.")
    bullet(pdf, "You return to continue the next bill / dashboard as configured.")
    callout(
        pdf,
        "Best practice",
        "Always confirm the mobile number before charging. Existing customers keep history, "
        "loyalty, and membership pricing tied to that number.",
    )


def section_appointments(pdf: ManualPDF) -> None:
    ensure_space(pdf, 50)
    pdf.add_page()
    h1(pdf, "6. Appointments (Manager)")
    para(pdf, "Path: Sidebar -> Appointments.")
    bullet(pdf, "View the schedule / list for the selected date.")
    bullet(pdf, "Filter appointment vs walk-in types when needed.")
    bullet(pdf, "Update status (for example checked-in, completed, no-show) as your floor process requires.")
    bullet(pdf, "Checkout an appointment into billing when the guest is ready to pay.")
    h2(pdf, "New Appointment")
    step(pdf, 1, "Open New Appointment from Dashboard quick action or Appointments.")
    step(pdf, 2, "Select an existing customer or create a new / walk-in customer.")
    step(pdf, 3, "Choose date, time, and services (packages/products if offered).")
    step(pdf, 4, "Confirm the booking.")


def section_customers(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "7. Customers")
    para(pdf, "Path: Sidebar -> Customers. Shared by Manager and Admin.")
    h2(pdf, "Add a customer")
    step(pdf, 1, "Click Add Customer.")
    step(pdf, 2, "Enter required Name and Phone. Optionally add email, gender, birthday, address, notes.")
    step(pdf, 3, "Save - the customer profile opens.")
    h2(pdf, "Search & filters")
    para(pdf, "Use search for name, phone, or email. Combine filters to build follow-up lists:")
    table(
        pdf,
        ["Filter", "What it does"],
        [
            ["Tier", "Filter by membership / loyalty tier"],
            ["Status", "Active or inactive customers"],
            ["Gender", "Male / Female / Other"],
            ["Source", "Walk-in or online (as recorded)"],
            ["Birthday", "Today or this month"],
            ["Inactive", "No visit for 7+ / 30+ / 60+ / 90+ days"],
            ["Last visit", "Date range (from - to)"],
        ],
        [45, 145],
    )
    para(pdf, "Use Clear to reset all filters. The counter shows how many customers match.")
    h2(pdf, "Customer profile actions")
    bullet(pdf, "Edit details; activate or deactivate")
    bullet(pdf, "View visit history")
    bullet(pdf, "Loyalty: view points, redeem, buy or upgrade tier")
    bullet(pdf, "Messaging helpers and feedback links where available")


def section_services(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "8. Services & bulk upload")
    para(pdf, "Path: Sidebar -> Services. Tabs: Services | Packages | Coupons.")
    bullet(pdf, "Search and filter by gender, category, and status.")
    bullet(pdf, "Managers can add services, manage categories, and run bulk Excel upload.")
    bullet(pdf, "Admins can review the catalog; add/bulk controls are primarily for Managers.")
    h2(pdf, "Bulk upload (Manager)")
    step(pdf, 1, "Open Bulk Upload and download the Excel template.")
    step(pdf, 2, "Fill rows using the column names exactly as in the template.")
    step(pdf, 3, "Upload .xlsx / .xls / .csv and review the preview (valid / warnings / errors).")
    step(pdf, 4, "Click Import once. A progress bar shows status - do not click Import repeatedly.")
    step(pdf, 5, "When finished, review Added / Updated / Skipped counts.")
    h3(pdf, "Typical template columns")
    table(
        pdf,
        ["Column", "Required?", "Notes"],
        [
            ["service_name", "Yes", "Display name of the service"],
            ["category", "Yes", "Must match an existing category name"],
            ["price", "Yes", "Walk-in / list price (INR)"],
            ["member_price", "Yes", "Member price"],
            ["duration_minutes", "Yes", "Service duration"],
            ["description", "No", "Optional details"],
            ["sku_code / service_code", "No", "Stable code for updates on re-import"],
            ["gender / tax / status / group", "No", "If present in your template version"],
        ],
        [55, 28, 107],
    )
    callout(
        pdf,
        "Important",
        "Bulk upload updates matching services and creates new ones. It does not delete your existing catalog.",
    )


def section_expenses(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "9. Expenses")
    para(pdf, "Path: Sidebar -> Expenses. Available to Manager and Admin.")
    h2(pdf, "Add an expense")
    step(pdf, 1, "Click Add expense. (Disabled if the business day is closed - list becomes read-only.)")
    step(pdf, 2, "Fill Date, Category (Operational / Inventory / Payroll / Transfer), Sub-category, Amount.")
    step(pdf, 3, "Choose Source: Cash, UPI, or Card.")
    step(pdf, 4, "Enter a Note - required for every expense.")
    step(pdf, 5, "Save. Totals and filters update immediately.")
    h2(pdf, "Filters")
    bullet(pdf, "Search note, sub-category, or employee text")
    bullet(pdf, "Date from - to")
    bullet(pdf, "Category chips and Source chips (Cash / UPI / Card)")
    bullet(pdf, "Status: Normal / Pending delete / Rejected delete")
    bullet(pdf, "Clear resets all filters; count and total amount update live")
    h2(pdf, "Delete workflow")
    bold_para(pdf, "Manager")
    bullet(pdf, "Deleting an expense sends a delete request to Admin (toast: requested).")
    bullet(pdf, "While pending, the row shows pending status. You can cancel the request if the UI offers it.")
    bullet(pdf, "If Admin rejects, you will see Rejected by admin.")
    bold_para(pdf, "Admin")
    bullet(pdf, "Pending delete requests show Approve and Reject actions.")
    bullet(pdf, "Approve permanently removes the expense.")
    bullet(pdf, "Reject keeps the expense and marks it rejected for the Manager.")
    callout(
        pdf,
        "Day closed",
        "When the day is closed, expenses are read-only. Open the next business day before adding or changing entries.",
    )


def section_finance(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "10. Revenue Report (Admin)")
    para(pdf, "Path: Sidebar -> Revenue Report. Managers are redirected away from this area.")
    para(pdf, "Work inside the receipts tabs:")
    table(
        pdf,
        ["Tab", "What you do"],
        [
            ["Sales", "Browse completed receipts / sales ledger"],
            ["Refunds", "Review pending refunds; approve (PIN) or reject"],
            ["Pending Payments", "Collect outstanding balances; send reminders"],
            ["Advance Payments", "Track customer advances"],
            ["Membership / Packages", "See enrollments (active / exhausted / expired)"],
        ],
        [50, 140],
    )
    callout(
        pdf,
        "Refunds",
        "Approving a refund may require your approval PIN. Keep that PIN confidential and use it only when verifying a valid refund request.",
    )


def section_inventory(pdf: ManualPDF) -> None:
    ensure_space(pdf, 50)
    pdf.add_page()
    h1(pdf, "11. Inventory")
    para(pdf, "Path: Sidebar -> Inventory. Tabs: Stock | Vendors | Orders | Log.")
    bullet(pdf, "Monitor total products, low / out of stock, stock value, and pending orders.")
    bullet(pdf, "Stock tab: review quantities and adjust / reorder as your process allows.")
    bullet(pdf, "Vendors and Orders: supplier records and purchase orders.")
    bullet(pdf, "Log: movement history for audits.")
    bullet(pdf, "Managers may see a Direct Bill shortcut for related billing flows.")


def section_misc(pdf: ManualPDF) -> None:
    ensure_space(pdf, 50)
    pdf.add_page()
    h1(pdf, "12. Notifications, Profile & Help")
    h2(pdf, "Notifications")
    bullet(pdf, "Open from the bell icon or profile menu.")
    bullet(pdf, "Categories can include warnings, appointments, payments, inventory, success, and system.")
    bullet(pdf, "Mark items read, mark all read, or dismiss as needed. Click an item to jump to related work when linked.")
    h2(pdf, "My Profile")
    bullet(pdf, "Confirm your name, email, phone, role, and salon identity.")
    bullet(pdf, "Use Sign Out when finished on a shared device.")
    h2(pdf, "Help & Support")
    bullet(pdf, "Browse FAQs and contact channels listed in the app.")
    bullet(pdf, f"Platform support reference: support channels shown in-app / {APP} branding.")


def section_checklists(pdf: ManualPDF) -> None:
    pdf.add_page()
    h1(pdf, "13. Quick day-one checklists")
    h2(pdf, "Manager - open the day")
    step(pdf, 1, "Sign in with OTP.")
    step(pdf, 2, "Check Dashboard: schedule, floor, stock alerts.")
    step(pdf, 3, "Bill walk-ins from Billing as guests arrive.")
    step(pdf, 4, "Log expenses with note + payment source.")
    step(pdf, 5, "Follow up inactive customers from Customers filters.")
    h2(pdf, "Manager - bill a walk-in (summary)")
    para(
        pdf,
        "Billing -> Services -> Mobile lookup / create customer (+ optional stylist) -> "
        "Cash/Card/UPI Pay -> optional stars -> Done.",
    )
    h2(pdf, "Admin - review the business")
    step(pdf, 1, "Sign in with OTP.")
    step(pdf, 2, "Check Dashboard revenue KPIs and franchise/shop panel.")
    step(pdf, 3, "Open Revenue Report: Sales, Pending, Refunds.")
    step(pdf, 4, "Open Expenses: approve or reject pending delete requests.")
    step(pdf, 5, "Spot-check Customers and Inventory.")


def section_troubleshooting(pdf: ManualPDF) -> None:
    ensure_space(pdf, 50)
    pdf.add_page()
    h1(pdf, "14. Troubleshooting")
    table(
        pdf,
        ["Problem", "What to try"],
        [
            ["Cannot open Billing / Appointments", "Confirm you are signed in as Manager."],
            ["Cannot open Revenue Report", "Confirm you are signed in as Admin."],
            ["Login OTP not arriving", "Wait for cooldown, check phone number, then Resend. Contact Admin if stuck."],
            ["Session expired / Unauthorized", "Sign out, sign in again with OTP."],
            ["Expense Add disabled", "Business day may be closed - ask Admin / wait for next open day."],
            ["Manager delete did not remove expense", "Expected - Admin must Approve the delete request."],
            ["Bulk upload category error", "Category text must match an existing category name exactly (or close match as guided)."],
            ["Customer not found on billing", "Confirm 10-digit mobile; create as new customer if first visit."],
            ["Feedback stars blocked Done", "On current release, rating is optional - tap Done without stars if you prefer."],
        ],
        [62, 128],
    )
    pdf.ln(2)
    h2(pdf, "Need more help?")
    para(
        pdf,
        f"Ask your salon Admin first. For platform issues, use Help & Support inside {APP} "
        f"or contact your {CLIENT} / {APP} implementation partner.",
    )
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(
        0,
        5,
        "End of User Manual - thank you for using BillVyapp to run The Starr Kuts operations.",
    )


def main() -> None:
    pdf = ManualPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)

    cover(pdf)
    toc(pdf)
    section_login(pdf)
    section_roles(pdf)
    section_nav(pdf)
    section_dashboard(pdf)
    section_billing(pdf)
    section_appointments(pdf)
    section_customers(pdf)
    section_services(pdf)
    section_expenses(pdf)
    section_finance(pdf)
    section_inventory(pdf)
    section_misc(pdf)
    section_checklists(pdf)
    section_troubleshooting(pdf)

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
