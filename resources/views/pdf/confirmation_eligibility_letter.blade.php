@php
    $currentTime = $currentTime ?? ($arraySpace ?? time());
    $records = $records ?? collect();
    $count = $count ?? count($records);
    $first = $first ?? ($records->first() ?? (object)[]);
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Confirmation of Eligibility</title>
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
        .para {
            text-indent: 30px;
            text-align: justify;
            margin-bottom: 6px;
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
            padding: 2.5px 3px;
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
            <td style="width: 55%;"></td>
            <td style="width: 45%; text-align: left;">
                No. IDOL/Eligib/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/{{ $currentTime }}<br>
                Date :
            </td>
        </tr>
    </table>

    <div class="address-block">
        To,<br>
        <b>Assistant Registrar.</b><br>
        Administration/I.T. Section,<br>
        Institute of Distance and Open Learning (IDOL)<br>
        University of Mumbai,<br>
        Vidyanagari, Santacruz (East),<br>
        Mumbai - 400 098.
    </div>

    <div class="subject-block">
        @if(!empty($subject))
            <b>Sub - :</b> {!! $subject !!}
        @else
            <b>Sub - :</b> Confirmation of Eligibility For the Academic Year <b>{{ $first->acd_year ?? '' }}</b> of Course <b>{{ $first->stream ?? '' }}.</b>
        @endif
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
            With reference to your letter No. <b>__________________</b> dated <b>__________________</b>. I am to inform you that the eligibility of <b>( {{ sprintf('%02d', $count) }} )</b> {{ $count == 1 ? 'student' : 'students' }} is hereby confirmed for the admission to the program mention againts their respective names in this University / Board.
        </div>
    @endif

    <table class="cand-table">
        <thead>
            <tr>
                <th align="center" style="width: 20px;"><b>No</b></th>
                <th align="center" style="width: 80px;"><b>Name of Students</b></th>
                <th align="center" style="width: 75px;"><b>Eligibility<br/>Case<br/>No.</b></th>
                <th align="center" style="width: 65px;"><b>Name of<br/>University / Board / Institute</b></th>
                <th align="center" style="width: 30px;"><b>Mig / TC</b></th>
                <th align="center" style="width: 35px;"><b>State-<br/>ment of marks</b></th>
                <th align="center" style="width: 35px;"><b>Pass-<br/>ing / Degree</b></th>
                <th align="center" style="width: 90px;"><b>Verified by the concerned Board University<br/>Institute vide letter No.<br/>Dated</b></th>
                <th align="center" style="width: 80px;"><b>Remark</b></th>
            </tr>
        </thead>
        <tbody>
            @foreach ($records as $i => $r)
                @php
                    $displayName = $r->display_name ?? ($r->student_name ?? ($r->name ?? ''));
                    $displayUni = $r->display_university ?? ($r->uni_add ?? ($r->clg_add ?? ''));
                @endphp
                <tr>
                    <td align="center" style="width: 20px;">{{ $i + 1 }}</td>
                    <td style="width: 80px;">{!! $displayName !!}</td>
                    <td align="center" style="width: 75px;">{{ $r->case_no ?? '' }}</td>
                    <td align="center" style="width: 65px;">{{ $displayUni }}</td>
                    <td align="center" style="width: 30px;">{{ $r->mig_TC ?? '' }}</td>
                    <td align="center" style="width: 35px;">{{ $r->s_marks ?? '' }}</td>
                    <td align="center" style="width: 35px;">{{ $r->p_degree ?? '' }}</td>
                    <td align="center" style="width: 90px;">{{ $r->letter_no_date ?? '' }}</td>
                    <td align="center" style="width: 80px;">
                        {{ $r->remark ?? '' }}
                        @if(!empty($r->conf_from))
                            <br/>{{ $r->conf_from }}<br/>& {{ $r->conf_from_select ?? '' }}
                        @endif
                        @if(!empty($r->etc_data))
                            & {{ $r->etc_data }}
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

</body>
</html>
