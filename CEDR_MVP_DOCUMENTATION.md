# CEDR Mediator Availability Portal — Documentation

**Version:** MVP 1.0 — Preliminary  
**Date:** September 2026  
**Prepared by:** KamKod  
**Status:** Pre-production — pending migration to CEDR-owned infrastructure

---

> **Important — Preliminary document**
> This documentation describes the application as deployed on KamKod's test infrastructure for MVP validation purposes. It is intended to inform CEDR's technical and legal teams ahead of production deployment. **No real personal data should be processed until the application has been migrated to CEDR-owned infrastructure** and the necessary Data Processing Agreements are in place.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Roles & Permissions](#2-roles--permissions)
3. [User Journeys](#3-user-journeys)
4. [Technical Documentation](#4-technical-documentation)
5. [Technical Stack & Production Architecture](#5-technical-stack--production-architecture)
6. [GDPR Compliance](#6-gdpr-compliance)

---

## 1. Introduction

The **CEDR Mediator Availability Portal** is a web application designed to streamline the mediation scheduling workflow between CEDR case resolution advisors (CRAs), mediators, and their supporting clerks.

### Objective

The application provides a centralised interface for:
- Mediators and clerks to manage and publish their availability
- CRAs to search available mediators and propose or confirm mediation dates linked to active HubSpot cases
- Automating the booking workflow from initial pencil through to confirmed booking, with HubSpot deal stage synchronisation

### Current MVP Status

This is a **Minimum Viable Product** built for internal demonstration and early validation with CEDR's commercial team. The application is currently deployed on **KamKod's test infrastructure** for evaluation purposes only.

**Before any production use or processing of real personal data, the following migration steps are required:**

| Component | Current (MVP / KamKod) | Target (Production / CEDR) |
|-----------|------------------------|---------------------------|
| Frontend hosting | KamKod Cloudflare Pages account | CEDR Cloudflare Pages account (or equivalent) |
| Database & Auth | KamKod Supabase project (eu-west-2) | CEDR Supabase project (or equivalent managed PostgreSQL) |
| Edge Functions | KamKod Supabase project | CEDR Supabase project |
| Source code | `github.com/teamkamkod/cedr_mediator_mvp` | CEDR GitHub organisation (or equivalent) |
| HubSpot portal | KamKod test portal (5956807) | CEDR production HubSpot portal |
| Automation (Make.com) | KamKod Make.com account | CEDR Make.com account (already in use) |
| Domain | `cedr-mediator-mvp.team-cd8.workers.dev` | CEDR-owned custom domain (e.g. `availability.cedr.com`) |

This document is intended to serve as the technical and compliance reference for that migration process and for CEDR's internal review.

---

## 2. Roles & Permissions

The application uses four roles, stored in the `users` table and enforced via Supabase Row Level Security (RLS) policies.

### Role overview

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `super_admin` | Full access. Manages all mediators, settings and system configuration. |
| CRA (Case Resolution Advisor) | `cra` | Books mediators, manages pencilled and provisional bookings across all mediators. |
| Mediator | `mediator` | Manages their own availability. Receives and responds to booking requests. |
| Clerk | `clerk` | Manages availability on behalf of an assigned mediator. Same permissions as mediator, scoped to their assigned mediator. |

### Permissions matrix

| Feature | Super Admin | CRA | Mediator | Clerk |
|---------|:-----------:|:---:|:--------:|:-----:|
| View own calendar | ✅ | ✅ (any) | ✅ | ✅ (assigned) |
| Set availability (Available / Unavailable / Ask Me) | ✅ | ✅ | ✅ | ✅ |
| Create recurring availability series | ✅ | ✅ | ✅ | ✅ |
| Create Pencilled slot | ✅ | ✅ | — | — |
| Create Provisional Booking | ✅ | ✅ | — | — |
| Accept / Decline booking notification | ✅ | — | ✅ | ✅ |
| Search available mediators | ✅ | ✅ | — | — |
| Bulk-book slots across mediators | ✅ | ✅ | — | — |
| Delete any slot regardless of status | ✅ | ✅ | — | — |
| Delete own slots | ✅ | ✅ | ✅ | ✅ |
| Manage clerks (invite / assign / revoke) | ✅ | — | ✅ | — |
| Access Settings (case type labels) | ✅ | — | — | — |
| View HubSpot case details (More Info) | ✅ | ✅ | ✅ | ✅ |
| View raw HubSpot deal name | ✅ | ✅ | — | — |
| View case type (mapped display label) | ✅ | ✅ | ✅ | ✅ |

### Case information display by role

- **CRA / Super Admin**: see the HubSpot deal name (e.g. "Acme Corp v. Defendant") and raw case type value
- **Mediator / Clerk**: see only the case reference number (e.g. "EQ-2024-001") and the mapped display label for case type (e.g. "Est. 6 hours")

---

## 3. User Journeys

### 3.1 Mediator

**First access**
1. Receives invitation email (sent by admin or assigned CRA via the Manage Clerks / invite flow)
2. Sets password via the email link
3. Logs in at the portal URL
4. Lands on their personal calendar (week view, current week)

**Day-to-day availability management**
1. Navigate to the desired week or month using the calendar header
2. Click any slot (AM = 08:00–12:00, PM = 14:00–18:00) to open the slot popover
3. Set status: **Available**, **Unavailable**, or **Ask Me** (CRA contacts before booking)
4. Optionally create a **recurring series** (weekly, bi-weekly, or monthly) for standing availability
5. Toggle weekends on/off using the header control
6. Use **Set Period** to bulk-apply a status across a date range

**Responding to booking requests**
1. A purple notification banner appears at the top of the calendar when a CRA has pencilled one or more dates
2. Click the bell icon to expand the banner — requests are grouped by case
3. Click **Accept** → the **Accept confirmation modal** opens, showing full HubSpot case details and the proposed slot(s)
4. Review and click **Confirm acceptance** → slot moves to Provisionally Booked; all other pencilled dates for the same case are automatically cleared
5. Click **Decline** to reject the proposal → slot is deleted; other pending dates remain

**Clerk (identical journey, scoped to assigned mediator)**
- Clerk sees the calendar of their assigned mediator
- Receives the same booking notifications and can accept/decline on the mediator's behalf

---

### 3.2 CRA / Super Admin

**Accessing the calendar**
1. Log in → land on the mediator picker (card grid)
2. Select a mediator to view their calendar
3. Navigate between mediators using the top-left picker

**Managing a mediator's availability**
1. Click any slot to open the CRA popover
2. Can set status, create a pencilled slot (with case link), or create a provisional booking directly
3. Can delete any slot regardless of status
4. For recurring series slots: prompted to delete "this occurrence only" or "this and all future occurrences"
5. For grouped booking slots: prompted to delete the entire mediation date group

**Pencilling a slot**
1. In the slot popover, choose **Pencil**
2. Search for the linked case (queries HubSpot deals in the mediation pipeline by case reference)
3. Optionally select Full day (AM + PM)
4. Submit → slot(s) created as Pencilled; mediator receives a notification in the banner
5. If the case already has a Provisionally Booked or Confirmed slot, the action is blocked with an error

**Creating a provisional booking directly**
1. In the slot popover, choose **Provisional Booking**
2. Select the linked case; optionally notify the mediator by email
3. Submit → slot(s) created as Provisionally Booked; all pencilled slots for the same case are cleared

**Using the availability search**
1. Navigate to **Search available mediators** (sidebar link)
2. A weekly grid shows aggregated availability across all mediators
3. Click any available slot to see which mediators are free for that date/period
4. Select one or more slots, open the mediator drawer, and click **Book x slots**
5. Choose **Pencil** or **Provisional Booking**, select the case, confirm

**Select mode (batch operations)**
1. Click **Select** in the calendar header to enter select mode
2. Click individual slots to build a selection
3. Floating action bar:
   - **Delete N** — deletes all selected slots (with confirmation)
   - **Book N slots** (CRA only) — opens batch booking popover (enabled only when all selected slots are Available or not set)

---

### 3.3 Super Admin (additional capabilities)

**Manage clerks**
1. From the calendar header, click **Manage Clerks**
2. View current clerk assignments for the active mediator
3. Invite a new clerk by email — they receive an invitation and are auto-assigned
4. Revoke access for any existing clerk

**Settings — Case Type Labels**
1. Navigate to **Settings** via the sidebar
2. The table shows all HubSpot `case_type` enum values (sourced live from the HubSpot Properties API)
3. Edit the **App Display** column to customise what mediators and clerks see
4. Save inline — changes take effect immediately

---

## 4. Technical Documentation

### 4.1 Database Tables

All tables live in the `public` schema of the PostgreSQL instance. Row Level Security (RLS) is enabled on all tables.

---

#### `users`

Mirrors the authentication provider's user records with application-level metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Matches `auth.users.id` |
| `email` | text | User's email address |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `full_name` | text | Display name |
| `avatar_url` | text | Profile picture URL |
| `role` | text | One of: `mediator`, `clerk`, `super_admin`, `cra` |
| `hubspot_contact_id` | text | HubSpot Contact object ID |
| `hubspot_mediator_object_id` | text | HubSpot custom Mediator object ID (type `2-48634649`) |
| `is_active` | boolean | Soft-deactivation flag |
| `created_at` / `updated_at` | timestamptz | Audit timestamps |

---

#### `availability_slots`

Core table. Each row represents a single AM or PM slot for a mediator on a given date.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row identifier |
| `mediator_id` | uuid FK → users | Owner mediator |
| `date` | date | Calendar date (stored explicitly) |
| `slot_start` | timestamptz | Slot start in UTC (AM: 07:00 UTC in BST / 08:00 UTC in GMT) |
| `slot_end` | timestamptz | Slot end in UTC (AM: 11:00 UTC in BST / 12:00 UTC in GMT) |
| `period` | text GENERATED | Derived from `slot_start`: `morning` if London hour < 13, else `afternoon` |
| `status` | text | See slot lifecycle below |
| `notes` | text | Optional notes |
| `series_id` | uuid FK → recurring_series | Set when slot is an exception to a recurring series |
| `is_exception` | boolean | True if this row overrides a series occurrence |
| `group_id` | uuid | Groups slots forming a single mediation date proposal |
| `case_id` | text | HubSpot enquiry reference (`enquiry_id_string`) |
| `hubspot_record_id` | text | HubSpot deal/ticket object ID |
| `hubspot_object_type` | text | `deal` or `ticket` |
| `record_name` | text | HubSpot deal name (shown to CRA/admin only) |
| `created_by` / `updated_by` | uuid FK → users | Audit trail |
| `created_at` / `updated_at` | timestamptz | Timestamps |

**Unique constraint:** `(mediator_id, slot_start)` — prevents duplicate slots.

**Slot lifecycle:**

```
not_set → available / unavailable / ask_me   (set by mediator / clerk / CRA)
        → pencilled                           (created by CRA, linked to a case)
             → provisionally_booked           (accepted by mediator / clerk)
                  → confirmed                 (HubSpot deal reaches confirmed stage)
```

**Business rules:**
- A case may have N `pencilled` mediation date proposals
- A case may have at most **1** `provisionally_booked` or `confirmed` slot at any time
- When a pencilled slot is accepted → all other pencilled slots for the same case are deleted
- When a provisional booking is created directly → all pencilled slots for the same case are deleted

---

#### `recurring_series`

Defines repeating availability patterns. Slots are generated on the fly by the `resolveSlot` function; only exceptions are stored in `availability_slots`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Series identifier |
| `mediator_id` | uuid FK → users | Owner mediator |
| `day_of_week` | smallint | 0=Monday … 6=Sunday |
| `series_slot_start` | time | Start time (e.g. `08:00:00` for AM) |
| `series_slot_end` | time | End time (e.g. `12:00:00` for AM) |
| `period` | text GENERATED | Derived from `series_slot_start` |
| `frequency` | text | `weekly`, `biweekly`, or `monthly` |
| `status` | text | Availability status for occurrences of this series |
| `start_date` | date | Series starts on or after this date |
| `end_date` | date | Series ends on or before this date (null = no end) |
| `notes` | text | Optional notes |
| `is_active` | boolean | False if series is fully deactivated |

---

#### `mediator_clerk_assignments`

Many-to-many relationship between mediators and their clerks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `mediator_id` | uuid FK → users | |
| `clerk_id` | uuid FK → users | |
| `created_at` | timestamptz | |

---

#### `case_type_labels`

Maps HubSpot `case_type` enum values to display labels shown to mediators and clerks.

| Column | Type | Description |
|--------|------|-------------|
| `api_value` | text PK | HubSpot internal enum value |
| `display_label` | text | Label shown to mediators and clerks in the app |
| `created_at` / `updated_at` | timestamptz | |

---

### 4.2 Row Level Security (RLS)

All tables have RLS enabled. Two helper functions in the `public` schema:

```sql
is_super_admin()  -- true if the authenticated user has role = 'super_admin'
is_cra()          -- true if the authenticated user has role = 'cra'
```

#### `availability_slots` policies

| Operation | Who can perform it |
|-----------|--------------------|
| SELECT | Mediator (own), assigned clerks, CRA (all), super_admin (all) |
| INSERT | Mediator, clerks, CRA, super_admin |
| UPDATE | Mediator (own), assigned clerks, CRA (all), super_admin (all) |
| DELETE | Mediator (own), assigned clerks, CRA (own inserts), super_admin (all) |

#### `recurring_series` policies

| Operation | Who can perform it |
|-----------|--------------------|
| SELECT | Mediator (own), assigned clerks, CRA (all), super_admin (all) |
| INSERT | Mediator, clerks, CRA, super_admin |
| UPDATE | Mediator (own), assigned clerks, CRA (all), super_admin (all) |
| DELETE | Mediator (own), CRA (all), super_admin (all) |

#### `users` policies

| Operation | Who can perform it |
|-----------|--------------------|
| SELECT | Own record; mediator sees own clerks; clerk sees assigned mediator; CRA (all); super_admin (all) |
| INSERT | super_admin only |
| UPDATE | Own record; super_admin (all) |

#### `case_type_labels` policies

| Operation | Who can perform it |
|-----------|--------------------|
| SELECT | All authenticated users |
| ALL | super_admin only |

---

### 4.3 Edge Functions

Serverless functions deployed alongside the database. JWT verification is enabled on all except `hubspot-sync-webhook`.

| Function | Auth | Description |
|----------|------|-------------|
| `invite-clerk` | JWT | Sends an invitation email for a new clerk user |
| `admin-invite-user` | JWT | Creates a user of any role (used by super_admin) |
| `search-hubspot-cases` | JWT | Searches HubSpot deals in the mediation pipeline by case reference; returns matched cases to the frontend |
| `get-deal-info` | JWT | Fetches deal properties and owner details from HubSpot for the case details modal; includes retry on rate limit |
| `get-deal-property-options` | JWT | Fetches enum options for a HubSpot deal property (used by Settings page to load `case_type` values) |
| `hubspot-sync-webhook` | None (server-to-server) | Receives `{ event, hubspot_record_id }` from Make.com; handles `case_confirmed` by updating `provisionally_booked → confirmed` |

---

### 4.4 Key Application Features

#### Slot resolution

Slots are resolved at display time by the `resolveSlot` function:
1. Check `availability_slots` for an explicit record matching `(date, period, mediator_id)`
2. If none found, check `recurring_series` for a matching series (day of week, frequency, active date range)
3. Return `not_set` if neither matches

This keeps the database lean — only explicit overrides and exceptions are stored, not every possible time slot for every mediator.

#### Timezone handling

All slot times are stored as `TIMESTAMPTZ` in UTC. The `slotTime.js` helper dynamically detects BST/GMT via `Intl.DateTimeFormat` and constructs timestamps with the correct offset.

- **AM:** 08:00–12:00 Europe/London (07:00–11:00 UTC in BST, 08:00–12:00 UTC in GMT)
- **PM:** 14:00–18:00 Europe/London (13:00–17:00 UTC in BST, 14:00–18:00 UTC in GMT)

The `period` column is GENERATED from `slot_start`, ensuring it is always consistent with the stored time.

#### Booking flow

```
CRA creates Pencilled slot (linked to HubSpot case)
    ↓  Mediator / clerk notified via banner
    ↓  Reviews case details and accepts via confirmation modal
Provisionally Booked
    ↓  HubSpot deal stage changes to Confirmed (stage ID 1113239382)
    ↓  Make.com automation fires
    ↓  POST /hubspot-sync-webhook  { "event": "case_confirmed", "hubspot_record_id": "..." }
Confirmed
```

#### Make.com outbound webhook events

| Event | Trigger |
|-------|---------|
| `request_availability_update` | CRA requests availability update from mediator |
| `slot_pencilled` | CRA creates a pencilled slot |
| `provisional_booking_confirmed` | Mediator/clerk accepts a pencil → becomes provisionally booked |
| `provisional_booking_declined` | Mediator/clerk declines a pencil |

All payloads include: `mediator_id`, `hubspot_mediator_object_id`, slot details, `case_id`, `hubspot_record_id`, `record_name`.

---

### 4.5 HubSpot CRM Extensions

Two custom CRM card projects extend the portal directly inside HubSpot, allowing CRAs to access availability and booking features without leaving their CRM. Both are built as **HubSpot UI Extensions** (Platform 2026.03) using React and HubSpot's `@hubspot/ui-extensions` SDK.

---

#### Mediator Card (`cedr-mediator-card`)

**Installed on:** The custom **Mediator** object (object type `2-48634649`)

This card appears on each mediator's record in HubSpot and gives CRAs an at-a-glance view of that mediator's upcoming availability without opening the portal separately.

**Features:**
- Displays a compact weekly availability grid inline on the HubSpot mediator record
- Shows the current week's AM/PM slot statuses (Available, Unavailable, Pencilled, etc.)
- Includes a button to open the **full calendar** for that mediator in an iframe modal, pre-loaded with the correct mediator context
- Passes the mediator's `hubspot_mediator_object_id` to the portal to ensure the correct calendar is displayed

**Deployment:** Installed via HubSpot's private app / UI extensions deployment process on the CEDR HubSpot portal.

---

#### Case Card (`cedr-case-card`)

**Installed on:** **Deals** and **Tickets** in HubSpot

This card appears on each deal or ticket record and gives CRAs a direct path to searching for available mediators and creating a booking, with the case context automatically pre-filled.

**Features:**
- Displays case identification information inline on the HubSpot record:
  - **Deals:** `enquiry_id_string` (case reference) + `dealname`
  - **Tickets:** `subject` + `enquiry_number_auto_generated`
- Includes a button that opens the **Search available mediators** page (`/availability`) in an iframe modal
- Automatically passes the case context as URL parameters: `case_id`, `record_id`, `object_type`, `record_name`
- The portal detects these parameters on load and pre-fills the case in all booking forms — the CRA does not need to search for the case manually

**Case context URL format:**
```
/availability?case_id={enquiry_id}&record_id={hubspot_record_id}&object_type=deal&record_name={dealname}
```

**Components:**
- `CaseDealCard.jsx` — card for Deal records
- `CaseTicketCard.jsx` — card for Ticket records
- `getCaseInfo.js` — serverless function that fetches the required case properties from HubSpot to populate the card display

**Deployment:** Two separate card registrations in HubSpot (one for Deals, one for Tickets), deployed via UI extensions. Requires a HubSpot Private App with CRM read scopes.

---

#### Production deployment note

Both CRM card projects are separate codebases from the main portal. For production deployment on CEDR's HubSpot portal:
- Both cards must be re-deployed targeting CEDR's production portal ID
- The `getCaseInfo.js` serverless function must be updated with CEDR's production HubSpot Private App token
- The iframe URLs in both cards must point to the CEDR production portal URL (e.g. `https://availability.cedr.com`)

---

### 4.6 Security

| Measure | Implementation |
|---------|----------------|
| Authentication | Supabase Auth — email/password, JWT sessions (access + refresh tokens) |
| Authorisation | Role stored in `users.role`; enforced by RLS at database level |
| API secrets | HubSpot Private App token stored as an encrypted server-side secret; never exposed to the browser |
| RLS enforcement | All queries go through RLS regardless of client; even a compromised frontend cannot bypass it |
| Audit trail | `created_by`, `updated_by`, `created_at`, `updated_at` on all slot records |
| Webhook security | `hubspot-sync-webhook` uses Supabase's service role key server-side; not exposed to browser clients |

---

## 5. Technical Stack & Production Architecture

### 5.1 Current MVP stack (KamKod test)

| Layer | Technology | MVP environment |
|-------|-----------|-----------------|
| Frontend | React 18 + Vite + Tailwind CSS | KamKod Cloudflare Pages account |
| Database | PostgreSQL via Supabase | KamKod Supabase project (eu-west-2) |
| Auth | Supabase Auth | KamKod Supabase project |
| Backend logic | Supabase Edge Functions (Deno) | KamKod Supabase project |
| Automation | Make.com | KamKod Make.com account |
| CRM | HubSpot | KamKod test portal (5956807) |
| **HubSpot CRM cards** | HubSpot UI Extensions (React) | KamKod test portal — Mediator card + Case card (Deal + Ticket) |
| Source code | GitHub | `github.com/teamkamkod/cedr_mediator_mvp` |
| State management | TanStack Query | (frontend library, no external dependency) |
| Routing | React Router v6 | (frontend library) |

### 5.2 Target production architecture (CEDR-owned)

For production deployment, **every infrastructure component must be transferred to accounts owned by CEDR**. No data should be processed in production through KamKod-owned services.

| Layer | Technology | Target CEDR environment |
|-------|-----------|-------------------------|
| **Frontend** | React 18 + Vite + Tailwind CSS | **CEDR Cloudflare Pages account** + custom domain (e.g. `availability.cedr.com`) |
| **Database** | PostgreSQL | **CEDR Supabase project** — recommended region: `eu-west-2` (London) to maintain UK data residency |
| **Auth** | Supabase Auth | **CEDR Supabase project** |
| **Backend logic** | Supabase Edge Functions (Deno) | **CEDR Supabase project** |
| **Automation** | Make.com | **CEDR Make.com account** (already in use for other flows) |
| **CRM** | HubSpot | **CEDR production HubSpot portal** |
| **HubSpot CRM cards** | HubSpot UI Extensions (React) | Re-deployed on **CEDR production HubSpot portal** (Mediator card + Case card) |
| **Source code** | GitHub | **CEDR GitHub organisation** (or equivalent) |
| **HubSpot Private App** | HubSpot API | New Private App created under CEDR's HubSpot portal with required scopes |

### 5.3 Migration checklist

Before going live with real data:

- [ ] Create Supabase project under CEDR's account (recommend eu-west-2)
- [ ] Run all database migrations on the CEDR Supabase project
- [ ] Deploy all Edge Functions to the CEDR Supabase project
- [ ] Set required secrets on CEDR Supabase (`HUBSPOT_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Fork / transfer source code repository to CEDR GitHub organisation
- [ ] Configure Cloudflare Pages on CEDR's Cloudflare account, connected to the CEDR repo
- [ ] Point `availability.cedr.com` (or chosen domain) to the Cloudflare Pages deployment
- [ ] Create a new HubSpot Private App in CEDR's production portal with the required API scopes
- [ ] Re-deploy `cedr-mediator-card` (Mediator object card) targeting CEDR's production portal
- [ ] Re-deploy `cedr-case-card` (Deal + Ticket cards) targeting CEDR's production portal
- [ ] Update `getCaseInfo.js` serverless function with CEDR production HubSpot token and portal URL
- [ ] Update Make.com scenarios on CEDR's account with the new Supabase webhook URL
- [ ] Create user accounts for all CEDR super admins and CRAs
- [ ] Invite mediators and assign clerks
- [ ] Sign DPAs with Supabase and Cloudflare (see Section 6)
- [ ] Conduct a brief security review of the RLS policies in the production environment
- [ ] Remove KamKod test accounts and revoke MVP infrastructure access

### 5.4 Infrastructure diagram (production target)

```
Browser (React PWA — CEDR domain)
    │
    ├── Supabase JS Client
    │       └── CEDR Supabase project (eu-west-2)
    │               ├── PostgreSQL database (RLS enforced)
    │               └── Edge Functions
    │                       └── CEDR HubSpot production portal (Private App)
    │
    └── Cloudflare Pages (CEDR account)

CEDR HubSpot (deal stage → Confirmed)
    └── CEDR Make.com account (automation scenario)
            └── POST /hubspot-sync-webhook (CEDR Supabase Edge Function)
                    └── UPDATE availability_slots SET status = 'confirmed'
```

---

## 6. GDPR Compliance

This section documents how the CEDR Mediator Availability Portal handles personal data in accordance with **UK GDPR** and **EU GDPR** (Regulation 2016/679).

> **Scope note:** This section covers the custom-built components of the system: the React frontend, the database and auth layer, edge functions, and the CDN hosting provider. HubSpot and Make.com are excluded as they are existing CEDR tools already covered by separate GDPR assessments and DPAs.

> **Production prerequisite:** The GDPR analysis below assumes that all components are running on **CEDR-owned infrastructure**. The current MVP deployment on KamKod infrastructure must not be used to process real personal data.

---

### 6.1 Data Controller and Processor

**CEDR** is the **Data Controller** for all personal data processed by this application.

During the development and MVP phase, **KamKod** acts as a **Data Processor** and a **Data Processing Agreement (DPA) must be in place** between CEDR and KamKod before any real personal data is processed.

Upon production deployment on CEDR-owned infrastructure, KamKod's role as a processor is limited to any ongoing development or maintenance work under contract. CEDR will need to establish its own DPAs directly with:

- **Supabase** (database, auth, edge functions)
- **Cloudflare** (CDN / hosting)
- **Amazon Web Services** (underlying infrastructure for Supabase)

---

### 6.2 Personal Data Processed

| Data | Table / Location | Purpose | Retention |
|------|-----------------|---------|-----------|
| Email address | `users.email` + Auth | Authentication, invitations | Duration of account |
| First name, last name | `users.first_name`, `last_name`, `full_name` | Display in UI, attribution | Duration of account |
| Profile picture URL | `users.avatar_url` | UI display | Duration of account |
| HubSpot contact/mediator ID | `users.hubspot_contact_id`, `users.hubspot_mediator_object_id` | CRM linkage | Duration of account |
| Availability data | `availability_slots`, `recurring_series` | Scheduling | Per CEDR retention policy |
| Case reference number | `availability_slots.case_id` | Link slot to HubSpot case | Duration of slot |
| HubSpot deal name | `availability_slots.record_name` | Display for CRAs/admins | Duration of slot |
| IP addresses / access logs | Infrastructure level (Supabase, Cloudflare) | Security, debugging | Per provider policy |

**No special category data** is collected or processed by this application.

---

### 6.3 Legal Basis for Processing

| Processing activity | Legal basis |
|--------------------|-------------|
| User authentication and session management | **Legitimate interest** — necessary to operate the service |
| Storing availability and booking data | **Legitimate interest** / **Contract performance** |
| Sending invitation emails | **Legitimate interest** — account creation |
| Webhook automation (Make.com → Supabase) | **Legitimate interest** — workflow execution |

---

### 6.4 Data Storage — Supabase (CEDR-owned project)

In production, **CEDR will own and control the Supabase project**. No data will transit through KamKod's Supabase project.

- **Recommended region:** `eu-west-2` (AWS London) — maintains UK data residency
- **Encryption at rest:** Supabase encrypts all data using AES-256
- **Encryption in transit:** TLS 1.2+ on all connections
- **Access control:** RLS enforced at database level on every query; Supabase project credentials held by CEDR
- **Supabase Privacy Policy:** [https://supabase.com/privacy](https://supabase.com/privacy)
- **Supabase GDPR documentation:** [https://supabase.com/docs/guides/platform/compliance](https://supabase.com/docs/guides/platform/compliance)
- **Supabase DPA:** [https://supabase.com/legal/dpa](https://supabase.com/legal/dpa)

Supabase is SOC 2 Type 2 certified and GDPR-compliant.

---

### 6.5 Data Storage — Cloudflare Pages (CEDR-owned account)

In production, **CEDR will own and control the Cloudflare Pages account and domain**.

- Cloudflare Pages serves **static files only** — no personal data is stored on Cloudflare
- Cloudflare may process IP addresses and request metadata as part of CDN and DDoS protection
- No application data is persisted at Cloudflare edge nodes
- **Cloudflare Privacy Policy:** [https://www.cloudflare.com/privacypolicy/](https://www.cloudflare.com/privacypolicy/)
- **Cloudflare GDPR documentation:** [https://www.cloudflare.com/trust-hub/gdpr/](https://www.cloudflare.com/trust-hub/gdpr/)
- **Cloudflare DPA:** [https://www.cloudflare.com/cloudflare-customer-dpa/](https://www.cloudflare.com/cloudflare-customer-dpa/)

---

### 6.6 Authentication

- Passwords are hashed using **bcrypt** and never stored in plaintext
- Sessions are managed via **JWT tokens** (short-lived access tokens + refresh tokens)
- Tokens are stored in browser memory / secure storage — not in persistent cookies
- Email invitations use time-limited, single-use links
- No third-party OAuth providers are used (email/password only in MVP)

---

### 6.7 HubSpot API Access

The application retrieves case information from CEDR's HubSpot portal:

- The HubSpot Private App token is stored as an **encrypted environment secret** in the CEDR Supabase project
- The token is **never sent to or exposed in the browser** — all HubSpot API calls are server-side (Edge Functions)
- Only the minimum required deal properties are requested
- Retrieved data is displayed in the UI only and **not persisted** in the database
- A **new Private App must be created in CEDR's production HubSpot portal** for production deployment (the MVP uses a KamKod test portal token)

---

### 6.8 Data Retention

The application does not implement automated data retention or deletion. CEDR should define a retention policy covering:

| Data | Recommended action |
|------|--------------------|
| User accounts | Deactivate (`is_active = false`) when a user is no longer engaged; delete upon formal request |
| Past availability slots | Archive or delete slots older than 12–24 months (configurable) |
| Confirmed bookings | Retain per CEDR's records management / legal hold policy |

A future version of the application may include a self-service retention interface.

---

### 6.9 Data Subject Rights

During the MVP phase, data subject rights requests should be handled by a Super Admin via the Supabase dashboard. Upon production deployment, CEDR should establish a formal process:

| Right | How to fulfil |
|-------|--------------|
| **Access** | Super Admin exports user data from `users` and `availability_slots` tables |
| **Rectification** | Super Admin updates records in the `users` table |
| **Erasure** | Delete user from Auth (cascades to `users` table); remove associated slots |
| **Portability** | Data exported from Supabase as CSV or JSON |
| **Objection / Restriction** | Deactivate account; contact technical team for full data removal |

> **Recommendation:** Before production launch, implement a formal data subject request workflow and appoint a named point of contact within CEDR.

---

### 6.10 Security Summary

| Measure | Implementation |
|---------|----------------|
| Encryption in transit | TLS 1.2+ (Supabase, Cloudflare) |
| Encryption at rest | AES-256 (Supabase / AWS eu-west-2) |
| Access control | JWT authentication + RLS on all tables |
| API secret management | HubSpot token stored as encrypted Supabase secret (CEDR-owned) |
| No browser-side secrets | HubSpot token and service role key never sent to the browser |
| Audit trail | `created_by`, `updated_by`, `created_at`, `updated_at` on all slot records |
| Minimal data collection | Only data required for scheduling is collected |

---

### 6.11 Sub-processors Summary (Production)

| Sub-processor | Location | Purpose | GDPR documentation |
|--------------|----------|---------|-------------------|
| **Supabase** (CEDR account) | AWS eu-west-2 (London, UK) | Database, Auth, Edge Functions | [supabase.com/legal/dpa](https://supabase.com/legal/dpa) |
| **Cloudflare** (CEDR account) | Global CDN (no data persistence) | Frontend hosting | [cloudflare.com/cloudflare-customer-dpa](https://www.cloudflare.com/cloudflare-customer-dpa/) |
| **Amazon Web Services** | eu-west-2 (London, UK) | Underlying infrastructure for Supabase | [aws.amazon.com/compliance/gdpr-center](https://aws.amazon.com/compliance/gdpr-center/) |
| **KamKod** | UK / France | Development and maintenance (during contract) | DPA to be signed between CEDR and KamKod |

> HubSpot and Make.com are existing CEDR tools covered under separate GDPR assessments and are excluded from this section.

---

### 6.12 Actions Required Before Production

The following GDPR-related steps must be completed before the application goes live with real data:

- [ ] Sign a DPA between CEDR and KamKod (covering development/maintenance activity)
- [ ] Ensure Supabase DPA is accepted under **CEDR's** Supabase account
- [ ] Ensure Cloudflare DPA is accepted under **CEDR's** Cloudflare account
- [ ] Define and document CEDR's data retention policy for availability and booking data
- [ ] Appoint a named contact for data subject rights requests
- [ ] Add the portal to CEDR's Record of Processing Activities (ROPA)
- [ ] Confirm with CEDR's DPO (if applicable) that the processing is within scope of the existing privacy notices
- [ ] Decommission KamKod MVP infrastructure once production migration is complete

---

*This is a preliminary document describing the application's architecture and compliance posture ahead of production deployment. It should be reviewed by CEDR's legal, IT, and data protection teams before go-live.*

*Prepared by KamKod — [team@kamkod.com](mailto:team@kamkod.com)*
