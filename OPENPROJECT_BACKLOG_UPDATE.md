# OpenProject Update Plan — BillVyapp / Saloon Operating System

> Purpose: reconcile your existing OpenProject backlog (screenshot reviewed: Phases 1–4, IDs #199–#253) with what's **actually built** in the codebase today (per `VERSION_1_AGILE_BOARD.md`), so the board reflects reality — plus a Bug workflow, since none exists in your board yet. I don't have API/write access to your OpenProject instance, so this is the exact content to enter, and the step-by-step below is for you (or whoever has edit rights) to follow.

---

## Part A — Update statuses on EXISTING work packages

Your board is currently almost entirely "New," but several of these are already built and working (frontend-side, at least). Update these:

| ID | Subject | Current Status | → Update To | Why |
|---|---|---|---|---|
| 199 | PHASE 1: FOUNDATION & SETUP | In progress | *(leave as-is)* | Design system/schema work is real and ongoing |
| 209 | PHASE 2: MVP CORE MODULES | New | **In progress** | Most features under it are partially/fully built |
| 210 | 2.1 Appointment Management Module | New | **In progress** | Walk-in + appointment booking both work end-to-end (frontend) |
| 211 | Walk-in booking under 60s | New | **In review** | Built and verified this session; not persisted to DB yet |
| 212 | Appointment API — CRUD endpoints | New | **New** *(no change)* | Not started — no Appointments backend module exists |
| 214 | Walk-in quick-entry modal | New | **Done** | Built, working |
| 216 | Public online booking (customer-facing) | New | **New** *(no change)* | Genuinely not started — current app is staff-facing only |
| 219 | Booking confirmation – WhatsApp + Email | New | **Blocked** | SMS/WhatsApp providers coded but disabled; SMTP unconfigured |
| 221 | 2.2 Point of Sale & Billing Module | New | **In progress** | Largest amount of real backend code in the whole project lives here |
| 222 | Digital receipt via WhatsApp | New | **Blocked** | Receipt generation works; WhatsApp send is not connected |
| 223 | Invoice creation API | New | **Blocked** | Built (`POST /billing/checkout`, `/confirm-only`) — blocked by an unapplied migration, not by missing code |
| 226 | POS billing UI | New | **Done** | Full billing dialog built: cash/card/UPI/wallet/split, GST, discounts, coupons, advances |
| 227 | Multi-payment support | New | **Done** | Split payment implemented |
| 228 | 2.3 Customer CRM Module | New | **In progress** | Directory + detail view built, not persisted |
| 229 | Customer 360° profile | New | **In review** | Built with mock data |
| 232 | 2.4 Employee Module | New | **Descope / Remove** | **Employees was permanently deleted from this codebase this sprint** (client scope decision) — recommend closing this Epic branch as "Won't do (v1)" rather than leaving it as pending backlog, to avoid confusion |
| 233–236 | (Employee sub-items) | New | **Won't do (v1)** | Same reason — code no longer exists |
| 237 | 2.5 Service Catalog | New | **In progress** | Catalog, packages, categories all built |
| 240 | Service catalog admin UI | New | **Done** | |
| 241 | Gender-based pricing / combo builder | New | **In review** | Male/Female/Others tabs + packages exist |
| 224 | PHASE 3: GROWTH MODULES | New | **In progress** | Inventory is substantially built |
| 242 | 3.1 Inventory Management | New | **In progress** | |
| 244 | Product/inventory CRUD API | New | **New** *(no change)* | No Inventory backend module exists yet |
| 245 | Supplier management | New | **Done** | Vendors tab built |
| 246 | 3.2 Loyalty & Membership Engine | New | **In progress** | Backend built (`SalonPlan`/enrollment API), blocked by migration; UI shows tiers |
| 248 | Customer loyalty wallet UI | New | **In review** | UI exists, loyalty math is client-side only |
| 249 | Membership plan management | New | **Blocked** | Real API built (`POST /plans`, `/plans/enrollments`) — blocked by unapplied `salon_plans` migration, and no page calls it yet |
| 225, 250–253 | PHASE 4: ENTERPRISE & MULTI-BRANCH | New | **New** *(no change)* | Genuinely not started — current app is explicitly single-branch for v1 |

**Recommended new/renamed statuses to add to your workflow** (if not already present): `In review`, `Blocked`, `Won't do (v1)` — alongside your existing `New` / `In progress`. These map directly to the Kanban vocabulary in `VERSION_1_AGILE_BOARD.md`.

---

## Part B — NEW work packages to create (things built but not yet on your board)

### Under existing Epic 209 “PHASE 2: MVP CORE MODULES”

**New Feature: “2.6 Advance Payments”**
- User Story: *“As Front Desk Staff, I want to collect an advance deposit from a customer so large bookings (e.g. bridal packages) are partially pre-paid.”*
  - Task: Advance-payment shared state (`AdvancesContext`) — **Done**
  - Task: “Collect Advance” form (Finance → Receipts) — **Done**
- User Story: *“As Front Desk Staff, I want a customer's advance balance to auto-apply at billing time so they're never double-charged.”*
  - Task: Detect matching advance by phone number at billing — **Done**
  - Task: Apply-advance UI + Balance Due recalculation across all payment methods — **Done**
  - Task: Persist advances to a real database table — **New** (backlog — no `Advance` model exists in Prisma yet)

**New Feature: “2.7 Bulk Data Import”**
- User Story: *“As a Salon Owner, I want to bulk-upload my service menu and product catalog from Excel/CSV so I don't have to enter each one manually.”*
  - Task: Service bulk upload — parse, validate, preview, import — **Done**
  - Task: Product bulk upload — new-product and restock modes, auto-detect by SKU — **Done**
  - Task: Wire bulk import to a real backend (persist beyond the session) — **New**

**New Feature: “2.8 Appointment Queue & Notifications”**
- User Story: *“As Front Desk Staff, I want appointments and walk-ins to queue in the order they were booked or checked in (FIFO) so nobody gets skipped.”*
  - Task: FIFO sort (status rank + booking-order) — **Done**
  - Task: Auto-reorder on status change (Waiting → In Progress → Completed) — **Done**
  - Task: Backend/DB enforce the same ordering — **New**
- User Story: *“As Front Desk Staff, I want to send a WhatsApp/SMS notification to a customer using a quick template.”*
  - Task: Notify modal + quick templates (Confirmation/Reminder/Running late/Thank you) — **Done**
  - Task: Connect to a real SMS/WhatsApp provider — **Blocked** (providers coded, disabled by config — needs credentials + `SMS_ENABLED`/`WHATSAPP_ENABLED=true`)

**New Feature: “2.9 UPI Payments”**
- User Story: *“As a Customer, I want to scan a UPI QR code to pay my bill instantly via GPay/PhonePe/Paytm.”*
  - Task: Generate a real UPI deep-link QR code, tied to the live bill amount — **Done**
  - Task: Confirm `billvyapp@ybl` is a real, registered merchant UPI ID — **New / needs client input**

### New Epic: “PHASE 0: FOUNDATION DELIVERED (RETROACTIVE)”

Use this to capture what's already shipped that predates/underlies the phases above — auth, and the version-1 scoping decisions. Recommend Status = **In progress** (auth is live; scope items are Done).

**Feature: “Authentication & Account Security”**
- User Story: *“As a Salon Owner, I want to register my salon and log in securely.”*
  - Task: Registration API (Zod validation, strong password rules) — **Done**
  - Task: Login (JWT access + refresh tokens, bcrypt hashing) — **Done**
  - Task: Email verification (link + OTP) — **Blocked** (no SMTP configured)
  - Task: Forgot / reset password — **Blocked** (same SMTP dependency)
  - Task: Seeded demo account as a verification workaround — **Done**

**Feature: “Version-1 Scope Reduction”** *(Status: Done)*
- Task: Remove Employees, Reports/Analytics, Marketing, CEO Dashboard, AI Insights, Settings from v1 — **Done**
- Task: Gate Coupons module (hidden from nav, route redirects — reversible) — **Done**

**Feature: “This sprint's bug fixes”** — *(see Bug list in Part C — link them here as related work packages)*

---

## Part C — Bug type & workflow

Your board has no Bug-type items yet. Recommended lean workflow (5 statuses is enough for a team this size — OpenProject's default Scrum bug workflow has 10+, which is overkill here):

```
New → In progress → In review → Resolved → Closed
                                     ↘ Rejected / Won't fix
```

| Field | Recommended values |
|---|---|
| Priority | Low / Normal / High / Immediate (OpenProject defaults are fine) |
| Status | New, In progress, In review, Resolved, Closed, Rejected |

### Seed bugs to log (all found + fixed this sprint — log as **Closed/Resolved** for a real audit trail)

1. **“Duplicate close (×) button on 17 dialogs across Inventory/Services/Feedback/Customers/Vendors/Coupons”** — Root cause: shared `DialogContent` always renders a default close button; several screens also built their own, and didn't hide the default one. — *Resolved*
2. **“Default dialog close button has no visible background/styling”** — *Resolved* (styled as a circular chip in the shared component)
3. **“New appointments/walk-ins were prepended to the list instead of appended, breaking booking order”** — *Resolved* (also fixed: only the first of multiple new bookings was ever merged — a second silent bug in the same code)
4. **“Notifications panel's 'View all' link pointed at `/reports` instead of `/notifications`”** — *Resolved*
5. **“LoginPage.tsx and SignUpPage.tsx were found completely empty (0 bytes), causing a blank white screen with no console errors”** — *Resolved* (root cause unknown/unconfirmed — recommend a follow-up task to add file-integrity checks or git tracking so this can't silently recur)

### Open bugs/blockers to log now (log as **New**, High priority)

6. **“Billing checkout, confirm-only, collect-payment, and pending-invoice endpoints all fail against the live database”** — Cause: migration `20260707140000_invoice_payment_balance` not applied. Fix: `npx prisma migrate deploy` from `backend/`.
7. **“Plans API (create/list/enroll) fails against the live database”** — Cause: migration `20260707160000_salon_plans` not applied. Same fix as #6.

*(#6 and #7 are arguably "Task" not "Bug" — they're deployment steps, not defects — but logging them as Bugs is reasonable if you want them to show up on a bug burndown; your call.)*

---

## Part D — Step-by-step: entering this in OpenProject

### 1. Update an existing work package's status
1. Open the **Work packages** view (you're already there).
2. Click the row (e.g., **#211**) to open its detail panel, or double-click directly on the **STATUS** cell in the table.
3. Select the new status from the dropdown (e.g., "In review"). If a status you need (e.g., "Blocked", "In review", "Won't do (v1)") doesn't exist yet:
   - Go to the project **Administration → Work packages → Status** (or, workspace-wide: *Administration ⚙ → Work packages → Statuses*) and click **+ Create** to add it.
   - Then go to **Administration → Work packages → Workflow**, pick the relevant Type (e.g., User Story), and make sure the new status is allowed as a transition target — tick the checkbox in the matrix, Save.
4. Repeat for each row in the Part A table.

### 2. Create a new Epic
1. Click **+ Create** (top right, green button) → choose **Epic**.
2. **Subject:** `PHASE 0: FOUNDATION DELIVERED (RETROACTIVE)`
3. **Description:** paste the intro line from Part B.
4. **Status:** In progress. **Priority:** High.
5. Save.

### 3. Create a Feature under that Epic
1. Open the new Epic you just created.
2. In its detail view, scroll to **Relations** (or use the **+** button in the hierarchy/children section) → **+ Create child** (or **Add existing** if you'd rather link) → choose type **Feature**.
   - Alternative path: **+ Create** → **Feature** → then set the **Parent** field (in the right-hand sidebar of the detail view) to your new Epic.
3. **Subject:** `Authentication & Account Security`
4. Save.

### 4. Create User Stories under the Feature
1. Open the Feature → **+ Create child** → type **User Story**.
2. **Subject:** `As a Salon Owner, I want to register my salon and log in securely.`
   *(Match the exact phrasing style already used in your board — subject = the full "As a ___, I want ___" sentence, same as #201, #211, #216, etc.)*
3. Set **Parent** = the Feature if not already inherited.
4. Save. Repeat for each User Story listed in Part B.

### 5. Create Tasks under each User Story
1. Open the User Story → **+ Create child** → type **Task**.
2. **Subject:** short imperative phrase, e.g. `Registration API (Zod validation, strong password rules)`.
3. **Status:** set per Part B (Done / Blocked / New).
4. **Assignee / Priority:** set as appropriate for your team.
5. Save. Repeat for every Task.

*(Tip: OpenProject lets you bulk-create by pasting multiple lines into the "Subject" field of the table's inline "+ Create new work package" row at the bottom — it'll offer to create one row per line. Faster than the detail-panel flow above if you're entering many Tasks at once.)*

### 6. Set up the Bug type & workflow
1. **Administration ⚙ → Work packages → Types** — confirm **Bug** is enabled for this project (checkbox next to "Bug" under your project's type list). If not ticked, tick it and Save.
2. **Administration ⚙ → Work packages → Statuses** — add any missing statuses from Part C (`In review`, `Resolved`, `Rejected` if not already present).
3. **Administration ⚙ → Work packages → Workflow**:
   - Select **Type = Bug**, **Role** = whichever roles your team uses (e.g., Developer, PM).
   - In the transition matrix, tick: New→In progress, In progress→In review, In review→Resolved, Resolved→Closed, In progress→Rejected, In review→Rejected.
   - Save.
4. Back in **Work packages**, click **+ Create → Bug** for each item in Part C.
   - **Subject:** the bold title (e.g., `Duplicate close (×) button on 17 dialogs across Inventory/Services/Feedback/Customers/Vendors/Coupons`)
   - **Description:** the explanation text below it
   - **Status:** Resolved/Closed for items 1–5, New for items 6–7
   - **Priority:** High for 6–7 (they block real functionality), Normal for the resolved ones
   - **Parent:** link items 1–4 (dialog/FIFO/notification bugs) to the Appointments/Services features they affect if you want them visible in that hierarchy; leave 6–7 unparented or link to their respective Feature (Billing, Loyalty & Membership).

### 7. Verify the hierarchy
1. Go back to **All open** (or add a filter for your new items).
2. Confirm each new Epic/Feature/User Story/Task/Bug shows correctly nested (expand the ▸ arrows) — matching the same indentation pattern visible in your screenshot for Phases 1–4.

---

## Quick reference: what to copy in first

If you want the single highest-value update first: do **Part A only** (status updates on existing rows) — that alone turns your board from "everything is New" into an accurate picture of what's shipped, with zero new content to write.
