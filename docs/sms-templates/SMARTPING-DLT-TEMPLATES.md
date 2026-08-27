# Starr Kuts / BillVyapp — SmartPing DLT SMS Templates (v2)

**Provider:** [SmartPing](https://smartping.live/entity/login)  
**Header / Sender ID:** `STRKUT`  
**Entity brand (FIXED in every SMS):** `Starr Kuts`  
**Variable format:** `{#VariableName#}` only for dynamic fields — **never** for brand

---

## Why SMS-02 was rejected

STPL remark (Ref `11-D1K6MSD7F7SN`, Template Id `1777178576004306357`):

> Entity brand name is not mentioned in the SMS content and Repeated submission of incorrect templates without relevance may lead to header blacklisting.

**Cause:** Brand was submitted as `{#BusinessName#}` / `{#Doctor/BusinessName#}`. Sample showed “Starr Kuts”, but STPL checks the **template body**, not only the sample. Brand Name on the form was also empty (`-`).

**Fix:**
1. Put **`Starr Kuts` as plain text** in every template (must match your DLT-registered entity brand).
2. Fill **Brand Name** = `Starr Kuts` on the SmartPing form.
3. Do **not** resubmit the old variable-brand wording (risk of `STRKUT` blacklist).

If your portal entity name is different (e.g. `StarrKuts` / `STRKUT`), change every “Starr Kuts” below to that **exact** string.

---

## SMS-01 — Login / Registration OTP
- **Type:** Transactional  

```
Starr Kuts: Your verification code is {#OTP#}. Valid for {#ExpiryMinutes#} minutes. Do not share this code.
```

| Variable | Sample |
|----------|--------|
| OTP | 482917 |
| ExpiryMinutes | 10 |

---

## SMS-02 — Appointment Confirmation
- **Type:** Service Implicit  

```
Dear Customer, your appointment with Starr Kuts is confirmed for {#Date#} at {#Time#}. For assistance, contact {#Phone#}. Thank you. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| Date | 03-Aug-2026 |
| Time | 11:30 AM |
| Phone | 9876543210 |

---

## SMS-03 — Appointment Reminder
- **Type:** Service Implicit  

```
Dear Customer, this is a reminder that your appointment with Starr Kuts is scheduled on {#Date#} at {#Time#}. We look forward to serving you. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| Date | 03-Aug-2026 |
| Time | 11:30 AM |

---

## SMS-04 — Running Late / Delay
- **Type:** Service Implicit  

```
Dear Customer, Starr Kuts regrets to inform you that your appointment is delayed by approximately {#DelayTime#}. We apologize for the inconvenience and appreciate your patience. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| DelayTime | 15 minutes |

---

## SMS-05 — Thank You After Visit
- **Type:** Promotional  

```
Dear Customer, thank you for visiting Starr Kuts today. We appreciate your trust and look forward to serving you again. - Starr Kuts
```

*(no variables)*

---

## SMS-06 — Upcoming Appointment (Customers)
- **Type:** Service Implicit  

```
Dear Customer, your upcoming appointment with Starr Kuts is on {#Date#} at {#Time#}. Please arrive {#Minutes#} minutes early. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| Date | 03-Aug-2026 |
| Time | 11:30 AM |
| Minutes | 10 |

---

## SMS-07 — Loyalty Points Reminder
- **Type:** Promotional  

```
Dear Customer, you have {#Points#} loyalty points available in your account. Redeem them before {#ExpiryDate#}. Thank you for choosing Starr Kuts.
```

| Variable | Sample |
|----------|--------|
| Points | 450 |
| ExpiryDate | 31-Dec-2026 |

---

## SMS-08 — Membership / Member Offer
- **Type:** Promotional  

```
Dear Customer, enjoy an exclusive member offer of {#OfferDetails#} valid until {#ExpiryDate#}. Visit Starr Kuts to redeem your benefit. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| OfferDetails | 20 percent OFF services |
| ExpiryDate | 31-Aug-2026 |

---

## SMS-09 — Birthday Wish + Offer
- **Type:** Promotional  

```
Happy Birthday, {#CustomerName#}! Wishing you a wonderful year ahead. Enjoy our special offer: {#OfferDetails#}, valid until {#ExpiryDate#}. Team Starr Kuts.
```

| Variable | Sample |
|----------|--------|
| CustomerName | Priya Sharma |
| OfferDetails | 20 percent OFF |
| ExpiryDate | 31-Aug-2026 |

---

## SMS-10 — Payment Received Receipt
- **Type:** Transactional  

```
Dear Customer, Starr Kuts has received your payment of Rs.{#Amount#} against Invoice {#InvoiceNo#} on {#Date#}. Thank you for your payment. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| Amount | 1850 |
| InvoiceNo | INV-2026-0842 |
| Date | 03-Aug-2026 |

---

## SMS-11 — Payment Reminder (Due)
- **Type:** Transactional  

```
Dear Customer, a payment of Rs.{#Amount#} for Invoice {#InvoiceNo#} at Starr Kuts is due on {#DueDate#}. Kindly make the payment to avoid any inconvenience. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| Amount | 1850 |
| InvoiceNo | INV-2026-0842 |
| DueDate | 20-Jul-2026 |

---

## SMS-12 — Payment Reminder (Overdue)
- **Type:** Transactional  

```
Dear Customer, your payment of Rs.{#Amount#} for Invoice {#InvoiceNo#} at Starr Kuts is overdue since {#DueDate#}. Kindly clear the outstanding amount at the earliest. Thank you. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| Amount | 1850 |
| InvoiceNo | INV-2026-0842 |
| DueDate | 20-Jul-2026 |

---

## SMS-13 — Coupon Send (Single / Bulk)
- **Type:** Promotional  

```
Dear Customer, your coupon code {#CouponCode#} is worth {#OfferDetails#} and is valid until {#ExpiryDate#}. Redeem it at Starr Kuts.
```

| Variable | Sample |
|----------|--------|
| CouponCode | SAVE20 |
| OfferDetails | 20 percent OFF |
| ExpiryDate | 31-Aug-2026 |

---

## SMS-14 — Request Feedback / Review
- **Type:** Promotional  

```
Dear Customer, thank you for choosing Starr Kuts. Please share your feedback here: {#FeedbackLink#}. Your opinion helps us improve. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| FeedbackLink | https://billvy.app/r/abc123 |

---

## SMS-15 — New Appointment Booking Notification (Staff)
- **Type:** Transactional  

```
Dear {#StaffName#}, a new appointment at Starr Kuts has been booked by {#CustomerName#} for {#Date#} at {#Time#}. Please review your schedule. - Starr Kuts
```

| Variable | Sample |
|----------|--------|
| StaffName | Ananya |
| CustomerName | Priya Sharma |
| Date | 03-Aug-2026 |
| Time | 11:30 AM |

---

## Resubmit checklist

1. Open rejected template → create **new** submission with v2 body (do not reuse variable-brand text).
2. **Brand Name** = `Starr Kuts` (not blank).
3. **Header** = `STRKUT`.
4. Confirm “Starr Kuts” appears as **plain text** in the message box before you add variables.
5. Add only Date / Time / Phone / etc. variables.
6. Confirm registered PE brand on SmartPing matches exactly — if not, tell us the exact brand string and we will regenerate.
