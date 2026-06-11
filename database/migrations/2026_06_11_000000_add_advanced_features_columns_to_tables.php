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
        // 1. Add staff_notes column to shift_assignments
        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->text('staff_notes')->nullable()->after('status');
        });

        // 2. Add signature_data column to attendances for manual signature overrides
        Schema::table('attendances', function (Blueprint $table) {
            $table->mediumText('signature_data')->nullable()->after('qr_verified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('signature_data');
        });

        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->dropColumn('staff_notes');
        });
    }
};
