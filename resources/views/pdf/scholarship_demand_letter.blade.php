<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fee Recovery Demand Notice - {{ $student->form_number }}</title>
    <style>
        @page {
            margin: 30mm 15mm 20mm 15mm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 9.5pt;
            line-height: 1.4;
            color: #111;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .inst-title {
            font-size: 14pt;
            font-weight: bold;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .inst-sub {
            font-size: 10pt;
            color: #4b5563;
            margin-top: 2px;
        }
        .inst-dept {
            font-size: 9pt;
            font-weight: bold;
            color: #1f2937;
            margin-top: 4px;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 15px;
            font-size: 9.5pt;
        }
        .to-block {
            margin-bottom: 15px;
            line-height: 1.4;
        }
        .subject-box {
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 15px;
            font-size: 10pt;
        }
        .para {
            text-align: justify;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .fee-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .fee-table th, .fee-table td {
            border: 1px solid #9ca3af;
            padding: 8px 10px;
            font-size: 9.5pt;
        }
        .fee-table th {
            background-color: #e5e7eb;
            text-align: left;
        }
        .total-row {
            font-weight: bold;
            background-color: #f9fafb;
        }
        .payable-row {
            font-weight: bold;
            background-color: #fee2e2;
            color: #991b1b;
            font-size: 10.5pt;
        }
        .notice-box {
            border-left: 4px solid #dc2626;
            background-color: #fef2f2;
            padding: 10px 12px;
            margin: 15px 0;
            font-size: 9pt;
        }
        .signature-table {
            width: 100%;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="inst-title">Institute of Distance and Open Learning (IDOL)</div>
        <div class="inst-sub">University of Mumbai, Vidyanagari, Kalina, Santacruz (East), Mumbai - 400 098</div>
        <div class="inst-dept">ELIGIBILITY & SCHOLARSHIP SECTION</div>
    </div>

    <table class="meta-table">
        <tr>
            <td style="width: 60%;">
                <strong>Ref. No.:</strong> {{ $letter->letter_no }}
            </td>
            <td style="width: 40%; text-align: right;">
                <strong>Date:</strong> {{ \Carbon\Carbon::parse($letter->letter_date)->format('d/m/Y') }}
            </td>
        </tr>
    </table>

    <div class="to-block">
        <strong>To,</strong><br>
        <strong>Candidate:</strong> {{ $student->student_name }}<br>
        <strong>Application Form No:</strong> {{ $student->form_number }} (Reg. No: {{ $student->registration_no ?: 'N/A' }})<br>
        <strong>Course:</strong> {{ $student->course?->name ?: $student->applied_programme_name }}<br>
        <strong>Academic Year:</strong> {{ $student->academic_year_label ?: '2026-2027' }}<br>
        <strong>Caste / Category:</strong> {{ $student->caste_category }}<br>
        <strong>Contact:</strong> {{ $student->mobile }} | {{ $student->email }}
    </div>

    <div class="subject-box">
        SUBJECT: DEMAND NOTICE FOR RECOVERY OF OUTSTANDING COURSE FEES DUE TO UNPROCESSED / REJECTED SCHOLARSHIP
    </div>

    <div class="para">
        Sir / Madam,
    </div>

    <div class="para">
        With reference to your admission to the <strong>{{ $student->course?->name ?: $student->applied_programme_name }}</strong> for the Academic Year <strong>{{ $student->academic_year_label ?: '2026-2027' }}</strong> under the concession / scholarship quota, you are hereby informed that your scholarship processing could not be completed / has been rejected by the concerned Government Social Welfare Department.
    </div>

    @if($letter->non_processed_reason)
    <div class="notice-box">
        <strong>Reason for Non-Processing / Rejection:</strong><br>
        {{ $letter->non_processed_reason }}
    </div>
    @endif

    <div class="para">
        As per the University and Institute regulations, in the event of scholarship non-sanction, disqualification, or document deficiency, the admitted candidate is personally responsible for paying the full tuition and institutional fees. The detailed fee account for your admission is outlined below:
    </div>

    <table class="fee-table">
        <thead>
            <tr>
                <th style="width: 10%;">Sr. No.</th>
                <th style="width: 60%;">Particulars / Fee Head</th>
                <th style="width: 30%; text-align: right;">Amount (INR)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>Total Prescribed Course Fee ({{ $student->academic_year_label ?: '2026-2027' }})</td>
                <td style="text-align: right;">₹ {{ number_format($letter->total_course_fee, 2) }}</td>
            </tr>
            <tr>
                <td>2</td>
                <td>Less: Amount Paid at the time of Admission / Prior Receipts</td>
                <td style="text-align: right;">- ₹ {{ number_format($letter->fee_collected, 2) }}</td>
            </tr>
            <tr class="payable-row">
                <td colspan="2" style="text-align: right;">NET OUTSTANDING AMOUNT PAYABLE:</td>
                <td style="text-align: right;">₹ {{ number_format($letter->balance_demanded, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="para">
        You are strictly instructed to pay the balance outstanding fee of <strong>₹ {{ number_format($letter->balance_demanded, 2) }}</strong> within <strong>15 days</strong> of the date of this notice through the official University IDOL payment portal or demand draft. Failure to clear the outstanding dues may result in the withholding of your hall ticket, examination eligibility, or cancellation of admission.
    </div>

    <table class="signature-table">
        <tr>
            <td style="width: 50%; vertical-align: bottom;">
                <strong>Generated By:</strong> {{ $letter->generated_by ?: 'E-Section Officer' }}<br>
                <strong>System Timestamp:</strong> {{ now()->format('d/m/Y h:i A') }}
            </td>
            <td style="width: 50%; text-align: right; vertical-align: bottom;">
                <br><br><br>
                <strong>Section Officer / Assistant Registrar</strong><br>
                Eligibility & Scholarship Section<br>
                IDOL, University of Mumbai
            </td>
        </tr>
    </table>
</body>
</html>
