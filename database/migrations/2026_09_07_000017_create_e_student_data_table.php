<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('e_student_data', function (Blueprint $table) {
            $table->increments('id');
            $table->string('AdmissionYear', 20)->nullable();
            $table->string('ApplicationID', 25)->nullable()->index('idx_esd_application_id');
            $table->string('FirstName', 50)->nullable();
            $table->string('MiddleName', 50)->nullable();
            $table->string('LastName', 50)->nullable();
            $table->string('NameOnMarkSheet', 500)->nullable();
            $table->string('Gender', 10)->nullable();
            $table->string('CorrespondenceAddress', 1000)->nullable();
            $table->string('PermanentAddress', 1000)->nullable();
            $table->string('PrimaryMobileNo', 30)->nullable();
            $table->string('AlternateMobileNo', 30)->nullable();
            $table->string('EmailID', 50)->nullable();
            $table->string('CourseName', 150)->nullable();
            $table->string('LastQual', 150)->nullable();
            $table->string('QualificationName', 150)->nullable();
            $table->string('CertifyingBodyType', 15)->nullable();
            $table->string('CertifyingBoardName', 200)->nullable();
            $table->string('CertifyingStateName', 50)->nullable();
            $table->string('AdmissionFeeAmount', 15)->nullable();
            $table->string('AdmissionFeeTransactionDateTime', 100)->nullable();
            $table->string('ApplicationStatus', 150)->nullable();
            $table->string('SCEligibilityStatus', 15)->nullable();
            $table->string('EligibilityCaseNo', 50)->nullable()->index('idx_esd_case_no');
            $table->string('EligibilityApprovalDate', 65)->nullable();
            $table->string('import_ref', 40)->nullable()->index('idx_esd_import_ref');
            $table->dateTime('imported_at')->nullable();
            $table->string('imported_by', 50)->nullable();
            $table->string('dispatch_array_space', 50)->nullable();

            if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
                $table->index([\Illuminate\Support\Facades\DB::raw('CertifyingBoardName(100)')], 'idx_esd_board');
            } else {
                $table->index('CertifyingBoardName', 'idx_esd_board');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('e_student_data');
    }
};
