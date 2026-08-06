# Starr Kuts / BillVyapp — WhatsApp Contact Import (WhatsMark CSV)

Use this CSV when importing contacts into your WhatsApp CRM (WhatsMark / similar portals that use the sample format below).

**File:** [`WhatsMark-Contact-Import-Template.csv`](./WhatsMark-Contact-Import-Template.csv)

---

## Required CSV header (exact order)

```csv
status_id,source_id,assigned_id,firstname,lastname,company,type,email,phone,group_id
```

### Sample row (from portal)

| status_id | source_id | assigned_id | firstname | lastname | company | type | email | phone | group_id |
|-----------|-----------|-------------|-----------|----------|---------|------|-------|-------|----------|
| 1 | 1 | 1 | sample data | sample data | *(empty)* | lead | abc@gmail.com | +1 555 123 4567 | *(empty)* |

---

## Column reference

| Column | Required | Description | How to fill |
|--------|----------|-------------|-------------|
| `status_id` | Yes | Contact status ID | Copy numeric **ID** from Contact Statuses (e.g. New = `1`). Do **not** put the name. |
| `source_id` | Yes | Lead source ID | Copy numeric **ID** from Lead Sources (e.g. WhatsApp / Walk-in). |
| `assigned_id` | No | Staff / assignee ID | Copy staff **ID** from Users / Assignees list. Leave empty if unassigned. |
| `firstname` | Yes | First name | Text |
| `lastname` | Yes | Last name | Text |
| `company` | No | Company / salon note | Optional (e.g. corporate client). Leave empty if none. |
| `type` | Yes | Contact type | One of: `lead`, `customer`, `guest` (lowercase as in sample). |
| `email` | No* | Email | Valid email when available. |
| `phone` | Yes | Mobile with country code | Must include `+` and country code, e.g. `+91 98765 43210`. |
| `group_id` | No | Contact group ID(s) | Numeric group ID. Multiple groups: comma-separated if portal allows. |

\* Portal UIs sometimes mark email required for manual add; CSV sample allows empty company/`group_id`. Keep email filled when you have it.

---

## Before you import

1. In the WhatsApp CRM, open **Import Contacts** → **Download Sample** and confirm headers match this file.
2. Open **Contact Statuses**, **Lead Sources**, **Assignees**, **Contact Groups** and replace every `1` in the template with **your real IDs**.
3. Save as **UTF-8 CSV**.
4. Phone rules:
   - India: `+91` + 10-digit mobile starting 6–9
   - Always keep the `+`
5. Upload → check **Import Logs** for success / failed rows.

---

## Starr Kuts sample rows included

The CSV includes:

1. Portal sample row (as provided)
2. Walk-in **lead** — Priya Sharma
3. Existing **customer** — Rahul Verma
4. New **lead** — Ananya Iyer
5. Corporate **customer** — Amit Patel

Replace phones/emails with real customers before production import.

---

## Mapping to BillVyapp

| WhatsApp CRM CSV | BillVyapp concept |
|------------------|-------------------|
| `firstname` + `lastname` | Customer name |
| `phone` | Customer mobile (store E.164 / +91) |
| `email` | Customer email (if collected) |
| `type=lead` | Prospect / new enquiry |
| `type=customer` | Existing salon customer |
| `source_id` | How they found you (WhatsApp, walk-in, referral) |
| `assigned_id` | Manager / front-desk owner |
| `status_id` | Pipeline stage (New, Contacted, …) |

After import, use CRM **template messages** / campaigns to message these contacts on WhatsApp (appointment reminder, offers, feedback, etc.).

**Message templates (Meta):** see [`WHATSAPP-MESSAGE-TEMPLATES.md`](./WHATSAPP-MESSAGE-TEMPLATES.md) and submit sheet [`WhatsApp-Message-Templates-Submit.csv`](./WhatsApp-Message-Templates-Submit.csv).

---

## Tips

- Do not put status/source **names** in ID columns — only numbers from the reference panels.
- Keep `type` values exactly: `lead` / `customer` / `guest`.
- Test with 2–3 rows first, then bulk import.
