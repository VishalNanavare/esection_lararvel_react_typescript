@php
    $currentTime = $currentTime ?? ($batch->pdf_time ?? time());
    $headName = $headName ?? ($batch->head_name ?? 'The Secretary');
    $universityName = $universityName ?? ($batch->university_name ?? '');
    $address = $address ?? '';
    $students = $students ?? collect();
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>University Reminder Letter</title>
    <style>
        @page {
            margin: 48mm 15mm 15mm 15mm;
        }
        header {
            position: fixed;
            top: -44mm;
            left: 0mm;
            right: 0mm;
            height: 40mm;
            text-align: center;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 8.5pt;
            line-height: 1.25;
            color: #000;
            margin: 0;
            padding: 0;
        }
        table {
            border-collapse: collapse;
        }
        .ref-table {
            width: 100%;
            font-size: 8.5pt;
            margin-bottom: 6px;
        }
        .address-block {
            font-size: 8.5pt;
            line-height: 1.3;
            margin-bottom: 6px;
        }
        .subject-block {
            text-align: center;
            font-size: 8.5pt;
            margin-top: 4px;
            margin-bottom: 6px;
        }
        .salutation {
            font-size: 8.5pt;
            margin-bottom: 4px;
        }
        .para {
            text-indent: 30px;
            text-align: justify;
            margin-bottom: 4px;
            line-height: 1.25;
            font-size: 8.5pt;
        }
        .cand-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 6px;
            font-size: 8pt;
        }
        .cand-table th, .cand-table td {
            border: 1px solid #000;
            padding: 2.5px 4px;
            font-size: 7.5pt;
            vertical-align: middle;
        }
        .cand-table th {
            font-weight: bold;
            text-align: center;
            line-height: 1.15;
        }
        .cand-table td {
            line-height: 1.15;
            font-weight: bold;
        }
        .sig-table {
            width: 100%;
            margin-top: 15px;
            font-size: 8.5pt;
        }
    </style>
</head>
<body>

    <header>
        @php
            $headerImg = (!empty($instituteLetterheadPath) && file_exists($instituteLetterheadPath))
                ? $instituteLetterheadPath
                : (file_exists(public_path('img/esection_header.jpg')) ? public_path('img/esection_header.jpg') : null);
        @endphp
        @if($headerImg)
            <img src="{{ $headerImg }}" style="width: 100%; height: auto;">
        @endif
    </header>

    <table class="ref-table">
        <tr>
            <td style="width: 48%;"></td>
            <td style="width: 52%; text-align: left; white-space: nowrap;">
                <b style="font-size: 13pt;">Reminder Letter</b><br>
                No. CDOE/Eligib/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/{{ $currentTime }}<br>
                Date :
            </td>
        </tr>
    </table>

    <div class="address-block">
        @php
            $cleanHeadName = trim($headName ?? '');
            $displayHead = preg_replace('/^\s*To\s*,?\s*/i', '', $cleanHeadName);
            if ($displayHead === '') {
                $displayHead = $cleanHeadName ?: 'The Controller of Examinations';
            }
        @endphp
        To,<br>
        <b>{{ $displayHead }}<br>{{ $universityName }}</b><br>
        {!! nl2br(e($address)) !!}
    </div>

    <div class="subject-block">
        @if(!empty($subject))
            <b>Subject - </b> {!! $subject !!}
        @else
            <b>Subject - </b> Verification of Documents for the <b>{{ $batch->admission_taken_in ?? '' }}</b> Course of Academic Year <b>{{ $batch->academic_year ?? '' }}</b>.
        @endif
    </div>

    <div class="salutation">
        <b>Sir/Madam,</b>
    </div>

    @if(!empty($body))
        @php
            $rawBody = trim($body ?? '');
            $bodyParagraphs = $rawBody !== '' ? preg_split('/(?:<br\s*\/?>\s*){2,}|\r\n\r\n|\n\n/i', $rawBody) : [];
        @endphp
        @if(!empty($bodyParagraphs))
            @foreach($bodyParagraphs as $bp)
                @php $cleanBp = preg_replace('/^(?:&nbsp;|\s)+/i', '', trim($bp)); @endphp
                @if($cleanBp !== '')
                    <div class="para">
                        {!! $cleanBp !!}
                    </div>
                @endif
            @endforeach
        @else
            <div class="para">
                {!! $body !!}
            </div>
        @endif
    @else
        <div class="para">
            The following students has/have taken admission in IDOL, University of Mumbai  from other Universities. As per the rule If the student from other than University of Mumbai takes admission in IDOL, the documents of the students is sent to the repective University for verification and accordingly the documents of the candidate are sent to you, the details are mentioned below.
        </div>
        <div class="para">
            We here by want to inform you that still the report of the student is not provided from your University. So Kindly take this as a reminder and verify their marksheets and confirm the validity of the same.
        </div>
        <div class="para">
            Kindly treat this matter as most urgent.
        </div>
    @endif

    <table class="cand-table">
        <thead>
            <tr>
                <th align="center" style="width: 20px;"><b>No</b></th>
                <th align="center" style="width: 130px;"><b>Name of Students</b></th>
                <th align="center" style="width: 80px;"><b>Eligibility Case No.</b></th>
                <th align="center" style="width: 50px;"><b>Verification of Marksheet</b></th>
                <th align="center" style="width: 210px;"><b>Letter no and Date Submitted By IDOL</b></th>
            </tr>
        </thead>
        <tbody>
            @foreach ($students as $index => $s)
                @php
                    $sname = (!empty($s->student_nee_name) && $s->student_nee_name !== '-') ? $s->student_nee_name : ($s->student_name ?? '');
                @endphp
                <tr>
                    <td align="center" style="width: 20px;">{{ $index + 1 }}</td>
                    <td style="width: 130px;">{{ $sname }}</td>
                    <td align="center" style="width: 80px;">{{ $s->eligibility_case_no ?? '' }}</td>
                    <td align="center" style="width: 50px;">{{ $s->verification_of_marksheet_done_by_you ?? '' }}</td>
                    <td style="width: 210px;">
                        @if (!empty($s->notes) && count($s->notes) > 0)
                            @foreach ($s->notes as $ni => $note)
                                @if ($ni > 0)<hr style="margin: 3px 0; border: none; border-top: 1px solid #000;"/>@endif
                                {{ $note->note_text }}<br>Date : {{ !empty($note->note_date) ? \Carbon\Carbon::parse($note->note_date)->format('d/m/Y') : '' }}
                            @endforeach
                        @else
                            {{ $s->verification_of_marksheet_done_by_you ?? '' }}
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if(!empty($closing))
        @php
            $rawClosing = trim($closing ?? '');
            $closingLines = $rawClosing !== '' ? preg_split('/(?:<br\s*\/?>\s*|\r\n|\n)+/i', $rawClosing) : [];
        @endphp
        @foreach($closingLines as $line)
            @php $cleanLine = preg_replace('/^(?:&nbsp;|\s)+/i', '', trim($line)); @endphp
            @if($cleanLine !== '')
                <div class="para" style="margin-bottom: 2px;">
                    {!! $cleanLine !!}
                </div>
            @endif
        @endforeach
    @endif

    <table class="sig-table">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; vertical-align: top;">
                <table align="right" style="border-collapse: collapse; text-align: center; margin-left: auto;">
                    <tr>
                        <td style="text-align: center; font-size: 9.5pt;">
                            Your faithfully,
                        </td>
                    </tr>
                    @for ($i = 0; $i < (int)($instituteSignatureSpaceLines ?? 3); $i++)
                        <tr><td style="height: 14px;"></td></tr>
                    @endfor
                    <tr>
                        <td style="text-align: center; font-size: 9.5pt; font-weight: bold;">
                            @if(!empty($instituteSignatoryName))
                                {{ $instituteSignatoryName }}<br/>
                            @endif
                            {!! !empty($instituteSignatoryDesignation) ? nl2br(e($instituteSignatoryDesignation)) : 'Deputy Registrar / Assistant Registrar' !!}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

</body>
</html>
