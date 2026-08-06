# Starr Kuts / BillVyapp — WhatsApp Business Message Templates

**Brand (FIXED in every template):** `Starr Kuts`  
**Language:** `en` (or `en_IN` if your WABA prefers)  
**Variable format:** positional `{{1}}`, `{{2}}`, … — **never** put the brand in a variable  
**Submit via:** Meta WhatsApp Manager → Message templates  
**Related:** contact import CSV → [`WHATSAPP-CONTACT-IMPORT.md`](./WHATSAPP-CONTACT-IMPORT.md)  
**PDF pack:** [`BillVyapp-WhatsApp-Message-Templates.pdf`](./BillVyapp-WhatsApp-Message-Templates.pdf)  
**Regenerate PDF:** `python docs/whatsapp-templates/generate_whatsapp_templates_pdf.py`

These mirror the SmartPing SMS set (SMS-01 … SMS-15) for the same BillVyapp flows.

---

## Meta category map

| Code | Use case | Meta category | SMS twin |
|------|----------|---------------|----------|
| WA-01 | Login / Registration OTP | **AUTHENTICATION** | SMS-01 |
| WA-02 | Appointment confirmation | UTILITY | SMS-02 |
| WA-03 | Appointment reminder | UTILITY | SMS-03 |
| WA-04 | Running late / delay | UTILITY | SMS-04 |
| WA-05 | Thank you after visit | MARKETING | SMS-05 |
| WA-06 | Upcoming appointment | UTILITY | SMS-06 |
| WA-07 | Loyalty points reminder | MARKETING | SMS-07 |
| WA-08 | Membership / member offer | MARKETING | SMS-08 |
| WA-09 | Birthday wish + offer | MARKETING | SMS-09 |
| WA-10 | Payment received | UTILITY | SMS-10 |
| WA-11 | Payment due reminder | UTILITY | SMS-11 |
| WA-12 | Payment overdue | UTILITY | SMS-12 |
| WA-13 | Coupon send | MARKETING | SMS-13 |
| WA-14 | Request feedback | UTILITY | SMS-14 |
| WA-15 | Staff — new booking | UTILITY | SMS-15 |

> Meta may reclassify UTILITY → MARKETING if content looks promotional. Prefer MARKETING for offers/coupons/birthday.

---

## Submission rules (quick)

1. Hardcode **Starr Kuts** in the body — do not use `{{n}}` for brand.
2. Variables must be sequential (`{{1}}` then `{{2}}` …).
3. Provide **example values** for every variable in WhatsApp Manager.
4. OTP must use category **AUTHENTICATION** (utility/marketing cannot send OTPs).
5. Keep body under Meta length limits; avoid ALL CAPS spam style.
6. Buttons: optional URL / Call / Copy code where noted.

---

## WA-01 — Login / Registration OTP

- **Template name:** `starrkuts_login_otp`
- **Category:** AUTHENTICATION
- **Type:** Authentication (OTP) — create via Authentication template flow in Manager when available

**Body (custom text style if portal allows):**

```
Starr Kuts: Your verification code is {{1}}. Valid for {{2}} minutes. Do not share this code.
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | OTP | 482917 |
| {{2}} | Expiry minutes | 10 |

**Preferred Meta AUTHENTICATION setup:** use the official OTP template with **Copy code** button; put brand as Starr Kuts in the security/disclaimer text.

---

## WA-02 — Appointment Confirmation

- **Template name:** `starrkuts_appt_confirm`
- **Category:** UTILITY
- **Header:** none (or text: `Appointment Confirmed`)
- **Footer (optional):** `Starr Kuts`

```
Dear Customer, your appointment with Starr Kuts is confirmed for {{1}} at {{2}}. For assistance, contact {{3}}. Thank you. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Date | 03-Aug-2026 |
| {{2}} | Time | 11:30 AM |
| {{3}} | Salon phone | 9876543210 |

**Button (optional):** Call phone number → salon line

---

## WA-03 — Appointment Reminder

- **Template name:** `starrkuts_appt_reminder`
- **Category:** UTILITY

```
Dear Customer, this is a reminder that your appointment with Starr Kuts is scheduled on {{1}} at {{2}}. We look forward to serving you. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Date | 03-Aug-2026 |
| {{2}} | Time | 11:30 AM |

---

## WA-04 — Running Late / Delay

- **Template name:** `starrkuts_appt_delay`
- **Category:** UTILITY

```
Dear Customer, Starr Kuts regrets to inform you that your appointment is delayed by approximately {{1}}. We apologize for the inconvenience and appreciate your patience. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Delay duration | 15 minutes |

---

## WA-05 — Thank You After Visit

- **Template name:** `starrkuts_thank_you_visit`
- **Category:** MARKETING

```
Dear Customer, thank you for visiting Starr Kuts today. We appreciate your trust and look forward to serving you again. - Starr Kuts
```

*(no variables)*

---

## WA-06 — Upcoming Appointment

- **Template name:** `starrkuts_appt_upcoming`
- **Category:** UTILITY

```
Dear Customer, your upcoming appointment with Starr Kuts is on {{1}} at {{2}}. Please arrive {{3}} minutes early. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Date | 03-Aug-2026 |
| {{2}} | Time | 11:30 AM |
| {{3}} | Arrive-early minutes | 10 |

---

## WA-07 — Loyalty Points Reminder

- **Template name:** `starrkuts_loyalty_points`
- **Category:** MARKETING

```
Dear Customer, you have {{1}} loyalty points available in your account. Redeem them before {{2}}. Thank you for choosing Starr Kuts.
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Points | 450 |
| {{2}} | Expiry date | 31-Dec-2026 |

---

## WA-08 — Membership / Member Offer

- **Template name:** `starrkuts_member_offer`
- **Category:** MARKETING

```
Dear Customer, enjoy an exclusive member offer of {{1}} valid until {{2}}. Visit Starr Kuts to redeem your benefit. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Offer details | 20 percent OFF services |
| {{2}} | Expiry date | 31-Aug-2026 |

---

## WA-09 — Birthday Wish + Offer

- **Template name:** `starrkuts_birthday_offer`
- **Category:** MARKETING

```
Happy Birthday, {{1}}! Wishing you a wonderful year ahead. Enjoy our special offer: {{2}}, valid until {{3}}. Team Starr Kuts.
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Customer name | Priya Sharma |
| {{2}} | Offer details | 20 percent OFF |
| {{3}} | Expiry date | 31-Aug-2026 |

---

## WA-10 — Payment Received Receipt

- **Template name:** `starrkuts_payment_received`
- **Category:** UTILITY

```
Dear Customer, Starr Kuts has received your payment of Rs.{{1}} against Invoice {{2}} on {{3}}. Thank you for your payment. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Amount | 1850 |
| {{2}} | Invoice number | INV-2026-0842 |
| {{3}} | Payment date | 03-Aug-2026 |

---

## WA-11 — Payment Reminder (Due)

- **Template name:** `starrkuts_payment_due`
- **Category:** UTILITY

```
Dear Customer, a payment of Rs.{{1}} for Invoice {{2}} at Starr Kuts is due on {{3}}. Kindly make the payment to avoid any inconvenience. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Amount | 1850 |
| {{2}} | Invoice number | INV-2026-0842 |
| {{3}} | Due date | 20-Jul-2026 |

---

## WA-12 — Payment Reminder (Overdue)

- **Template name:** `starrkuts_payment_overdue`
- **Category:** UTILITY

```
Dear Customer, your payment of Rs.{{1}} for Invoice {{2}} at Starr Kuts is overdue since {{3}}. Kindly clear the outstanding amount at the earliest. Thank you. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Amount | 1850 |
| {{2}} | Invoice number | INV-2026-0842 |
| {{3}} | Due date | 20-Jul-2026 |

---

## WA-13 — Coupon Send

- **Template name:** `starrkuts_coupon_send`
- **Category:** MARKETING

```
Dear Customer, your coupon code {{1}} is worth {{2}} and is valid until {{3}}. Redeem it at Starr Kuts.
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Coupon code | SAVE20 |
| {{2}} | Offer details | 20 percent OFF |
| {{3}} | Expiry date | 31-Aug-2026 |

**Button (optional):** Copy code → `{{1}}` if Manager supports dynamic copy; else static CTA “Visit Starr Kuts”

---

## WA-14 — Request Feedback / Review

- **Template name:** `starrkuts_feedback_request`
- **Category:** UTILITY

```
Dear Customer, thank you for choosing Starr Kuts. Please share your feedback using the link below. Your opinion helps us improve. - Starr Kuts
```

**Button:** URL → `https://billvy.app/r/{{1}}`  
*(If dynamic URL suffix is not allowed, put full link as `{{1}}` in body instead.)*

**Body variant with link variable:**

```
Dear Customer, thank you for choosing Starr Kuts. Please share your feedback here: {{1}}. Your opinion helps us improve. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Feedback URL | https://billvy.app/r/abc123 |

---

## WA-15 — New Appointment Booking (Staff)

- **Template name:** `starrkuts_staff_new_booking`
- **Category:** UTILITY

```
Dear {{1}}, a new appointment at Starr Kuts has been booked by {{2}} for {{3}} at {{4}}. Please review your schedule. - Starr Kuts
```

| Var | Meaning | Sample |
|-----|---------|--------|
| {{1}} | Staff name | Ananya |
| {{2}} | Customer name | Priya Sharma |
| {{3}} | Date | 03-Aug-2026 |
| {{4}} | Time | 11:30 AM |

---

## Quick send mapping (BillVyapp → template)

| App event | Template name |
|-----------|---------------|
| Login / signup OTP | `starrkuts_login_otp` |
| Appointment created / confirmed | `starrkuts_appt_confirm` |
| Reminder job (T-1 / same day) | `starrkuts_appt_reminder` |
| Staff marks delay | `starrkuts_appt_delay` |
| Checkout / visit complete | `starrkuts_thank_you_visit` |
| Loyalty balance nudge | `starrkuts_loyalty_points` |
| Membership offer campaign | `starrkuts_member_offer` |
| Birthday cron | `starrkuts_birthday_offer` |
| Payment success (walk-in bill) | `starrkuts_payment_received` |
| Invoice due | `starrkuts_payment_due` |
| Invoice overdue | `starrkuts_payment_overdue` |
| Coupon campaign | `starrkuts_coupon_send` |
| Feedback request | `starrkuts_feedback_request` |
| Notify assigned staff | `starrkuts_staff_new_booking` |

---

## Checklist before submit

1. [ ] WABA display name / brand aligns with **Starr Kuts**
2. [ ] Every body includes plain text **Starr Kuts** (except pure AUTH OTP UI if Meta fills brand separately)
3. [ ] Categories match the table above
4. [ ] Example values filled for all `{{n}}`
5. [ ] No leading/trailing variables without surrounding words (Meta often rejects)
6. [ ] Test send to an internal number after **Approved**

---

## Contact import + campaigns

1. Import customers/leads with [`WhatsMark-Contact-Import-Template.csv`](./WhatsMark-Contact-Import-Template.csv)
2. After templates are **Approved**, run campaigns / “Initiate chat” using the template names above
3. Keep `type=customer` for billing guests and `type=lead` for enquiries
