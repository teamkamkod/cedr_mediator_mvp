# CEDR Mediator Availability Portal — MVP Documentation

**Version:** MVP 1.0  
**Date:** September 2026  
**Prepared by:** KamKod  
**Status:** MVP — Test environment

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Roles & Permissions](#2-roles--permissions)
3. [User Journeys](#3-user-journeys)
4. [Technical Documentation](#4-technical-documentation)
5. [Technical Stack](#5-technical-stack)
6. [GDPR Compliance](#6-gdpr-compliance)

---

## 1. Introduction

The **CEDR Mediator Availability Portal** is a web application designed to streamline the mediation scheduling workflow between CEDR case resolution advisors (CRAs), mediators, and their supporting clerks.

### Objective

The application provides a centralised interface for:
- Mediators and clerks to manage and publish their availability
- CRAs to search available mediators and propose or confirm mediation dates linked to active HubSpot cases
- Automating the booking workflow from initial pencil through to confirmed booking, with HubSpot deal stage synchronisation

### MVP Scope

This is a **Minimum Viable Product** intended for internal demonstration and early validation with CEDR's commercial team. It is deployed on **KamKod's test infrastructure**:

| Component | Environment |
|-----------|-------------|
| Frontend | Cloudflare Pages — `cedr-mediator-mvp.team-cd8.workers.dev` |
| Backend | Supabase project `kvmvgezohrrrutkxhzit` (eu-west-2) |
| Source code | GitHub — `github.com/teamkamkod/cedr_mediator_mvp` |
| HubSpot portal | Portal `5956807` (KamKod test portal) |
| Automation | Make.com (KamKod account) |

> **Note:** Before production deployment, all environments will be migrated to CEDR's own accounts and infrastructure.

---

## 2. Roles & Permissions

The application uses four roles, stored on the `users` table and enforced via Supabase Row Level Security (RLS) policies.

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
3. Review the case summary and slot details in the **Accept confirmation modal** (HubSpot case info + proposed dates)
4. Click **Accept** to confirm → slot moves to Provisionally Booked; all other pencilled dates for the same case are automatically cleared
5. Click **Decline** to reject → slot is deleted; other pending dates remain

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
2. Can set status, create a pencilled slot (with case link), or create a provisional booking
3. Can delete any slot regardless of status
4. For recurring series slots: prompted to delete "this occurrence only" or "this and all future occurrences"
5. For grouped booking slots: prompted to delete the entire mediation date group

**Pencilling a slot**
1. In the slot popover, choose **Pencil**
2. Search for the linked case using the case search (queries HubSpot deals in the mediation pipeline)
3. Optionally select Full day (AM + PM)
4. Submit → slot(s) created as Pencilled; mediator receives a notification
5. If the case already has a Provisionally Booked or Confirmed slot, the action is blocked with an error

**Creating a provisional booking directly**
1. In the slot popover, choose **Provisional Booking**
2. Select the linked case
3. Optionally notify the mediator by email
4. Submit → slot(s) created as Provisionally Booked; all pencilled slots for the same case are cleared

**Using the availability search**
1. Navigate to **Search available mediators** (sidebar link)
2. A weekly grid shows aggregated availability across all mediators (green = available, red = unavailable)
3. Click any available slot to see which mediators are available for that date/period
4. Select one or more slots using checkboxes
5. Open the mediator drawer to view their full calendar for those slots
6. Click **Book x slots** to open the booking popover
7. Choose **Pencil** or **Provisional Booking**, select the case, confirm

**Select mode (batch operations)**
1. Click **Select** in the calendar header to enter select mode
2. Click individual slots to add them to the selection
3. The floating action bar at the bottom shows:
   - **Delete N** — deletes all selected slots (with confirmation)
   - **Book N slots** (CRA only) — opens the batch booking popover (enabled only when all selected slots are Available or not set)

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
3. Edit the **App Display** column to customise what mediators and clerks see instead of the raw HubSpot value
4. Save inline — changes take effect immediately

---

## 4. Technical Documentation

### 4.1 Database Tables

All tables live in the `public` schema of the Supabase PostgreSQL instance. Row Level Security (RLS) is enabled on all tables.

---

#### `users`

Mirrors Supabase Auth users with application-level metadata.

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
| `slot_start` | timestamptz | Slot start time in UTC (AM = 07:00 UTC / BST 08:00, PM = 13:00 UTC / BST 14:00) |
| `slot_end` | timestamptz | Slot end time in UTC (AM = 11:00 UTC / BST 12:00, PM = 17:00 UTC / BST 18:00) |
| `period` | text GENERATED | Computed from `slot_start`: `morning` if hour < 13 (Europe/London), else `afternoon` |
| `status` | text | See slot lifecycle below |
| `notes` | text | Optional free-text notes |
| `series_id` | uuid FK → recurring_series | Set when slot is an exception to a recurring series |
| `is_exception` | boolean | True if this row overrides a series occurrence |
| `group_id` | uuid | Groups slots forming a single mediation date proposal (shared across AM+PM or multi-day) |
| `case_id` | text | HubSpot enquiry reference (`enquiry_id_string`) |
| `hubspot_record_id` | text | HubSpot deal/ticket object ID |
| `hubspot_object_type` | text | `deal` or `ticket` |
| `record_name` | text | HubSpot deal name (shown to CRA/admin only) |
| `created_by` / `updated_by` | uuid FK → users | Audit trail |
| `created_at` / `updated_at` | timestamptz | Timestamps |

**Unique constraint:** `(mediator_id, slot_start)` — prevents duplicate slots for the same mediator at the same time.

**Slot lifecycle:**

```
not_set → available / unavailable / ask_me  (set by mediator/clerk/CRA)
        → pencilled                          (created by CRA, linked to a case)
            → provisionally_booked           (accepted by mediator/clerk)
                → confirmed                  (HubSpot deal reaches stage 1113239382)
```

**Business rules enforced in application:**
- A case may have N `pencilled` mediation date proposals
- A case may have at most **1** `provisionally_booked` or `confirmed` slot
- When a pencilled slot is accepted → all other pencilled slots for the same case are deleted
- When a provisional booking is created → all pencilled slots for the same case are deleted

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
| `status` | text | Availability status for this series |
| `start_date` | date | Series starts on or after this date |
| `end_date` | date | Series ends on or before this date (null = no end) |
| `notes` | text | Optional notes |
| `is_active` | boolean | Set to false to deactivate the series |

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

Maps HubSpot `case_type` enum values to display labels shown in the app.

| Column | Type | Description |
|--------|------|-------------|
| `api_value` | text PK | HubSpot internal enum value |
| `display_label` | text | Label shown to mediators and clerks |
| `created_at` / `updated_at` | timestamptz | |

---

### 4.2 Row Level Security (RLS)

All tables have RLS enabled. Helper functions in the `public` schema:

```sql
is_super_admin()  -- returns true if auth.uid() maps to a user with role = 'super_admin'
is_cra()          -- returns true if auth.uid() maps to a user with role = 'cra'
```

#### `availability_slots` policies

| Operation | Who can perform it |
|-----------|--------------------|
| SELECT | Mediator (own slots), assigned clerks, CRA (all), super_admin (all) |
| INSERT | Mediator, clerks, CRA, super_admin |
| UPDATE | Mediator (own), assigned clerks, CRA (all), super_admin (all) |
| DELETE | Mediator (own), assigned clerks, CRA (own inserts only), super_admin (all) |

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
| SELECT | Own record; mediator sees own clerks; clerk sees assigned mediator; CRA sees all; super_admin sees all |
| INSERT | super_admin only |
| UPDATE | Own record; super_admin (all) |

#### `case_type_labels` policies

| Operation | Who can perform it |
|-----------|--------------------|
| SELECT | All authenticated users |
| ALL | super_admin only |

---

### 4.3 Edge Functions (Supabase)

All functions are deployed to the `kvmvgezohrrrutkxhzit` Supabase project. JWT verification is enabled on all except `hubspot-sync-webhook`.

| Function | Auth | Description |
|----------|------|-------------|
| `invite-clerk` | JWT | Sends an invitation email for a new clerk user |
| `admin-invite-user` | JWT | Creates a user of any role (used by super_admin) |
| `search-hubspot-cases` | JWT | Searches HubSpot deals in the mediation pipeline (`764352937`) by `enquiry_id_string`; client-side substring filtering; returns `case_id`, `record_name`, `record_id` |
| `get-deal-info` | JWT | Fetches deal properties + owner from HubSpot for the case details modal; includes retry on 429 |
| `get-deal-property-options` | JWT | Fetches enum options for a HubSpot deal property (used by Settings page for `case_type`) |
| `hubspot-sync-webhook` | None (server-to-server) | Receives `{ event, hubspot_record_id }` from Make.com; handles `case_confirmed` event by updating `provisionally_booked` → `confirmed` |

---

### 4.4 Key Frontend Features

#### Slot resolution

Slots are resolved at display time by the `resolveSlot(date, period, slots, series)` function:
1. Check `availability_slots` for an explicit record matching `(date, period, mediator_id)`
2. If none, check `recurring_series` for a matching series (day_of_week, frequency, active date range)
3. Return `not_set` if neither matches

This approach keeps the database lean — only overrides and exceptions are stored, not every possible slot.

#### Timezone handling

All slot times are stored as `TIMESTAMPTZ` in UTC. The `slotTime.js` helper dynamically detects BST/GMT using `Intl.DateTimeFormat` and constructs ISO 8601 timestamps with the correct offset at write time.

- AM: `08:00–12:00 Europe/London` → UTC `07:00–11:00` (BST) or `08:00–12:00` (GMT)
- PM: `14:00–18:00 Europe/London` → UTC `13:00–17:00` (BST) or `14:00–18:00` (GMT)

The `period` column is GENERATED from `slot_start`, making it always consistent.

#### HubSpot booking flow

```
CRA creates Pencilled slot (linked to HubSpot case)
    ↓  Mediator receives notification in ProvisionalBanner
    ↓  Mediator accepts
Provisionally Booked
    ↓  HubSpot deal stage changes to "Confirmed" (1113239382)
    ↓  Make.com webhook fires → POST /hubspot-sync-webhook
    ↓  { "event": "case_confirmed", "hubspot_record_id": "xxx" }
Confirmed
```

#### Make.com webhook events (outbound)

| Event | Trigger |
|-------|---------|
| `request_availability_update` | CRA clicks "Request Update" on a mediator calendar |
| `slot_pencilled` | CRA creates a pencilled slot |
| `provisional_booking_confirmed` | Mediator/clerk accepts a pencil → becomes provisionally booked |
| `provisional_booking_declined` | Mediator/clerk declines a pencil |

All payloads include: `mediator_id`, `hubspot_mediator_object_id`, slot details, `case_id`, `hubspot_record_id`, `record_name`.

---

### 4.5 Security

#### Authentication
- Managed by **Supabase Auth** (email/password). Sessions are JWT-based.
- All API calls from the frontend include the user's JWT in the `Authorization` header.
- Edge Functions validate the JWT against Supabase Auth before executing.

#### Authorisation
- Role stored in `public.users.role`; read by helper functions `is_super_admin()` and `is_cra()` used in RLS policies.
- RLS is enforced at the database level — even if the frontend sends an incorrect request, the database will reject it.
- The `hubspot-sync-webhook` endpoint does not require JWT (it is called by Make.com, not by browser clients). It uses Supabase's service role key server-side and only processes a predefined set of events.

#### HubSpot API access
- The HubSpot Private App token is stored as a Supabase secret (`HUBSPOT_API_TOKEN`) and is never exposed to the browser.
- All HubSpot API calls are proxied through Supabase Edge Functions.

#### Data exposure by role
- Mediators and clerks never receive the HubSpot deal name (`record_name`) in the UI — only the case reference number (`case_id`).
- The `get-deal-info` function is accessible to all authenticated users, but the UI applies role-based filtering to what is displayed (e.g. raw vs mapped case type label).

---

## 5. Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + Tailwind CSS | Single-page PWA |
| **Hosting** | Cloudflare Pages | CDN-hosted static build, global edge delivery |
| **Database** | Supabase PostgreSQL (eu-west-2) | Slot data, user profiles, recurring series |
| **Auth** | Supabase Auth | Email/password authentication, JWT sessions |
| **Backend logic** | Supabase Edge Functions (Deno) | HubSpot API proxy, user invitation, webhook receiver |
| **Automation** | Make.com | Middleware between HubSpot deal stage changes and the Supabase webhook; outbound notifications |
| **CRM** | HubSpot (portal 5956807) | Source of truth for cases (deals), mediator objects, pipeline stages |
| **Source control** | GitHub (`teamkamkod/cedr_mediator_mvp`) | Version control and CI/CD trigger for Cloudflare Pages |
| **State management** | TanStack Query (React Query) | Server state, caching, background polling |
| **Routing** | React Router v6 | Client-side navigation |
| **Date handling** | date-fns | Date arithmetic, formatting |
| **UI icons** | Lucide React | Icon set |

### Infrastructure diagram

```
Browser (React PWA)
    │
    ├── Supabase JS Client (realtime + REST)
    │       │
    │       └── Supabase PostgreSQL (RLS enforced)
    │               └── Supabase Edge Functions
    │                       └── HubSpot API (Private App token)
    │
    └── Cloudflare Pages (static hosting)

HubSpot (deal stage change)
    └── Make.com (workflow)
            └── POST /hubspot-sync-webhook (Supabase Edge Function)
                    └── UPDATE availability_slots SET status = 'confirmed'
```

---

## 6. GDPR Compliance

This section documents how the CEDR Mediator Availability Portal handles personal data in accordance with the **UK GDPR** and **EU GDPR** (Regulation 2016/679).

> **Scope:** This section covers the custom-built components of the system: the React frontend, Supabase (auth + database + edge functions), and Cloudflare Pages. HubSpot and Make.com are excluded as they are existing CEDR tools already covered by separate GDPR assessments.

---

### 6.1 Data Controller

**CEDR** is the Data Controller for all personal data processed by this application. KamKod acts as a **Data Processor** during the development and MVP phase.

A **Data Processing Agreement (DPA)** should be in place between CEDR and KamKod before any real personal data is processed. Upon production deployment, CEDR should also establish DPAs with Supabase and Cloudflare as sub-processors.

---

### 6.2 Personal Data Processed

| Data | Table / Location | Purpose | Retention |
|------|-----------------|---------|-----------|
| Email address | `users.email` + Supabase Auth | Authentication, invitations | Duration of account |
| First name, last name | `users.first_name`, `last_name`, `full_name` | Display in UI, attribution | Duration of account |
| Profile picture URL | `users.avatar_url` | UI display | Duration of account |
| HubSpot contact ID | `users.hubspot_contact_id` | CRM linkage | Duration of account |
| Availability data | `availability_slots`, `recurring_series` | Scheduling | Per retention policy |
| IP addresses / access logs | Supabase + Cloudflare infrastructure | Security, debugging | See below |
| Case reference (enquiry_id) | `availability_slots.case_id` | Link slot to case | Duration of slot |

**No special category data** (health, race, political views, etc.) is collected or processed by this application.

---

### 6.3 Legal Basis for Processing

| Processing activity | Legal basis |
|--------------------|-------------|
| User authentication and session management | **Legitimate interest** — necessary to operate the service |
| Storing availability and booking data | **Legitimate interest** / **Contract performance** — core function of the service |
| Sending invitation emails | **Legitimate interest** — user account creation |
| Webhook notifications (Make.com → Supabase) | **Legitimate interest** — automated workflow execution |

---

### 6.4 Data Storage — Supabase

The application's primary data store is **Supabase**, hosted on **Amazon Web Services eu-west-2 (London)**.

- **Data residency:** All data is stored in the AWS eu-west-2 (London) region, within the UK.
- **Encryption at rest:** Supabase encrypts all data at rest using AES-256.
- **Encryption in transit:** All connections use TLS 1.2 or higher.
- **Access control:** Database access is restricted to authenticated sessions with Row Level Security enforced at every query.
- **Supabase GDPR documentation:** [https://supabase.com/privacy](https://supabase.com/privacy) | [https://supabase.com/docs/guides/platform/compliance](https://supabase.com/docs/guides/platform/compliance)
- **Supabase DPA:** Available at [https://supabase.com/legal/dpa](https://supabase.com/legal/dpa)

Supabase is SOC 2 Type 2 certified. The platform is GDPR-compliant and acts as a Data Processor with appropriate contractual safeguards.

---

### 6.5 Data Storage — Cloudflare Pages

The frontend application is served via **Cloudflare Pages** (CDN).

- Cloudflare Pages serves **static files only** — no personal data is stored on Cloudflare.
- Cloudflare may process IP addresses and request metadata as part of its CDN and security services.
- Cloudflare operates data centres globally; edge nodes may handle requests outside the UK/EU, but no application data is persisted at these locations.
- **Cloudflare Privacy Policy:** [https://www.cloudflare.com/privacypolicy/](https://www.cloudflare.com/privacypolicy/)
- **Cloudflare GDPR documentation:** [https://www.cloudflare.com/trust-hub/gdpr/](https://www.cloudflare.com/trust-hub/gdpr/)
- **Cloudflare DPA:** [https://www.cloudflare.com/cloudflare-customer-dpa/](https://www.cloudflare.com/cloudflare-customer-dpa/)

---

### 6.6 Authentication

User authentication is handled by **Supabase Auth**:

- Passwords are hashed using **bcrypt** and never stored in plaintext.
- Sessions are managed via **JWT tokens** (short-lived access tokens + refresh tokens).
- Tokens are stored in browser memory / secure storage — not in cookies.
- Email invitations use time-limited, single-use links.
- No third-party OAuth providers are used in this MVP (email/password only).

---

### 6.7 Data Access & RLS

Row Level Security ensures that:
- Users can only access data they are authorised to see (their own availability, their assigned mediator's data, etc.)
- Even direct database queries from the frontend cannot bypass these policies
- CRAs and admins access all mediator data — this is an explicit business requirement, not a security oversight

---

### 6.8 HubSpot API Access

The application retrieves case information from HubSpot (deal properties, owner details) via Supabase Edge Functions:

- The HubSpot Private App token is stored as an **encrypted environment secret** in Supabase
- The token is **never exposed to the browser** — all HubSpot API calls are server-side
- Only the minimum required deal properties are requested (enquiry reference, location, dates, case type, owner)
- Retrieved data is returned to the browser for display only and is **not persisted** in Supabase

---

### 6.9 Data Retention

The application does not currently implement automated data retention/deletion. CEDR should define and implement a retention policy covering:

- **User accounts:** deactivate (`is_active = false`) when a mediator or clerk is no longer engaged; full deletion upon request
- **Availability slots:** consider archiving slots older than 12 months
- **Confirmed bookings:** retention period to be aligned with CEDR's records management policy

---

### 6.10 Data Subject Rights

The application does not yet include a self-service interface for data subject rights requests. The following should be handled manually by a Super Admin or via the Supabase dashboard during the MVP phase:

| Right | How to fulfil (MVP) |
|-------|---------------------|
| **Access** | Super Admin can view all user data via the Supabase dashboard |
| **Rectification** | Super Admin can update user records in `users` table |
| **Erasure** | Super Admin deletes the user from `auth.users` (cascades to `users` table) and removes associated slots |
| **Portability** | Data can be exported from Supabase as CSV/JSON |
| **Objection / Restriction** | Deactivate account (`is_active = false`), contact KamKod for full data removal |

> **Recommendation:** Before production launch, implement a formal data subject request workflow.

---

### 6.11 Security Measures

| Measure | Implementation |
|---------|---------------|
| Encryption in transit | TLS 1.2+ on all endpoints (Supabase, Cloudflare) |
| Encryption at rest | AES-256 (Supabase / AWS) |
| Access control | JWT authentication + RLS on all tables |
| API secret management | HubSpot token stored as encrypted Supabase secret |
| No sensitive data in frontend | HubSpot API token and service role key never sent to browser |
| Audit trail | `created_by`, `updated_by`, `created_at`, `updated_at` on all slot records |
| Minimal data collection | Only data required for scheduling is collected |

---

### 6.12 Sub-processors Summary

| Sub-processor | Location | Purpose | GDPR documentation |
|--------------|----------|---------|-------------------|
| **Supabase** | AWS eu-west-2 (London, UK) | Database, Auth, Edge Functions | [supabase.com/legal/dpa](https://supabase.com/legal/dpa) |
| **Cloudflare** | Global CDN (no data persistence) | Frontend hosting, CDN | [cloudflare.com/cloudflare-customer-dpa](https://www.cloudflare.com/cloudflare-customer-dpa/) |
| **Amazon Web Services** | eu-west-2 (London, UK) | Underlying infrastructure for Supabase | [aws.amazon.com/compliance/gdpr-center](https://aws.amazon.com/compliance/gdpr-center/) |

> HubSpot and Make.com are existing CEDR tools covered under separate GDPR assessments and are therefore excluded from this section.

---

*This documentation reflects the state of the MVP as of September 2026. It should be reviewed and updated prior to any production deployment or processing of real personal data.*

---

*Prepared by KamKod — [team@kamkod.com](mailto:team@kamkod.com)*
