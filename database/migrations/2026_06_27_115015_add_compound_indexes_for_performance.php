<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 10.2.1.2: Add compound indexes for query performance optimization.
     */
    public function up(): void
    {
        // Events: frequently filtered by org + status
        Schema::table('events', function (Blueprint $table) {
            $table->index(['org_id', 'status'], 'idx_events_org_status');
        });

        // Shifts: frequently queried by event + time range
        Schema::table('shifts', function (Blueprint $table) {
            $table->index(['event_id', 'start_time'], 'idx_shifts_event_start');
        });

        // Shift Assignments: critical join table, queried by volunteer + status
        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->index(['volunteer_id', 'status'], 'idx_assignments_vol_status');
            $table->index(['shift_id', 'volunteer_id'], 'idx_assignments_shift_vol');
        });

        // Attendances: queried for check-in/out lookups
        Schema::table('attendances', function (Blueprint $table) {
            $table->index(['volunteer_id', 'shift_id'], 'idx_attendance_vol_shift');
        });

        // Announcements: filtered by org + audience
        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['org_id', 'target_audience'], 'idx_announce_org_audience');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('idx_events_org_status');
        });
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropIndex('idx_shifts_event_start');
        });
        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->dropIndex('idx_assignments_vol_status');
            $table->dropIndex('idx_assignments_shift_vol');
        });
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex('idx_attendance_vol_shift');
        });
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex('idx_announce_org_audience');
        });
    }
};
