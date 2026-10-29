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
        // 1. student_details (DD View / Student Verification Batches)
        if (Schema::hasTable('student_details')) {
            Schema::table('student_details', function (Blueprint $table) {
                if (! Schema::hasColumn('student_details', 'letter_no')) {
                    $table->string('letter_no', 100)->nullable()->after('in_favour_of');
                }
                if (! Schema::hasColumn('student_details', 'letter_date')) {
                    $table->date('letter_date')->nullable()->after('letter_no');
                }
                if (! Schema::hasColumn('student_details', 'remarks')) {
                    $table->text('remarks')->nullable()->after('letter_date');
                }
            });
        }

        // 2. conf_stud_data (Confirmation Batches)
        if (Schema::hasTable('conf_stud_data')) {
            Schema::table('conf_stud_data', function (Blueprint $table) {
                if (! Schema::hasColumn('conf_stud_data', 'letter_no')) {
                    $table->string('letter_no', 100)->nullable()->after('letter_no_date');
                }
                if (! Schema::hasColumn('conf_stud_data', 'letter_date')) {
                    $table->date('letter_date')->nullable()->after('letter_no');
                }
                if (! Schema::hasColumn('conf_stud_data', 'remarks')) {
                    $table->text('remarks')->nullable()->after('remark');
                }
            });
        }

        // 3. regularizations (Regularization Letters)
        if (Schema::hasTable('regularizations')) {
            Schema::table('regularizations', function (Blueprint $table) {
                if (! Schema::hasColumn('regularizations', 'letter_no')) {
                    $table->string('letter_no', 100)->nullable()->after('admission_letter_date');
                }
                if (! Schema::hasColumn('regularizations', 'letter_date')) {
                    $table->date('letter_date')->nullable()->after('letter_no');
                }
                if (! Schema::hasColumn('regularizations', 'remarks')) {
                    $table->text('remarks')->nullable()->after('letter_date');
                }
            });
        }

        // 4. university_reminder_batches (University Reminder Batches)
        if (Schema::hasTable('university_reminder_batches')) {
            Schema::table('university_reminder_batches', function (Blueprint $table) {
                if (! Schema::hasColumn('university_reminder_batches', 'letter_no')) {
                    $table->string('letter_no', 100)->nullable()->after('head_name');
                }
                if (! Schema::hasColumn('university_reminder_batches', 'letter_date')) {
                    $table->date('letter_date')->nullable()->after('letter_no');
                }
                if (! Schema::hasColumn('university_reminder_batches', 'remarks')) {
                    $table->text('remarks')->nullable()->after('letter_date');
                }
            });
        }

        // 5. student_reminders (Candidate Document Reminders)
        if (Schema::hasTable('student_reminders')) {
            Schema::table('student_reminders', function (Blueprint $table) {
                if (! Schema::hasColumn('student_reminders', 'letter_no')) {
                    $table->string('letter_no', 100)->nullable()->after('missing_doc');
                }
                if (! Schema::hasColumn('student_reminders', 'letter_date')) {
                    $table->date('letter_date')->nullable()->after('letter_no');
                }
                if (! Schema::hasColumn('student_reminders', 'remarks')) {
                    $table->text('remarks')->nullable()->after('letter_date');
                }
                if (! Schema::hasColumn('student_reminders', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('created_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('student_details')) {
            Schema::table('student_details', function (Blueprint $table) {
                $table->dropColumn(['letter_no', 'letter_date', 'remarks']);
            });
        }

        if (Schema::hasTable('conf_stud_data')) {
            Schema::table('conf_stud_data', function (Blueprint $table) {
                $table->dropColumn(['letter_no', 'letter_date', 'remarks']);
            });
        }

        if (Schema::hasTable('regularizations')) {
            Schema::table('regularizations', function (Blueprint $table) {
                $table->dropColumn(['letter_no', 'letter_date', 'remarks']);
            });
        }

        if (Schema::hasTable('university_reminder_batches')) {
            Schema::table('university_reminder_batches', function (Blueprint $table) {
                $table->dropColumn(['letter_no', 'letter_date', 'remarks']);
            });
        }

        if (Schema::hasTable('student_reminders')) {
            Schema::table('student_reminders', function (Blueprint $table) {
                $table->dropColumn(['letter_no', 'letter_date', 'remarks', 'updated_at']);
            });
        }
    }
};
