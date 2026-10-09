# 🧪 VMS Full System Testing Walkthrough (Phases 1 – 9)
> **Every step matches the rebuilt frontend exactly.**  
> Follow in order. Each step tells you what to click, what to fill in, and what to expect.

---

## 🛠️ Step 0 — Start All Three Servers

Open **three separate terminal windows** before anything else.

### Terminal 1 — Laravel API (Port 8000)
```bash
cd "f:\Volunteer Management System"
php artisan migrate
php artisan serve --port=8000
```

### Terminal 2 — Queue Worker (background jobs)
```bash
cd "f:\Volunteer Management System"
php artisan queue:work
```

### Terminal 3 — React Frontend (Port 3000)
```bash
cd "f:\Volunteer Management System\front end demo to test the backend"
npm run dev
```

Open your browser at **`http://localhost:3000`**.

> The app opens directly on the **Login screen** — you will see no dashboard until logged in.

> **Mode note**: The frontend defaults to **Live Mode** — every request hits `http://localhost:8000/api`.  
> If you want to test without the Laravel backend, open the **API Test Workbench** (sidebar bottom) and switch to **Mock Mode**. In Mock Mode the quick-fill credentials below are the usernames in the seeded mock store.

---

### 🔑 Quick-Fill Credentials Reference

| Role | Mock Email | Mock Password | Live Backend (after seeding) |
|---|---|---|---|
| SuperAdmin | `superadmin@vms-platform.io` | any (mock ignores password) | Use your seeded superadmin credentials |
| OrgAdmin | `marcus.admin@hopefood.org` | any (mock ignores password) | `admin@redcross.org` / `password123` (after Step 2C) |
| Coordinator | `sarah.coordinator@hopefood.org` | any (mock ignores password) | `marcus@redcross.org` / `password123` (after Step 3B) |
| Volunteer | `alex.rivera@volunteer.me` | any (mock ignores password) | `sara@example.com` / `password123` (after Step 1A) |

> **In Mock Mode** the login mock checks only the email — password is not validated. Use the quick-fill buttons on the login screen for instant fill.

---

## 🔐 Phase 1 & 3 — Authentication

### TEST 1A — Register a New Volunteer
*(Works in both Live and Mock modes)*

1. On the **Login screen**, click the **"Register as Volunteer"** tab.
2. Fill in:
   | Field | Value |
   |---|---|
   | Full Name | `Sara Jenkins` |
   | Email | `sara@example.com` |
   | Password | `password123` |
   | Bio | `Experienced first aid provider and community volunteer.` |
   | Skills | Click: `First Aid`, `Teaching`, `Logistics` |
   | Availability | Click: `Weekends`, `Evenings` |
3. Click **"Create Volunteer Account"**.
4. **Expected**: Green banner — "Account created! Redirecting…"  
   Backend: `POST /api/register` → `201 Created` with `access_token`.  
   You land on the **Volunteer Dashboard**. Status bar shows:  
   `Signed in as Sara Jenkins (sara@example.com) — Role: Volunteer`

### TEST 1B — Logout
*(Works in both modes)*

1. In the thin bar just below the top header, click **"Logout (POST /api/logout)"** on the right.
2. **Expected**: `POST /api/logout` → `200 OK`. Token cleared, returns to **Login screen**.

### TEST 1C — Login as SuperAdmin

1. On the **Login screen**, stay on **"Sign In"** tab.
2. Click the **"SuperAdmin"** quick-fill button. It fills:  
   - **Live MySQL mode**: `superadmin@vms.com` / `password`  
   - **Mock mode**: `superadmin@vms-platform.io` / `password123`
3. Click **"Sign In"**.
4. **Expected**: `POST /api/login` → `200 OK`. Redirected to **Tenancy Overview**.  
   Status bar: `Role: SuperAdmin`

### TEST 1D — Login as OrgAdmin

1. Click **"OrgAdmin"** quick-fill:  
   - **Live MySQL mode**: `redcross.admin@vms.com` / `password`  
   - **Mock mode**: `marcus.admin@hopefood.org` / `password123`
2. Click **"Sign In"**.
3. **Expected**: Redirected to **Organization Portal**. `Role: OrgAdmin`

### TEST 1E — Login as Coordinator

1. Click **"Coordinator"** quick-fill:  
   - **Live MySQL mode**: `redcross.coord@vms.com` / `password`  
   - **Mock mode**: `sarah.coordinator@hopefood.org` / `password123`
2. Click **"Sign In"**.
3. **Expected**: Redirected to **Command Center**. `Role: Coordinator`

### TEST 1F — Login as Volunteer

1. Click **"Volunteer"** quick-fill:  
   - **Live MySQL mode**: `redcross.vol@vms.com` / `password` (or newly registered user)  
   - **Mock mode**: `sara@example.com` / `password123`
2. Click **"Sign In"**.
3. **Expected**: Redirected to **Volunteer Dashboard**. `Role: Volunteer`

---

## 🏢 Phase 1 & 4 — SuperAdmin Portal

> Log in as **SuperAdmin** (TEST 1C). In the sidebar, the role switcher should show **SYS ADMIN** highlighted in amber.

### TEST 2A — View SuperAdmin Dashboard

1. Sidebar → **"Tenancy Overview"** tab (default when you log in as SuperAdmin).
2. **Expected**: `GET /api/superadmin/dashboard` fires.  
   4 metric cards appear: Total Organizations, User Directory, Service Output (hrs), Audit Trail entries.  
   Below them: the list of provisioned organizations.

### TEST 2B — View a Specific Organization Detail

1. On any organization card, click **"View ▼"**.
2. **Expected**: Inline panel expands. Calls `GET /api/superadmin/organizations/{id}`.  
   Shows: ID, email, phone, website, geofence radius, total volunteers, total hours.

### TEST 2C — Provision a New Tenant (IMPORTANT: do this first on Live backend)

1. Click **"Provision Tenant"** button (top right of the Tenancy Overview page).
2. A modal appears. Fill in:
   | Field | Value |
   |---|---|
   | Organization Name | `Red Cross Disaster Response` |
   | Org Admin Name | `Abebe Bikila` |
   | Org Admin Email | `admin@redcross.org` |
   | Admin Password | `password123` |
   | Subscription Plan | `Pro` |
   | Geofence Radius | `100` |
3. Click **"Onboard Tenant (201)"**.
4. **Expected**: `POST /api/superadmin/onboard-tenant` → `201 Created`.  
   Banner: "Tenant 'Red Cross Disaster Response' onboarded successfully!"  
   New org appears in the organization list. Metrics update. Audit log entry `tenant.onboarded` is written.

### TEST 2D — Suspend an Organization

1. On any active organization card, click **"Suspend"**.
2. **Expected**: `PATCH /api/superadmin/organizations/{id}/status` → `200 OK`.  
   Status badge changes: `active` (green) → `suspended` (red).

### TEST 2E — Reactivate a Suspended Organization

1. On the card now showing `suspended`, click **"Activate"**.
2. **Expected**: Badge flips back to `active` (green).

### TEST 2F — View Audit Trail

1. Sidebar → **"SOC-2 Audit Trail"** tab.
2. **Expected**: Immutable log of all system actions. In Mock mode, 3 pre-seeded entries are visible.  
   The suspension action from TEST 2D should appear at the top.

---

## 🔑 Phase 4 — OrgAdmin Portal

> Log in as OrgAdmin (TEST 1D). Sidebar role switcher shows **ORG ADMIN** highlighted in rose/red.

### TEST 3A — View & Edit Organization Profile

1. Sidebar → **"Organization Portal"** tab is active by default.
2. Click the **"🏢 My Organization"** inner tab.
3. **Expected**: `GET /api/admin/organization` fires. Form pre-fills with org name, email, phone, website.
4. Change **Organization Name** to `Red Cross - Ethiopia Chapter`.
5. Click **"Save Changes — PATCH /api/admin/organization"**.
6. **Expected**: `PATCH /api/admin/organization` → `200 OK`. Name updates immediately.

### TEST 3B — Create a New Coordinator

1. Click **"👥 Create Coordinator"** inner tab.
2. Fill in:
   | Field | Value |
   |---|---|
   | Full Name | `Marcus Reed` |
   | Email | `marcus@redcross.org` |
   | Password | `password123` |
3. Click **"Create Coordinator — POST /api/admin/coordinators"**.
4. **Expected**: `201 Created`. Banner: "Coordinator 'Marcus Reed' created successfully!"

### TEST 3C — View All Members

1. Click **"📋 All Members"** inner tab.
2. Click **"Reload"**.
3. **Expected**: `GET /api/admin/members` → lists all users in the organization with name, email, role, active status.

### TEST 3D — Suspend a Volunteer

1. Click **"🙋 Manage Volunteers"** inner tab → **"Reload"**.
2. Find a volunteer, click **"Suspend"**.
3. **Expected**: `PATCH /api/admin/volunteers/{userId}/status` → `200 OK`.  
   Badge: `Active` (green) → `Suspended` (red).

### TEST 3E — View a Volunteer Profile

1. On the same tab, click **"View"** next to any volunteer.
2. **Expected**: `GET /api/admin/volunteers/{volunteerId}` → panel expands with skills, hours, impact score, attendance rate, bio, emergency contact.

---

## 📅 Phase 2 — Coordinator: Events & Shifts

> Log in as Coordinator (TEST 1E). Sidebar role switcher shows **COORD** highlighted in indigo.

### TEST 4A — Create a New Event

1. Sidebar → **"Events & Shifts"** tab.
2. Click **"+ Create Event"**.
3. Fill in:
   | Field | Value |
   |---|---|
   | Event Title | `National Disaster Relief Drill` |
   | Description | `Simulated emergency response training.` |
   | Category | `Disaster Relief` |
   | Venue Name | `Addis Ababa Stadium` |
   | Venue Address | `Meskel Square, Addis Ababa` |
   | Latitude | `9.010000` |
   | Longitude | `38.740000` |
   | Geofence Radius | `100` |
   | Start Date | `2026-09-05` |
   | End Date | `2026-09-10` |
4. Click **"Create Event"**.
5. **Expected**: `POST /api/coordinator/events` → `201 Created`.

### TEST 4B — Edit an Event

1. On the event card, click the **pencil (edit) icon**.
2. Change **Title** to `National Disaster Relief Drill — Round 2`.
3. Click **"Save"**.
4. **Expected**: `PATCH /api/coordinator/events/{id}` → `200 OK`. Title updates.

### TEST 4C — Add a Shift to the Event

1. On the event card, click **"+ Add Shift"**.
2. Fill in:
   | Field | Value |
   |---|---|
   | Shift Title | `Morning First Aid Shift` |
   | Start Time | `2026-09-06 09:00` |
   | End Time | `2026-09-06 13:00` |
   | Required Skills | `First Aid`, `Logistics` |
   | Capacity | `5` |
3. Click **"Save Shift"**.
4. **Expected**: `POST /api/coordinator/shifts` → `201 Created`.

### TEST 4D — Check Shift Capacity

1. On the shift row, look for the **capacity indicator** (auto-loads on shift expand).
2. **Expected**: `GET /api/coordinator/shifts/{id}/capacity` →  
   Shows: capacity (5), confirmed count, available slots, is_full flag.

### TEST 4E — Delete an Event

1. On any **draft** event, click the **trash (delete) icon** → confirm.
2. **Expected**: `DELETE /api/coordinator/events/{id}` → `200 OK`. Event removed from list.

---

## 👋 Phase 4 — Volunteer: Browse & Apply

> Log in as Volunteer (TEST 1F). Sidebar role shows **VOLUNTEER** in green.

### TEST 5A — Browse Events & See AI Match Score

1. Sidebar → **"Browse Shifts"** tab.
2. **Expected**: `GET /api/volunteer/events` fires.  
   *(Mock mode)* Alex Rivera's skills (`Food Prep`, `Logistics`, `First Aid`) are matched against shift required skills. Shift #1 shows **100% Match** badge.  
   *(Live mode)* Sara's skills (`First Aid`, `Logistics`) match the `Morning First Aid Shift` created in TEST 4C.

### TEST 5B — Apply for a Shift

1. On a shift card, click **"Apply for Shift"**.
2. **Expected**: `POST /api/volunteer/shifts/{id}/apply` → `201 Created`. Status shows `pending`.

### TEST 5C — Withdraw an Application

1. Sidebar → **"My Schedule"** tab.
2. Find the pending application, click **"Withdraw"**.
3. **Expected**: `DELETE /api/volunteer/apply/{assignmentId}` → `200 OK`. Status: `cancelled`.

---

## ✅ Phase 3 & 6 — Coordinator: Application Review

> Switch to **Coordinator** role.

### TEST 6A — Review Pending Applications

1. Sidebar → **"Review Applicants"** tab.
2. *(Mock)* You will see Maya Chen's application with `match_score: 50` and status `applied`.  
   *(Live)* Sara Jenkins' application appears after TEST 5B.

### TEST 6B — View AI Screening Feedback

1. On an application row, click **"AI Feedback"**.
2. **Expected**: `GET /api/coordinator/applications/{id}/ai-feedback` →  
   Panel shows: Match Score, Recommendation (`STRONG APPROVE` / `REVIEW CAREFULLY`), Strengths (matching skills), Gaps (missing skills).

### TEST 6C — Approve an Application

1. Click **"Approve"** on an application.
2. **Expected**: `POST /api/coordinator/applications/{id}/approve` → `200 OK`.  
   Status changes to `approved`. `ShiftApprovedNotification` dispatched to volunteer.

### TEST 6D — Reject an Application

1. Click **"Reject"** on a different application.
2. **Expected**: `POST /api/coordinator/applications/{id}/reject` → `200 OK`. Status → `rejected`.

### TEST 6E — Force Check-In (Override)

1. On an approved application, click **"Force Check-In"**.
2. Enter override reason: `Volunteer's phone GPS not working.`
3. Click **"Confirm"**.
4. **Expected**: `POST /api/coordinator/applications/{id}/force-checkin` → `200 OK`.  
   Attendance record created with `verification_method: coordinator_force_override`.  
   Audit log entry written and visible in the SOC-2 Audit Trail.

---

## 📡 Phase 5 — Live Kiosk & GPS Geofenced Check-In

### TEST 7A — Generate (Refresh) a QR Code

1. Coordinator → Sidebar → **"Live Kiosk & Geofence"** tab.
2. Select a shift from the dropdown.
3. Click **"Refresh QR Code"**.
4. **Expected**: `GET /api/coordinator/shifts/{id}/qr` → New signed QR hash, 15-minute expiry.

### TEST 7B — Volunteer Check-In Outside Geofence (should FAIL)

1. Switch to **Volunteer** → Sidebar → **"My Schedule"** tab.
2. Click **"Check-In"** on the approved shift.
3. In the Check-In modal, enter coordinates far from the venue:
   - **Latitude**: `8.977800` (Bole Airport — ~4 km from Addis Ababa Stadium)
   - **Longitude**: `38.799300`
4. Click **"Submit Check-In"**.
5. **Expected**: `422 Unprocessable Entity` — "You are outside the permitted check-in radius."

### TEST 7C — Volunteer Check-In Inside Geofence (should PASS)

1. In the same modal, change coordinates to:
   - **Latitude**: `9.010001`
   - **Longitude**: `38.740001`
   *(within 100m of the stadium — Addis Ababa)*
2. Click **"Submit Check-In"**.
3. **Expected**: `POST /api/volunteer/check-in` → `201 Created` — "Check-in verified successfully!"  
   *(Mock)* For the seeded Hope Center Warehouse event use: Lat `37.774930`, Lon `-122.419415`

### TEST 7D — Check-Out & Impact Accumulation

1. On **"My Schedule"**, click **"Check Out"** on the active shift.
2. Confirm.
3. **Expected**: `POST /api/volunteer/check-out` → `200 OK`.  
   Toast: e.g. "Logged 4.0 hours! Impact +40 pts."  
   `total_hours` and `impact_score` update in the database.

---

## 📊 Phase 5 — Volunteer: Impact Score Breakdown

### TEST 8A — View Impact Score

1. Volunteer → Sidebar → **"Impact Score"** tab.
2. **Expected**: `GET /api/volunteer/impact` fires.  
   3 stat cards: Total Hours, Impact Score, Attendance Rate.  
   Score Components bar chart: Base Hours Score, Skill Multiplier, Attendance Bonus, On-Time Bonus.  
   Milestone progress bars for 10h / 25h / 50h / 100h — achieved ones show ✓ in green.

   *(Mock)* Alex Rivera has 48h total, so 10h ✓ and 25h ✓ are achieved; 50h is 96% complete.

---

## 🏆 Phase 6 — Certificates

### TEST 9A — View Certificates Hub

1. Volunteer → Sidebar → **"Certificates Hub"** tab.
2. **Expected**: `GET /api/volunteer/certificates` → lists earned certificates.  
   *(Mock)* Alex Rivera has 2 seeded certificates: `VMS-10HR-849201` (10h) and `VMS-25HR-992140` (25h).  
   *(Live)* When cumulative hours cross 10h/25h/50h/100h, `GenerateCertificateJob` auto-creates a PDF.

### TEST 9B — Download a Certificate PDF

1. On a certificate card, click **"Download PDF"**.
2. **Expected**: `GET /api/volunteer/certificates/{id}/download` → `200 OK`.  
   Returns a `download_url` (e.g. `/storage/certificates/VMS-10HR-849201.pdf`).

### TEST 9C — Public Certificate Verification (No Auth Required)

1. Copy a certificate number from a card, e.g. **`VMS-10HR-849201`**.
2. At the **bottom of the sidebar**, click **"Public Verify Portal"**.
3. Paste the certificate number and click **"Verify"**.
4. **Expected**: `GET /api/certificates/verify/{certificateNumber}` (no auth token sent) → `200 OK`.  
   Confirms: volunteer name, organization, milestone hours, issue date.

---

## 📢 Phase 5 & 6 — Coordinator: Announcements & Broadcasts

> Switch to **Coordinator** role.

### TEST 10A — Create an Announcement

1. Sidebar → **"Announcements"** tab (the one with **Broadcast** badge, not the Inbox one).
2. Fill in:
   | Field | Value |
   |---|---|
   | Title | `Volunteer Training This Saturday` |
   | Content | `Please arrive 30 minutes early for the safety briefing.` |
   | Target Audience | `Volunteers` |
   | Mark as URGENT | ✓ Check the box |
3. Click **"Publish Announcement"**.
4. **Expected**: `POST /api/coordinator/announcements` → `201 Created`.  
   The announcement appears in "Published This Session" history below the form.

### TEST 10B — Read the Announcement Inbox

1. Coordinator → Sidebar → **"Announcement Inbox"** tab (with **All** badge).
2. **Expected**: `GET /api/announcements` →  
   *(Mock)* Shows 2 pre-seeded announcements: "URGENT: 4 Drivers Needed…" and "New Safety Protocol Updates."  
   Your announcement from TEST 10A appears at the top with red **URGENT** badge.

3. Switch to **Volunteer** role → Sidebar → **"Announcements"** tab.  
   The same announcements are visible from the volunteer's view.

### TEST 10C — Urgent Shift Broadcast

1. Coordinator → Sidebar → **"Command Center"** tab.
2. Click **"Urgent Broadcast"** (top right of the dashboard).
3. Select a shift, enter a message, click **"Broadcast"**.
4. **Expected**: `POST /api/coordinator/shifts/{id}/broadcast` → `202 Accepted`.  
   `SendShiftAlertJob` queues in Terminal 2 (queue worker). Watch Terminal 2 log the job processing.

---

## 👥 Phase 4 — Coordinator: Volunteer Directory

### TEST 11A — Browse Volunteer Directory

1. Coordinator → Sidebar → **"Volunteer Directory"** tab.
2. Click **"Refresh"**.
3. **Expected**: `GET /api/coordinator/volunteers` →  
   Grid of volunteer cards showing name, email, total hours, impact score, top skills.  
   *(Mock)* Shows Alex Rivera (48h, 84.5 pts) and Maya Chen (32.5h, 72 pts).

### TEST 11B — View Full Volunteer Profile

1. Click **"View Full Profile"** on any volunteer card.
2. **Expected**: `GET /api/coordinator/volunteers/{id}` → card expands with:  
   skills, total hours, impact score, attendance rate, availability, bio, emergency contact.

---

## 📋 Phase 5 — Async Reports

### TEST 12A — Generate a Report

1. Coordinator → Sidebar → **"Reports & Export"** tab.
2. Select report type and period (e.g. `Q3 2026`).
3. Click **"Generate Report"**.
4. **Expected**: `POST /api/coordinator/reports` → `202 Accepted`, `status: processing`.  
   Watch **Terminal 2** (queue worker) — `CompileReportJob` starts running.

### TEST 12B — Poll & Download Report

1. The UI automatically polls `GET /api/coordinator/reports/{id}/status`.
2. Once status → `completed`, a **"Download CSV"** button appears.
3. Click it.
4. **Expected**: Report file returned.

---

## 🤖 Phase 7 — VolunBot AI Assistant

### TEST 13A — Floating Chat Widget

1. Switch to **Volunteer** role.
2. On any screen (not the VolunBot tab), click the **green "Ask VolunBot"** button — bottom-right corner.
3. Type: `"What is my total logged hours and upcoming schedule?"`
4. Click **Send**.
5. **Expected**: `POST /api/volunteer/chat` (or the proxy `/api/gemini/chat` on the Node server) →  
   VolunBot responds with the volunteer's actual hours and schedule from the database.  
   If no `GEMINI_API_KEY` is set, the built-in context engine gives a smart fallback answer.

### TEST 13B — Full Chat Screen

1. Sidebar → **"VolunBot AI"** tab.
2. Ask: `"Which upcoming shifts best match my skills?"`
3. **Expected**: Gemini AI (or fallback engine) responds with a relevant answer based on injected volunteer context.

---

## 🔒 Phase 8 & 9 — Security Checks

### TEST 14A — Tenant Isolation (Cross-Tenant Data Blocked)

1. Open the **"API Test Workbench"** (sidebar bottom — the **9 PHASES** button).
2. Run a raw request:
   - Method: `GET`
   - Path: `/api/coordinator/events`
   - Use a token from a different organization
3. **Expected**: `403 Forbidden` — "You do not have access to this resource."

### TEST 14B — Suspended Org Access Blocked

1. As SuperAdmin, suspend an organization (TEST 2D).
2. Log in as any user from that suspended org.
3. Make any request.
4. **Expected**: `403 Forbidden` — "Organization Suspended: Contact the platform administrator."

### TEST 14C — Role Enforcement (Volunteer Cannot Access Admin Routes)

1. Log in as **Volunteer**.
2. In the **API Test Workbench**, try:
   - Method: `POST`
   - Path: `/api/superadmin/onboard-tenant`
   - Body: `{"organization_name": "Hack Org"}`
3. **Expected**: `403 Forbidden` — "This action is unauthorized."

---

## 🖥️ Phase 4 — Developer API Test Console

### TEST 15 — Manual Raw API Request

1. In the sidebar (bottom), click **"API Test Workbench"** (9 PHASES badge).
2. The console drawer opens. Try:
   - Method: `GET`
   - Path: `/api/volunteer/profile`
3. Click **"Send Request"**.
4. **Expected**: `200 OK`. Shows full JSON response body, response headers (including `X-Frame-Options: DENY`), and latency in ms.

---

## 🧪 Run the Full Automated Test Suite

In **Terminal 1**, run:
```bash
cd "f:\Volunteer Management System"
php artisan test
```

**Expected (39 passed, 0 failures)**:
```
PASS  Tests\Unit\Services\GeofenceServiceTest (3 tests)
PASS  Tests\Unit\Services\ImpactScoreServiceTest (3 tests)
PASS  Tests\Unit\Services\SkillMatchingServiceTest (4 tests)
PASS  Tests\Feature\TenantAuthAndOnboardingTest (4 tests)
PASS  Tests\Feature\DashboardEventAndShiftTest (4 tests)
PASS  Tests\Feature\AttendanceVerificationTest (4 tests)
PASS  Tests\Feature\EnterpriseReportingAndRecognitionTest (3 tests)
PASS  Tests\Feature\NotificationDispatchTest (3 tests)
PASS  Tests\Feature\ChatbotAiAssistantTest (2 tests)
PASS  Tests\Feature\Security\RoleEnforcementTest (2 tests)
PASS  Tests\Feature\Security\TenantIsolationTest (1 test)
...
Tests:    39 passed (121 assertions)
Duration: ~2.7s
Failures: 0
```

---

## 📌 Quick Reference — All Backend Endpoints Mapped to Frontend

| # | Method | Endpoint | Frontend Location |
|---|---|---|---|
| 1 | POST | `/api/login` | Login screen → Sign In tab |
| 2 | POST | `/api/register` | Login screen → Register tab |
| 3 | POST | `/api/logout` | Status bar → Logout button |
| 4 | GET | `/api/superadmin/dashboard` | SYS ADMIN → Tenancy Overview (auto-loads) |
| 5 | GET | `/api/superadmin/organizations` | SYS ADMIN → Tenancy Overview org list |
| 6 | POST | `/api/superadmin/onboard-tenant` | SYS ADMIN → "Provision Tenant" modal |
| 7 | GET | `/api/superadmin/organizations/{id}` | SYS ADMIN → "View ▼" on org card |
| 8 | PATCH | `/api/superadmin/organizations/{id}/status` | SYS ADMIN → "Suspend / Activate" button |
| 9 | GET | `/api/admin/organization` | ORG ADMIN → My Organization tab (auto-loads) |
| 10 | PATCH | `/api/admin/organization` | ORG ADMIN → "Save Changes" button |
| 11 | POST | `/api/admin/coordinators` | ORG ADMIN → Create Coordinator tab |
| 12 | GET | `/api/admin/members` | ORG ADMIN → All Members → Reload |
| 13 | PATCH | `/api/admin/volunteers/{id}/status` | ORG ADMIN → Manage Volunteers → Suspend/Activate |
| 14 | GET | `/api/admin/volunteers/{id}` | ORG ADMIN → Manage Volunteers → View |
| 15 | POST | `/api/coordinator/events` | COORD → Events & Shifts → Create Event |
| 16 | PATCH | `/api/coordinator/events/{id}` | COORD → Events & Shifts → pencil icon |
| 17 | DELETE | `/api/coordinator/events/{id}` | COORD → Events & Shifts → trash icon |
| 18 | POST | `/api/coordinator/shifts` | COORD → Events & Shifts → Add Shift |
| 19 | GET | `/api/coordinator/shifts/{id}/capacity` | COORD → Events & Shifts → shift capacity indicator |
| 20 | GET | `/api/coordinator/shifts/{id}/qr` | COORD → Live Kiosk → Refresh QR |
| 21 | POST | `/api/coordinator/applications/{id}/approve` | COORD → Review Applicants → Approve |
| 22 | POST | `/api/coordinator/applications/{id}/reject` | COORD → Review Applicants → Reject |
| 23 | GET | `/api/coordinator/applications/{id}/ai-feedback` | COORD → Review Applicants → AI Feedback |
| 24 | POST | `/api/coordinator/applications/{id}/force-checkin` | COORD → Review Applicants → Force Check-In |
| 25 | GET | `/api/coordinator/volunteers` | COORD → Volunteer Directory → Refresh |
| 26 | GET | `/api/coordinator/volunteers/{id}` | COORD → Volunteer Directory → View Full Profile |
| 27 | POST | `/api/coordinator/announcements` | COORD → Announcements (Broadcast badge) |
| 28 | POST | `/api/coordinator/shifts/{id}/broadcast` | COORD → Command Center → Urgent Broadcast |
| 29 | POST | `/api/coordinator/reports` | COORD → Reports & Export → Generate Report |
| 30 | GET | `/api/coordinator/reports/{id}` | COORD → Reports & Export → Download |
| 31 | GET | `/api/announcements` | All roles → Announcement Inbox tab |
| 32 | GET | `/api/volunteer/events` | VOLUNTEER → Browse Shifts (auto-loads) |
| 33 | POST | `/api/volunteer/shifts/{id}/apply` | VOLUNTEER → Browse Shifts → Apply |
| 34 | DELETE | `/api/volunteer/apply/{id}` | VOLUNTEER → My Schedule → Withdraw |
| 35 | POST | `/api/volunteer/check-in` | VOLUNTEER → My Schedule → Check-In modal |
| 36 | POST | `/api/volunteer/check-out` | VOLUNTEER → My Schedule → Check Out |
| 37 | GET | `/api/volunteer/schedule` | VOLUNTEER → My Schedule (auto-loads) |
| 38 | GET | `/api/volunteer/impact` | VOLUNTEER → Impact Score tab |
| 39 | GET | `/api/volunteer/profile` | VOLUNTEER → Volunteer Profile tab |
| 40 | PATCH | `/api/volunteer/profile` | VOLUNTEER → Volunteer Profile → Save |
| 41 | GET | `/api/volunteer/certificates` | VOLUNTEER → Certificates Hub (auto-loads) |
| 42 | GET | `/api/volunteer/certificates/{id}/download` | VOLUNTEER → Certificates Hub → Download PDF |
| 43 | GET | `/api/certificates/verify/{number}` | Sidebar → Public Verify Portal |
| 44 | POST | `/api/volunteer/chat` | VOLUNTEER → VolunBot AI tab or floating widget |
