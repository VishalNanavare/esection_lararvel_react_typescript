<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Student Eligibility Regularization Letter</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; font-size: 11pt; line-height: 1.5; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .title { font-size: 14pt; font-weight: bold; }
        .subject { font-weight: bold; text-decoration: underline; margin: 15px 0; }
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

    <div>
        <strong>Ref No.: IDOL/REG/{{ date('Y') }}/{{ rand(100, 999) }}</strong>
        <span style="float: right;">Date: {{ $date ?? date('d/m/Y') }}</span>
    </div>

    <div style="margin-top: 15px;">
        To,<br>
        <strong>{{ $record->admission_letter_for ?: 'The Controller of Examinations' }}</strong>,<br>
        {{ $record->university_name }}
    </div>

    <div class="subject">
        Subject: {{ $subject ?? 'Eligibility Regularization of student admitted to IDOL' }}
    </div>

    @if (!empty($record->admission_letter_for))
        <div>
            With reference to your letter No. <strong>{{ $record->admission_letter_for }}</strong>
            @if (!empty($record->admission_letter_date))
                , Date - <strong>{{ \Carbon\Carbon::parse($record->admission_letter_date)->format('d/m/Y') }}</strong>
            @endif
            .
        </div>
    @endif

    <div style="margin-top: 10px;">
        {!! $body ?? "This is to inform that candidate <strong>{$record->student_name}</strong> bearing Case No. <strong>{$record->eligibility_case_no}</strong> has completed the required admission formalities for the academic program <strong>{$record->admission_taken_in}</strong> (Year {$record->admission_taken_year}). Hence, their provisional admission is regularized." !!}
    </div>

    <div style="margin-top: 15px;">
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
