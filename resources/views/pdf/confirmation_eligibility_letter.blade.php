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
        <b>Assistant Registrar.</b><br>
        Administration/I.T. Section,<br>
        Institute of Distance and Open Learning (IDOL)<br>
        University of Mumbai,<br>
        Vidyanagari, Santacruz (East),<br>
        Mumbai - 400 098.
    </div>

    <div class="subject-block">
        <b>Sub - :</b> Confirmation of Eligibility For the Academic Year <b>{{ $first->acd_year ?? '' }}</b> of Course <b>{{ $first->stream ?? '' }}.</b>
    </div>

    <div class="para">
        With reference to your letter No. <b>__________________</b> dated <b>__________________</b>. I am to inform you that the eligibility of <b>( {{ sprintf('%02d', $count) }} )</b> {{ $count == 1 ? 'student' : 'students' }} is hereby confirmed for the admission to the program mention againts their respective names in this University / Board.
    </div>

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
                <tr>
                    <td align="center" style="width: 20px;">{{ $i + 1 }}</td>
                    <td style="width: 80px;">{!! $r->display_name !!}</td>
                    <td align="center" style="width: 75px;">{{ $r->case_no }}</td>
                    <td align="center" style="width: 65px;">{{ $r->display_university }}</td>
                    <td align="center" style="width: 30px;">{{ $r->mig_TC }}</td>
                    <td align="center" style="width: 35px;">{{ $r->s_marks }}</td>
                    <td align="center" style="width: 35px;">{{ $r->p_degree }}</td>
                    <td align="center" style="width: 90px;">{{ $r->letter_no_date }}</td>
                    <td align="center" style="width: 80px;">
                        {{ $r->remark }}
                        @if(!empty($r->conf_from))
                            <br/>{{ $r->conf_from }}<br/>& {{ $r->conf_from_select }}
                        @endif
                        @if(!empty($r->etc_data))
                            & {{ $r->etc_data }}
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
