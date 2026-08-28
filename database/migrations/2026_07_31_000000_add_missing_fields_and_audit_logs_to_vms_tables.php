<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add missing fields to organizations
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('address');
            $table->string('logo_path', 500)->nullable()->after('phone');
            $table->string('website', 255)->nullable()->after('logo_path');
            $table->string('subscription_plan', 50)->default('free')->after('website');
        });

        // 2. Add missing fields to users
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_photo_path', 500)->nullable()->after('last_login');
            $table->boolean('is_active')->default(true)->after('profile_photo_path');
        });

        // 3. Add geofence radius to events
        Schema::table('events', function (Blueprint $table) {
            $table->integer('geofence_radius')->default(100)->after('status');
        });

        // 4. Add QR code expiry to shifts
        Schema::table('shifts', function (Blueprint $table) {
            $table->timestamp('qr_expires_at')->nullable()->after('qr_code_signature');
        });

        // 5. Add feedback & match score to shift_assignments
        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->text('coordinator_feedback')->nullable()->after('assigned_at');
            $table->integer('match_score')->nullable()->after('coordinator_feedback');
        });

        // 6. Add signature_path to attendances
        Schema::table('attendances', function (Blueprint $table) {
            $table->string('signature_path', 500)->nullable()->after('signature_data');
        });

        // 6b. Add status to reports
        Schema::table('reports', function (Blueprint $table) {
            $table->string('status', 50)->default('completed')->after('file_path');
        });

        // 7. Create audit_logs table
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('org_id')->nullable();
            $table->string('action', 100);
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

        // 8. Create announcement_reads table (unread tracking)
        Schema::create('announcement_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('read_at');
            $table->unique(['announcement_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcement_reads');
        Schema::dropIfExists('audit_logs');

        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('signature_path');
        });

        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->dropColumn(['coordinator_feedback', 'match_score']);
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->dropColumn('qr_expires_at');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('geofence_radius');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['profile_photo_path', 'is_active']);
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['phone', 'logo_path', 'website', 'subscription_plan']);
        });
    }
};
