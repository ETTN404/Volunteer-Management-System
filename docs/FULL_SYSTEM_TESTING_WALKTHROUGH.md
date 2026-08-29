# 🧪 VMS Full System Testing Walkthrough Guide (Phases 1 — 9)

Welcome to the **Volunteer Management System (VMS) Full System Testing Guide**! 

This guide provides a complete, step-by-step walkthrough to test **every single endpoint, security policy, background job, and UI feature** across all 9 implementation phases.

---

## 🛠️ Step 0: Server & Frontend Startup Instructions

Open **two terminal windows**:

### Terminal 1: Start Laravel Backend & Queue Worker
```bash
# Navigate to project root
cd "f:\Volunteer Management System"

# 1. Ensure migrations are fresh
php artisan migrate

# 2. Start Laravel API Server (Port 8000)
php artisan serve --port=8000
```

Open a **third terminal window** for background jobs:
```bash
cd "f:\Volunteer Management System"
php artisan queue:work
```

### Terminal 2: Start Frontend Testing Application
```bash
# Navigate to the frontend demo folder
cd "f:\Volunteer Management System\front end demo to test the backend"

# Start Vite React Dev Server (Port 5173 or 3000)
npm run dev
```

Open your web browser and go to: **`http://localhost:5173`** (or the port displayed in your terminal).

> **Note**: The frontend `ApiClient` is pre-configured to `'live'` mode, sending requests directly to `http://localhost:8000/api`.

---

## 📋 Step-by-Step Testing Flow (Phases 1 — 9)

---

### Step 1: SuperAdmin / Tenant Onboarding (Phases 1 & 4)

1. On the left sidebar under **RBAC ACTIVE ROLE**, select the **ORG ADMIN** red button (you are already on this screen in your screenshot!).
2. In the top-right header area, click the blue **`+ PROVISION TENANT`** button.
3. A modal dialog titled **"Provision New Tenant Organization"** will appear. Complete the form:
   - **Organization Name**: `Red Cross Disaster Response`
   - **Subdomain / Slug**: `redcross` (or email: `contact@redcross.org`)
   - **Subscription Plan**: Select `Pro` or `Enterprise`
4. Click **Provision Tenant**.
5. **What to Expect**:
   - A `201 Created` response is sent to `POST /api/superadmin/onboard-tenant`.
   - A new tenant card (`Red Cross Disaster Response`) appears immediately under **ACTIVE TENANT ORGANIZATIONS**, and an immutable audit log entry is recorded in the **SOC-2 Audit Trail**.

---

### Step 2: Volunteer Registration & Login (Phases 3 & 4)

1. On the top right header, click **Logout** (if logged in).
2. Click **Register as Volunteer**.
3. Complete the registration form:
   - **Full Name**: `Sara Jenkins`
   - **Email**: `sara@example.com`
   - **Password**: `password123`
   - **Skills**: Select `First Aid`, `Teaching`, `Logistics`
   - **Availability**: Select `Weekends`, `Evenings`
   - **Bio**: `Experienced first aid provider and community volunteer.`
4. Click **Submit Registration**.
5. **What to Expect**:
   - Returns `201 Created` with Sanctum `access_token`.
   - The frontend automatically captures this bearer token and saves it to `localStorage`.
   - Next, test **Login**: Enter `sara@example.com` and `password123`.
   - Returns `200 OK` with user details (`role: Volunteer`) and authenticates your session.

---

### Step 3: Coordinator Event Creation & Shift Scheduling (Phases 2 & 4)

1. On the left sidebar under **RBAC ACTIVE ROLE**, select the **COORD** red button.
2. Go to **Event Management** (or click **+ Create Event**).
3. Click **Create New Event**:
   - **Event Title**: `National Disaster Relief Drill`
   - **Description**: `Simulated emergency response training for flood relief.`
   - **Location**: `Addis Ababa Stadium`
   - **Latitude**: `9.010000`
   - **Longitude**: `38.740000`
   - **Geofence Radius**: `100` (meters)
   - **Start Date**: Select a date 5 days in the future (e.g. `2026-09-05`)
   - **End Date**: Select a date 10 days in the future (e.g. `2026-09-10`)
4. Click **Create Event**.
5. Inside the newly created event, click **Add Shift**:
   - **Start Time**: `2026-09-06 09:00:00`
   - **End Time**: `2026-09-06 13:00:00`
   - **Required Skills**: `First Aid`, `Logistics`
   - **Capacity**: `5`
6. Click **Save Shift**.
7. **What to Expect**:
   - Returns `201 Created` for both event and shift endpoints.
   - The backend validates that shift start/end times fall strictly within event start/end dates.

---

### Step 4: Volunteer Event Browsing & Skill Match Scoring (Phases 2 & 4)

1. On the left sidebar under **RBAC ACTIVE ROLE**, select the **VOLUNTEER** button.
2. Go to **Browse Events**.
3. **What to Expect**:
   - Calls `GET /api/volunteer/events`.
   - The backend `SkillMatchingService` evaluates Sara's skills (`First Aid`, `Logistics`) against the shift's required skills (`First Aid`, `Logistics`) and calculates a **100% Match Score** badge on the shift card!

---

### Step 5: Applying for Shifts & Overlap Conflict Guard (Phase 4)

1. On the `National Disaster Relief Drill` shift card, click **Apply for Shift**.
2. **What to Expect**:
   - Returns `201 Created` (`POST /api/volunteer/shifts/{id}/apply`). Application status is set to `pending`.
3. **Test Overlap Conflict Guard**:
   - As Coordinator, create a second shift `Shift B` on the exact same date and time (`2026-09-06 10:00:00` to `12:00:00`).
   - Switch to Volunteer and try applying for `Shift B`.
   - **What to Expect**: Returns `422 Unprocessable Entity` with message: `"Scheduling Conflict: This shift overlaps with another shift you are scheduled for."`

---

### Step 6: Coordinator Application Approval & Capacity Limits (Phases 3, 4, 6)

1. On the left sidebar under **RBAC ACTIVE ROLE**, select the **COORD** button.
2. Go to **Application Review** (or **Live Shift Attendance**).
3. Locate Sara Jenkins' pending application and click **Approve Application**.
4. **What to Expect**:
   - Calls `POST /api/coordinator/applications/{id}/approve`.
   - Updates status to `confirmed`.
   - Automatically dispatches **`ShiftApprovedNotification`** to Sara.
   - Updates shift confirmed count and invalidates Redis capacity cache (`shift_{id}_capacity`).

---

### Step 7: Live QR Code Generation & GPS Geofenced Check-In (Phases 4, 5)

1. As **Coordinator**, click **Refresh QR Code** on the shift.
   - Returns new signed QR hash and sets `qr_expires_at` (15 minutes expiry enforced by `RevokeExpiredQrCodesJob`).
2. Switch to **Volunteer** role and click **Check-In**.
3. **Test Case A (Outside Geofence)**:
   - Enter coordinates > 100 meters away (e.g. Latitude `8.977800`, Longitude `38.799300` — Bole Airport).
   - Click **Submit Check-In**.
   - **What to Expect**: Fails with `422 Unprocessable Entity`: `"You are outside the permitted check-in radius."`
4. **Test Case B (Inside Geofence)**:
   - Enter exact stadium coordinates: Latitude `9.010001`, Longitude `38.740001`.
   - Click **Submit Check-In**.
   - **What to Expect**: Returns `201 Created` with message: `"Check-in verified successfully. Welcome to your shift!"`

---

### Step 8: Shift Check-Out & Impact Score Accumulation (Phases 4, 5)

1. On the Volunteer dashboard, click **Check-Out**.
2. Confirm check-out.
3. **What to Expect**:
   - Calls `POST /api/volunteer/check-out`.
   - Calculates total served duration (e.g. 4.0 hours).
   - Credits `total_hours` (+4.0h) and calculates updated `impact_score` (+bonus multiplier for on-time check-in and required skills).
   - Purges `volunteer_{id}_profile` and `volunteer_{id}_impact` cache entries.

---

### Step 9: Automatic Milestone Certificate Generation (Phases 5, 6)

1. Go to **Certificates Hub** on the Volunteer dashboard.
2. **What to Expect**:
   - When cumulative hours cross milestone thresholds (10h, 25h, 50h, 100h), **`GenerateCertificateJob`** runs in the background queue.
   - Renders a formal PDF certificate in `storage/app/public/certificates/` and creates a DB record.
   - Dispatches **`CertificateIssuedNotification`** to the volunteer.
   - Displays certificate card with a **Download Certificate PDF** button.

---

### Step 10: Public Certificate Verification (Phase 4)

1. Copy the **Certificate Number** (e.g., `VMS-8F9A5BA1`) from the certificate card.
2. Click **Verify Certificate** on the top header.
3. Enter the certificate number and click **Verify**.
4. **What to Expect**:
   - Calls `GET /api/certificates/verify/{certificateNumber}` (Public Endpoint — no auth required).
   - Returns `200 OK` confirming volunteer name, issuing organization, milestone hours, and issue date.

---

### Step 11: Donor Impact Report Request & Queue Polling (Phases 4, 5)

1. On the left sidebar under **RBAC ACTIVE ROLE**, select the **COORD** button.
2. Go to **Reports Center**.
3. Click **Generate Quarterly Impact Report**:
   - Select Period: `Q3 2026`
4. Click **Generate Report**.
5. **What to Expect**:
   - Calls `POST /api/coordinator/reports`.
   - Returns `202 Accepted` (`status: processing`) and dispatches **`CompileReportJob`** to the background queue worker.
   - The UI automatically polls `GET /api/coordinator/reports/{id}/status`.
   - Once the queue worker completes CSV/PDF compilation, status changes to `completed` and a **Download CSV Report** button appears!

---

### Step 12: Urgent Shift Broadcast (Phases 5, 6)

1. As **Coordinator**, locate an upcoming shift and click **Urgent Shift Broadcast**.
2. Click **Confirm Broadcast**.
3. **What to Expect**:
   - Calls `POST /api/coordinator/shifts/{id}/broadcast`.
   - Dispatches **`SendShiftAlertJob`** to the queue worker.
   - Background worker filters all tenant volunteers by skills and dispatches **`ShiftBroadcastNotification`** to qualified volunteers.

---

### Step 13: VolunBot AI Assistant Queries (Phases 4, 7)

1. On any Volunteer screen, click the **VolunBot AI** widget at the bottom right.
2. Type a query: `"What is my total logged hours and upcoming schedule?"`
3. Click **Send**.
4. **What to Expect**:
   - Calls `POST /api/volunteer/chat`.
   - The backend compiles localized RAG context (Sara's actual hours, impact score, and upcoming shifts from database) and passes it to Gemini AI.
   - VolunBot responds in conversational natural language with accurate database facts!

---

### Step 14: Developer API Test Console (Phase 4)

1. On the top navigation bar, click **Developer API Console**.
2. Test raw API HTTP requests directly:
   - Select Method: `GET`
   - Path: `/api/volunteer/profile`
   - Click **Send Request**.
3. **What to Expect**:
   - Displays real-time HTTP response status (`200 OK`), JSON response body, response headers (including Security Headers `X-Frame-Options: DENY`), and latency duration.

---

### Step 15: Executing Full Automated Test Suite (Phases 8 & 9)

In your terminal, run the entire automated PHPUnit test suite:

```bash
cd "f:\Volunteer Management System"
php artisan test
```

**Expected Result**:
```
   PASS  Tests\Unit\ExampleTest (1 test)
   PASS  Tests\Unit\Services\GeofenceServiceTest (3 tests)
   PASS  Tests\Unit\Services\ImpactScoreServiceTest (3 tests)
   PASS  Tests\Unit\Services\SkillMatchingServiceTest (4 tests)
   PASS  Tests\Feature\AdvancedSaaSVisualMockupsTest (3 tests)
   PASS  Tests\Feature\AttendanceVerificationTest (4 tests)
   PASS  Tests\Feature\ChatbotAiAssistantTest (2 tests)
   PASS  Tests\Feature\DashboardEventAndShiftTest (4 tests)
   PASS  Tests\Feature\EnterpriseReportingAndRecognitionTest (3 tests)
   PASS  Tests\Feature\ExampleTest (1 test)
   PASS  Tests\Feature\NotificationDispatchTest (3 tests)
   PASS  Tests\Feature\Security\RoleEnforcementTest (2 tests)
   PASS  Tests\Feature\Security\TenantIsolationTest (1 test)
   PASS  Tests\Feature\TenantAuthAndOnboardingTest (4 tests)
   PASS  Tests\Feature\TenantIsolationSecurityTest (1 test)

Tests:    39 passed (121 assertions)
Duration: 2.69s
Failures: 0
```

---

## 🎉 Summary

You are all set! Follow this step-by-step walkthrough to test the entire system end-to-end. Every request, validation rule, background job, and security check is ready for testing. Enjoy exploring your system!
