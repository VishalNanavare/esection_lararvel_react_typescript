<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\ScholarshipDocument;
use App\Models\ScholarshipFeeMaster;
use App\Models\ScholarshipInstallment;
use App\Models\ScholarshipStudent;
use App\Models\User;
use App\Services\ScholarshipImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScholarshipTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected AcademicYear $year;
    protected Course $course;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'username' => 'admin_test',
            'full_name' => 'Admin User',
            'password' => \Illuminate\Support\Facades\Hash::make('secret123'),
            'role' => 'admin',
            'is_active' => true,
        ]);
        $this->year = AcademicYear::firstOrCreate(['year_label' => '2026-2027'], ['is_current' => true]);
        $this->course = Course::firstOrCreate(['name' => 'F.Y.B.A'], ['is_active' => true]);
    }

    public function test_scholarship_roster_loads_successfully(): void
    {
        $response = $this->actingAs($this->user)->get('/scholarship');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Scholarship/Index'));
    }

    public function test_document_checklist_can_be_ticked_and_verified(): void
    {
        $student = ScholarshipStudent::create([
            'form_number' => 'TESTFORM001',
            'student_name' => 'Test Candidate',
            'caste_category' => 'SC',
            'scholarship_status' => 'pending_docs',
        ]);

        $response = $this->actingAs($this->user)->postJson("/scholarship/student/{$student->id}/documents", [
            'caste_cert' => true,
            'caste_validity' => true,
            'income_cert' => true,
            'domicile_cert' => true,
            'prev_marksheet' => true,
            'bank_aadhaar_linked' => true,
            'remarks' => 'All original documents verified.',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $doc = ScholarshipDocument::where('scholarship_student_id', $student->id)->first();
        $this->assertNotNull($doc);
        $this->assertTrue($doc->caste_cert);
        $this->assertTrue($doc->caste_validity);
        $this->assertEquals(6, $doc->completedCount());

        $student->refresh();
        $this->assertEquals('docs_verified', $student->scholarship_status);
    }

    public function test_installments_repeater_recalculates_financial_ledger(): void
    {
        // 1. Create fee master: Course Fee ₹5000, Govt ₹4500, Student ₹500
        ScholarshipFeeMaster::updateOrCreate(
            [
                'academic_year_id' => $this->year->id,
                'course_id' => $this->course->id,
                'caste_category' => 'SC',
            ],
            [
                'total_college_fee' => 5000,
                'govt_share_amount' => 4500,
                'student_share_amount' => 500,
                'admission_token_amount' => 500,
            ]
        );

        $student = ScholarshipStudent::create([
            'form_number' => 'TESTFORM002',
            'student_name' => 'Rahul Shinde',
            'academic_year_id' => $this->year->id,
            'course_id' => $this->course->id,
            'caste_category' => 'SC',
            'admission_fee_paid' => 500,
            'total_fee' => 5000,
            'balance_due' => 4500,
        ]);

        // 2. Pay 1st installment of ₹2250
        $response = $this->actingAs($this->user)->postJson("/scholarship/student/{$student->id}/installments", [
            'installments' => [
                [
                    'installment_no' => 1,
                    'amount' => 2250,
                    'status' => 'paid_done',
                    'paid_date' => '2026-10-30',
                    'reference_no' => 'MDBT998877',
                    'remarks' => '1st Installment credited',
                ],
                [
                    'installment_no' => 2,
                    'amount' => 2250,
                    'status' => 'unpaid',
                ],
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $student->refresh();
        // Total collected = ₹500 (admission) + ₹2250 (Inst 1) = ₹2750
        $this->assertEquals(2750.00, (float) $student->total_collected);
        // Balance due = ₹5000 - ₹2750 = ₹2250
        $this->assertEquals(2250.00, (float) $student->balance_due);
    }

    public function test_scholarship_not_processed_flow_and_pdf_demand_letter(): void
    {
        $student = ScholarshipStudent::create([
            'form_number' => 'TESTFORM003',
            'student_name' => 'Pooja Patil',
            'academic_year_id' => $this->year->id,
            'course_id' => $this->course->id,
            'caste_category' => 'OBC',
            'total_fee' => 5500,
            'admission_fee_paid' => 500,
            'total_collected' => 500,
            'balance_due' => 5000,
        ]);

        // Mark as Not Processed
        $response = $this->actingAs($this->user)->postJson("/scholarship/student/{$student->id}/not-processed", [
            'reason' => 'Caste Validity Certificate was not submitted within deadline.',
            'manual_recovery_amount' => 5000,
        ]);

        $response->assertStatus(200);
        $student->refresh();
        $this->assertEquals('not_processed', $student->scholarship_status);
        $this->assertEquals('Caste Validity Certificate was not submitted within deadline.', $student->not_processed_reason);

        // Download Demand Letter PDF
        $pdfResponse = $this->actingAs($this->user)->get("/scholarship/student/{$student->id}/demand-letter");
        $pdfResponse->assertStatus(200);
        $this->assertEquals('application/pdf', $pdfResponse->headers->get('content-type'));
    }

    public function test_category_normalizer_detects_state_codes(): void
    {
        $service = app(ScholarshipImportService::class);

        $this->assertEquals('VJNT', $service->normalizeCategory('', '26'));
        $this->assertEquals('NT-B', $service->normalizeCategory('', '27'));
        $this->assertEquals('NT-C', $service->normalizeCategory('', '28'));
        $this->assertEquals('NT-D', $service->normalizeCategory('', '29'));
        $this->assertEquals('SBC', $service->normalizeCategory('', '30'));
        $this->assertEquals('SEBC', $service->normalizeCategory('', '35'));
        $this->assertEquals('SC', $service->normalizeCategory('Scheduled Caste (SC)', '3'));
        $this->assertEquals('ST', $service->normalizeCategory('Scheduled Tribe (ST)', '4'));
        $this->assertEquals('OBC', $service->normalizeCategory('OBC', '6'));
    }
}
