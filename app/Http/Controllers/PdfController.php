<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MatchesColleges;
use App\Models\CollegeDetail;
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
    use MatchesColleges;

    /**
     * Resolve the university name and clean mailing address from a raw clg_add/string.
     *
     * @return array{to_name: string, university_name: string, address: string}
     */
    public function resolveUniversityAndAddress(?string $clgAdd, ?string $toName = null): array
    {
        $raw = trim((string) $clgAdd);
        $college = null;

        if (is_numeric($raw)) {
            $college = CollegeDetail::find((int) $raw);
        }

        if (! $college && $raw !== '') {
            $college = CollegeDetail::where('Name', $raw)->orWhere('Address', $raw)->first();
            if (! $college) {
                [, $matcher] = $this->buildCollegeMatcher();
                $college = $matcher($raw);
            }
        }

        $universityName = '';
        $address = $raw;

        if ($college) {
            $universityName = trim((string) $college->Name, " ,\t\n\r\0\x0B");
            $colAddress = trim((string) $college->Address);
            if ($colAddress !== '') {
                $address = $colAddress;
            }
        }

        // If $address still contains $universityName at the beginning, strip it so it doesn't repeat
        if ($universityName !== '' && $address !== '') {
            $pattern = '/^' . preg_quote($universityName, '/') . '[\s,\-\n\r<br\/>]*/i';
            $cleaned = preg_replace($pattern, '', $address);
            if (trim($cleaned) !== '') {
                $address = trim($cleaned);
            }
        }

        // If no college matched, but clgAdd has multiple lines, first line might be university name
        if ($universityName === '' && $address !== '') {
            $lines = preg_split('/(\r\n|\n|\r|<br\s*\/?>)/i', $address);
            $lines = array_values(array_filter(array_map('trim', $lines)));
            if (count($lines) > 1) {
                $universityName = array_shift($lines);
                $address = implode("\n", $lines);
            }
        }

        $resolvedToName = $toName ?: ($college?->head_name ? 'The ' . trim($college->head_name) : 'The Secretary');
        $fees = floatval(preg_replace('/[^0-9.]/', '', (string)($college?->fees ?? '0')));
        $inFavourOf = trim((string)($college?->in_favour_of ?? ''));

        $address = trim(preg_replace('/<br\s*\/?>/i', "\n", $address));

        return [
            'to_name' => $resolvedToName,
            'university_name' => $universityName,
            'address' => $address,
            'fees' => $fees,
            'in_favour_of' => $inFavourOf,
            'college' => $college,
        ];
    }
    /**
     * Helper to load global institution settings.
     */
    public function getInstituteSettings(): array
    {
        $settings = Setting::pluck('setting_value', 'setting_key')->toArray();

        return [
            'instituteUniversityTitle' => $settings['institute_university_title'] ?? 'UNIVERSITY OF MUMBAI',
            'instituteName' => $settings['institute_name'] ?? 'INSTITUTE OF DISTANCE AND OPEN LEARNING (IDOL)',
            'instituteAddress' => $settings['institute_address'] ?? 'Dr. Shankar Dayal Sharma Bhavan, Vidyanagari, Santacruz (E), Mumbai - 400 098.',
            'instituteSignatoryName' => $settings['institute_signatory_name'] ?? ($settings['signatory_name'] ?? ''),
            'instituteSignatoryDesignation' => $settings['institute_signatory_designation'] ?? ($settings['signatory_designation'] ?? 'Deputy Registrar / Assistant Registrar'),
            'instituteSignatureSpaceLines' => ! empty($settings['institute_signature_space_lines']) ? (int) $settings['institute_signature_space_lines'] : 3,
            'instituteLogoPath' => ! empty($settings['institute_logo_path']) ? public_path(ltrim($settings['institute_logo_path'], '/')) : null,
            'instituteLetterheadPath' => (! empty($settings['institute_letterhead_path']) && file_exists(public_path(ltrim($settings['institute_letterhead_path'], '/'))))
                ? public_path(ltrim($settings['institute_letterhead_path'], '/'))
                : (file_exists(public_path('img/esection_header.jpg')) ? public_path('img/esection_header.jpg') : null),
            'footerDepartment' => $settings['footer_department'] ?? 'IDOL Eligibility Section',
        ];
    }

    /**
     * Renders a letter-template slug's subject/body/closing, substituting
     * {token} placeholders with bolded, escaped values — mirrors
     * esection_ci4's LetterTemplateService::render() exactly: escape first,
     * then substitute, on all three fields including the subject line.
     */
    public function renderLetterTemplate(string $slug, array $tokenValues): array
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
            $formatted = '<strong>'.e((string) $value).'</strong>';
            $replacements['{'.$token.'}'] = $formatted;
            $replacements['{'.strtolower($token).'}'] = $formatted;
            $replacements['{'.strtoupper($token).'}'] = $formatted;
        }

        $result = [];
        foreach (['subject', 'body', 'closing'] as $field) {
            $result[$field] = SettingsController::formatTemplateText($fields[$field], $replacements);
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
        $resolved = $this->resolveUniversityAndAddress($first->clg_add, $first->to_name);

        $fees = (float) ($resolved['fees'] ?? 0);
        $count = $students->count();
        $totalFees = $fees * $count;
        $currentTime = !empty($first->pdf_time) ? $first->pdf_time : (!empty($first->en_time) ? $first->en_time : $arraySpace);

        $firstRow = [
            'clg_add' => $first->clg_add,
            'address' => $resolved['address'],
            'university_name' => $resolved['university_name'],
            'to_name' => $resolved['to_name'],
            'in_favour_of' => $resolved['in_favour_of'],
            'fees' => $fees,
        ];

        $rendered = $this->renderLetterTemplate('dispatch', [
            'course' => $first->admission_taken_in ?? '',
            'academic_year' => $first->admission_taken_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'currentTime' => $currentTime,
            'firstRow' => $firstRow,
            'students' => $students,
            'fees' => $fees,
            'totalFees' => $totalFees,
            'academic_year' => $first->admission_taken_year ?? '',
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.dispatch_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("{$currentTime}.pdf");
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
        $resolved = $this->resolveUniversityAndAddress($first->clg_add, $first->to_name);

        $fees = (float) ($resolved['fees'] ?? 0);
        $count = $students->count();
        $totalFees = $fees * $count;
        $currentTime = !empty($first->pdf_time) ? $first->pdf_time : (!empty($first->en_time) ? $first->en_time : $arraySpace);

        $firstRow = [
            'clg_add' => $first->clg_add,
            'address' => $resolved['address'],
            'university_name' => $resolved['university_name'],
            'to_name' => $resolved['to_name'],
            'in_favour_of' => $resolved['in_favour_of'],
            'fees' => $fees,
        ];

        $rendered = $this->renderLetterTemplate('dispatch_accounts', [
            'academic_year' => $first->admission_taken_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'currentTime' => $currentTime,
            'firstRow' => $firstRow,
            'students' => $students,
            'fees' => $fees,
            'totalFees' => $totalFees,
            'ddAmount' => $totalFees,
            'ddAmountWords' => $totalFees > 0 ? $this->numberToWords((int) $totalFees) : '',
            'academic_year' => $first->admission_taken_year ?? '',
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.dispatch_accounts_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("{$currentTime}.pdf");
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
        $currentTime = !empty($first->en_time) ? $first->en_time : $arraySpace;

        foreach ($records as $r) {
            $student = null;
            if (!empty($r->student_id)) {
                $student = StudentDetail::find($r->student_id);
            }
            if (!$student && is_numeric($r->name)) {
                $student = StudentDetail::find((int) $r->name);
            }
            if (!$student && !empty($r->name)) {
                $student = StudentDetail::where('student_name', $r->name)->orWhere('student_nee_name', $r->name)->first();
            }

            if ($student) {
                if (empty($student->student_nee_name) || $student->student_nee_name === '-') {
                    $r->display_name = $student->student_name;
                } else {
                    $r->display_name = $student->student_name . '<br/>( Nee name : ' . $student->student_nee_name . ' )';
                }
            } else {
                $r->display_name = $r->name;
            }

            // Resolve ONLY the University Name
            $displayUni = '';
            if (!empty($r->uni_add) && is_numeric($r->uni_add)) {
                $clg = CollegeDetail::find((int) $r->uni_add);
                if ($clg) {
                    $displayUni = trim((string) $clg->Name, " ,\t\n\r\0\x0B");
                }
            }
            if (empty($displayUni) && $student && !empty($student->clg_add) && is_numeric($student->clg_add)) {
                $clg = CollegeDetail::find((int) $student->clg_add);
                if ($clg) {
                    $displayUni = trim((string) $clg->Name, " ,\t\n\r\0\x0B");
                }
            }
            if (empty($displayUni) && !empty($r->uni_add) && $r->uni_add !== '-') {
                $resolved = $this->resolveUniversityAndAddress($r->uni_add);
                $displayUni = $resolved['university_name'] ?? '';
            }
            if (empty($displayUni) && $student && !empty($student->clg_add) && $student->clg_add !== '-') {
                $resolved = $this->resolveUniversityAndAddress($student->clg_add);
                $displayUni = $resolved['university_name'] ?? '';
            }
            if (empty($displayUni)) {
                $rawUni = (!empty($r->uni_add) && $r->uni_add !== '-') ? $r->uni_add : ($student->clg_add ?? '');
                if (!empty($rawUni)) {
                    $lines = preg_split('/(<br\s*\/?>|\r\n|\n|\r)/i', (string) $rawUni);
                    $displayUni = trim(strip_tags($lines[0] ?? (string) $rawUni));
                }
            }

            $r->display_university = $displayUni ?: ($r->uni_add ?: '');
        }

        $rendered = $this->renderLetterTemplate('confirmation_eligibility', [
            'academic_year' => $first->acd_year ?? '',
            'course' => $first->stream ?? '',
            'student_count_phrase' => '( ' . sprintf('%02d', $count) . ' ) ' . ($count === 1 ? 'student' : 'students'),
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'currentTime' => $currentTime,
            'first' => $first,
            'count' => $count,
            'records' => $records,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.confirmation_eligibility_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("{$currentTime}.pdf");
    }

    /**
     * Regularization Letter.
     */
    public function regularization(int $id): Response
    {
        $record = Regularization::findOrFail($id);

        $admDate = '';
        if (!empty($record->admission_letter_date)) {
            $admDate = \Carbon\Carbon::parse($record->admission_letter_date)->format('d/m/Y');
        }

        $college = CollegeDetail::where('Name', $record->university_name)->first();
        $states = $college?->States ?? '';

        $gender = trim($record->gender ?? '');
        $genCh1 = ($gender === 'Ms' || $gender === 'Mrs') ? 'she' : 'he';
        $genCh2 = ($gender === 'Ms' || $gender === 'Mrs') ? 'her' : 'his';

        $currentTime = !empty($record->en_time) ? (is_numeric($record->en_time) ? $record->en_time : strtotime($record->en_time)) : time();

        $rendered = $this->renderLetterTemplate('regularization', [
            'student_name' => $record->student_name,
            'gender' => $record->gender ?? '',
            'eligibility_case_no' => $record->eligibility_case_no ?? '',
            'passing_course' => $record->passing_course ?? '',
            'admission_course' => $record->admission_taken_in ?? '',
            'admission_taken_in' => $record->admission_taken_in ?? '',
            'academic_year' => $record->admission_taken_year ?? '',
            'admission_taken_year' => $record->admission_taken_year ?? '',
            'admission_letter_date' => $admDate,
            'admission_letter_for' => $record->admission_letter_for ?? '',
            'Last_Attended_University' => $record->university_name ?? '',
            'last_attended_university' => $record->university_name ?? '',
            'university_name' => $record->university_name ?? '',
            'gen_ch1' => $genCh1,
            'gen_ch2' => $genCh2,
        ]);

        $resolved = $this->resolveUniversityAndAddress($record->university_name);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'record' => $record,
            'universityName' => $resolved['university_name'] ?: $record->university_name,
            'address' => $resolved['address'] ?: ($record->university_address ?? ''),
            'states' => $states,
            'genCh1' => $genCh1,
            'genCh2' => $genCh2,
            'currentTime' => $currentTime,
            'admDate' => $admDate,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.regularization_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("{$currentTime}.pdf");
    }

    /**
     * University Reminder Letter.
     */
    public function universityReminder(int $batchId): Response
    {
        $batch = UniversityReminderBatch::findOrFail($batchId);

        // Fetch notes for this batch grouped by student
        $notes = UniversityReminderNote::where('batch_id', $batchId)->orderBy('student_id')->orderBy('id')->get();
        $studentIds = $notes->pluck('student_id')->unique();

        $students = StudentDetail::with('confirmation')
            ->whereIn('id', $studentIds)
            ->get()
            ->filter(fn ($s) => $s->isEligibleForReminder())
            ->values();

        $allStudentNotes = UniversityReminderNote::whereIn('student_id', $students->pluck('id'))->orderBy('id')->get();
        foreach ($students as $student) {
            $student->notes = $allStudentNotes->where('student_id', $student->id)->values();
        }

        $latestNoteText = optional($students->first())->notes?->last()?->note_text ?? '1st Reminder';

        $rendered = $this->renderLetterTemplate('university_reminder', [
            'reminder_type' => $latestNoteText,
            'course' => $batch->admission_taken_in ?? '',
            'academic_year' => $batch->academic_year ?? '',
        ]);

        $resolved = $this->resolveUniversityAndAddress($batch->university_name, $batch->head_name);
        $currentTime = !empty($batch->pdf_time) ? $batch->pdf_time : time();

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'batch' => $batch,
            'currentTime' => $currentTime,
            'universityName' => $resolved['university_name'] ?: $batch->university_name,
            'headName' => $resolved['to_name'] ?: $batch->head_name,
            'address' => $resolved['address'],
            'students' => $students,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.university_reminder_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("{$currentTime}.pdf");
    }

    /**
     * Student / Candidate Document Reminder Letter.
     */
    public function studentReminder(int $id): Response
    {
        $record = StudentReminder::findOrFail($id);

        $student = null;
        if (!empty($record->student_id)) {
            $student = StudentDetail::find($record->student_id);
        }
        if (!$student && is_numeric($record->name)) {
            $student = StudentDetail::find((int) $record->name);
        }
        if (!$student && !empty($record->student_name)) {
            $student = StudentDetail::where('student_name', $record->student_name)->orWhere('student_nee_name', $record->student_name)->first();
        }

        $currentTime = !empty($record->pdf_time) ? $record->pdf_time : (!empty($record->created_at) ? $record->created_at->timestamp : time());

        $rendered = $this->renderLetterTemplate('student_reminder', [
            'course_name' => $record->course_name ?? ($student?->admission_taken_in ?? ''),
            'academic_year' => $record->acd_year ?? ($student?->admission_taken_year ?? ''),
            'missing_doc' => $record->missing_doc ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'record' => $record,
            'student' => $student,
            'currentTime' => $currentTime,
            'date' => date('d/m/Y'),
        ]);

        $pdf = Pdf::loadView('pdf.student_reminder_letter', $data)->setPaper('a4', 'portrait');

        return $pdf->stream("{$currentTime}.pdf");
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
