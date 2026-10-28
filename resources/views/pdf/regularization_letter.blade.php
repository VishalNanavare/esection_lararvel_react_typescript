@php
    $currentTime = $currentTime ?? ($record->en_time ?? time());
    $admDate = $admDate ?? (!empty($record->admission_letter_date) ? \Carbon\Carbon::parse($record->admission_letter_date)->format('d/m/Y') : '');
    $states = $states ?? '';
    $universityName = $universityName ?? ($record->university_name ?? '');
    $gender = $record->gender ?? '';
    $genCh1 = $genCh1 ?? (($gender === 'Ms' || $gender === 'Mrs' || $gender === 'Ms.') ? 'she' : 'he');
    $genCh2 = $genCh2 ?? (($gender === 'Ms' || $gender === 'Mrs' || $gender === 'Ms.') ? 'her' : 'his');
@endphp
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
        To,<br>
        The Assistant Registrar,<br>
        (Administration),<br>
        CDOE,<br>
        University of Mumbai,<br>
        Vidyanagri, Santacruz(E),<br>
        Mumbai - 400 098.
    </div>

    <div class="subject-block">
        @if(!empty($subject))
            <b>Sub - :</b> {!! $subject !!}
        @else
            <b>Sub - :</b> Admission Regulariztion of <b>{{ $record->admission_taken_in }}</b> course for the academic year <b>{{ $record->admission_taken_year }}.</b>
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
            With reference to your letter No. <b>{{ $record->admission_letter_for }}</b>, Date - <b>{{ $admDate }}</b>.
        </div>

        <div class="para">
            I am to inform you that since <b>{{ $record->gender }} {{ $record->student_name }}</b> submitted the Migration Certificate of <b>{{ $universityName }}@if(!empty($states)), {{ $states }}@endif</b> which {{ $genCh1 }} had migrated after passing <b>{{ $record->passing_course }}</b> course from University of Mumbai, {{ $genCh2 }} admission for <b>{{ $record->admission_taken_in }}</b> course for the academic year <b>{{ $record->admission_taken_year }}</b> in CDOE is hereby <b style="font-style: italic;">regularized accordingly</b>.
        </div>
    @endif

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
