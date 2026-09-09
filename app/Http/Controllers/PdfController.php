<?php

namespace App\Http\Controllers;

use App\Models\ConfStudData;
use App\Models\Regularization;
use App\Models\Setting;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class PdfController extends Controller
{
    /**
     * Helper to load global institution settings.
     */
    private function getInstituteSettings(): array
    {
        $settings = Setting::pluck('setting_value', 'setting_key')->toArray();

        return [
            'instituteUniversityTitle' => $settings['institute_university_title'] ?? 'UNIVERSITY OF MUMBAI',
            'instituteName' => $settings['institute_name'] ?? 'INSTITUTE OF DISTANCE AND OPEN LEARNING (IDOL)',
            'instituteAddress' => $settings['institute_address'] ?? 'Dr. Shankar Dayal Sharma Bhavan, Vidyanagari, Santacruz (E), Mumbai - 400 098.',
            'instituteSignatoryName' => $settings['institute_signatory_name'] ?? ($settings['signatory_name'] ?? ''),
            'instituteSignatoryDesignation' => $settings['institute_signatory_designation'] ?? ($settings['signatory_designation'] ?? 'Deputy Registrar / Assistant Registrar'),
            'instituteSignatureSpaceLines' => ! empty($settings['institute_signature_space_lines']) ? (int) $settings['institute_signature_space_lines'] : 3,
            'instituteLogoPath' => ! empty($settings['institute_logo_path']) ? public_path($settings['institute_logo_path']) : null,
            'instituteLetterheadPath' => ! empty($settings['institute_letterhead_path']) ? public_path($settings['institute_letterhead_path']) : null,
            'footerDepartment' => $settings['footer_department'] ?? 'IDOL Eligibility Section',
        ];
    }

    /**
     * Renders a letter-template slug's subject/body/closing, substituting
     * {token} placeholders with bolded, escaped values — mirrors
     * esection_ci4's LetterTemplateService::render() exactly: escape first,
     * then substitute, on all three fields including the subject line.
     */
    private function renderLetterTemplate(string $slug, array $tokenValues): array
    {
        $definitions = SettingsController::getLetterTemplateDefinitions();
        $def = $definitions[$slug] ?? [
            'default_subject' => '',
            'default_body' => '',
            'default_closing' => '',
        ];

        $fields = [
            'subject' => Setting::get("letter_{$slug}_subject", $def['default_subject']),
            'body' => Setting::get("letter_{$slug}_body", $def['default_body']),
            'closing' => Setting::get("letter_{$slug}_closing", $def['default_closing']),
        ];

        $replacements = [];
        foreach ($tokenValues as $token => $value) {
            $replacements['{'.$token.'}'] = '<strong>'.e((string) $value).'</strong>';
        }

        $result = [];
        foreach (['subject', 'body', 'closing'] as $field) {
            $text = nl2br(e($fields[$field]));
            $result[$field] = strtr($text, $replacements);
        }

        return $result;
    }

    /**
     * Dispatch Verification Letter (Original for Target University).
     */
    public function dispatch(string $arraySpace): Response
    {
        $students = StudentDetail::where('array_space', $arraySpace)->orderBy('id', 'asc')->get();

        if ($students->isEmpty()) {
            abort(404, 'No students found for this dispatch batch.');
        }

        $first = $students->first();
        $firstRow = [
            'clg_add' => $first->clg_add,
            'to_name' => $first->to_name ?: 'The Controller of Examinations',
            'in_favour_of' => $first->in_favour_of,
            'fees' => $first->fees,
        ];

        $rendered = $this->renderLetterTemplate('dispatch', [
            'course' => $first->admission_taken_in ?? '',
            'academic_year' => $first->admission_taken_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'firstRow' => $firstRow,
            'students' => $students,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.dispatch_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("dispatch_letter_{$arraySpace}.pdf");
    }

    /**
     * Accounts Copy of Dispatch Letter with Demand Draft details.
     */
    public function accounts(string $arraySpace): Response
    {
        $students = StudentDetail::where('array_space', $arraySpace)->orderBy('id', 'asc')->get();

        if ($students->isEmpty()) {
            abort(404, 'No students found for this dispatch batch.');
        }

        $first = $students->first();
        $fees = (float) ($first->fees ?: 0);
        $totalFees = count($students) * $fees;

        $firstRow = [
            'clg_add' => $first->clg_add,
            'to_name' => $first->to_name ?: 'The Controller of Examinations',
            'in_favour_of' => $first->in_favour_of,
            'fees' => $fees,
        ];

        $rendered = $this->renderLetterTemplate('dispatch_accounts', [
            'academic_year' => $first->admission_taken_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'firstRow' => $firstRow,
            'students' => $students,
            'fees' => $fees,
            'ddAmount' => $totalFees,
            'ddAmountWords' => $this->numberToWords((int) $totalFees).' Rupees Only',
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.dispatch_accounts_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("dispatch_accounts_{$arraySpace}.pdf");
    }

    /**
     * Confirmation of Eligibility Letter (Addressed to IDOL AR).
     */
    public function confirmation(string $arraySpace): Response
    {
        $records = ConfStudData::where('array_space', $arraySpace)->orderBy('id', 'asc')->get();

        if ($records->isEmpty()) {
            abort(404, 'No confirmation records found for this batch.');
        }

        $first = $records->first();
        $count = $records->count();

        $rendered = $this->renderLetterTemplate('confirmation_eligibility', [
            'academic_year' => $first->acd_year ?? '',
            'course' => $first->stream ?? '',
            'student_count_phrase' => '( '.$count.' ) '.($count === 1 ? 'student' : 'students'),
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'records' => $records,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.confirmation_eligibility_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("confirmation_letter_{$arraySpace}.pdf");
    }

    /**
     * Regularization Letter.
     */
    public function regularization(int $id): Response
    {
        $record = Regularization::findOrFail($id);

        $rendered = $this->renderLetterTemplate('regularization', [
            'student_name' => $record->student_name,
            'eligibility_case_no' => $record->eligibility_case_no ?? '',
            'passing_course' => $record->passing_course ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'record' => $record,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.regularization_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("regularization_letter_{$id}.pdf");
    }

    /**
     * University Reminder Letter.
     */
    public function universityReminder(int $batchId): Response
    {
        $batch = UniversityReminderBatch::findOrFail($batchId);

        // Fetch notes for this batch grouped by student
        $notes = UniversityReminderNote::where('batch_id', $batchId)->get();
        $studentIds = $notes->pluck('student_id')->unique();

        $students = StudentDetail::whereIn('id', $studentIds)->get();

        foreach ($students as $student) {
            $student->notes = $notes->where('student_id', $student->id)->values();
        }

        $latestNoteText = optional($students->first())->notes?->last()?->note_text ?? '1st Reminder';

        $rendered = $this->renderLetterTemplate('university_reminder', [
            'reminder_type' => $latestNoteText,
            'course' => $batch->admission_taken_in ?? '',
            'academic_year' => $batch->academic_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'batch' => $batch,
            'students' => $students,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.university_reminder_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("university_reminder_{$batchId}.pdf");
    }

    /**
     * Student / Candidate Document Reminder Letter.
     */
    public function studentReminder(int $id): Response
    {
        $record = StudentReminder::findOrFail($id);

        $rendered = $this->renderLetterTemplate('student_reminder', [
            'course_name' => $record->course_name ?? '',
            'missing_doc' => $record->missing_doc ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'record' => $record,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.student_reminder_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("student_reminder_{$id}.pdf");
    }

    /**
     * Simple Indian numbering conversion into words.
     */
    private function numberToWords(int $number): string
    {
        $words = [
            0 => 'Zero', 1 => 'One', 2 => 'Two', 3 => 'Three', 4 => 'Four',
            5 => 'Five', 6 => 'Six', 7 => 'Seven', 8 => 'Eight', 9 => 'Nine',
            10 => 'Ten', 11 => 'Eleven', 12 => 'Twelve', 13 => 'Thirteen', 14 => 'Fourteen',
            15 => 'Fifteen', 16 => 'Sixteen', 17 => 'Seventeen', 18 => 'Eighteen', 19 => 'Nineteen',
            20 => 'Twenty', 30 => 'Thirty', 40 => 'Forty', 50 => 'Fifty',
            60 => 'Sixty', 70 => 'Seventy', 80 => 'Eighty', 90 => 'Ninety',
        ];

        if ($number < 20) {
            return $words[$number];
        }

        if ($number < 100) {
            return $words[10 * (int) ($number / 10)].($number % 10 > 0 ? ' '.$words[$number % 10] : '');
        }

        if ($number < 1000) {
            return $words[(int) ($number / 100)].' Hundred'.($number % 100 > 0 ? ' and '.$this->numberToWords($number % 100) : '');
        }

        if ($number < 100000) {
            return $this->numberToWords((int) ($number / 1000)).' Thousand'.($number % 1000 > 0 ? ' '.$this->numberToWords($number % 1000) : '');
        }

        if ($number < 10000000) {
            return $this->numberToWords((int) ($number / 100000)).' Lakh'.($number % 100000 > 0 ? ' '.$this->numberToWords($number % 100000) : '');
        }

        return $this->numberToWords((int) ($number / 10000000)).' Crore'.($number % 10000000 > 0 ? ' '.$this->numberToWords($number % 10000000) : '');
    }
}
