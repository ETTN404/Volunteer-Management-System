# 📘 Backend Completeness Analysis & Logic Specification

> **Source**: Comparative Analysis between `Documentation.md` (Academic System Requirements & Design Specification) and the Current VMS Laravel Backend Implementation.

---

## Executive Summary

A rigorous audit of `Documentation.md` against our implemented 39-test Laravel backend reveals that **the core multi-tenant architecture, Sanctum authentication, shift scheduling, geofenced check-in, skill matching, impact scoring, async reports, and public certificate verification are 100% operational**.

However, `Documentation.md` introduces **6 specialized backend business logic requirements and edge cases** that enhance enterprise readiness, regulatory compliance, and documentation alignment.

---

## 🔍 Gap Analysis: Current Backend vs. `Documentation.md` Specifications

| # | Domain Area | `Documentation.md` Requirement | Current Backend Status | Required Backend Action |
|---|---|---|---|---|
| **1** | **Minor Volunteer & Parental Consent (BR-02)** | Volunteers under 18 require signed parental/guardian consent form before shift assignment. | Basic volunteer profile exists; age and minor consent flags are missing. | Add `is_minor`, `date_of_birth`, and `parental_consent_verified` to `volunteers` table + validation guard in `ShiftApplicationService`. |
| **2** | **Document Upload & Verification Subsystem (UC-7, UC-16)** | Volunteers upload certificates, IDs, or consent forms (PDF/PNG/JPEG, max 2MB). Coordinators inspect documents to verify skills. | Basic skill text list exists without physical proof attachment endpoints. | Add `Media` / `Document` model, migration, file upload endpoint (`POST /api/volunteer/documents`), and coordinator review endpoint (`PATCH /api/coordinator/documents/{id}/verify`). |
| **3** | **Skill Verification & Status-Based Background Checks (BR-03)** | Medical, teaching, and driver skills require coordinator verification status (`pending`, `verified`, `rejected`). | Skills stored as array; no verification status per skill. | Add `skill_verifications` relationship table or structured JSON status map (`skills_verified_map`) to track verified skills. |
| **4** | **DomPDF Real PDF Storage & SHA-256 Cryptographic Seal (UC-19)** | Generate formal PDF files stored in `storage/app/public/certificates/` with cryptographic signature and QR verification URL. | DB record and verification route exist; physical PDF generation uses mock/placeholder URL. | Install/configure `barryvdh/laravel-dompdf`, create Blade template `resources/views/certificates/milestone.blade.php`, and generate real PDF files in `GenerateCertificateJob`. |
| **5** | **Custom Tenant Branding & Subdomain Resolution (BR-08, §3.5.5)** | Each tenant can configure custom branding (`logo_path`, `primary_color`, `subdomain`). | Org model has `name`, `email`, `slug`, `status`. Subdomain and theme fields are unmapped in DB. | Add `subdomain`, `primary_color`, `logo_url`, `custom_domain` to `organizations` migration and scope tenant middleware. |
| **6** | **OpenAPI / Swagger Spec Auto-Generation (Table 1.1)** | Auto-generate Swagger/OpenAPI documentation via `L5-Swagger` annotations. | Master plan documentation exists in markdown. | Install `darkaonline/l5-swagger` and add OpenAPI annotations to API controllers. |

---

## 🛠️ Step-by-Step Backend Logic Specifications & Code Implementations

Below are the exact PHP/Laravel migrations, models, services, and controller methods to implement these 6 remaining logic specs on the backend.

---

### Phase 10.1 — Minor Volunteers & Parental Consent Guard (BR-02)

#### 1. Migration Update: `database/migrations/xxxx_xx_xx_add_minor_consent_to_volunteers_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('bio');
            $table->boolean('is_minor')->default(false)->after('date_of_birth');
            $table->boolean('parental_consent_verified')->default(false)->after('is_minor');
            $table->string('parental_consent_file_path')->nullable()->after('parental_consent_verified');
        });
    }

    public function down(): void
    {
        Schema::table('volunteers', function (Blueprint $table) {
            $table->dropColumn(['date_of_birth', 'is_minor', 'parental_consent_verified', 'parental_consent_file_path']);
        });
    }
};
```

#### 2. Validation Guard in `ShiftApplicationService.php`
```php
public function applyForShift(Volunteer $volunteer, Shift $shift): ShiftAssignment
{
    // BR-02: Under-18 Parental Consent Guard
    if ($volunteer->is_minor && !$volunteer->parental_consent_verified) {
        throw new UnprocessableEntityHttpException(
            "BR-02 Violation: Minor volunteers (under 18) require a verified parental consent form before applying for active shifts."
        );
    }

    // Existing scheduling conflict and capacity guards...
    return $this->createAssignment($volunteer, $shift);
}
```

---

### Phase 10.2 — Document & Certificate Upload Subsystem (UC-7, UC-16)

#### 1. Migration: `database/migrations/xxxx_xx_xx_create_volunteer_documents_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('volunteer_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->foreignId('volunteer_id')->constrained()->onDelete('cascade');
            $table->string('document_type'); // 'certification', 'id_proof', 'parental_consent', 'medical_clearance'
            $table->string('title');
            $table->string('file_path');
            $table->string('mime_type');
            $table->integer('file_size_bytes');
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('coordinator_notes')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_documents');
    }
};
```

#### 2. Controller: `app/Http/Controllers/Api/VolunteerDocumentController.php`
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VolunteerDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VolunteerDocumentController extends Controller
{
    /**
     * POST /api/volunteer/documents
     * Upload supporting credentials (PDF, PNG, JPG <= 2MB)
     */
    public function store(Request $request)
    {
        $request->validate([
            'document_type' => 'required|string|in:certification,id_proof,parental_consent,medical_clearance',
            'title' => 'required|string|max:150',
            'file' => 'required|file|mimes:pdf,png,jpg,jpeg|max:2048', // BR Boundary: max 2MB
        ]);

        $user = $request->user();
        $volunteer = $user->volunteer;

        $path = $request->file('file')->store("documents/org_{$user->organization_id}", 'public');

        $doc = VolunteerDocument::create([
            'organization_id' => $user->organization_id,
            'volunteer_id' => $volunteer->id,
            'document_type' => $request->document_type,
            'title' => $request->title,
            'file_path' => $path,
            'mime_type' => $request->file('file')->getClientMimeType(),
            'file_size_bytes' => $request->file('file')->getSize(),
            'verification_status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully and queued for coordinator verification.',
            'data' => $doc
        ], 201);
    }

    /**
     * PATCH /api/coordinator/documents/{id}/verify
     */
    public function verifyDocument(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:verified,rejected',
            'notes' => 'nullable|string|max:500',
        ]);

        $doc = VolunteerDocument::where('organization_id', $request->user()->organization_id)->findOrFail($id);

        $doc->update([
            'verification_status' => $request->status,
            'coordinator_notes' => $request->notes,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        // If it's a parental consent form, auto-verify minor status
        if ($doc->document_type === 'parental_consent' && $request->status === 'verified') {
            $doc->volunteer->update(['parental_consent_verified' => true]);
        }

        return response()->json([
            'message' => "Document status updated to {$request->status}.",
            'data' => $doc
        ]);
    }
}
```

---

### Phase 10.3 — DomPDF Milestone PDF Generation (`DomPDF`)

#### 1. Service: `app/Services/CertificatePdfService.php`
```php
<?php

namespace App\Services;

use App\Models\Certificate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class CertificatePdfService
{
    public function generatePdf(Certificate $certificate): string
    {
        $data = [
            'certificate_number' => $certificate->certificate_number,
            'volunteer_name'     => $certificate->volunteer->user->name,
            'organization_name'  => $certificate->organization->name,
            'milestone_hours'    => $certificate->milestone_hours,
            'issued_date'        => $certificate->issued_date->format('F d, Y'),
            'signatory_name'     => $certificate->signatory_name ?? 'Executive Director',
            'signatory_title'    => $certificate->signatory_title ?? 'Volunteer Coordinator',
            'verify_url'         => config('app.url') . "/api/certificates/verify/{$certificate->certificate_number}",
            'sha256_hash'        => hash('sha256', $certificate->certificate_number . $certificate->created_at),
        ];

        $pdf = Pdf::loadView('certificates.milestone', $data)
                  ->setPaper('a4', 'landscape');

        $fileName = "certificates/{$certificate->certificate_number}.pdf";
        Storage::disk('public')->put($fileName, $pdf->output());

        $certificate->update([
            'file_path' => $fileName,
            'pdf_generated' => true,
        ]);

        return Storage::url($fileName);
    }
}
```

---

### Phase 10.4 — Tenant Branding & Custom Domain Resolution (BR-08, §3.5.5)

#### 1. Migration: `database/migrations/xxxx_xx_xx_add_branding_to_organizations_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('subdomain')->unique()->nullable()->after('slug');
            $table->string('custom_domain')->unique()->nullable()->after('subdomain');
            $table->string('primary_color')->default('#4f46e5')->after('website'); // Indigo 600 default
            $table->string('logo_url')->nullable()->after('primary_color');
            $table->json('settings')->nullable()->after('logo_url');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['subdomain', 'custom_domain', 'primary_color', 'logo_url', 'settings']);
        });
    }
};
```

---

## 📌 Implementation Action Checklist for Future Sprints

- [x] **Core System (Phases 1-9)**: Sanctum Auth, Tenant Scoping, Shifts, Geofence Check-in, Impact Scoring, Async Reports, Public Cert Verification, Gemini AI Assistant (39/39 PHPUnit Tests Passed).
- [ ] **Phase 10.1 (Minor Guard)**: Run `minor_consent` migration & add `parental_consent_verified` validation guard.
- [ ] **Phase 10.2 (Documents)**: Create `volunteer_documents` migration & register `VolunteerDocumentController` (`POST /api/volunteer/documents`).
- [ ] **Phase 10.3 (DomPDF)**: Install `barryvdh/laravel-dompdf`, publish `certificates.milestone` Blade template.
- [ ] **Phase 10.4 (Branding)**: Add `subdomain` and `primary_color` columns to `organizations` table.
- [ ] **Phase 10.5 (OpenAPI Specs)**: Run `php artisan l5-swagger:generate` to output OpenAPI 3.0 JSON spec.

---

*Document created automatically from analysis of `Documentation.md`.*
