<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\CoordinatorController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\OrgAdminController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\TelegramController;
use App\Http\Controllers\TenantOnboardingController;
use App\Http\Controllers\VolunteerController;
use App\Http\Middleware\EnsureVolunteerProfile;
use Illuminate\Support\Facades\Route;

// ----------------------------------------------------------------------
// Public (no auth)
// ----------------------------------------------------------------------
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
Route::get('/invitations/{token}', [AuthController::class, 'showInvitation'])->middleware('throttle:30,1');
Route::post('/invitations/{token}/accept', [AuthController::class, 'acceptInvitation'])->middleware('throttle:10,1');
Route::post('/invitations/resend', [AuthController::class, 'resendInvitation'])->middleware('throttle:5,1');

Route::get('/verify/certificate/{number}', [CertificateController::class, 'verifyCertificate']);
Route::get('/public/organizations', [PublicController::class, 'organizations']);
Route::get('/public/stats', [PublicController::class, 'stats']);
Route::get('/public/plans', [PublicController::class, 'plans']);
Route::post('/public/organizations/signup', [TenantOnboardingController::class, 'signup'])->middleware('throttle:5,10');
Route::get('/files/{id}', [FileController::class, 'show'])->name('files.show');
Route::get('/public/organizations/{id}', [PublicController::class, 'organization']);
Route::post('/telegram/webhook/{secret}', [TelegramController::class, 'webhook'])->middleware('throttle:120,1');

// ----------------------------------------------------------------------
// Authenticated
// ----------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AccountController::class, 'me']);

    // Account (every role)
    Route::patch('/account', [AccountController::class, 'update']);
    Route::patch('/account/password', [AccountController::class, 'changePassword'])->middleware('throttle:10,1');
    Route::post('/account/photo', [AccountController::class, 'uploadPhoto']);
    Route::post('/account/telegram', [TelegramController::class, 'link']);
    Route::delete('/account/telegram', [TelegramController::class, 'unlink']);
    Route::delete('/account/photo', [AccountController::class, 'deletePhoto']);
    Route::get('/notifications', [AccountController::class, 'notifications']);
    Route::post('/notifications/read-all', [AccountController::class, 'markAllNotificationsRead']);
    Route::post('/notifications/{id}/read', [AccountController::class, 'markNotificationRead']);

    // Announcements (every role; filtered per role)
    Route::get('/announcements', [AnnouncementController::class, 'getAnnouncements']);
    Route::post('/announcements/read', [AnnouncementController::class, 'markRead']);
    Route::post('/announcements/{id}/read', [AnnouncementController::class, 'markRead']);

    // ------------------------------------------------------------------
    // SuperAdmin
    // ------------------------------------------------------------------
    Route::middleware('role:SuperAdmin')->prefix('superadmin')->group(function () {
        Route::get('/dashboard', [SuperAdminController::class, 'dashboardMetrics']);
        Route::get('/metrics/timeseries', [SuperAdminController::class, 'timeseries']);
        Route::get('/health', [SuperAdminController::class, 'health']);

        Route::post('/onboard-tenant', [TenantOnboardingController::class, 'onboard']);
        Route::get('/organizations', [SuperAdminController::class, 'listOrganizations']);
        Route::get('/organizations/{id}', [SuperAdminController::class, 'showOrganization']);
        Route::patch('/organizations/{id}/status', [SuperAdminController::class, 'updateOrganizationStatus']);
        Route::patch('/organizations/{id}/verification', [SuperAdminController::class, 'reviewVerification']);
        Route::patch('/organization-documents/{id}', [SuperAdminController::class, 'reviewOrgDocument']);

        Route::get('/admins', [SuperAdminController::class, 'listAdmins']);
        Route::patch('/admins/{id}/status', [SuperAdminController::class, 'toggleAdminStatus']);
        Route::post('/users/{id}/resend-invite', [SuperAdminController::class, 'resendInvite']);
        Route::get('/users', [SuperAdminController::class, 'listUsers']);
        Route::patch('/users/{id}/status', [SuperAdminController::class, 'toggleAdminStatus']);

        Route::get('/audit-logs', [SuperAdminController::class, 'listAuditLogs']);

        Route::get('/payments', [SuperAdminController::class, 'listPayments']);
        Route::get('/payments/summary', [SuperAdminController::class, 'paymentSummary']);
        Route::patch('/payments/{id}', [SuperAdminController::class, 'reviewPayment']);
        Route::post('/payments/{id}/retry', [SuperAdminController::class, 'retryPaymentVerification']);

        Route::get('/reports', [SuperAdminController::class, 'listReports']);
        Route::patch('/reports/{id}', [SuperAdminController::class, 'reviewReport']);

        Route::get('/threads', [SupportController::class, 'index']);
        Route::post('/threads', [SupportController::class, 'store']);
        Route::get('/threads/{id}', [SupportController::class, 'show']);
        Route::post('/threads/{id}/messages', [SupportController::class, 'reply']);
        Route::patch('/threads/{id}', [SupportController::class, 'updateStatus']);
    });

    // ------------------------------------------------------------------
    // Organization admin
    // ------------------------------------------------------------------
    Route::middleware('role:OrgAdmin')->prefix('admin')->group(function () {
        Route::get('/organization', [OrgAdminController::class, 'getOrganization']);
        Route::patch('/organization', [OrgAdminController::class, 'updateOrganization']);
        Route::post('/organization/logo', [OrgAdminController::class, 'uploadLogo']);
        Route::delete('/organization/logo', [OrgAdminController::class, 'removeLogo']);
        Route::get('/organization/documents', [DocumentController::class, 'orgDocuments']);
        Route::post('/organization/documents', [DocumentController::class, 'uploadOrgDocument']);

        Route::post('/coordinators', [OrgAdminController::class, 'createCoordinator']);
        Route::patch('/coordinators/{id}', [OrgAdminController::class, 'updateCoordinator']);
        Route::patch('/coordinators/{id}/status', [OrgAdminController::class, 'toggleCoordinatorStatus']);
        Route::post('/coordinators/{id}/resend-invite', [OrgAdminController::class, 'resendCoordinatorInvite']);

        Route::get('/members', [OrgAdminController::class, 'listMembers']);
        Route::patch('/volunteers/{userId}/status', [OrgAdminController::class, 'toggleVolunteerStatus']);
        Route::get('/volunteers/{volunteerId}', [OrgAdminController::class, 'viewVolunteer']);

        Route::get('/analytics', [OrgAdminController::class, 'analytics']);
        Route::get('/audit-logs', [OrgAdminController::class, 'auditLogs']);

        Route::get('/billing', [OrgAdminController::class, 'billing']);
        Route::post('/billing/payments', [OrgAdminController::class, 'submitPayment'])->middleware('throttle:10,1');

        Route::get('/threads', [SupportController::class, 'index']);
        Route::post('/threads', [SupportController::class, 'store']);
        Route::get('/threads/{id}', [SupportController::class, 'show']);
        Route::post('/threads/{id}/messages', [SupportController::class, 'reply']);
        Route::patch('/threads/{id}', [SupportController::class, 'updateStatus']);
    });

    // ------------------------------------------------------------------
    // Coordinator & OrgAdmin
    // ------------------------------------------------------------------
    Route::middleware('role:Coordinator,OrgAdmin')->prefix('coordinator')->group(function () {
        Route::get('/dashboard', [CoordinatorController::class, 'dashboard']);

        Route::post('/events', [CoordinatorController::class, 'createEvent']);
        Route::get('/events', [CoordinatorController::class, 'getEvents']);
        Route::get('/events/{eventId}', [CoordinatorController::class, 'showEvent']);
        Route::patch('/events/{eventId}', [CoordinatorController::class, 'updateEvent']);
        Route::delete('/events/{eventId}', [CoordinatorController::class, 'deleteEvent']);

        Route::post('/events/{eventId}/shifts', [CoordinatorController::class, 'createShift']);
        Route::patch('/shifts/{shiftId}', [CoordinatorController::class, 'updateShift']);
        Route::delete('/shifts/{shiftId}', [CoordinatorController::class, 'deleteShift']);
        Route::get('/shifts/{shiftId}/capacity', [CoordinatorController::class, 'getShiftCapacity']);
        Route::get('/shifts/{shiftId}/attendance', [CoordinatorController::class, 'roster']);
        Route::get('/shifts/{shiftId}/candidates', [CoordinatorController::class, 'replacementCandidates']);
        Route::post('/shifts/{shiftId}/assign', [CoordinatorController::class, 'assignVolunteer']);
        Route::post('/shifts/{shiftId}/qrcode', [AttendanceController::class, 'generateQrCode']);
        Route::get('/shifts/{shiftId}/qrcode', [AttendanceController::class, 'generateQrCode']);
        Route::get('/shifts/{shiftId}/broadcast-preview', [CoordinatorController::class, 'broadcastPreview']);
        Route::post('/shifts/{shiftId}/broadcast', [AnnouncementController::class, 'broadcastUrgentShift']);

        Route::get('/events/{eventId}/applications', [CoordinatorController::class, 'getApplications']);
        Route::post('/applications/{assignmentId}/approve', [CoordinatorController::class, 'approveApplication']);
        Route::post('/applications/{assignmentId}/remove', [CoordinatorController::class, 'removeAssignment']);
        Route::get('/applications/{assignmentId}/ai-feedback', [CoordinatorController::class, 'getAiFeedback']);
        Route::post('/applications/{assignmentId}/force-checkin', [CoordinatorController::class, 'forceCheckIn']);

        Route::post('/attendance/{attendanceId}/check-out', [CoordinatorController::class, 'staffCheckOut']);
        Route::get('/attendance/pending', [CoordinatorController::class, 'pendingHours']);
        Route::patch('/attendance/{attendanceId}/verify', [CoordinatorController::class, 'verifyHours']);

        Route::get('/volunteers', [CoordinatorController::class, 'listVolunteers']);
        Route::get('/volunteers/{volunteerId}', [CoordinatorController::class, 'showVolunteer']);
        Route::patch('/volunteers/{volunteerId}/skills/{skill}', [CoordinatorController::class, 'verifySkill']);

        Route::get('/documents', [DocumentController::class, 'review']);
        Route::patch('/documents/{id}/verify', [DocumentController::class, 'verify']);

        Route::post('/certificates', [CertificateController::class, 'generateCertificate']);
        Route::post('/reports', [ReportController::class, 'generateReport']);
        Route::get('/reports', [ReportController::class, 'getReports']);
        Route::get('/reports/{id}', [ReportController::class, 'showReport']);
        Route::get('/reports/{id}/export', [ReportController::class, 'export']);
        Route::delete('/reports/{id}', [ReportController::class, 'deleteReport']);
        Route::post('/announcements', [AnnouncementController::class, 'createAnnouncement']);
        Route::delete('/announcements/{id}', [AnnouncementController::class, 'deleteAnnouncement']);
    });

    // ------------------------------------------------------------------
    // Volunteer
    // ------------------------------------------------------------------
    Route::middleware(['role:Volunteer', EnsureVolunteerProfile::class])->prefix('volunteer')->group(function () {
        Route::get('/profile', [VolunteerController::class, 'getProfile']);
        Route::patch('/profile', [VolunteerController::class, 'updateProfile']);
        Route::get('/impact', [VolunteerController::class, 'getImpactBreakdown']);
        Route::get('/impact/history', [VolunteerController::class, 'impactHistory']);

        Route::get('/events', [VolunteerController::class, 'browseEvents']);
        Route::get('/events/{eventId}', [VolunteerController::class, 'showEvent']);
        Route::get('/organizations/{orgId}', [VolunteerController::class, 'showOrganization']);
        Route::post('/organizations/{orgId}/report', [VolunteerController::class, 'reportOrganization'])->middleware('throttle:5,10');

        Route::post('/apply/{shiftId}', [VolunteerController::class, 'applyForShift']);
        Route::delete('/apply/{assignmentId}', [VolunteerController::class, 'withdrawApplication']);
        Route::get('/schedule', [VolunteerController::class, 'getSchedule']);

        Route::post('/check-in', [AttendanceController::class, 'checkIn'])->middleware('throttle:10,1');
        Route::post('/check-out', [AttendanceController::class, 'checkOut'])->middleware('throttle:10,1');
        Route::post('/check-out/undo', [AttendanceController::class, 'resume'])->middleware('throttle:10,1');
        Route::post('/attendance/ping', [AttendanceController::class, 'ping'])->middleware('throttle:30,1');
        Route::get('/attendance', [AttendanceController::class, 'history']);

        Route::get('/documents', [DocumentController::class, 'myDocuments']);
        Route::post('/documents', [DocumentController::class, 'upload']);
        Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);

        Route::get('/certificates', [VolunteerController::class, 'getCertificates']);
        Route::get('/certificates/{certificateId}/download', [CertificateController::class, 'downloadCertificate']);

        Route::post('/chat', [ChatbotController::class, 'chat'])->middleware('throttle:20,1');
        Route::get('/chat/history', [ChatbotController::class, 'history']);
        Route::delete('/chat/history', [ChatbotController::class, 'clearHistory']);
    });
});
