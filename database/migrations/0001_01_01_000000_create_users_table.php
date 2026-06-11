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
        // 1. Create Organizations Table
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 100)->unique();
            $table->string('address', 255)->nullable();
            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Create Users Table (Multi-tenant with org_id)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->nullable()->constrained('organizations')->onDelete('cascade');
            $table->string('full_name', 100);
            $table->string('email', 100)->unique();
            $table->string('password', 255);
            $table->enum('role', ['SuperAdmin', 'OrgAdmin', 'Coordinator', 'Volunteer'])->default('Volunteer');
            $table->timestamp('last_login')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('organizations');
    }
};
