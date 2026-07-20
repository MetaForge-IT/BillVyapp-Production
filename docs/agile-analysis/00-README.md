# BillVyapp ("The Starr Kuts") — Agile Project Documentation Package

**Generated:** 2026-07-07 · **Method:** static code audit of `Frontend folder/` (React 18 + Vite + React Router 7) and `backend/` (Express + Prisma + MySQL), plus a live check of `npx prisma migrate status` against the real database. Every status below is evidence-based — traced to a specific file, route, or command output — not assumed from naming conventions.

This package supersedes/reconciles (does not duplicate) prior root-level docs, which remain valid supporting material:
- `../../VERSION_1_AGILE_BOARD.md` — page-by-page Kanban view, written same day
- `../../OPENPROJECT_BACKLOG_UPDATE.md` / `../../OPENPROJECT_WORKPACKAGE_UPDATE.md` — reconciliation against the user's **live OpenProject board, work packages #199–253**
- `../../DATABASE_DESIGN_V1.md`, `../../ARCHITECTURE.md` — schema/architecture reference

Where this package creates new Epics/Features/Stories, it references existing OpenProject WP IDs (#199–253) by number wherever a match exists, and marks genuinely new items as **NEW**.

## Contents

| # | Document | Purpose |
|---|---|---|
| 01 | [Complete Project Analysis Report](01-Complete-Project-Analysis-Report.md) | Executive summary, architecture, module-by-module narrative findings |
| 02 | [Epic Backlog](02-Epic-Backlog.md) | 16 Epics, all business modules incl. descoped ones |
| 03 | [Feature Backlog](03-Feature-Backlog.md) | ~70 Features under those Epics |
| 04 | [User Story Backlog](04-User-Story-Backlog.md) | User stories with acceptance criteria, priority, dependencies |
| 05 | [Task Backlog](05-Task-Backlog.md) | Frontend/Backend/DB/API/Validation/Test/Doc tasks per story |
| 06 | [Bug Backlog](06-Bug-Backlog.md) | All defects found — historical (fixed) and open |
| 07 | [Test Case Document](07-Test-Cases.md) | Positive/negative/boundary/permission/API test cases |
| 08 | [Feature Status Matrix](08-Feature-Status-Matrix.md) | Per-page audit table: Module/Page/Feature/Status/Backend/API/UI/Validation/Testing/Notes |
| 09 | [Module Completion Report](09-Module-Completion-Report.md) | % complete per module, weighted by layer |
| 10 | [Gap Analysis Report](10-Gap-Analysis.md) | Missing functionality, validations, permissions, APIs, notifications |
| 11 | [Sprint Planning Recommendations](11-Sprint-Planning-Recommendations.md) | Ordered backlog for next 4 sprints |
| 12 | [Release Readiness Report](12-Release-Readiness-Report.md) | Go/no-go assessment for a v1 production release |
| 13 | [Risk Assessment](13-Risk-Assessment.md) | Technical, security, and business risks, ranked |
| 14 | [OpenProject Import Structure](14-OpenProject-Import.csv) | Flat CSV, hierarchical (Epic→Feature→Story→Task→Bug), ready for OpenProject's work package CSV importer |

## The one fact that governs almost every status in this package

Three backend modules are wired to routes: **`auth`**, **`billing`**, **`plans`**. Nothing else has an API — Customers, Appointments, Services, Inventory, Coupons, Notifications, Feedback, Memberships-as-shown-in-UI all run on local React Context + seed data, with zero network calls. Of the three real modules, `billing` and `plans` are coded correctly but **currently fail at runtime** because 2 of their Prisma migrations (`20260707140000_invoice_payment_balance`, `20260707160000_salon_plans`) are not applied to the live database (confirmed via `npx prisma migrate status`, 2026-07-07). Only `auth` is genuinely working end-to-end today — and even that is blocked for real self-service users because SMTP is not configured, so verification emails can never send (a seeded demo account, `demo@starrkuts.com` / `Demo@1234`, is the only guaranteed working login).
