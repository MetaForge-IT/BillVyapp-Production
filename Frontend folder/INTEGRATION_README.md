# Settings & Administration — Integration Guide

## What was changed

### 1. Renamed: `Settings` → `Administration`
The existing "Settings" section in the sidebar nav has been renamed to **Administration**.

**File added:** `src/app/components/shared/AdministrationPage.tsx`

This page includes:
- Users & Roles
- Permissions
- Security
- API Keys
- Notifications (placeholder)
- Data Management (placeholder)
- Audit Log (placeholder)

---

### 2. New: `Settings` section
A brand new **Settings** section has been created, containing the first 6 sub-sections from the PDF spec.

**File added:** `src/app/components/shared/SettingsPage.tsx`

Sub-sections included:
1. **OT Rates** — Add position-specific overtime rates with a modal form
2. **Attendance Configuration** — Manual/biometric mode, staff login config, geo-location radius
3. **Loyalty Points** — Earning rules (points per ₹ spent) + redemption rules
4. **Membership** — One-time membership fee setting
5. **Staff ID** — Configure the starting ID number for new staff
6. **Gift Cards** — Create and manage gift card templates (name, amount, validity)

---

## How to integrate into your Next.js app

### Step 1 — Update your sidebar navigation

Find your sidebar/nav component (likely in `src/app/layout.tsx` or a `Sidebar.tsx`) and update the nav items:

```tsx
// BEFORE
{ label: "Settings", href: "/settings", icon: Settings }

// AFTER
{ label: "Administration", href: "/administration", icon: Shield }
{ label: "Settings", href: "/settings", icon: Sliders }
```

### Step 2 — Create the page routes

**`src/app/administration/page.tsx`**
```tsx
import { AdministrationPage } from "@/app/components/shared/AdministrationPage";
export default function Page() {
  return <AdministrationPage />;
}
```

**`src/app/settings/page.tsx`**
```tsx
import { SettingsPage } from "@/app/components/shared/SettingsPage";
export default function Page() {
  return <SettingsPage />;
}
```

### Step 3 — Rename the old settings route

If your old settings was at `/settings`, move it to `/administration` and update any links.

---

## Remaining sections (next session)

The following sections from the PDF are not yet implemented and will be added in a future session:

7. Credit Management
8. Club Members
9. Packages
10. Taxes
11. Combo Configuration
12. Notification Control Center
13. Booking
14. Authentication
15. Invoice Sequence
16. Activity History

---

## Theme tokens used

| Token | Value |
|-------|-------|
| Background | `#FAF8F2` |
| Dark | `#121212` |
| Gold | `#D4AF37` |
| Green | `#00C896` |
| Muted text | `#6B6B6B` |
| Border | `#D4AF37` at 15-30% opacity |
| Card radius | `rounded-2xl` |
| Font | `font-display` for headings |
