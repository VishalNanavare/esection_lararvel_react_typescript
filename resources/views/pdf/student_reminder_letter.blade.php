<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Candidate Document Reminder Letter</title>
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
        <strong>Ref. No.:</strong> IDOL/Eligibility/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/STUD-REM/{{ date('Y') }}/{{ $record->eligibility_case_no ?? $record->id }}<br>
        <strong>Date :</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    </div>

    <div class="address-box" style="margin-top: 15px; margin-bottom: 15px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: normal; line-height: 1.4;">
        <strong>To,</strong><br>
        <strong>{{ $record->student_name }}</strong>,<br>
        @if (!empty($record->address))
            <div style="word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: normal;">
                {!! nl2br(e($record->address)) !!}
            </div>
        @endif
        Admission Taken in IDOL: <strong>{{ $record->course_name ?: 'N/A' }}</strong><br>
        Eligibility Case No.: <strong>{{ $record->eligibility_case_no }}</strong>
    </div>

    <div class="subject">
        Subject: {!! $subject ?? 'Reminder for submission of pending eligibility verification documents' !!}
    </div>

    <div class="content">
        {!! $body ?? "You have taken provisional admission in IDOL, University of Mumbai. It is observed from your eligibility record that the following document(s) are still pending from your end: <br><br><strong>Pending Document(s): {$record->missing_doc}</strong><br><br>You are hereby instructed to submit the aforementioned original document(s) along with attested copies to IDOL Eligibility Section within 15 days, failing which your provisional admission will be cancelled." !!}
    </div>

    <div class="content">
        {!! $closing ?? 'Please treat this as urgent.' !!}
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
