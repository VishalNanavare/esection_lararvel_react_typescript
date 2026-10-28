@php
    $currentTime = $currentTime ?? ($arraySpace ?? time());
    $students = $students ?? collect();
    $academic_year = $academic_year ?? (count($students) ? ($students->first()->admission_taken_year ?? '') : '');
    $firstRow = $firstRow ?? ['to_name' => 'The Secretary', 'university_name' => '', 'address' => ''];
    $fees = $fees ?? 0;
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Dispatch Letter</title>
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
            margin-top: 12px;
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
                No. CDOE/Eligib/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/{{ $currentTime }}<br>
                Date :
            </td>
        </tr>
    </table>

    <div class="address-block">
        @php
            $cleanHeadName = trim($firstRow['to_name'] ?? '');
            $displayHead = preg_replace('/^\s*To\s*,?\s*/i', '', $cleanHeadName);
            if ($displayHead === '') {
                $displayHead = $cleanHeadName ?: 'The Controller of Examinations';
            }
        @endphp
        To,<br>
        <b>{{ $displayHead }}</b><br>
        @if(!empty($firstRow['university_name']))
            <b>{{ $firstRow['university_name'] }}</b><br>
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
            University of Mumbai has decided to verify the document/s of the student/s who have taken admission in our <b>Center for Distance and Online Education (CDOE),</b> University of Mumbai, on the basis of earlier qualification.
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
                <th style="width: 90px;"><b>Admission<br/>takenin<br/>CDOE</b></th>
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
            <td style="width: 50%; vertical-align: bottom;">
                <b>Encl.:</b>
            </td>
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
