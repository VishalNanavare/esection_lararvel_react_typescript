<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Eligibility Verification Dispatch Letter (Accounts Copy)</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 20px;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 14pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
        }
        .subtitle {
            font-size: 10pt;
            text-align: center;
        }
        .letter-no {
            float: left;
            font-weight: bold;
        }
        .date {
            float: right;
            font-weight: bold;
        }
        .clear {
            clear: both;
        }
        .address-box {
            margin-top: 15px;
            margin-bottom: 15px;
        }
        .subject {
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 15px;
            text-decoration: underline;
        }
        .content {
            text-align: justify;
            margin-bottom: 15px;
        }
        .student-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 20px;
        }
        .student-table th, .student-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 10pt;
            text-align: left;
        }
        .student-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .footer-sig {
            margin-top: 40px;
            float: right;
            text-align: center;
            width: 250px;
        }
        .accounts-note {
            margin-top: 40px;
            border-top: 1px dashed #000;
            padding-top: 15px;
        }
    </style>
</head>
<body>

    @if (!empty($instituteLogoPath) && empty($instituteLetterheadPath) && file_exists($instituteLogoPath))
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="{{ $instituteLogoPath }}" style="max-height: 60px;">
        </div>
    @endif
    <table class="header-table">
        @if (!empty($instituteLetterheadPath) && file_exists($instituteLetterheadPath))
            <tr>
                <td style="text-align: center; padding: 0;">
                    <img src="{{ $instituteLetterheadPath }}" style="width: 100%; max-width: 100%; height: auto; display: block;">
                </td>
            </tr>
        @else
            <tr>
                <td class="title">{{ $instituteUniversityTitle ?? 'UNIVERSITY OF MUMBAI' }}</td>
            </tr>
            <tr>
                <td class="subtitle">{{ $instituteName ?? 'INSTITUTE OF DISTANCE AND OPEN LEARNING (IDOL)' }}</td>
            </tr>
            <tr>
                <td class="subtitle">{!! nl2br(e($instituteAddress ?? 'Dr. Shankar Dayal Sharma Bhavan, Vidyanagari, Santacruz (E), Mumbai - 400 098.')) !!}</td>
            </tr>
        @endif
    </table>

    <div>
        <span class="letter-no">Ref. No. IDOL/Eligibility/{{ $arraySpace }}</span>
        <span class="date">Date: {{ $date ?? date('d/m/Y') }}</span>
        <div class="clear"></div>
    </div>

    <div class="address-box">
        <strong>To,</strong><br>
        {{ $firstRow['to_name'] ?? 'The Controller of Examinations' }},<br>
        {!! nl2br(e($firstRow['clg_add'] ?? '')) !!}
    </div>

    <div class="subject">
        Subject: {{ $subject ?? 'Verification of Statement of Marks / Passing Certificates of students admitted in IDOL' }}
    </div>

    <div class="content">
        {!! $body ?? 'With reference to the subject cited above, the following candidate(s) have been admitted to the program mentioned below. Kindly verify and confirm the authenticity of their educational documents issued by your institution.' !!}
    </div>

    <table class="student-table">
        <thead>
            <tr>
                <th style="width: 30px;">Sr.</th>
                <th>Candidate Full Name</th>
                <th>Eligibility Case No.</th>
                <th>Admission Taken In IDOL</th>
                <th>Verification Done By You</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($students as $index => $s)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td><strong>{{ $s->student_nee_name && $s->student_nee_name !== '-' ? $s->student_nee_name : $s->student_name }}</strong></td>
                    <td>{{ $s->eligibility_case_no }}</td>
                    <td>{{ $s->admission_taken_in }}</td>
                    <td>{{ $s->verification_of_marksheet_done_by_you ?: 'Marksheet Verification' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="content">
        {!! $closing ?? 'The verification report may kindly be sent to this office at an early date.' !!}
        @if (!empty($ddAmount))
            <br>I am also enclosing herewith a <strong>D.D.</strong> of <strong>Rs. {{ number_format($ddAmount, 2) }} /-</strong> @ <strong>Rs. {{ number_format($fees, 2) }} /-</strong> per document for the said purpose.
        @endif
    </div>

    <div class="footer-sig">
        <br><br>
        <strong>Yours faithfully,</strong><br><br><br>
        @if (!empty($instituteSignatoryName))
            <strong>{{ $instituteSignatoryName }}</strong><br>
        @endif
        <strong>{{ $instituteSignatoryDesignation ?? 'Deputy Registrar / Assistant Registrar' }}</strong><br>
        {{ $footerDepartment ?? 'IDOL Eligibility Section' }}
    </div>

    @if (!empty($ddAmount))
        <div class="accounts-note" style="clear: both;">
            Copy forwarded to the Assistant Registrar (F &amp; A) IDOL for information. He/She is requested to issue
            <strong>D.D. of Rs. {{ number_format($ddAmount, 2) }} ( {{ $ddAmountWords ?? '' }} ) In Favour of {{ $firstRow['in_favour_of'] ?? '' }}</strong>

            <div class="footer-sig">
                <br><br>
                @if (!empty($instituteSignatoryName))
                    <strong>{{ $instituteSignatoryName }}</strong><br>
                @endif
                <strong>{{ $instituteSignatoryDesignation ?? 'Deputy Registrar / Assistant Registrar' }}</strong><br>
                {{ $footerDepartment ?? 'IDOL Eligibility Section' }}
            </div>
        </div>
    @endif

</body>
</html>
