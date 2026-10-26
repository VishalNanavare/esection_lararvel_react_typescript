<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Admission Regularization Letter</title>
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
            font-size: 10pt;
            line-height: 1.5;
            color: #000;
            margin: 0;
            padding: 0;
        }
        table {
            border-collapse: collapse;
        }
        .ref-table {
            width: 100%;
            font-size: 10pt;
            margin-bottom: 12px;
        }
        .address-block {
            font-size: 10pt;
            line-height: 1.4;
            margin-bottom: 12px;
        }
        .subject-block {
            text-align: center;
            font-size: 10pt;
            margin-top: 10px;
            margin-bottom: 14px;
        }
        .para {
            text-indent: 40px;
            text-align: justify;
            margin-bottom: 10px;
            line-height: 1.5;
            font-size: 10pt;
        }
        .sig-table {
            width: 100%;
            margin-top: 30px;
            font-size: 10pt;
        }
    </style>
</head>
<body>

    <header>
        <img src="{{ public_path('img/esection_header.jpg') }}" style="width: 100%; height: auto;">
    </header>

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
        The Assistant Registrar,<br>
        (Administration),<br>
        IDOL,<br>
        University of Mumbai,<br>
        Vidyanagri, Santacruz(E),<br>
        Mumbai - 400 098.
    </div>

    <div class="subject-block">
        <b>Sub - :</b> Admission Regulariztion of <b>{{ $record->admission_taken_in }}</b> course for the academic year <b>{{ $record->admission_taken_year }}.</b>
    </div>

    <div class="para">
        With reference to your letter No. <b>{{ $record->admission_letter_for }}</b>, Date - <b>{{ $admDate }}</b>.
    </div>

    <div class="para">
        I am to inform you that since <b>{{ $record->gender }} {{ $record->student_name }}</b> submitted the Migration Certificate of <b>{{ $universityName }}@if(!empty($states)), {{ $states }}@endif</b> which {{ $genCh1 }} had migrated after passing <b>{{ $record->passing_course }}</b> course from University of Mumbai, {{ $genCh2 }} admission for <b>{{ $record->admission_taken_in }}</b> course for the academic year <b>{{ $record->admission_taken_year }}</b> in IDOL is hereby <b style="font-style: italic;">regularized accordingly</b>.
    </div>

    <table class="sig-table">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
                <div style="font-size: 10pt; font-weight: bold;">
                    Off. Superintdent<br/>(Eligib/Sch)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
