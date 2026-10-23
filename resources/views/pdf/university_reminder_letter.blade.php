<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>University Verification Reminder Letter</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 11pt; line-height: 1.5; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .title { font-size: 14pt; font-weight: bold; }
        .subject { font-weight: bold; text-decoration: underline; margin: 15px 0; text-align: center; }
        .ref-date-box { text-align: right; margin-bottom: 15px; line-height: 1.4; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { border: 1px solid #000; padding: 6px 8px; font-size: 10pt; text-align: left; }
        .table th { background: #f2f2f2; }
        .footer { margin-top: 50px; float: right; text-align: center; width: 250px; }
    </style>
</head>
<body>
    @if (!empty($instituteLogoPath) && empty($instituteLetterheadPath) && file_exists($instituteLogoPath))
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="{{ $instituteLogoPath }}" style="max-height: 60px;">
        </div>
    @endif
    @if (!empty($instituteLetterheadPath) && file_exists($instituteLetterheadPath))
        <div style="text-align: center; margin-bottom: 15px;">
            <img src="{{ $instituteLetterheadPath }}" style="width: 100%; max-width: 100%; height: auto; display: block;">
        </div>
    @else
        <div class="header">
            <div class="title">{{ $instituteUniversityTitle ?? 'UNIVERSITY OF MUMBAI' }}</div>
            <div>{{ $instituteName ?? 'INSTITUTE OF DISTANCE AND OPEN LEARNING (IDOL)' }}</div>
            <div>{!! nl2br(e($instituteAddress ?? 'Vidyanagari, Santacruz (E), Mumbai - 400 098.')) !!}</div>
        </div>
    @endif

    <div class="ref-date-box">
        <strong>Ref No.: IDOL/REM/{{ date('Y') }}/{{ rand(1000, 9999) }}</strong><br>
        <strong>Date:</strong> {{ $date ?? date('d/m/Y') }}
    </div>

    <div style="margin-top: 15px;">
        To,<br>
        <strong>{{ ($batch->head_name ?? null) ?: 'The Controller of Examinations' }}</strong>,<br>
        {!! nl2br(e($batch->university_name ?? '')) !!}
    </div>

    <div class="subject">
        Subject: {!! $subject ?? ("REMINDER: Verification of Marksheet / Passing Certificate (" . ($batch->admission_taken_in ?? 'All Programs') . ")") !!}
    </div>

    <div>
        {!! $body ?? "With reference to this office earlier communication, the verification report of the following student(s) is still awaited from your institution. Kindly expedite the verification and send the report to this office at an early date." !!}
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 25px;">#</th>
                <th>Candidate Full Name</th>
                <th style="width: 110px;">Eligibility Case No.</th>
                <th>Course / Program</th>
                <th style="width: 75px;">Academic Year</th>
                <th style="width: 110px;">Reminder History</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($students as $index => $s)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $s->student_name ?? '-' }}</strong>
                        @if (!empty($s->student_nee_name) && $s->student_nee_name !== '-')
                            <br><small style="color: #555;">(Nee: {{ $s->student_nee_name }})</small>
                        @endif
                    </td>
                    <td>{{ $s->eligibility_case_no ?? '-' }}</td>
                    <td>{{ $s->admission_taken_in ?? '-' }}</td>
                    <td>{{ $s->admission_taken_year ?? '-' }}</td>
                    <td>
                        @if (!empty($s->notes) && count($s->notes) > 0)
                            @foreach ($s->notes as $ni => $note)
                                @if ($ni > 0)<hr style="margin: 4px 0;">@endif
                                <strong>{{ $note->note_text }}</strong><br>
                                <small>Date: {{ !empty($note->note_date) ? \Carbon\Carbon::parse($note->note_date)->format('d/m/Y') : '-' }}</small>
                            @endforeach
                        @else
                            {{ $s->verification_of_marksheet_done_by_you ?: 'Marksheet Verification' }}
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div>
        {!! $closing ?? 'Thanking you in anticipation.' !!}
    </div>

    <div class="footer">
        <br><br>
        <strong>Yours faithfully,</strong><br><br><br>
        @if (!empty($instituteSignatoryName))
            <strong>{{ $instituteSignatoryName }}</strong><br>
        @endif
        <strong>{{ $instituteSignatoryDesignation ?? 'Deputy Registrar / Assistant Registrar' }}</strong><br>
        {{ $footerDepartment ?? 'IDOL Eligibility Section' }}
    </div>
</body>
</html>
