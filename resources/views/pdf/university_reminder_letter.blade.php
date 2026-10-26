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
        <img src="{{ public_path('img/esection_header.jpg') }}" style="width: 100%; height: auto;">
    </header>

    <div style="text-align: center; margin-bottom: 4px;">
        <b style="font-size: 14pt;">Reminder Letter</b>
    </div>

    <table class="ref-table">
        <tr>
            <td style="width: 55%;"></td>
            <td style="width: 45%; text-align: left;">
                No. IDOL/Eligib/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/{{ $currentTime }}<br>
                Date :
            </td>
        </tr>
    </table>

    <div class="address-block">
        To,<br>
        <b>{{ $headName }}<br>{{ $universityName }}</b><br>
        {!! nl2br(e($address)) !!}
    </div>

    <div class="subject-block">
        <b>Subject - </b> Verification of Documents for the <b>{{ $batch->admission_taken_in ?? '' }}</b> Course of Academic Year <b>{{ $batch->academic_year ?? '' }}</b>.
    </div>

    <div class="salutation">
        <b>Sir/Madam,</b>
    </div>

    <div class="para">
        The following students has/have taken admission in IDOL, University of Mumbai  from other Universities. As per the rule If the student from other than University of Mumbai takes admission in IDOL, the documents of the students is sent to the repective University for verification and accordingly the documents of the candidate are sent to you, the details are mentioned below.
    </div>
    <div class="para">
        We here by want to inform you that still the report of the student is not provided from your University. So Kindly take this as a reminder and verify their marksheets and confirm the validity of the same.
    </div>
    <div class="para">
        Kindly treat this matter as most urgent.
    </div>

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
                    $sname = (!empty($s->student_nee_name) && $s->student_nee_name !== '-') ? $s->student_nee_name : $s->student_name;
                @endphp
                <tr>
                    <td align="center" style="width: 20px;">{{ $index + 1 }}</td>
                    <td style="width: 130px;">{{ $sname }}</td>
                    <td align="center" style="width: 80px;">{{ $s->eligibility_case_no }}</td>
                    <td align="center" style="width: 50px;">{{ $s->verification_of_marksheet_done_by_you }}</td>
                    <td style="width: 210px;">
                        @if (!empty($s->notes) && count($s->notes) > 0)
                            @foreach ($s->notes as $ni => $note)
                                @if ($ni > 0)<hr style="margin: 3px 0; border: none; border-top: 1px solid #000;"/>@endif
                                {{ $note->note_text }}<br>Date : {{ !empty($note->note_date) ? \Carbon\Carbon::parse($note->note_date)->format('d/m/Y') : '' }}
                            @endforeach
                        @else
                            {{ $s->verification_of_marksheet_done_by_you }}
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="sig-table">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
                <div style="font-size: 9.5pt;">Your faithfully,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                <div style="font-size: 9.5pt; font-weight: bold; margin-top: 8px;">
                    Off. Superintdent<br/>(Eligib/Sch)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
