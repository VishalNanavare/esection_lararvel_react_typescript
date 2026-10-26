<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Candidate Document Reminder Letter</title>
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
            font-size: 9pt;
            line-height: 1.35;
            color: #000;
            margin: 0;
            padding: 0;
        }
        table {
            border-collapse: collapse;
        }
        .ref-table {
            width: 100%;
            font-size: 9pt;
            margin-bottom: 6px;
        }
        .address-block {
            font-size: 9pt;
            line-height: 1.35;
            margin-bottom: 6px;
        }
        .subject-block {
            text-align: center;
            font-size: 9pt;
            margin-top: 6px;
            margin-bottom: 8px;
        }
        .salutation {
            font-size: 9pt;
            margin-bottom: 4px;
        }
        .para {
            text-indent: 30px;
            text-align: justify;
            margin-bottom: 6px;
            line-height: 1.35;
            font-size: 9pt;
        }
        ul.missing-docs {
            font-weight: bold;
            font-size: 9pt;
            margin-top: 4px;
            margin-bottom: 6px;
            padding-left: 25px;
        }
        ul.missing-docs li {
            margin-bottom: 4px;
        }
        .sig-table {
            width: 100%;
            margin-top: 20px;
            font-size: 9pt;
        }
    </style>
</head>
<body>

    <header>
        <img src="{{ public_path('img/esection_header.jpg') }}" style="width: 100%; height: auto;">
    </header>

    <div style="text-align: center; margin-bottom: 4px;">
        <b style="font-size: 14pt;">Most Urgent</b>
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
        {{ $record->student_name }}<br>
        @if(!empty($record->address))
            {!! nl2br(e($record->address)) !!}<br>
        @endif
    </div>

    <div class="subject-block">
        <b>Ref. : </b> Admission to <b>{{ $student->admission_taken_in ?? ($record->course_name ?? '') }}</b> course for the academic year <b>{{ $student->admission_taken_year ?? '' }}</b>.
    </div>

    <div class="salutation">
        <b>Sir/Madam,</b>
    </div>

    <div class="para">
        With reference to your application for admission to the <b>{{ $student->admission_taken_in ?? ($record->course_name ?? '') }}</b> course, I am to request you to see the undersigned immediately (within a week) during the office hours at Room No.108-A (Eligibility/Scholarship Section) in connection with your admission in this Institute  is pending due to.
    </div>

    <ul class="missing-docs">
        <li>Required Original Migration</li>
        <li>Required SSC onwards documents(all attempts marksheets, Passing/Degree certificate)</li>
        <li>Marriage/ Gazette certificate (if name change).</li>
        <li>Required original T.C and Eligibility Confirmation letter (for T.C+ Eligibility Students)</li>
        <li>Required Previous Eligibility Confirmation letter (for Old + Eligibility Students)</li>
    </ul>

    <div class="para">
        If you fail to comply with the above mentioned requirement your admission will be treated as cancelled or your result of the aforesaid course will not be declared which may please be noted. Also please note that your admission in this Institute is still provisional.
    </div>

    <div class="para">
        Kindly treat this matter as most urgent.
    </div>

    <div class="para">
        Your co-operation in this matter will be appreciated.
    </div>

    <table class="sig-table">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
                <div style="font-size: 9.5pt; font-weight: bold;">
                    Off. Superintdent<br/>(Eligib/Sch)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
