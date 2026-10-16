# Pending backend contracts

The React frontend already uses every endpoint below. Until Laravel implements one, it is served by a
Mock Service Worker handler in `src/mocks/handlers/pending/` (active when `VITE_MOCK_MODE=pending` or `all`).

**To ship one:** implement the route exactly as described → delete its handler (search for the `G#` tag) →
run `npm test` and `npm run dev:live`. No UI change is needed.

Conventions (same as the existing API):
- Base path `/api`, Sanctum bearer auth unless marked **public**.
- Success: `{ "status": "success", "message"?: string, "data": … , "pagination"?: {current_page,last_page,per_page,total} }`.
- Validation: Laravel default 422 `{ "message", "errors": { field: [msg] } }`. Other errors: `{ "status": "error", "message" }`.
- Datetimes: Carbon casts (ISO `…Z`) or `toDateTimeString()` (UTC). Dates: `Y-m-d`.
- Tenant isolation: every coordinator/admin route must scope by `auth()->user()->org_id` (BR-08).

Status legend: ⏳ pending · ✅ shipped (handler removed)

---

## Known issues in the current backend (found while integrating)

| # | Where | Problem | Suggested fix |
|---|---|---|---|
| K1 | `AttendanceController::generateQrCode` | Rotates `qr_code_signature` but never updates `qr_expires_at`. `checkIn` rejects every scan once the creation-time expiry (15 min after shift creation) passes, so live QR check-in effectively never works. | `$shift->update(['qr_code_signature' => $signature, 'qr_expires_at' => now()->addMinutes(config('vms.qr_expiry_minutes', 15))]);` |
| K2 | `events.status` enum | Migration enum is `upcoming, ongoing, completed`, but `UpdateEventRequest` allows `cancelled` → SQL error on MySQL. | Migration adding `cancelled` to the enum. |
| K3 | `ApproveApplicationRequest` | Status values are `confirmed|cancelled`; there is no "rejected", so declined applications look the same as volunteer withdrawals. | Add `decline_reason` (G15) or a `rejected` status. |
| K4 | `CertificateController::verifyCertificate` | `orWhere('id', …)` is not grouped, and `withoutGlobalScopes()` + `LIKE` on `file_path` can match multiple rows. | Store a `certificate_number` column, unique index, exact match. |
| K5 | `GET /announcements` | Returns announcements for every audience (coordinators-only posts visible to volunteers). | Filter by `target_audience` for the user's role. |
| K6 | `Volunteer.availability` | Seeder writes an object (`{"weekends": true}`) while `UpdateVolunteerProfileRequest` expects a string array. Frontend accepts both; pick one. | Store string array of slot keys (see list below). |

Availability slot keys used by the UI: `weekday_mornings`, `weekday_afternoons`, `weekday_evenings`, `saturdays`, `sundays`, `holidays`.
Skill keys are lowercase snake_case (`first_aid`, `disaster_response`, …).

---

## G1 ⏳ Public organization list — **public**
`GET /api/public/organizations` — used by registration (org picker). Only `status = active`.
```json
{ "status": "success", "data": [ { "id": 1, "name": "Red Cross Ethiopia", "logo_url": null, "address": "Addis Ababa", "volunteer_count": 14 } ] }
```

## G2 ⏳ Public platform stats — **public**
`GET /api/public/stats` — landing page counters. Cache 10 min.
```json
{ "status": "success", "data": { "organizations": 4, "volunteers": 32, "verified_hours": 2950, "certificates_issued": 61, "shifts_completed": 140 } }
```

## G3 ⏳ Forgot / reset password — **public**
- `POST /api/forgot-password` `{ email }` → always `200 { status, message }` (never reveal if the email exists). Use Laravel `Password::sendResetLink`; the email link must point to `${FRONTEND_URL}/reset-password/{token}?email=…`.
- `POST /api/reset-password` `{ token, email, password, password_confirmation }` → `200` or `422 { message: "This password reset token is invalid." }`.

## G4 ⏳ Change password
`PATCH /api/account/password` `{ current_password, password (min 8), password_confirmation }` → `200`; `422` with `errors.current_password = ["The password is incorrect."]`.

## G5 ⏳ Minor volunteers & parental consent (BR-02)
- Migration on `volunteers`: `date_of_birth date null`, `parental_consent_verified bool default false`.
- `VolunteerResource` adds `date_of_birth`, `is_minor` (computed, age < 18), `parental_consent_verified`.
- `POST /register` and `PATCH /volunteer/profile` accept `date_of_birth` (`nullable|date|before:today`).
- `POST /volunteer/apply/{shiftId}`: if minor and not verified → `422 { message: "Volunteers under 18 need a verified parental consent form before applying for shifts." }`.
- Verifying a `parental_consent` document (G6) sets `parental_consent_verified = true`.

## G6 ⏳ Documents (UC-7, UC-16)
Table `volunteer_documents`: `id, org_id, volunteer_id, document_type (certification|id_proof|parental_consent|medical_clearance), title (150), file_path, mime_type, file_size_bytes, verification_status (pending|verified|rejected) default pending, coordinator_notes text null, verified_by null, verified_at null, timestamps`.

Resource:
```json
{ "id": 3, "volunteer_id": 1, "document_type": "certification", "title": "ERCS First Aid Certificate", "file_url": "https://…/storage/documents/org_1/abc.pdf", "mime_type": "application/pdf", "file_size_bytes": 412334, "verification_status": "pending", "coordinator_notes": null, "verified_at": null, "created_at": "2026-10-14 08:00:00", "volunteer": { …VolunteerResource with user (coordinator list only) } }
```
- `GET /api/volunteer/documents` (Volunteer) → own documents, newest first.
- `POST /api/volunteer/documents` multipart `file` (`required|file|mimes:pdf,png,jpg,jpeg|max:2048`), `document_type`, `title` → `201`.
- `DELETE /api/volunteer/documents/{id}` → `200`; `422` if already verified.
- `GET /api/coordinator/documents?status=pending|verified|rejected` (Coordinator, OrgAdmin) → org documents with `volunteer.user`.
- `PATCH /api/coordinator/documents/{id}/verify` `{ status: verified|rejected, notes?: string(1000) }` → `200` document. Notify the volunteer.

## G7 ⏳ Skill verification (BR-03)
- Column `volunteers.skills_verification json null` → map `{ "first_aid": "verified" }`, values `unverified|pending|verified|rejected`. Add to `VolunteerResource`.
- `PATCH /api/coordinator/volunteers/{volunteerId}/skills/{skill}` `{ status }` → `200` VolunteerResource (with user). `422` if the volunteer does not list the skill.

## G8 ⏳ Volunteer event detail
`GET /api/volunteer/events/{id}` → `EventResource` with `shifts`, each shift with `match_score` and **`confirmed_count`** (also add `confirmed_count` to shifts in `GET /volunteer/events` and coordinator event endpoints — the UI draws capacity meters from it).

## G9 ⏳ Volunteer attendance history
`GET /api/volunteer/attendance` → `AttendanceResource[]` with `shift.event`, newest first. Include `hours_status` and `verified_hours` once G14 exists.

## G10 ⏳ Impact history
`GET /api/volunteer/impact/history` → last 12 months:
```json
{ "status": "success", "data": [ { "month": "2026-10", "hours": 12.5, "shifts": 3, "impact_score": 38.2 } ] }
```

## G11 ⏳ VolunBot history
- `GET /api/volunteer/chat/history` → `[{ "role": "user"|"model", "content": "…", "created_at": "…" }]` (from the cached `chat_session_{id}`).
- `DELETE /api/volunteer/chat/history` → clears it.

## G12 ⏳ Shift edit / delete
- `PATCH /api/coordinator/shifts/{id}` — any of `start_time`, `end_time` (`Y-m-d H:i:s`), `capacity` (not below confirmed count), `required_skills` → ShiftResource. Same event-boundary rule as create.
- `DELETE /api/coordinator/shifts/{id}` → `422` if attendance exists.

## G13 ⏳ Live roster
`GET /api/coordinator/shifts/{id}/attendance` → non-cancelled assignments of the shift:
```json
{ "status": "success", "data": [ { "assignment_id": 12, "status": "confirmed", "volunteer": { …VolunteerResource with user }, "attendance": { …AttendanceResource } | null } ] }
```

## G14 ⏳ Hours verification (BR-06)
- Columns on `attendances`: `hours_status (pending|verified|adjusted|rejected) default pending`, `verified_hours decimal(5,2) null`, `verified_by`, `verified_at`.
- Reports must count only `verified`/`adjusted` hours.
- `GET /api/coordinator/attendance/pending` → checked-out attendances with `hours_status=pending`, each with `shift.event`, `volunteer.user` and computed `hours`.
- `PATCH /api/coordinator/attendance/{id}/verify` `{ status, verified_hours? (required if adjusted, 0–24), note? }`.

## G15 ⏳ Decline reason
`POST /coordinator/applications/{id}/approve` accepts optional `reason` (string ≤ 500) when `status=cancelled`; store in `shift_assignments.coordinator_feedback` (column already exists) and expose as `decline_reason` in `ShiftAssignmentResource`.

## G16 ⏳ Broadcast preview (BR-07)
`GET /api/coordinator/shifts/{id}/broadcast-preview` → who `SendShiftAlertJob` would notify:
```json
{ "status": "success", "data": { "matching_volunteers": 9, "remaining_slots": 4, "sample": [ { "id": 5, "full_name": "Hana Tesfaye", "skills": ["first_aid"] } ] } }
```

## G17 ⏳ Coordinator dashboard
`GET /api/coordinator/dashboard` → `{ shifts_today, checked_in_now, pending_applications, underfilled_shifts (future shifts < 50% confirmed), hours_this_month, active_volunteers }`.

## G18 ⏳ Organization analytics (OrgAdmin)
`GET /api/admin/analytics` → `{ volunteers, active_volunteers, coordinators, events, upcoming_events, total_hours, hours_by_month: [{month, hours}] (6 months), top_skills: [{skill, count}] (8) }`.

## G19 ⏳ Coordinator management (OrgAdmin)
- `PATCH /api/admin/coordinators/{id}` `{ full_name?, email? (unique) }` → UserResource.
- `PATCH /api/admin/coordinators/{id}/status` → toggles `is_active`, returns `{ status, message, is_active }` (same shape as volunteer toggle).
- Login must reject inactive users (today `is_active=false` users can still sign in).

## G20 ⏳ Branding (BR-08 §3.5.5)
- Columns on `organizations`: `primary_color string(7) null` (hex), `subdomain string unique null`.
- `PATCH /admin/organization` accepts `primary_color` (`nullable|regex:/^#[0-9A-Fa-f]{6}$/`) and `subdomain` (`nullable|alpha_dash|max:40|unique`). `OrganizationResource` exposes both.
- `POST /api/admin/organization/logo` multipart `logo` (`image|max:1024`) → OrganizationResource.

## G21 ⏳ Organization audit trail
`GET /api/admin/audit-logs` → same shape as `/superadmin/audit-logs`, filtered to the admin's `org_id`.

## G22 ⏳ Org admin accounts (SuperAdmin)
- `GET /api/superadmin/admins` → UserResource[] (role OrgAdmin) with `organization`.
- `PATCH /api/superadmin/admins/{id}/status` → toggles `is_active`, `{ status, message, is_active }`.

## G23 ⏳ Platform timeseries
`GET /api/superadmin/metrics/timeseries` → 12 monthly points `[{ "date": "2026-10", "organizations": 4, "users": 41, "hours": 420 }]` (cumulative orgs/users, hours logged that month).

## G24 ⏳ Platform user directory
`GET /api/superadmin/users?q=&role=` → UserResource[] with `organization` (paginate when large).

## G25 ⏳ Notifications
The `notifications` table and notification classes already exist. Expose:
- `GET /api/notifications` → `{ data: [{ id, type, title, body, action_url, read_at, created_at }], unread_count }`. Map notification classes to `type`: `shift_approved`, `shift_broadcast`, `certificate_issued`, `organization_suspended`, `announcement`, `document_reviewed`. `action_url` is a frontend path (e.g. `/v/schedule`).
- `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`.

## G26 ⏳ Real certificate PDF (UC-19)
`GET /volunteer/certificates/{id}/download` should stream a real PDF (DomPDF) with the public number (`VMS-00012`) and a QR code to `${FRONTEND_URL}/verify/VMS-00012`.

## G27 ⏳ Report export
`GET /api/coordinator/reports/{id}/export?format=csv|pdf` → file download (`Content-Disposition: attachment`).

## G28 ⏳ Profile photo
`POST /api/account/photo` multipart `photo` (`image|max:2048`) → `{ data: { profile_photo_url } }`.

## G29 ⏳ Audit filters
`?action=&org_id=&from=&to=&page=` on both audit endpoints (frontend filters client-side today, over the latest 100).
