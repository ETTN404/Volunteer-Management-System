<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\TenantOnboardingController;
use App\Http\Controllers\CoordinatorController;
use App\Http\Controllers\VolunteerController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AnnouncementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user()->load('volunteer');
    });

    // Super Admin Only
    Route::middleware('role:SuperAdmin')->group(function () {
        Route::post('/superadmin/onboard-tenant', [TenantOnboardingController::class, 'onboard']);
    });

    // Coordinator & OrgAdmin routes
    Route::middleware('role:Coordinator,OrgAdmin')->group(function () {
        Route::post('/coordinator/events', [CoordinatorController::class, 'createEvent']);
        Route::get('/coordinator/events', [CoordinatorController::class, 'getEvents']);
        Route::post('/coordinator/events/{eventId}/shifts', [CoordinatorController::class, 'createShift']);
        Route::get('/coordinator/events/{eventId}/applications', [CoordinatorController::class, 'getApplications']);
        Route::post('/coordinator/applications/{assignmentId}/approve', [CoordinatorController::class, 'approveApplication']);
        
        // Advanced Screening Feedback & Signature Overrides
        Route::get('/coordinator/applications/{assignmentId}/ai-feedback', [CoordinatorController::class, 'getAiFeedback']);
        Route::post('/coordinator/applications/{assignmentId}/force-checkin', [CoordinatorController::class, 'forceCheckIn']);
        
        // Attendance & QR
        Route::post('/coordinator/shifts/{shiftId}/qrcode', [AttendanceController::class, 'generateQrCode']);
        
        // Certificates & Reports & Broadcasts
        Route::post('/coordinator/certificates', [CertificateController::class, 'generateCertificate']);
        Route::post('/coordinator/reports', [ReportController::class, 'generateReport']);
        Route::get('/coordinator/reports', [ReportController::class, 'getReports']);
        Route::post('/coordinator/shifts/{shiftId}/broadcast', [AnnouncementController::class, 'broadcastUrgentShift']);
    });

    // Volunteer Only routes
    Route::middleware('role:Volunteer')->group(function () {
        // Core features
        Route::get('/volunteer/events', [VolunteerController::class, 'browseEvents']);
        Route::post('/volunteer/apply/{shiftId}', [VolunteerController::class, 'applyForShift']);
        Route::get('/volunteer/schedule', [VolunteerController::class, 'getSchedule']);
        
        // Attendance
        Route::post('/volunteer/check-in', [AttendanceController::class, 'checkIn'])->middleware('throttle:3,1');
        Route::post('/volunteer/check-out', [AttendanceController::class, 'checkOut']);
        
        // Chatbot AI
        Route::post('/volunteer/chat', [ChatbotController::class, 'chat']);
        
        // Certificate downloads
        Route::get('/volunteer/certificates/{certificateId}/download', [CertificateController::class, 'downloadCertificate']);
    });

    // Shared Announcements route (Visible to both volunteers and staff)
    Route::get('/announcements', [AnnouncementController::class, 'getAnnouncements']);
});
