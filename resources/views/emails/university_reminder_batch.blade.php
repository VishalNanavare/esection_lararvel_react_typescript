<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>University Marksheet Verification Reminder Notice</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #212529;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 720px;
            margin: 0 auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .header h2 {
            margin: 0 0 4px 0;
            color: #1e3a8a;
            font-size: 18px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .header h3 {
            margin: 0 0 4px 0;
            color: #334155;
            font-size: 15px;
            font-weight: 600;
        }
        .header p {
            margin: 0;
            color: #64748b;
            font-size: 12px;
        }
        .meta-bar {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 13px;
            color: #475569;
        }
        .recipient-box {
            margin-bottom: 20px;
            padding: 12px 16px;
            background-color: #f1f5f9;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
        }
        .subject-line {
            font-size: 15px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #cbd5e1;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
        }
        .table th {
            background-color: #f8fafc;
            color: #334155;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            font-size: 12px;
            text-transform: uppercase;
        }
        .table td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
            vertical-align: top;
        }
        .table tr:nth-child(even) {
            background-color: #fdfdfd;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            background-color: #dbeafe;
            color: #1e40af;
        }
        .badge-amber {
            background-color: #fef3c7;
            color: #92400e;
        }
        .custom-note-box {
            margin: 20px 0;
            padding: 14px;
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            font-size: 13px;
            color: #78350f;
        }
        .attachment-notice {
            margin: 20px 0;
            padding: 12px;
            background-color: #ecfdf5;
            border: 1px solid #d1fae5;
            border-left: 4px solid #10b981;
            border-radius: 4px;
            font-size: 13px;
            color: #065f46;
        }
        .footer {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: right;
            font-size: 13px;
            color: #334155;
        }
        .footer strong {
            display: block;
            color: #0f172a;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{{ $instituteUniversityTitle ?? 'UNIVERSITY OF MUMBAI' }}</h2>
            <h3>{{ $instituteName ?? 'INSTITUTE OF DISTANCE AND OPEN LEARNING (IDOL)' }}</h3>
            <p>{{ $instituteAddress ?? 'Dr. Shankar Dayal Sharma Bhavan, Vidyanagari, Santacruz (E), Mumbai - 400 098.' }}</p>
        </div>

        <div class="meta-bar">
            <div><strong>Batch Ref:</strong> #REM-BATCH-{{ $batch->id }}</div>
            <div><strong>Date:</strong> {{ date('d/m/Y') }}</div>
        </div>

        <div class="recipient-box">
            <div>To,</div>
            <strong>{{ $batch->head_name ?: 'The Controller of Examinations' }}</strong><br>
            <span>{!! nl2br(e($batch->university_name)) !!}</span>
        </div>

        <div class="subject-line">
            Subject: {{ $latestReminderText ?? '1st Reminder' }} - Verification of Marksheets / Passing Certificates
        </div>

        <p>Respected Sir / Madam,</p>

        <p>
            With reference to our office communication, the official marksheet / passing certificate verification reports for the following candidate(s) are still awaited from your university / examination authority.
        </p>
        <p>
            Kindly expedite the verification process and send the attested verification report(s) to this office at an early date to enable the completion of their degree eligibility regularization.
        </p>

        @if (!empty($customNotes))
            <div class="custom-note-box">
                <strong>Important Note / Specific Instructions:</strong><br>
                {!! nl2br(e($customNotes)) !!}
            </div>
        @endif

        <h4 style="margin: 24px 0 8px 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase;">
            Candidate(s) Awaiting Verification Details
        </h4>

        <table class="table">
            <thead>
                <tr>
                    <th style="width: 25px;">#</th>
                    <th>Candidate Full Name</th>
                    <th>Eligibility Case No.</th>
                    <th>Course / Program</th>
                    <th>Academic Year</th>
                    <th>Reminder Stage</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($students as $idx => $s)
                    <tr>
                        <td>{{ $idx + 1 }}</td>
                        <td>
                            <strong>{{ $s->student_name }}</strong>
                            @if (!empty($s->student_nee_name) && $s->student_nee_name !== '-')
                                <div style="font-size: 11px; color: #64748b;">(Nee: {{ $s->student_nee_name }})</div>
                            @endif
                        </td>
                        <td>
                            <span class="badge">{{ $s->eligibility_case_no ?: '—' }}</span>
                        </td>
                        <td>{{ $s->admission_taken_in ?: '—' }}</td>
                        <td><strong>{{ $s->admission_taken_year ?: '—' }}</strong></td>
                        <td>
                            <span class="badge badge-amber">{{ $latestReminderText }}</span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        @if ($hasAttachment)
            <div class="attachment-notice">
                <i class="fa fa-paperclip"></i> <strong>Attachment:</strong> The official consolidated verification notice letter PDF has been attached to this email (<code>university_reminder_{{ $batch->id }}.pdf</code>).
            </div>
        @endif

        <p>Thanking you in anticipation of your prompt assistance.</p>

        <div class="footer">
            Yours faithfully,<br><br>
            @if (!empty($instituteSignatoryName))
                <strong>{{ $instituteSignatoryName }}</strong>
            @endif
            <strong>{{ $instituteSignatoryDesignation ?? 'Deputy Registrar / Assistant Registrar' }}</strong>
            <div>{{ $footerDepartment ?? 'IDOL Eligibility Section' }}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">University of Mumbai</div>
        </div>
    </div>
</body>
</html>
