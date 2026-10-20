<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Review fixes (2026-10-20):
 *  - Status columns become strings so new states (inactive, cancelled, rejected, removed) never truncate.
 *  - Organization verification, plans, branding, location and attendance policy.
 *  - Invitations + forced password change, first/last name.
 *  - Hours verification, check-out reasons, presence pings, documents, payments, support threads, org reports.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Free-form status strings (enum → varchar). Fixes "Data truncated for column status".
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->change();
        });
        Schema::table('events', function (Blueprint $table) {
            $table->string('status', 20)->default('upcoming')->change();
        });
        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->change();
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->string('verification_status', 20)->default('verified')->after('status');
            $table->timestamp('verified_at')->nullable()->after('verification_status');
            $table->string('country', 2)->nullable()->after('address');
            $table->string('city', 100)->nullable()->after('country');
            $table->string('primary_color', 7)->nullable()->after('logo_path');
            $table->string('subdomain', 40)->nullable()->unique()->after('primary_color');
            $table->timestamp('plan_expires_at')->nullable()->after('subscription_plan');
            $table->json('settings')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 60)->nullable()->after('org_id');
            $table->string('last_name', 60)->nullable()->after('first_name');
            $table->string('phone', 30)->nullable()->after('email');
            $table->boolean('must_change_password')->default(false)->after('password');
            $table->timestamp('email_verified_at')->nullable()->after('email');
        });

        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::table('volunteers', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('bio');
            $table->boolean('parental_consent_verified')->default(false)->after('date_of_birth');
            $table->json('skills_verification')->nullable()->after('skills');
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->string('title', 100)->nullable()->after('event_id');
            $table->text('notes')->nullable()->after('title');
            $table->string('qr_secret', 64)->nullable()->after('qr_code_signature');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->string('hours_status', 20)->default('pending')->after('check_out_time');
            $table->decimal('verified_hours', 5, 2)->nullable()->after('hours_status');
            $table->unsignedBigInteger('verified_by')->nullable()->after('verified_hours');
            $table->timestamp('verified_at')->nullable()->after('verified_by');
            $table->text('verification_note')->nullable()->after('verified_at');
            $table->string('check_in_method', 20)->default('self')->after('qr_verified');
            $table->string('check_out_method', 20)->nullable()->after('check_in_method');
            $table->string('check_out_reason', 500)->nullable()->after('check_out_method');
            $table->unsignedBigInteger('checked_in_by')->nullable()->after('check_out_reason');
            $table->unsignedBigInteger('checked_out_by')->nullable()->after('checked_in_by');
            $table->decimal('check_in_accuracy', 8, 2)->nullable()->after('longitude');
            $table->string('device_id', 64)->nullable()->after('check_in_accuracy');
            $table->json('flags')->nullable()->after('device_id');
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->string('kind', 20)->default('general')->after('target_audience'); // general | urgent
            $table->unsignedBigInteger('shift_id')->nullable()->after('kind');
            $table->unsignedInteger('recipients_count')->default(0)->after('shift_id');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->date('period_start')->nullable()->after('period');
            $table->date('period_end')->nullable()->after('period_start');
            $table->json('summary')->nullable()->after('total_hours');
        });

        Schema::create('attendance_pings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendances')->cascadeOnDelete();
            $table->decimal('latitude', 9, 6);
            $table->decimal('longitude', 9, 6);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->decimal('distance_m', 10, 2)->nullable();
            $table->boolean('inside')->default(true);
            $table->timestamp('created_at')->nullable();
            $table->index(['attendance_id', 'created_at']);
        });

        Schema::table('certificates', function (Blueprint $table) {
            $table->string('certificate_number', 20)->nullable()->unique()->after('id');
        });
        foreach (DB::table('certificates')->select('id')->get() as $c) {
            DB::table('certificates')->where('id', $c->id)
                ->update(['certificate_number' => 'VMS-' . str_pad((string) $c->id, 5, '0', STR_PAD_LEFT)]);
        }

        Schema::create('volunteer_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('org_id')->nullable()->index();
            $table->foreignId('volunteer_id')->constrained('volunteers')->cascadeOnDelete();
            $table->string('document_type', 40);
            $table->string('title', 150);
            $table->string('file_path', 500);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('file_size_bytes')->default(0);
            $table->string('verification_status', 20)->default('pending');
            $table->text('coordinator_notes')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('organization_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('document_type', 40);
            $table->string('title', 150);
            $table->string('file_path', 500);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('file_size_bytes')->default(0);
            $table->string('status', 20)->default('pending');
            $table->text('review_notes')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('plan', 20);
            $table->unsignedSmallInteger('months')->default(1);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('ETB');
            $table->string('method', 30);
            $table->string('transaction_ref', 100);
            $table->string('payer_name', 120)->nullable();
            $table->string('payer_account_suffix', 12)->nullable();
            $table->string('status', 20)->default('pending');
            $table->string('verification_source', 20)->nullable();
            $table->json('verification_response')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['method', 'transaction_ref']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('support_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('subject', 150);
            $table->string('status', 20)->default('open');
            $table->string('started_by_side', 10)->default('platform'); // platform | org
            $table->unsignedBigInteger('created_by')->nullable();
            $table->boolean('unread_platform')->default(false);
            $table->boolean('unread_org')->default(false);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('support_threads')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('side', 10); // platform | org
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('organization_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->unsignedBigInteger('event_id')->nullable();
            $table->unsignedBigInteger('reporter_id');
            $table->string('category', 40);
            $table->text('details');
            $table->string('status', 20)->default('open');
            $table->text('resolution_note')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        // Uploads live in the database: the Render container disk is wiped on every restart.
        Schema::create('stored_files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('visibility', 10)->default('private'); // public | private
            $table->string('name', 200)->nullable();
            $table->string('mime_type', 100);
            $table->unsignedInteger('size_bytes');
            $table->longText('content'); // base64
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->text('value')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        // Backfill names from full_name so first/last are always present.
        foreach (DB::table('users')->select('id', 'full_name')->get() as $u) {
            $parts = preg_split('/\s+/', trim((string) $u->full_name), 2);
            DB::table('users')->where('id', $u->id)->update([
                'first_name' => $parts[0] ?? null,
                'last_name'  => $parts[1] ?? null,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('stored_files');
        Schema::dropIfExists('organization_reports');
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_threads');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('organization_documents');
        Schema::dropIfExists('volunteer_documents');
        Schema::dropIfExists('attendance_pings');
        Schema::dropIfExists('invitations');

        Schema::table('certificates', fn (Blueprint $t) => $t->dropColumn('certificate_number'));
        Schema::table('announcements', fn (Blueprint $t) => $t->dropColumn(['kind', 'shift_id', 'recipients_count']));
        Schema::table('reports', fn (Blueprint $t) => $t->dropColumn(['period_start', 'period_end', 'summary']));
        Schema::table('attendances', fn (Blueprint $t) => $t->dropColumn([
            'hours_status', 'verified_hours', 'verified_by', 'verified_at', 'verification_note', 'check_in_method',
            'check_out_method', 'check_out_reason', 'checked_in_by', 'checked_out_by', 'check_in_accuracy', 'device_id', 'flags',
        ]));
        Schema::table('shifts', fn (Blueprint $t) => $t->dropColumn(['title', 'notes', 'qr_secret']));
        Schema::table('volunteers', fn (Blueprint $t) => $t->dropColumn(['date_of_birth', 'parental_consent_verified', 'skills_verification']));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['first_name', 'last_name', 'phone', 'must_change_password', 'email_verified_at']));
        Schema::table('organizations', fn (Blueprint $t) => $t->dropColumn([
            'verification_status', 'verified_at', 'country', 'city', 'primary_color', 'subdomain', 'plan_expires_at', 'settings',
        ]));
    }
};
