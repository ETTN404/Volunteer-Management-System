<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Waitlist (shift_assignments.status = 'waitlisted', ordered by waitlisted_at) and
 * alert channels for volunteers without the app: Telegram and SMS.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shift_assignments', function (Blueprint $table) {
            $table->timestamp('waitlisted_at')->nullable()->after('assigned_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('telegram_chat_id', 40)->nullable()->after('phone');
            $table->string('telegram_link_token', 64)->nullable()->after('telegram_chat_id');
            $table->boolean('sms_opt_in')->default(false)->after('telegram_link_token');
            $table->string('locale', 5)->default('en')->after('sms_opt_in');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['telegram_chat_id', 'telegram_link_token', 'sms_opt_in', 'locale']));
        Schema::table('shift_assignments', fn (Blueprint $t) => $t->dropColumn('waitlisted_at'));
    }
};
