<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Scholarship Fee Reference Master
        if (!Schema::hasTable('scholarship_fee_masters')) {
            Schema::create('scholarship_fee_masters', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('academic_year_id')->index();
                $table->unsignedInteger('course_id')->index();
                $table->string('caste_category', 50)->index();
                $table->decimal('total_college_fee', 10, 2)->default(0);
                $table->decimal('govt_share_amount', 10, 2)->default(0);
                $table->decimal('student_share_amount', 10, 2)->default(0);
                $table->decimal('admission_token_amount', 10, 2)->default(0);
                $table->text('remarks')->nullable();
                $table->timestamps();

                $table->unique(['academic_year_id', 'course_id', 'caste_category'], 'uq_sch_fee_year_course_caste');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->cascadeOnDelete();
                $table->foreign('course_id')->references('id')->on('courses')->cascadeOnDelete();
            });
        }

        // 2. Scholarship Students Master Roster
        if (!Schema::hasTable('scholarship_students')) {
            Schema::create('scholarship_students', function (Blueprint $table) {
                $table->id();
                $table->string('form_number', 50)->unique();
                $table->string('registration_no', 50)->nullable()->index();
                $table->string('student_name', 255);
                $table->string('email', 150)->nullable()->index();
                $table->string('mobile', 30)->nullable()->index();
                $table->string('alternate_mobile', 30)->nullable();
                $table->string('gender', 20)->nullable();
                $table->string('dob', 50)->nullable();
                $table->text('photo_url')->nullable();
                $table->text('signature_url')->nullable();
                $table->unsignedInteger('academic_year_id')->nullable()->index();
                $table->string('academic_year_label', 50)->nullable();
                $table->unsignedInteger('course_id')->nullable()->index();
                $table->string('applied_programme_name', 255)->nullable();
                $table->string('caste_category', 50)->nullable()->index();
                $table->string('category_id', 10)->nullable()->index();
                $table->string('family_income_code', 20)->nullable();
                $table->string('payment_status', 50)->default('PAID');
                $table->string('row_hash', 64)->nullable()->index();
                $table->string('admission_status', 50)->default('ACTIVE'); // ACTIVE, CANCELLED
                $table->string('scholarship_status', 50)->default('pending_docs'); // pending_docs, docs_verified, in_process, fully_settled, not_processed, cancelled
                $table->text('not_processed_reason')->nullable();
                $table->decimal('manual_recovery_amount', 10, 2)->nullable();
                $table->decimal('total_fee', 10, 2)->default(0);
                $table->decimal('govt_expected_share', 10, 2)->default(0);
                $table->decimal('student_expected_share', 10, 2)->default(0);
                $table->decimal('admission_fee_paid', 10, 2)->default(0);
                $table->decimal('total_collected', 10, 2)->default(0);
                $table->decimal('balance_due', 10, 2)->default(0);
                $table->text('existing_system_status')->nullable();
                $table->text('internal_remarks')->nullable();
                $table->dateTime('last_imported_at')->nullable();
                $table->timestamps();

                $table->foreign('academic_year_id')->references('id')->on('academic_years')->nullOnDelete();
                $table->foreign('course_id')->references('id')->on('courses')->nullOnDelete();
            });
        }

        // 3. Scholarship Documents Checklist (The 6 Mandatory Ticks)
        if (!Schema::hasTable('scholarship_documents')) {
            Schema::create('scholarship_documents', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('scholarship_student_id')->unique();
                $table->boolean('caste_cert')->default(false);
                $table->boolean('caste_validity')->default(false);
                $table->boolean('income_cert')->default(false);
                $table->boolean('domicile_cert')->default(false);
                $table->boolean('prev_marksheet')->default(false);
                $table->boolean('bank_aadhaar_linked')->default(false);
                $table->string('verified_by', 100)->nullable();
                $table->dateTime('verified_at')->nullable();
                $table->text('remarks')->nullable();
                $table->timestamps();

                $table->foreign('scholarship_student_id')->references('id')->on('scholarship_students')->cascadeOnDelete();
            });
        }

        // 4. Scholarship Installments Repeater
        if (!Schema::hasTable('scholarship_installments')) {
            Schema::create('scholarship_installments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('scholarship_student_id')->index();
                $table->unsignedSmallInteger('installment_no')->default(1);
                $table->decimal('amount', 10, 2)->default(0);
                $table->string('status', 30)->default('unpaid'); // paid_done, unpaid, no_response
                $table->date('paid_date')->nullable();
                $table->string('reference_no', 100)->nullable();
                $table->text('remarks')->nullable();
                $table->timestamps();

                $table->foreign('scholarship_student_id')->references('id')->on('scholarship_students')->cascadeOnDelete();
            });
        }

        // 5. Scholarship Recovery Demand Letters
        if (!Schema::hasTable('scholarship_demand_letters')) {
            Schema::create('scholarship_demand_letters', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('scholarship_student_id')->index();
                $table->string('letter_no', 100)->unique();
                $table->date('letter_date');
                $table->decimal('total_course_fee', 10, 2)->default(0);
                $table->decimal('fee_collected', 10, 2)->default(0);
                $table->decimal('balance_demanded', 10, 2)->default(0);
                $table->text('non_processed_reason')->nullable();
                $table->string('generated_by', 100)->nullable();
                $table->timestamps();

                $table->foreign('scholarship_student_id')->references('id')->on('scholarship_students')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_demand_letters');
        Schema::dropIfExists('scholarship_installments');
        Schema::dropIfExists('scholarship_documents');
        Schema::dropIfExists('scholarship_students');
        Schema::dropIfExists('scholarship_fee_masters');
    }
};
