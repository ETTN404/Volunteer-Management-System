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
        // 1. Volunteers Table (Specialization of Users)
        Schema::create('volunteers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->json('skills')->nullable();
            $table->json('availability')->nullable();
            $table->decimal('total_hours', 8, 2)->default(0.00);
            $table->decimal('impact_score', 5, 2)->default(0.00);
            $table->text('bio')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Events Table
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->onDelete('cascade');
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->string('location', 255)->nullable();
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['upcoming', 'ongoing', 'completed'])->default('upcoming');
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. Shifts Table
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');
            $table->datetime('start_time');
            $table->datetime('end_time');
            $table->json('required_skills')->nullable();
            $table->integer('capacity')->default(0);
            $table->string('qr_code_signature', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Shift Assignments Table
        Schema::create('shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('shifts')->onDelete('cascade');
            $table->foreignId('volunteer_id')->constrained('volunteers')->onDelete('cascade');
            $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Attendances Table
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('shifts')->onDelete('cascade');
            $table->foreignId('volunteer_id')->constrained('volunteers')->onDelete('cascade');
            $table->timestamp('check_in_time')->nullable();
            $table->timestamp('check_out_time')->nullable();
            $table->boolean('qr_verified')->default(false);
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 6. Certificates Table
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained('volunteers')->onDelete('cascade');
            $table->foreignId('org_id')->constrained('organizations')->onDelete('cascade');
            $table->date('issued_date');
            $table->decimal('milestone_hours', 8, 2);
            $table->string('file_path', 255);
            $table->timestamps();
            $table->softDeletes();
        });

        // 7. Reports Table
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->string('period', 50);
            $table->integer('total_volunteers')->default(0);
            $table->decimal('total_hours', 10, 2)->default(0.00);
            $table->string('file_path', 255);
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. Announcements Table
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('posted_by')->constrained('users')->onDelete('cascade');
            $table->string('title', 150);
            $table->text('message');
            $table->enum('target_audience', ['all', 'coordinators', 'volunteers'])->default('all');
            $table->timestamps();
            $table->softDeletes();
        });

        // 9. Chatbot Sessions Table
        Schema::create('chatbot_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained('volunteers')->onDelete('cascade');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('last_interaction')->nullable();
            $table->json('context_data')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_sessions');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('certificates');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('shift_assignments');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('events');
        Schema::dropIfExists('volunteers');
    }
};
