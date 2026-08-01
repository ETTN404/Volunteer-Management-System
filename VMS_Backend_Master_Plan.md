# VMS Backend Master Plan
## Volunteer Management System — Professional Backend Engineering Plan

> **Scope:** Laravel + MySQL + Redis backend only. Frontend is excluded.
> **Source of Truth:** `Documentation.md` (1,676 lines) + full codebase audit conducted 2026-07-31.

---

## Executive Summary

The Volunteer Management System is a **multi-tenant SaaS backend** serving NGOs, non-profits, and community organizations. It is not a simple CRUD app. It is a professional platform with:
- Strict **multi-tenant data isolation** (one platform, N organizations, zero cross-contamination)
- **Role-Based Access Control** across 4 distinct actor types
- **AI integration** (Gemini API) for intelligent volunteer assistance
- **Cryptographically signed QR codes** with Haversine geofencing for attendance
- **Asynchronous background job processing** via Redis queues
- **Automated PDF certificate generation** and **anonymized CSV impact reporting**
- **Audit trails**, soft deletes, and data integrity enforcement at every layer

---

## 1. Current State Audit — What Exists vs. What's Missing

### What Is Already Built (and working)

| Component | File | Status |
|-----------|------|--------|
| All 11 database tables | `2026_06_10_200000_create_vms_tables.php` | Migrated |
| Compound performance indexes | `2026_06_27_115015_add_compound_indexes.php` | Migrated |
| All 11 Eloquent Models | `app/Models/` | Exist |
| `CheckRole` middleware | `app/Http/Middleware/CheckRole.php` | Working |
| `TenantMiddleware` | `app/Http/Middleware/TenantMiddleware.php` | Partially working — see §4 |
| `BelongsToTenant` trait | `app/Models/Traits/` | Exists |
| Auth (login/register/logout) | `AuthController.php` | Working |
| Event + Shift CRUD | `CoordinatorController.php` | Core working |
| Volunteer browse/apply/schedule | `VolunteerController.php` | Core working |
| QR + GPS check-in/check-out | `AttendanceController.php` | Advanced — Haversine implemented |
| AI Chatbot | `ChatbotController.php` + `GeminiService.php` | Working with mock fallback |
| PDF Certificate generation | `CertificateController.php` | DomPDF integrated |
| CSV Report generation | `ReportController.php` | Basic — needs async wiring |
| Background jobs (3) | `app/Jobs/` | Exist but never dispatched |
| Tenant Onboarding | `TenantOnboardingController.php` | Core working |
| Seed data (2 orgs) | `DatabaseSeeder.php` | Working |

### What Is Missing / Incomplete / Broken

| Gap | Severity | Description |
|-----|----------|-------------|
| `TenantMiddleware` bug | CRITICAL | Only checks org status if relationship is already loaded — silently passes suspended orgs |
| No `Form Request` classes | CRITICAL | All validation lives inside controllers — violates SRP, untestable, unscalable |
| No `OrgAdmin` user management routes | HIGH | Org admins cannot create/deactivate coordinators via API |
| No `SuperAdmin` system dashboard | HIGH | No API to list all orgs, view system health, suspend/activate tenants |
| Report is not background-queued | MEDIUM | `CompileReportJob` exists but `ReportController` never dispatches it |
| Certificate not background-queued | MEDIUM | `GenerateCertificateJob` exists but never dispatched |
| No milestone auto-trigger | MEDIUM | Certificates only issued manually — no auto-issuance when hours threshold is crossed at check-out |
| `TenantScope` not applied to `Event` | MEDIUM | `CoordinatorController::getEvents()` calls `Event::with('shifts')->get()` with NO org filter — leaks all orgs' events |
| No `AnnouncementController` pagination | MEDIUM | Fetches all announcements with no limit |
| No `volunteer profile update` endpoint | MEDIUM | Volunteers cannot update their own skills/bio via API |
| No `event status auto-transition` | MEDIUM | Events stay `upcoming` forever — no scheduled command |
| No `API Resource classes` | MEDIUM | Raw Eloquent models returned directly — exposes internal fields |
| No `PHPUnit tests` | MEDIUM | `phpunit.xml` exists but zero test files written |
| No `rate limiting` on chat endpoint | MEDIUM | Gemini API rate abuse protection missing |
| No `audit log table` | SHOULD-HAVE | Boundary conditions describe audit trail — not implemented |
| `signature_data` stored as raw base64 in attendance | SHOULD-HAVE | Should be stored as a file path |
| `GeminiService` uses `gemini-1.5-flash` hardcoded | SHOULD-HAVE | Should be configurable via `.env` |
| No `GEMINI_API_KEY` in `.env` | LOW | Chatbot always falls back to mock |

---

## 2. Architecture Blueprint

```
HTTP Request Layer (Nginx -> public/index.php)
         |
Laravel Global Kernel Middleware Pipeline
[EncryptCookies] -> [TenantMiddleware] -> [auth:sanctum] -> [CheckRole] -> [ThrottleRequests]
         |
Route Layer (api.php) — Public / Auth / Role-gated route groups
         |
Form Request Validation Layer — Dedicated FormRequest per action
         |
Controller Layer — Thin; delegates to Services
    |               |                  |
Service Layer    Job Queue (Redis)   API Resource Layer
(Business Logic)  (Async work)       (Response shaping)
    |               |                  |
Eloquent ORM / Model Layer (Global Scopes enforce org_id isolation)
    |               |
 MySQL DB       Redis Cache + Queue
```

---

## 3. Database Layer — Complete Schema Verification

### 3.1 Table-by-Table Verification

| Table | Migration | Model | Scoped? | SoftDelete? |
|-------|-----------|-------|---------|-------------|
| `organizations` | Yes | `Organization.php` | N/A (root entity) | Yes |
| `users` | Yes | `User.php` | Yes via `BelongsToTenant` | Yes |
| `volunteers` | Yes | `Volunteer.php` | Yes via user org | Yes |
| `events` | Yes | `Event.php` | **BUG: Scope not enforced in controller** | Yes |
| `shifts` | Yes | `Shift.php` | Yes via event's org | Yes |
| `shift_assignments` | Yes | `ShiftAssignment.php` | Yes via shift to event | Yes |
| `attendances` | Yes | `Attendance.php` | Yes via volunteer's org | Yes |
| `certificates` | Yes | `Certificate.php` | Yes — org_id present | Yes |
| `reports` | Yes | `Report.php` | Yes — org_id present | Yes |
| `announcements` | Yes | `Announcement.php` | Yes — org_id present | Yes |
| `chatbot_sessions` | Yes | `ChatbotSession.php` | Yes via volunteer | Yes |

### 3.2 Missing Database Fields (new migration required)

```php
// New migration: add_missing_fields_to_vms_tables

// attendances — replace inline base64 with file path
$table->string('signature_path', 500)->nullable();
// (drop inline signature_data column after migration)

// organizations — missing EER fields
$table->string('phone', 50)->nullable();
$table->string('logo_path', 500)->nullable();
$table->string('website', 255)->nullable();
$table->string('subscription_plan', 50)->default('free');

// users — profile photo + active flag
$table->string('profile_photo_path', 500)->nullable();
$table->boolean('is_active')->default(true);

// events — configurable geofence radius
$table->integer('geofence_radius')->default(100);

// shifts — QR expiry timestamp
$table->timestamp('qr_expires_at')->nullable();

// shift_assignments — coordinator feedback + cached match score
$table->text('coordinator_feedback')->nullable();
$table->integer('match_score')->nullable();

// New table: audit_logs
Schema::create('audit_logs', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->unsignedBigInteger('org_id')->nullable();
    $table->string('action', 100);       // e.g. 'application.approved'
    $table->string('model_type', 100)->nullable();
    $table->unsignedBigInteger('model_id')->nullable();
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->string('user_agent')->nullable();
    $table->timestamps();
    $table->index(['user_id', 'created_at']);
    $table->index(['org_id', 'action']);
});

// New table: announcement_reads (for unread tracking)
Schema::create('announcement_reads', function (Blueprint $table) {
    $table->id();
    $table->foreignId('announcement_id')->constrained()->onDelete('cascade');
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->timestamp('read_at');
    $table->unique(['announcement_id', 'user_id']);
});
```

---

## 4. Middleware Layer — Fixes and Enhancements

### 4.1 Fix: `TenantMiddleware` (Critical Bug)

**Current Bug:** The check `if ($user->org_id !== null && $user->relationLoaded('organization'))` fails silently on almost every real request because the relation is never pre-loaded on fresh requests.

**Fix:**
```php
public function handle(Request $request, Closure $next): Response
{
    if (Auth::check()) {
        $user = Auth::user();
        if ($user->org_id !== null) {
            // Always query — never rely on cached relation loading
            $org = $user->organization()->first();
            if ($org && $org->status === 'suspended') {
                $user->tokens()->delete(); // revoke all Sanctum tokens
                return response()->json([
                    'error'   => 'Organization Suspended',
                    'message' => 'Your organization has been suspended. Contact the platform administrator.'
                ], 403);
            }
        }
    }
    return $next($request);
}
```

### 4.2 New Middleware Required

| Middleware | Class | Purpose |
|------------|-------|---------|
| `EnsureVolunteerProfile` | `app/Http/Middleware/EnsureVolunteerProfile.php` | Reusable guard — ensures user has a linked Volunteer record before volunteer-only actions |
| `LogAuditTrail` | `app/Http/Middleware/LogAuditTrail.php` | Logs all mutating requests (POST/PUT/PATCH/DELETE) to `audit_logs` automatically |

---

## 5. Form Request Validation Layer (Complete List)

Every controller action must have its own `FormRequest`. No exceptions.

```
app/Http/Requests/
├── Auth/
│   ├── LoginRequest.php
│   └── RegisterRequest.php
├── Coordinator/
│   ├── CreateEventRequest.php
│   ├── UpdateEventRequest.php
│   ├── CreateShiftRequest.php
│   ├── ApproveApplicationRequest.php
│   ├── ForceCheckInRequest.php
│   └── BroadcastShiftRequest.php
├── Volunteer/
│   ├── UpdateProfileRequest.php
│   ├── CheckInRequest.php
│   └── CheckOutRequest.php
├── OrgAdmin/
│   ├── CreateStaffRequest.php
│   └── UpdateOrganizationRequest.php
├── SuperAdmin/
│   └── OnboardTenantRequest.php
├── Report/
│   └── GenerateReportRequest.php
└── Certificate/
    └── GenerateCertificateRequest.php
```

### Validation Rules Summary

| Field | Rule |
|-------|------|
| Email | `email:rfc,dns` |
| Password | `min:8, confirmed, regex with uppercase + digit + special char` |
| Lat/Long | `numeric, between:-90,90 / between:-180,180` |
| File uploads | `mimes:jpeg,png,pdf, max:2048` |
| Shift times | `date_format:Y-m-d H:i:s, after:start_time` |
| Skill arrays | `array, each string max:100` |
| Bio / descriptions | `string, max:2000` |
| QR signatures | `string, max:500` |
| Chatbot prompt | `string, max:1000` |

---

## 6. Service Layer — Business Logic Architecture

Controllers must be thin. All business logic belongs in dedicated Service classes.

```
app/Services/
├── GeminiService.php           Exists — needs configurable model via env
├── SkillMatchingService.php    MISSING — extract from VolunteerController
├── GeofenceService.php         MISSING — extract Haversine from AttendanceController
├── CertificateService.php      MISSING — extract from CertificateController
├── ReportService.php           MISSING — extract from ReportController
├── ImpactScoreService.php      MISSING — extract from AttendanceController checkout
├── ShiftBroadcastService.php   MISSING — extract from AnnouncementController
└── AuditLogService.php         MISSING — new
```

### 6.1 SkillMatchingService

```php
class SkillMatchingService
{
    // Returns a 0-100 float representing % match
    public function calculateMatchScore(array $volunteerSkills, array $requiredSkills): float;

    // Returns volunteers sorted by match score DESC for a given shift (coordinator dashboard)
    public function rankVolunteersForShift(Shift $shift): Collection;

    // Returns ['eligible' => bool, 'missing_skills' => [...]] for a specific volunteer+shift
    public function assessEligibility(Volunteer $volunteer, Shift $shift): array;
}
```

### 6.2 ImpactScoreService

The current calculation (0.1 pts/hour, capped at 100) lives inline in `AttendanceController::checkOut()`.
It must become a formal service with milestone detection:

```php
class ImpactScoreService
{
    // Base: 0.1 pts per hour
    // Bonus multipliers:
    //   +20% if shift required >= 3 skills
    //   +15% if volunteer checked in before shift start (on-time)
    //   +10% if volunteer attendance rate >= 90%
    public function calculateIncrement(Volunteer $volunteer, Attendance $attendance, Shift $shift): float;

    // Checks milestones: [10, 25, 50, 100, 200, 500] hours
    // Returns array of newly crossed milestones (triggers auto certificate jobs)
    public function checkMilestones(Volunteer $volunteer, float $prevHours, float $newHours): array;
}
```

### 6.3 GeofenceService

```php
class GeofenceService
{
    const DEFAULT_RADIUS_METERS = 100;

    // Standard Haversine — extract from AttendanceController
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float;

    // Returns true if within geofence (uses event.geofence_radius or default 100m)
    public function isWithinGeofence(float $vLat, float $vLon, Event $event): bool;

    // Returns distance in meters for use in error messages
    public function getDistanceFromVenue(float $lat, float $lon, Event $event): float;
}
```

### 6.4 AuditLogService

```php
class AuditLogService
{
    public function log(string $action, ?Model $model = null, array $oldValues = [], array $newValues = []): void;
    // Logs: user_id, org_id, action, model_type, model_id, old_values, new_values, ip, user_agent
}
```

---

## 7. API Resource Layer — Response Shaping

Raw Eloquent models must never be returned directly from a production API.

```
app/Http/Resources/
├── UserResource.php
├── VolunteerResource.php           includes reliability_metrics, skills_alignment
├── OrganizationResource.php
├── EventResource.php
├── ShiftResource.php               includes computed: available_slots, is_full
├── ShiftAssignmentResource.php     includes match_score, nested volunteer + shift
├── AttendanceResource.php
├── CertificateResource.php         includes download_url
├── ReportResource.php              includes download_url, status
├── AnnouncementResource.php        includes is_read (per-user context)
└── ChatbotResponseResource.php
```

---

## 8. Controller Layer — Complete API Inventory

### 8.1 Routes That Exist

| Method | Route | Controller | Status |
|--------|-------|------------|--------|
| POST | `/api/register` | `AuthController@register` | Working |
| POST | `/api/login` | `AuthController@login` | Working |
| POST | `/api/logout` | `AuthController@logout` | Working |
| GET | `/api/user` | closure | Working |
| POST | `/api/superadmin/onboard-tenant` | `TenantOnboardingController@onboard` | Working |
| POST | `/api/coordinator/events` | `CoordinatorController@createEvent` | Working |
| GET | `/api/coordinator/events` | `CoordinatorController@getEvents` | BUG: no tenant scope |
| POST | `/api/coordinator/events/{id}/shifts` | `CoordinatorController@createShift` | Working |
| GET | `/api/coordinator/events/{id}/applications` | `CoordinatorController@getApplications` | Working |
| POST | `/api/coordinator/applications/{id}/approve` | `CoordinatorController@approveApplication` | Working |
| GET | `/api/coordinator/applications/{id}/ai-feedback` | `CoordinatorController@getAiFeedback` | Working |
| POST | `/api/coordinator/applications/{id}/force-checkin` | `CoordinatorController@forceCheckIn` | Working |
| POST | `/api/coordinator/shifts/{id}/qrcode` | `AttendanceController@generateQrCode` | Working |
| POST | `/api/coordinator/certificates` | `CertificateController@generateCertificate` | Working |
| POST | `/api/coordinator/reports` | `ReportController@generateReport` | Not async — blocks thread |
| GET | `/api/coordinator/reports` | `ReportController@getReports` | Working |
| POST | `/api/coordinator/shifts/{id}/broadcast` | `AnnouncementController@broadcastUrgentShift` | Working |
| GET | `/api/volunteer/events` | `VolunteerController@browseEvents` | Working |
| POST | `/api/volunteer/apply/{shiftId}` | `VolunteerController@applyForShift` | Working |
| GET | `/api/volunteer/schedule` | `VolunteerController@getSchedule` | Working |
| POST | `/api/volunteer/check-in` | `AttendanceController@checkIn` | Working |
| POST | `/api/volunteer/check-out` | `AttendanceController@checkOut` | Working |
| POST | `/api/volunteer/chat` | `ChatbotController@chat` | Working |
| GET | `/api/volunteer/certificates/{id}/download` | `CertificateController@downloadCertificate` | Working |
| GET | `/api/announcements` | `AnnouncementController@getAnnouncements` | Working |

### 8.2 Routes That Must Be Added

| Method | Route | Purpose | Priority |
|--------|-------|---------|----------|
| GET | `/api/superadmin/organizations` | List all tenants | HIGH |
| PATCH | `/api/superadmin/organizations/{id}/status` | Suspend/activate tenant | HIGH |
| GET | `/api/superadmin/system-stats` | Platform-wide metrics | MEDIUM |
| GET | `/api/orgadmin/staff` | List all coordinators in org | HIGH |
| POST | `/api/orgadmin/staff` | Create coordinator account | HIGH |
| PATCH | `/api/orgadmin/staff/{id}/status` | Activate/deactivate coordinator | HIGH |
| GET | `/api/orgadmin/volunteers` | List all volunteers in org | HIGH |
| GET | `/api/orgadmin/dashboard` | Summary stats for org | MEDIUM |
| GET | `/api/coordinator/events/{id}` | Get single event detail | MEDIUM |
| PATCH | `/api/coordinator/events/{id}` | Update event | MEDIUM |
| DELETE | `/api/coordinator/events/{id}` | Delete/archive event | MEDIUM |
| GET | `/api/coordinator/shifts/{id}/capacity` | Live slot availability | MEDIUM |
| GET | `/api/coordinator/volunteers` | Volunteers ranked by skills | MEDIUM |
| GET | `/api/volunteer/profile` | Own profile + stats | HIGH |
| PATCH | `/api/volunteer/profile` | Update skills, bio, availability | HIGH |
| GET | `/api/volunteer/certificates` | List own certificates | MEDIUM |
| GET | `/api/volunteer/impact` | Detailed impact breakdown | MEDIUM |
| DELETE | `/api/volunteer/apply/{assignmentId}` | Withdraw application | MEDIUM |
| GET | `/api/verify/certificate/{number}` | Public certificate verification | MEDIUM |
| GET | `/api/coordinator/reports/{id}` | Poll report status | MEDIUM |

---

## 9. Background Job System — Full Specification

### 9.1 Jobs That Exist (but are never dispatched)

| Job | File | Problem |
|-----|------|---------|
| `CompileReportJob` | `app/Jobs/CompileReportJob.php` | Never dispatched — `ReportController` does the work synchronously |
| `GenerateCertificateJob` | `app/Jobs/GenerateCertificateJob.php` | Never dispatched — `CertificateController` does it synchronously |
| `SendShiftAlertJob` | `app/Jobs/SendShiftAlertJob.php` | Verify if dispatched in `AnnouncementController` |

### 9.2 New Jobs Required

| Job | Trigger | Description |
|-----|---------|-------------|
| `AutoTransitionEventStatusJob` | Scheduled | Flip `upcoming -> ongoing -> completed` based on dates |
| `RevokeExpiredQrCodesJob` | Scheduled | Nullify QR signatures older than configured expiry |
| `AutoGenerateMilestoneCertificateJob` | After check-out | Triggered by `ImpactScoreService::checkMilestones()` |
| `SendCheckOutReminderJob` | 30 min before shift ends | Notify checked-in volunteers to check out |

### 9.3 Scheduled Commands (Console Kernel)

```php
// app/Console/Kernel.php
$schedule->job(new AutoTransitionEventStatusJob)->everyFifteenMinutes();
$schedule->job(new RevokeExpiredQrCodesJob)->everyFifteenMinutes();
$schedule->job(new SendCheckOutReminderJob)->everyThirtyMinutes();
```

> **Important:** `.env` currently has `QUEUE_CONNECTION=database`. For production, set `QUEUE_CONNECTION=redis` and ensure a queue worker is running: `php artisan queue:work redis --queue=certificates,reports,default`

---

## 10. Multi-Tenant Architecture — Deep Dive

### 10.1 Isolation Chain

```
Organization
  └── owns --> Users, Events, Reports, Announcements, Certificates
                  Event
                    └── owns --> Shifts
                                  Shift
                                    └── owns --> ShiftAssignments, Attendances
User (Volunteer role)
  └── belongs to --> Organization
```

### 10.2 Global Scope — Model Coverage

| Model | Needs Tenant Scope | Current Status |
|-------|-------------------|----------------|
| `Organization` | No — it IS the tenant root | N/A |
| `User` | Yes — `org_id` direct | Applied |
| `Volunteer` | Yes — via `user.org_id` | Applied |
| `Event` | Yes — `org_id` direct | **BUG: scope exists but controller bypasses it** |
| `Shift` | Yes — via `event.org_id` | Applied |
| `ShiftAssignment` | Yes — via `shift.event.org_id` | Applied |
| `Attendance` | Yes — via `volunteer.user.org_id` | Applied |
| `Certificate` | Yes — `org_id` direct | Applied |
| `Report` | Yes — `org_id` direct | Applied |
| `Announcement` | Yes — `org_id` direct | Applied |
| `ChatbotSession` | Yes — via `volunteer.user.org_id` | Applied |

### 10.3 SuperAdmin Global Scope Bypass

```php
// In BelongsToTenant trait:
static::addGlobalScope('tenant', function (Builder $builder) {
    if (!Auth::check()) return;
    $user = Auth::user();
    if ($user->role === 'SuperAdmin') return; // sees everything
    if ($user->org_id) {
        $builder->where($builder->getModel()->getTable() . '.org_id', $user->org_id);
    }
});
```

---

## 11. Security Architecture

### 11.1 Authentication

- Stateless API auth via `Laravel Sanctum` (`auth:sanctum` middleware)
- Tokens in `personal_access_tokens` table
- **Enhancement:** Name tokens by client: `$user->createToken('web-client-' . substr($request->userAgent(), 0, 100))`
- **Enhancement:** Token expiration: add `SANCTUM_EXPIRATION=10080` (7 days) to `.env`

### 11.2 RBAC Matrix

| Capability | Volunteer | Coordinator | OrgAdmin | SuperAdmin |
|-----------|:---------:|:-----------:|:--------:|:----------:|
| Login/Register | Yes | Yes | Yes | Yes |
| Browse events | Yes | Yes | Yes | Yes |
| Apply for shift | Yes | No | No | No |
| QR Check-in/out | Yes | No | No | No |
| Chat with VolunBot | Yes | No | No | No |
| Update own profile | Yes | Yes | Yes | Yes |
| Create/edit events | No | Yes | Yes | Yes |
| Create shifts | No | Yes | Yes | Yes |
| Approve applications | No | Yes | Yes | Yes |
| Force check-in override | No | Yes | Yes | Yes |
| Generate QR codes | No | Yes | Yes | Yes |
| Broadcast urgent alerts | No | Yes | Yes | Yes |
| Issue certificates | No | Yes | Yes | Yes |
| Generate reports | No | Yes | Yes | Yes |
| Manage coordinators | No | No | Yes | Yes |
| Org-level dashboard | No | No | Yes | Yes |
| Onboard new tenants | No | No | No | Yes |
| Suspend/activate tenants | No | No | No | Yes |
| Platform-wide stats | No | No | No | Yes |

### 11.3 Rate Limiting

```php
// api.php route groups:
// General API — 60 requests per minute
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(...);

// Check-in — 3 per minute (already implemented)
Route::middleware(['auth:sanctum', 'throttle:3,1'])->post('/volunteer/check-in', ...);

// Chatbot — 10 per minute (MISSING — must add)
Route::middleware(['auth:sanctum', 'throttle:10,1'])->post('/volunteer/chat', ...);

// Broadcasts — 5 per minute per user (MISSING — must add)
Route::middleware(['auth:sanctum', 'throttle:5,1'])->post('/coordinator/shifts/{id}/broadcast', ...);
```

---

## 12. QR Code and Geofencing System

### 12.1 QR Code Enhancement

**Current:** Random hex string stored in `shifts.qr_code_signature`, validated on check-in. No database-level expiry.

**Required:**
- Add `shifts.qr_expires_at TIMESTAMP` (included in §3.2 migration)
- On `generateQrCode()`: set `qr_expires_at = now()->addMinutes(config('vms.qr_expiry_minutes'))`
- On `checkIn()`: verify `$shift->qr_expires_at && $shift->qr_expires_at->isFuture()` before accepting

### 12.2 Geofence Boundary Conditions (from docs §3.5.8)

| Parameter | Value | Config Key |
|-----------|-------|------------|
| Default radius | 100 meters | `vms.geofence_default_radius` |
| Per-event override | `events.geofence_radius` column | — |
| Check-in window start | 15 min before shift | `vms.checkin_buffer_before` |
| Check-in window end | 30 min after shift start | `vms.checkin_buffer_after` |
| Time-drift tolerance | 2 minutes | `vms.time_drift_tolerance` |

---

## 13. AI Chatbot Subsystem

### 13.1 Context Injection Architecture

```
[SYSTEM PROMPT]
You are VolunBot, AI assistant for the Volunteer Management System.
Only answer questions related to this volunteer's data. Do not fabricate data.

[VOLUNTEER CONTEXT]
- Name: {user.full_name}
- Organization: {org.name}
- Total Verified Service Hours: {volunteer.total_hours}
- Impact Score: {volunteer.impact_score} / 100
- Registered Skills: {volunteer.skills}
- Next Upcoming Shift: {shift_title} on {date} at {location}
- Recent Service: {last 3 attended shifts}
- Milestone Progress: {hours_to_next_milestone} hours to next certificate

[CONVERSATION HISTORY]
{last 10 turns stored in chatbot_sessions.context_data}

[VOLUNTEER QUERY]
{user message}
```

### 13.2 Session Lifecycle

- Session created on first chat message; linked to `chatbot_sessions.volunteer_id`
- `context_data` JSON stores last 10 turns (configurable via `config('vms.chatbot_max_history')`)
- Session expires after 24 hours of `last_interaction` inactivity
- New session auto-created if expired or explicitly reset

### 13.3 GeminiService Enhancements

```php
// config/services.php — add:
'gemini' => [
    'key'   => env('GEMINI_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-1.5-flash'),
],

// GeminiService — read model from config:
protected string $model;
public function __construct() {
    $this->apiKey = config('services.gemini.key');
    $this->model  = config('services.gemini.model', 'gemini-1.5-flash');
}
```

---

## 14. Certificate Generation System

### 14.1 Milestone Tiers

```php
// config/vms.php
'certificate_milestones' => [10, 25, 50, 100, 200, 500], // hours
```

### 14.2 Auto-Generation Trigger Chain (Post Check-Out)

```
Volunteer checks out
  -> ImpactScoreService::checkMilestones($volunteer, $prevHours, $newHours)
    -> Returns e.g. [25, 50] — milestones newly crossed
      -> foreach $milestone:
         GenerateCertificateJob::dispatch($volunteer, $milestone)->onQueue('certificates')
           -> Job: generate PDF via DomPDF
           -> Job: store to storage/certificates/
           -> Job: create Certificate DB record
           -> Job: dispatch CertificateIssuedNotification
```

### 14.3 Certificate PDF — Production Requirements

- Organization logo (from `organizations.logo_path`)
- Unique certificate number: `VMS-XXXXXXXX` (already implemented)
- QR code printed on certificate pointing to: `GET /api/verify/certificate/{number}`
- Coordinator/admin signatory name + org name
- Issue date

### 14.4 Public Certificate Verification Endpoint

```
GET /api/verify/certificate/{certificate_number}
// No auth required — publicly verifiable by employers/universities
// Returns: volunteer first name + last initial, org name, hours, issue date
// Never returns: full name, email, personal details
```

---

## 15. Reporting System

### 15.1 Report Types

| Type | Description | Who Can Access |
|------|-------------|----------------|
| Impact Report | Org totals: volunteers, hours, events per period | OrgAdmin, Coordinator |
| Volunteer Detail Report | Per-volunteer: shifts, hours, score | OrgAdmin |
| Attendance Report | Event-level: attendance rate, no-shows | Coordinator |
| Skills Gap Report | Unfilled shifts + missing skills patterns | OrgAdmin |
| System Report | Cross-org platform statistics | SuperAdmin only |

### 15.2 Making Report Generation Async

```php
// ReportController::generateReport()
$report = Report::create([
    'org_id'       => $orgId,
    'generated_by' => auth()->id(),
    'period'       => $request->period,
    'status'       => 'processing',   // add status column to reports table
    'file_path'    => '',
]);
CompileReportJob::dispatch($report)->onQueue('reports');
return response()->json(['status' => 'queued', 'report_id' => $report->id], 202);

// GET /api/coordinator/reports/{id} — poll for completion
// Returns: { status: "processing|completed|failed", download_url: "..." }
```

### 15.3 PII Anonymization Rules (from docs §3.5.8)

- Volunteer name → `VOL-XXXXXX` hashed identifier (already implemented)
- Email → `fi****@domain.com` masked (already implemented)
- **Never** export: passwords, raw GPS coordinates, signature files, biographies

---

## 16. Announcement and Urgent Broadcast System

### 16.1 Regular Announcements

- Scoped to `org_id` — coordinators and OrgAdmins post, volunteers read
- `target_audience`: `all | volunteers | coordinators`
- Unread tracking via `announcement_reads` pivot table (§3.2)
- Paginate: 20 per page

### 16.2 Urgent Shift Broadcast Flow

1. Coordinator triggers broadcast for under-staffed shift
2. `ShiftBroadcastService` identifies eligible volunteers:
   - Same org + skill match > 0% + no overlapping confirmed shift
3. Volunteers chunked into batches of 50; `SendShiftAlertJob` dispatched per batch
4. Each volunteer receives: in-app announcement + email notification
5. When shift reaches capacity: broadcast flag set to closed, no further notifications

---

## 17. Notification Infrastructure (Currently Missing)

```php
// .env additions:
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS=noreply@voluntrackapp.com
MAIL_FROM_NAME="VolunTrack"

// app/Notifications/ — create these:
├── ShiftApprovedNotification.php       // sent when coordinator approves application
├── ShiftBroadcastNotification.php      // sent during urgent broadcast
├── CertificateIssuedNotification.php   // sent when milestone certificate generated
└── OrganizationSuspendedNotification.php // sent to org admin on suspension
```

---

## 18. Caching Strategy (Redis)

### 18.1 Cache Key Plan

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `org:{id}:events` | 5 min | Event created/updated/deleted |
| `volunteer:{id}:profile` | 10 min | Profile updated, checkout completed |
| `volunteer:{id}:schedule` | 5 min | Assignment status changed |
| `shift:{id}:capacity` | 1 min | Assignment confirmed/cancelled |
| `org:{id}:announcements` | 2 min | Announcement posted |
| `org:{id}:impact_summary` | 30 min | Report generated |

### 18.2 Implementation Pattern

```php
// In Service classes (using cache tags for grouped invalidation):
return Cache::tags(['org:' . $orgId, 'events'])
    ->remember('org:' . $orgId . ':events:page:' . $page, 300,
        fn() => Event::with('shifts')->paginate(config('vms.events_per_page'))
    );

// On mutation — invalidate the whole group:
Cache::tags(['org:' . $orgId, 'events'])->flush();
```

> **Note:** Cache tags require Redis-backed cache driver. Set `CACHE_STORE=redis` in `.env`.

---

## 19. Audit Log System

### 19.1 Events to Log

| Category | Actions |
|----------|---------|
| Auth | Login success, Login failed (with IP), Logout |
| Tenant | Organization onboarded, Suspended, Activated |
| Applications | Submitted, Approved, Rejected, Force-checked-in |
| Attendance | QR check-in, Manual override check-in, Check-out |
| Certificates | Generated (auto/manual), Downloaded |
| Reports | Generated, Downloaded |
| Broadcasts | Dispatched, Number of volunteers notified |
| Staff | Coordinator created, Deactivated |

---

## 20. Testing Strategy

### 20.1 Test File Structure

```
tests/
├── Unit/
│   ├── Services/
│   │   ├── SkillMatchingServiceTest.php
│   │   ├── GeofenceServiceTest.php
│   │   ├── ImpactScoreServiceTest.php
│   │   └── GeminiServiceTest.php      -- tests mock fallback
│   └── Models/
│       ├── VolunteerTest.php           -- reliability metrics, skill alignment
│       └── TenantScopeTest.php         -- isolation guarantee
└── Feature/
    ├── Auth/
    │   ├── LoginTest.php
    │   └── RegisterTest.php
    ├── Coordinator/
    │   ├── EventManagementTest.php
    │   ├── ShiftManagementTest.php
    │   └── ApplicationReviewTest.php
    ├── Volunteer/
    │   ├── BrowseEventsTest.php
    │   ├── ApplyForShiftTest.php
    │   └── CheckInTest.php             -- geofence, QR, time-drift
    ├── Security/
    │   ├── TenantIsolationTest.php     -- Org A cannot read Org B's data
    │   └── RoleEnforcementTest.php
    └── Reports/
        └── ReportGenerationTest.php
```

### 20.2 Six Non-Negotiable Tests (Must Pass Before Any Deployment)

1. **Tenant isolation:** User from Org A cannot access Org B's events, volunteers, or reports via any endpoint — even with a valid Sanctum token
2. **Geofence:** Check-in from 500m away is rejected; from 50m is accepted
3. **QR expiry:** Signature older than 15 minutes is rejected
4. **Shift conflict:** Volunteer cannot apply to two overlapping shifts
5. **Capacity enforcement:** Approving past `shift.capacity` is blocked
6. **Role enforcement:** Volunteer cannot hit coordinator routes; coordinator cannot hit SuperAdmin routes

---

## 21. Configuration Additions

### 21.1 `config/vms.php` (New — Must Create)

```php
return [
    'certificate_milestones'  => [10, 25, 50, 100, 200, 500],
    'geofence_default_radius' => 100,      // meters
    'qr_expiry_minutes'       => 15,
    'checkin_buffer_before'   => 15,       // minutes before shift start
    'checkin_buffer_after'    => 30,       // minutes after shift start
    'time_drift_tolerance'    => 2,        // minutes max client-server drift
    'chatbot_max_history'     => 10,       // conversation turns stored per session
    'impact_score_per_hour'   => 0.1,
    'impact_score_max'        => 100,
    'report_per_page'         => 50,
    'events_per_page'         => 10,
];
```

### 21.2 `.env` Keys to Add

```dotenv
# Gemini AI
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash

# Sanctum Token Expiration (minutes — 7 days)
SANCTUM_EXPIRATION=10080

# Redis (production)
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_FROM_ADDRESS=noreply@voluntrackapp.com
MAIL_FROM_NAME="VolunTrack"
```

---

## 22. Phased Execution Roadmap (39 Tasks)

### Phase 1 — Foundation Fixes (Blockers — Do First)
- [ ] 1. Fix `TenantMiddleware` bug (suspended org bypass)
- [ ] 2. Fix `Event` model — apply `TenantScope` and fix `CoordinatorController::getEvents()`
- [ ] 3. Add `GEMINI_API_KEY` + `GEMINI_MODEL` to `.env` and `config/services.php`
- [ ] 4. Create `config/vms.php` with all constants
- [ ] 5. Write new migration: `add_missing_fields_and_audit_logs_to_vms_tables`

### Phase 2 — Service Layer
- [ ] 6. Create `GeofenceService` (extract Haversine formula)
- [ ] 7. Create `SkillMatchingService` (extract + enhance match logic)
- [ ] 8. Create `ImpactScoreService` (extract + add milestone detection)
- [ ] 9. Create `CertificateService` (extract from controller)
- [ ] 10. Create `ReportService` (extract from controller)
- [ ] 11. Create `AuditLogService`

### Phase 3 — Form Requests and API Resources
- [ ] 12. Create all 14 `FormRequest` classes
- [ ] 13. Create all 11 `API Resource` classes
- [ ] 14. Refactor all controllers to use both

### Phase 4 — Missing Routes and Controllers
- [ ] 15. Create `SuperAdminController` (org management, platform stats)
- [ ] 16. Create `OrgAdminController` (staff management, org dashboard)
- [ ] 17. Add missing Coordinator routes (update/delete event, capacity endpoint, volunteer list)
- [ ] 18. Add missing Volunteer routes (profile view/update, certificate list, impact breakdown, withdraw)
- [ ] 19. Add `EnsureVolunteerProfile` middleware; apply to volunteer routes
- [ ] 20. Add public `GET /api/verify/certificate/{number}` endpoint

### Phase 5 — Async Processing
- [ ] 21. Wire `CompileReportJob` into `ReportController` (dispatch instead of inline work)
- [ ] 22. Add `status` column to `reports` table; add poll endpoint
- [ ] 23. Wire `GenerateCertificateJob` into checkout flow via `ImpactScoreService`
- [ ] 24. Create `AutoTransitionEventStatusJob` + register in Console Kernel
- [ ] 25. Create `RevokeExpiredQrCodesJob` + register in Console Kernel
- [ ] 26. Add QR `expires_at` enforcement in `AttendanceController::checkIn()`

### Phase 6 — Notifications
- [ ] 27. Configure mail in `.env`
- [ ] 28. Create `ShiftApprovedNotification`
- [ ] 29. Create `ShiftBroadcastNotification`
- [ ] 30. Create `CertificateIssuedNotification`
- [ ] 31. Wire notifications into service and job dispatch points

### Phase 7 — Caching
- [ ] 32. Implement `Cache::tags()` in Services for events, schedule, capacity
- [ ] 33. Add cache invalidation on all mutations

### Phase 8 — Testing
- [ ] 34. Write Unit tests for all 6 Service classes
- [ ] 35. Write Feature security tests (tenant isolation + role enforcement — run first)
- [ ] 36. Write Feature tests for Coordinator flows
- [ ] 37. Write Feature tests for Volunteer flows including QR check-in edge cases
- [ ] 38. Achieve full PHPUnit suite passing — 0 failures

### Phase 9 — Production Readiness
- [ ] 39. Add `LogAuditTrail` middleware; wire to all mutating routes
- [ ] 40. Add rate limiting to chatbot and broadcast routes
- [ ] 41. Add Sanctum token expiration
- [ ] 42. Final review — ensure all API responses go through Resource classes
- [ ] 43. Install and configure `L5-Swagger`; document all endpoints

---

## 23. Ten Non-Negotiable Engineering Rules

1. **No raw DB queries** — always Eloquent with proper scopes
2. **No business logic in controllers** — controllers are thin dispatchers only
3. **No model data returned raw** — always through API Resource classes
4. **No validation in controllers** — always through Form Request classes
5. **No synchronous heavy operations** — reports, certificates, broadcasts go to Queue
6. **No cross-tenant data access** — every query scoped; explicitly tested
7. **No plaintext sensitive data** — PII encrypted at rest; never logged
8. **No tokens without expiry** — Sanctum tokens must expire after 7 days
9. **No unhandled exceptions** — global handler must return structured JSON always
10. **Every migration is reversible** — all `up()` must have matching `down()`

---

*Generated: 2026-07-31*
*Stack: Laravel 12 + MySQL + Redis + Gemini API + DomPDF*
*Based on: full audit of `Documentation.md` (1,676 lines) + complete codebase scan*
