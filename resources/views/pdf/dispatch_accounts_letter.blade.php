@php
    $currentTime = $currentTime ?? ($arraySpace ?? time());
    $students = $students ?? collect();
    $academic_year = $academic_year ?? (count($students) ? ($students->first()->admission_taken_year ?? '') : '');
    $firstRow = $firstRow ?? ['to_name' => 'The Secretary', 'university_name' => '', 'address' => '', 'in_favour_of' => ''];
    $fees = $fees ?? 0;
    $totalFees = $totalFees ?? ($ddAmount ?? ($fees * count($students)));
    $ddAmountWords = $ddAmountWords ?? '';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Dispatch Accounts Copy</title>
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
            font-size: 8.5pt;
        }
        .cand-table th, .cand-table td {
            border: 1px solid #000;
            padding: 2.5px 4px;
            font-size: 8.5pt;
            vertical-align: middle;
        }
        .cand-table th {
            font-weight: bold;
            text-align: center;
            line-height: 1.15;
        }
        .cand-table td {
            line-height: 1.15;
        }
        .closing-block {
            margin-top: 6px;
            font-size: 8.5pt;
        }
        .sig-table {
            width: 100%;
            margin-top: 10px;
            font-size: 8.5pt;
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
        <b>{{ $firstRow['to_name'] }}</b><br>
        @if(!empty($firstRow['university_name']))
            {{ $firstRow['university_name'] }}<br>
        @endif
        {!! nl2br(e($firstRow['address'])) !!}
    </div>

    <div class="subject-block">
        @if(!empty($subject))
            <b>Sub - :</b> {!! $subject !!}
        @else
            <b>Sub - :</b> Verification of Document/s for the academic year <b>{{ $academic_year }}.</b>
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
            University of Mumbai has decided to verify the document/s of the student/s who have taken admission in our <b>Institue of Distance and Open Learning,</b> University of Mumbai, on the basis of earlier qualification.
        </div>
        <div class="para">
            The following student/s has /have taken admission in the University of Mumbai as the/their details mentioned below. I am enclosing here with xerox copy/copies of the marksheet/s for your ready reference.
        </div>
    @endif

    <table class="cand-table">
        <thead>
            <tr>
                <th style="width: 25px;"><b><br/>No</b></th>
                <th style="width: 180px;"><b><br/>Name of Students</b></th>
                <th style="width: 100px;"><b>Eligibility<br/>Case<br/>No.</b></th>
                <th style="width: 90px;"><b>Admission<br/>takenin<br/>IDOL</b></th>
                <th style="width: 95px;"><b>Verification of<br/>marksheet to be<br/>done by you.</b></th>
            </tr>
        </thead>
        <tbody>
            @foreach ($students as $idx => $s)
                @php
                    $displayName = (!empty($s->student_nee_name) && $s->student_nee_name !== '-' && strpos($s->student_nee_name, '-') === false) ? $s->student_nee_name : $s->student_name;
                @endphp
                <tr>
                    <td align="center" style="width: 25px;">{{ $idx + 1 }}</td>
                    <td style="width: 180px;">{{ $displayName }}</td>
                    <td align="center" style="width: 100px;">{{ $s->eligibility_case_no }}</td>
                    <td align="center" style="width: 90px;">{{ $s->admission_taken_in }}</td>
                    <td align="center" style="width: 95px;">{{ $s->verification_of_marksheet_done_by_you }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="closing-block">
        @php
            $rawClosing = trim($closing ?? '');
            $closingLines = $rawClosing !== '' ? preg_split('/(?:<br\s*\/?>\s*|\r\n|\n)+/i', $rawClosing) : [];
        @endphp
        @if(!empty($closingLines))
            @foreach($closingLines as $ci => $line)
                @php $cleanLine = preg_replace('/^(?:&nbsp;|\s)+/i', '', trim($line)); @endphp
                @if($cleanLine !== '')
                    <div class="para" style="margin-bottom: 2px;">
                        {!! $cleanLine !!}
                        @if($ci === 0 && !empty($fees) && $fees > 0 && !str_contains($cleanLine, 'D.D.'))
                            I am also enclosing herewith a <b>D.D.</b> of <b>Rs. {{ ($fees * count($students)) }} /-</b> @ <b>Rs. {{ $fees }} /-</b> per document for the said purpose.
                        @endif
                    </div>
                @endif
            @endforeach
        @else
            <div class="para" style="margin-bottom: 2px;">
                You are requestd to kindly verify the/their marksheet/s and confirm the validity of the same.
                @if(!empty($fees) && $fees > 0)
                    I am also enclosing herewith a <b>D.D.</b> of <b>Rs. {{ ($fees * count($students)) }} /-</b> @ <b>Rs. {{ $fees }} /-</b> per document for the said purpose.
                @endif
            </div>
            <div class="para" style="margin-bottom: 2px;">
                I shall be grateful if you treat this matter as most urgent.
            </div>
            <div class="para" style="margin-bottom: 2px;">
                Kindly mentioned the reference number and date of this letter in your further communication.
            </div>
            <div class="para" style="margin-bottom: 2px;">
                Thanking you.
            </div>
        @endif
    </div>

    <table class="sig-table">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
                <div style="font-size: 9.5pt;">Your faithfully,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
                @for ($i = 0; $i < (int)($instituteSignatureSpaceLines ?? 3); $i++)
                    <br/>
                @endfor
                <div style="font-size: 9.5pt; font-weight: bold;">
                    Off. Superintdent<br/>(Eligib/Sch)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
            </td>
        </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #000; margin-top: 10px; margin-bottom: 6px;"/>

    <table style="width: 100%; font-size: 8.5pt; font-weight: bold; margin-bottom: 6px;">
        <tr>
            <td style="text-align: left;">
                <b>No. IDOL/Eligib/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/{{ $currentTime }}</b>
            </td>
            <td style="text-align: right;">
                <b>Dated:-&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</b>
            </td>
        </tr>
    </table>

    @if(!empty($fees) && $fees > 0)
        <div style="font-size: 8.5pt; line-height: 1.35; margin-top: 4px; margin-bottom: 6px;">
            Copy forwarded to the Assistant Registrar (F & A) IDOL for information. He/She is requested to issue<br/>
            <b>D.D. of Rs. {{ $totalFees }} ( {{ $ddAmountWords }} Only. ) In Favour of {{ $firstRow['in_favour_of'] }}</b>
        </div>
    @endif

    <table class="sig-table" style="margin-top: 10px;">
        <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
                @for ($i = 0; $i < (int)($instituteSignatureSpaceLines ?? 3); $i++)
                    <br/>
                @endfor
                <div style="font-size: 9.5pt; font-weight: bold;">
                    Off. Superintdent<br/>(Eligib/Sch)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
