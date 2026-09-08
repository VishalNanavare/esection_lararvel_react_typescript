<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Confirmation of Eligibility Letter</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10.5pt; line-height: 1.5; color: #000; margin: 0; padding: 20px; }
        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; }
        .subtitle { font-size: 10pt; text-align: center; }
        .letter-no { float: left; font-weight: bold; }
        .date { float: right; font-weight: bold; }
        .clear { clear: both; }
        .address-box { margin-top: 15px; margin-bottom: 15px; }
        .subject { font-weight: bold; margin-top: 15px; margin-bottom: 15px; text-decoration: underline; }
        .content { text-align: justify; margin-bottom: 15px; }
        .student-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
        .student-table th, .student-table td { border: 1px solid #000; padding: 5px 6px; font-size: 8pt; text-align: left; }
        .student-table th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
        .footer-sig { margin-top: 40px; float: right; text-align: center; width: 250px; }
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
        <strong>Assistant Registrar,</strong><br>
        Administration/I.T. Section,<br>
        {{ $instituteName ?? 'Institute of Distance and Open Learning (IDOL)' }}<br>
        {{ $instituteUniversityTitle ?? 'University of Mumbai' }},<br>
        {!! nl2br(e($instituteAddress ?? 'Vidyanagari, Santacruz (East), Mumbai - 400 098.')) !!}
    </div>

    <div class="subject">
        Subject: {{ $subject ?? 'Eligibility confirmation reports of students admitted to IDOL' }}
    </div>

    <div class="content">
        {!! $body ?? 'With reference to the subject cited above, the documents of the candidate(s) listed below have been verified by the concerned universities / boards and found eligible as per University of Mumbai norms.' !!}
    </div>

    <table class="student-table">
        <thead>
            <tr>
                <th style="width: 20px;">No</th>
                <th>Name of Students</th>
                <th>Eligibility Case No.</th>
                <th>University / Institute</th>
                <th>Mig / TC</th>
                <th>Statement of Marks</th>
                <th>Passing / Degree</th>
                <th>Verified by concerned Board/Univ vide letter No., Dated</th>
                <th>Remark</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($records as $index => $r)
                <tr>
                    <td style="text-align: center;">{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $r->student_name }}</strong>
                        @if (!empty($r->student_nee_name) && $r->student_nee_name !== '-')
                            <br><small>( Nee name : {{ $r->student_nee_name }} )</small>
                        @endif
                    </td>
                    <td>{{ $r->case_no }}</td>
                    <td>{!! nl2br(e($r->clg_add ?: ($r->uni_add ?: ''))) !!}</td>
                    <td style="text-align: center;">{{ $r->mig_TC ?: '-' }}</td>
                    <td style="text-align: center;">{{ $r->s_marks ?: '-' }}</td>
                    <td style="text-align: center;">{{ $r->p_degree ?: '-' }}</td>
                    <td>{{ $r->letter_no_date ?: '-' }}</td>
                    <td>
                        {{ $r->remark ?: '-' }}
                        @if (!empty($r->conf_from))
                            <br><small>{{ $r->conf_from === 'other' ? $r->conf_from_text : $r->conf_from }}
                            @if (!empty($r->conf_from_select)) &amp; {{ $r->conf_from_select }} @endif
                            </small>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="content">
        {!! $closing ?? 'Hence, their provisional eligibility may be regularized in the records.' !!}
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

</body>
</html>
