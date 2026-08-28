<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\CoordinatorController;
use App\Http\Controllers\OrgAdminController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\TenantOnboardingController;
use App\Http\Controllers\VolunteerController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (requires valid Sanctum Bearer token)
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return new UserResource($request->user()->load('volunteer', 'organization'));
    });

    // ------------------------------------------------------------------
    // SuperAdmin Only Routes
    // ------------------------------------------------------------------
    Route::middleware('role:SuperAdmin')->group(function () {
        Route::get('/superadmin/dashboard', [SuperAdminController::class, 'dashboardMetrics']);
        Route::post('/superadmin/onboard-tenant', [TenantOnboardingController::class, 'onboard']);
        Route::get('/superadmin/organizations', [SuperAdminController::class, 'listOrganizations']);
        Route::get('/superadmin/organizations/{id}', [SuperAdminController::class, 'showOrganization']);
        Route::patch('/superadmin/organizations/{id}/status', [SuperAdminController::class, 'updateOrganizationStatus']);
    });

    // ------------------------------------------------------------------
    // Organization Admin Only Routes
    // ------------------------------------------------------------------
    Route::middleware('role:OrgAdmin')->group(function () {
        Route::get('/admin/organization', [OrgAdminController::class, 'getOrganization']);
        Route::patch('/admin/organization', [OrgAdminController::class, 'updateOrganization']);
        Route::post('/admin/coordinators', [OrgAdminController::class, 'createCoordinator']);
        Route::get('/admin/members', [OrgAdminController::class, 'listMembers']);
        Route::patch('/admin/volunteers/{userId}/status', [OrgAdminController::class, 'toggleVolunteerStatus']);
        Route::get('/admin/volunteers/{volunteerId}', [OrgAdminController::class, 'viewVolunteer']);
    });

    // ------------------------------------------------------------------
    // Coordinator & OrgAdmin Routes
    // ------------------------------------------------------------------
    Route::middleware('role:Coordinator,OrgAdmin')->group(function () {
        // Event Management
        Route::post('/coordinator/events', [CoordinatorController::class, 'createEvent']);
        Route::get('/coordinator/events', [CoordinatorController::class, 'getEvents']);
        Route::get('/coordinator/events/{eventId}', [CoordinatorController::class, 'showEvent']);
        Route::patch('/coordinator/events/{eventId}', [CoordinatorController::class, 'updateEvent']);
        Route::post('/coordinator/events/{eventId}/shifts', [CoordinatorController::class, 'createShift']);

        // Application & Screening Management
        Route::get('/coordinator/events/{eventId}/applications', [CoordinatorController::class, 'getApplications']);
        Route::post('/coordinator/applications/{assignmentId}/approve', [CoordinatorController::class, 'approveApplication']);
        Route::get('/coordinator/applications/{assignmentId}/ai-feedback', [CoordinatorController::class, 'getAiFeedback']);

        // Attendance & Force Check-in
        Route::post('/coordinator/applications/{assignmentId}/force-checkin', [CoordinatorController::class, 'forceCheckIn']);
        Route::post('/coordinator/shifts/{shiftId}/qrcode', [AttendanceController::class, 'generateQrCode']);

        // Volunteer Directory & Profiles
        Route::get('/coordinator/volunteers', [CoordinatorController::class, 'listVolunteers']);
        Route::get('/coordinator/volunteers/{volunteerId}', [CoordinatorController::class, 'showVolunteer']);

        // Certificates, Reports & Broadcast Announcements
        Route::post('/coordinator/certificates', [CertificateController::class, 'generateCertificate']);
        Route::post('/coordinator/reports', [ReportController::class, 'generateReport']);
        Route::get('/coordinator/reports', [ReportController::class, 'getReports']);
        Route::post('/coordinator/announcements', [AnnouncementController::class, 'createAnnouncement']);
        Route::post('/coordinator/shifts/{shiftId}/broadcast', [AnnouncementController::class, 'broadcastUrgentShift']);
    });

    // ------------------------------------------------------------------
    // Volunteer Only Routes
    // ------------------------------------------------------------------
    Route::middleware('role:Volunteer')->group(function () {
        // Profile Management
        Route::get('/volunteer/profile', [VolunteerController::class, 'getProfile']);
        Route::patch('/volunteer/profile', [VolunteerController::class, 'updateProfile']);

        // Shift Applications & Schedule
        Route::get('/volunteer/events', [VolunteerController::class, 'browseEvents']);
        Route::post('/volunteer/apply/{shiftId}', [VolunteerController::class, 'applyForShift']);
        Route::get('/volunteer/schedule', [VolunteerController::class, 'getSchedule']);

        // GPS & QR Attendance Tracking
        Route::post('/volunteer/check-in', [AttendanceController::class, 'checkIn'])->middleware('throttle:5,1');
        Route::post('/volunteer/check-out', [AttendanceController::class, 'checkOut']);

        // Certificates & Chatbot AI
        Route::get('/volunteer/certificates', [VolunteerController::class, 'getCertificates']);
        Route::get('/volunteer/certificates/{certificateId}/download', [CertificateController::class, 'downloadCertificate']);
        Route::post('/volunteer/chat', [ChatbotController::class, 'chat']);
    });

    // Shared Announcements route (Visible to all authenticated users)
    Route::get('/announcements', [AnnouncementController::class, 'getAnnouncements']);
});
