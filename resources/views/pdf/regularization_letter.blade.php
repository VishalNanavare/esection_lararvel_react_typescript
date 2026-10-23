<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Student Eligibility Regularization Letter</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 11pt; line-height: 1.5; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .title { font-size: 14pt; font-weight: bold; }
        .subject { font-weight: bold; text-decoration: underline; margin: 15px 0; text-align: center; }
        .ref-date-box { text-align: right; margin-bottom: 15px; line-height: 1.4; }
        .content { text-align: justify; margin: 15px 0; line-height: 1.5; }
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
        <strong>Ref No.: IDOL/REG/{{ date('Y') }}/{{ rand(100, 999) }}</strong><br>
        <strong>Date:</strong> {{ $date ?? date('d/m/Y') }}
    </div>

    <div style="margin-top: 15px;">
        To,<br>
        @if (!empty($record->admission_letter_for) && (str_contains($record->admission_letter_for, 'Registrar') || str_contains($record->admission_letter_for, 'Principal') || str_contains($record->admission_letter_for, 'Controller') || str_contains($record->admission_letter_for, 'Director')))
            <strong>{{ $record->admission_letter_for }}</strong>,<br>
            @if (!empty($record->university_name))
                {!! nl2br(e($record->university_name)) !!}
            @endif
        @elseif (!empty($record->university_name))
            <strong>The Controller of Examinations</strong>,<br>
            {!! nl2br(e($record->university_name)) !!}
        @else
            <strong>The Assistant Registrar</strong>,<br>
            (Administration),<br>
            IDOL, University of Mumbai,<br>
            Vidyanagari, Santacruz (E), Mumbai - 400 098.
        @endif
    </div>

    <div class="subject">
        Subject: {!! $subject ?? 'Eligibility Regularization of student admitted to IDOL' !!}
    </div>

    @if (!empty($record->admission_letter_for) && (!isset($body) || (!str_contains($body, 'With reference') && !str_contains($body, 'with reference'))))
        <div>
            With reference to your letter No. <strong>{{ $record->admission_letter_for }}</strong>
            @if (!empty($record->admission_letter_date))
                , Date - <strong>{{ \Carbon\Carbon::parse($record->admission_letter_date)->format('d/m/Y') }}</strong>
            @endif
            .
        </div>
    @endif

    <div class="content">
        {!! $body ?? "This is to inform that candidate <strong>{$record->student_name}</strong> bearing Case No. <strong>{$record->eligibility_case_no}</strong> has completed the required admission formalities for the academic program <strong>{$record->admission_taken_in}</strong> (Year {$record->admission_taken_year}). Hence, their provisional admission is regularized." !!}
    </div>

    <div class="content">
        {!! $closing ?? 'Thanking you.' !!}
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
