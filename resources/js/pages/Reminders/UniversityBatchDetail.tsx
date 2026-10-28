import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';

interface ReminderNote {
    id: number;
    note_text: string;
    note_date: string | null;
    created_by: string | null;
    created_at: string | null;
}

interface StudentWithNotes {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    admission_taken_in: string;
    admission_taken_year: string;
    verification_status?: 'pending' | 'reminder_sent' | 'verified' | 'excluded';
    exclusion_reason?: string | null;
    is_verified?: boolean;
    is_excluded?: boolean;
    is_eligible?: boolean;
    computed_status?: 'verified' | 'excluded' | 'reminder_sent' | 'pending';
    notes: ReminderNote[];
}

interface BatchSummary {
    id: number;
    academic_year: string;
    university_name: string;
    admission_taken_in: string | null;
    head_name: string | null;
    is_consolidated?: boolean;
    created_by: string | null;
    created_at: string | null;
}

interface Batch extends BatchSummary {
    consolidated_meta?: {
        source_batch_ids?: number[];
        total_raw_entries?: number;
        unique_candidates?: number;
        verified_excluded_count?: number;
        explicitly_excluded_count?: number;
        duplicate_entries_removed?: number;
        other_ineligible_count?: number;
        final_eligible_count?: number;
    } | null;
}

interface Props {
    batch: Batch;
    sourceBatches?: BatchSummary[];
    students: StudentWithNotes[];
    suggestedEmail?: string;
    mailReady?: boolean;
}

export default function UniversityBatchDetail({
    batch,
    sourceBatches = [],
    students,
    suggestedEmail = '',
    mailReady = true,
}: Props) {
    const latestNote = students[0]?.notes?.[students[0]?.notes?.length - 1]?.note_text || '1st Reminder Notice';

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState(suggestedEmail);
    const [subject, setSubject] = useState(
        `${latestNote}: Verification of Pending Marksheets - ${batch.university_name}`
    );
    const [messageNotes, setMessageNotes] = useState('');
    const [attachPdf, setAttachPdf] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Verification status correction modal
    const [statusModalStudent, setStatusModalStudent] = useState<StudentWithNotes | null>(null);
    const [newStatus, setNewStatus] = useState<'pending' | 'verified' | 'excluded'>('verified');
    const [exclusionReason, setExclusionReason] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Candidate eligibility calculations
    const eligibleStudents = students.filter(s => s.is_eligible !== false);
    const verifiedStudents = students.filter(s => s.is_verified);
    const excludedStudents = students.filter(s => s.is_excluded);
    const pendingStudents = students.filter(s => !s.is_verified && !s.is_excluded);

    // Grouping summary by Course and Academic Year
    const courseYearBreakdown = students.reduce<Record<string, number>>((acc, s) => {
        const key = `${s.admission_taken_in || 'General'} (${s.admission_taken_year || 'Unknown Year'})`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const handleSaveStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModalStudent) return;
        if (newStatus === 'excluded' && !exclusionReason.trim()) {
            Swal.fire('Reason Required', 'Please provide a reason for explicitly excluding this candidate.', 'warning');
            return;
        }

        setIsUpdatingStatus(true);
        router.post(
            `/reminders/university/students/${statusModalStudent.id}/status`,
            {
                status: newStatus,
                reason: exclusionReason.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsUpdatingStatus(false);
                    setStatusModalStudent(null);
                    Swal.fire({
                        icon: 'success',
                        title: 'Verification Status Updated',
                        text: `Candidate status updated to ${newStatus}.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                },
                onError: (errs) => {
                    setIsUpdatingStatus(false);
                    Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to update status', 'error');
                },
            }
        );
    };

    const handleSendEmail = (e: React.FormEvent) => {
        e.preventDefault();

        if (eligibleStudents.length === 0) {
            Swal.fire(
                'No Eligible Candidates',
                'All candidates in this batch are already verified or explicitly excluded. No reminder dispatch needed.',
                'info'
            );
            return;
        }

        if (!recipientEmail || !recipientEmail.includes('@')) {
            Swal.fire('Valid Email Required', 'Please provide a valid university email address.', 'warning');
            return;
        }

        setIsSending(true);
        router.post(
            `/reminders/university/batches/${batch.id}/send-email`,
            {
                recipient_email: recipientEmail,
                subject,
                message_notes: messageNotes,
                attach_pdf: attachPdf,
            },
            {
                onSuccess: () => {
                    setIsSending(false);
                    setShowEmailModal(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'Reminder Email Sent!',
                        text: `Reminder notice and candidate details successfully emailed to ${recipientEmail}.`,
                        timer: 3500,
                    });
                },
                onError: (errors) => {
                    setIsSending(false);
                    const msg = Object.values(errors)[0] || 'Failed to dispatch reminder email.';
                    Swal.fire('Email Error', String(msg), 'error');
                },
            }
        );
    };

    const handleEditNote = (note: ReminderNote, candidateName: string) => {
        const initialDate = note.note_date ? note.note_date.split('T')[0] : new Date().toISOString().split('T')[0];
        Swal.fire({
            title: 'Update Reminder Note',
            html: `
                <div class="text-start">
                    <p class="small text-muted mb-2">Candidate: <strong>${candidateName}</strong></p>
                    <label class="form-label small fw-semibold text-secondary">Reminder Message / Note Text</label>
                    <input id="swal_note_text" class="form-control mb-3" value="${note.note_text.replace(/"/g, '&quot;')}" />
                    <label class="form-label small fw-semibold text-secondary">Reminder Date</label>
                    <input id="swal_note_date" type="date" class="form-control" value="${initialDate}" />
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fa fa-save me-1"></i> Save Changes',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#4f46e5',
            focusConfirm: false,
            preConfirm: () => {
                const text = (document.getElementById('swal_note_text') as HTMLInputElement)?.value;
                const date = (document.getElementById('swal_note_date') as HTMLInputElement)?.value;
                if (!text || !text.trim()) {
                    Swal.showValidationMessage('Note text cannot be empty');
                    return false;
                }
                return { text: text.trim(), date };
            },
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                router.post(
                    `/reminders/university/notes/${note.id}`,
                    {
                        note_text: result.value.text,
                        note_date: result.value.date,
                    },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            Swal.fire({
                                icon: 'success',
                                title: 'Note Updated!',
                                text: 'Reminder note updated successfully.',
                                timer: 1500,
                                showConfirmButton: false,
                            });
                        },
                        onError: (errs) => {
                            Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to update note', 'error');
                        },
                    }
                );
            }
        });
    };

    return (
        <AppLayout>
            <Head title={`Reminder Batch #${batch.id}`} />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        {/* Header */}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="fw-bold mb-0 text-dark">
                                        <i className="fa fa-envelope-o me-2 text-indigo"></i> Reminder Batch #{batch.id}
                                    </h3>
                                    <span className="badge badge-glass-indigo fs-6">
                                        {batch.academic_year}
                                    </span>
                                    {batch.is_consolidated && (
                                        <span className="badge bg-indigo text-white fs-6">
                                            <i className="fa fa-cubes me-1"></i> Consolidated Campaign
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted small mb-0">
                                    <i className="fa fa-university me-1 text-secondary"></i> {batch.university_name}
                                </p>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                <Link href="/reminders/university/history" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to Batches
                                </Link>
                                <Link
                                    href={`/reminders/university/batches/${batch.id}/edit`}
                                    className="btn btn-outline-danger"
                                    title="Update reminder notes or enter next reminder notes (as per reme_view.php)"
                                >
                                    <i className="fa fa-pencil me-1"></i> Update Reminder Notes
                                </Link>
                                <a
                                    href={`/pdf/reminders/university/${batch.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-indigo"
                                >
                                    <i className="fa fa-print me-1"></i> Print Consolidated Notice
                                </a>
                                <button
                                    type="button"
                                    className="btn btn-emerald"
                                    onClick={() => setShowEmailModal(true)}
                                    disabled={eligibleStudents.length === 0}
                                    title={eligibleStudents.length === 0 ? 'All candidates verified or excluded' : 'Send reminder notice email to university'}
                                >
                                    <i className="fa fa-paper-plane me-1"></i> Send Email to University
                                </button>
                            </div>
                        </div>

                        {/* Consolidated Campaign Banner */}
                        {batch.is_consolidated && (
                            <div className="alert alert-primary bg-indigo-subtle border-indigo mb-4 rounded-3 p-3">
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                    <div>
                                        <h6 className="fw-bold text-dark mb-1">
                                            <i className="fa fa-cubes me-2 text-indigo"></i> Multi-Batch Consolidated Campaign
                                        </h6>
                                        <p className="small text-secondary mb-0">
                                            This campaign was consolidated across multiple pending batches without altering or deleting the original records.
                                        </p>
                                    </div>
                                    {batch.consolidated_meta && (
                                        <div className="d-flex flex-wrap gap-2">
                                            <span className="badge bg-white text-dark border px-2 py-1">
                                                <strong>Raw Entries:</strong> {batch.consolidated_meta.total_raw_entries ?? students.length}
                                            </span>
                                            <span className="badge bg-white text-dark border px-2 py-1">
                                                <strong>Unique Students:</strong> {batch.consolidated_meta.unique_candidates ?? students.length}
                                            </span>
                                            {(batch.consolidated_meta.verified_excluded_count ?? 0) > 0 && (
                                                <span className="badge bg-white text-success border px-2 py-1">
                                                    <strong>Verified Excluded:</strong> {batch.consolidated_meta.verified_excluded_count}
                                                </span>
                                            )}
                                            {(batch.consolidated_meta.duplicate_entries_removed ?? 0) > 0 && (
                                                <span className="badge bg-white text-info border px-2 py-1">
                                                    <strong>Duplicates Deduplicated:</strong> {batch.consolidated_meta.duplicate_entries_removed}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {sourceBatches && sourceBatches.length > 0 && (
                                    <div className="pt-2 border-top border-indigo-subtle">
                                        <span className="small fw-semibold text-dark me-2">
                                            <i className="fa fa-link me-1 text-indigo"></i> Consolidated From {sourceBatches.length} Source Batches:
                                        </span>
                                        <div className="d-inline-flex flex-wrap gap-1 align-items-center">
                                            {sourceBatches.map(sb => (
                                                <Link
                                                    key={sb.id}
                                                    href={`/reminders/university/batches/${sb.id}`}
                                                    className="badge bg-white text-indigo border border-indigo-subtle text-decoration-none px-2 py-1"
                                                    title={`View Source Batch #${sb.id}`}
                                                >
                                                    <i className="fa fa-external-link me-1 small"></i>
                                                    Batch #{sb.id} ({sb.academic_year || 'N/A'})
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summary Cards */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border h-100">
                                    <small className="text-secondary d-block">Total Candidates</small>
                                    <span className="fw-bold text-dark fs-5">{students.length}</span>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border h-100">
                                    <small className="text-secondary d-block">Eligible for Reminder</small>
                                    <span className="fw-bold text-indigo fs-5">{eligibleStudents.length}</span>
                                    {eligibleStudents.length < students.length && (
                                        <small className="text-muted d-block mt-1">
                                            ({students.length - eligibleStudents.length} verified/excluded)
                                        </small>
                                    )}
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border h-100">
                                    <small className="text-secondary d-block">Verified / Completed</small>
                                    <span className="fw-bold text-emerald fs-5">{verifiedStudents.length}</span>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border h-100">
                                    <small className="text-secondary d-block">Explicitly Excluded</small>
                                    <span className="fw-bold text-danger fs-5">{excludedStudents.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Course & Academic Year Breakdown Badges */}
                        {Object.keys(courseYearBreakdown).length > 1 && (
                            <div className="mb-4 p-3 bg-white rounded border">
                                <div className="small fw-semibold text-secondary mb-2">
                                    <i className="fa fa-graduation-cap me-1 text-indigo"></i> Multi-Course &amp; Academic Year Breakdown:
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {Object.entries(courseYearBreakdown).map(([label, count], i) => (
                                        <span key={i} className="badge bg-light text-dark border px-3 py-2 fs-7">
                                            <strong>{label}:</strong> {count} Candidate(s)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Students & History Table */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold text-dark mb-0">
                                <i className="fa fa-users me-2 text-indigo"></i> Candidates, Verification &amp; Reminder History
                            </h5>
                            {eligibleStudents.length === 0 && (
                                <span className="badge badge-glass-emerald px-3 py-2">
                                    <i className="fa fa-check-circle me-1"></i> All students in this batch have completed verification
                                </span>
                            )}
                        </div>

                        <div className="table-responsive">
                            <table className="table table-glass align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>#</th>
                                        <th>Candidate Name</th>
                                        <th>Eligibility Case No.</th>
                                        <th>Course / Program</th>
                                        <th>Academic Year</th>
                                        <th>Verification Status</th>
                                        <th>Reminder Notes History</th>
                                        <th className="text-end" style={{ width: '100px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, idx) => (
                                        <tr key={s.id} className={!s.is_eligible ? 'table-light opacity-75' : ''}>
                                            <td className="text-muted fw-semibold">{idx + 1}</td>
                                            <td>
                                                <strong className="text-dark d-block">{s.student_name}</strong>
                                                {s.student_nee_name && s.student_nee_name !== '-' && (
                                                    <small className="text-muted">(Nee: {s.student_nee_name})</small>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge badge-glass-indigo font-monospace">
                                                    {s.eligibility_case_no || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="fw-semibold text-dark">{s.admission_taken_in || '—'}</span>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {s.admission_taken_year || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                {s.is_verified ? (
                                                    <span className="badge badge-glass-emerald">
                                                        <i className="fa fa-check-circle me-1"></i> Verified
                                                    </span>
                                                ) : s.is_excluded ? (
                                                    <div>
                                                        <span className="badge badge-glass-danger">
                                                            <i className="fa fa-ban me-1"></i> Excluded
                                                        </span>
                                                        {s.exclusion_reason && (
                                                            <small className="d-block text-danger mt-1 fst-italic" style={{ maxWidth: '180px' }}>
                                                                {s.exclusion_reason}
                                                            </small>
                                                        )}
                                                    </div>
                                                ) : s.computed_status === 'reminder_sent' ? (
                                                    <span className="badge badge-glass-indigo">
                                                        <i className="fa fa-paper-plane me-1"></i> Reminder Sent
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-glass-amber">
                                                        <i className="fa fa-clock-o me-1"></i> Pending Verification
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {s.notes.length === 0 ? (
                                                    <span className="text-muted small">No reminder notes recorded</span>
                                                ) : (
                                                    <div className="d-flex flex-column gap-1">
                                                        {s.notes.map((n, i) => (
                                                            <div key={i} className="small bg-white p-2 rounded border d-flex align-items-center justify-content-between flex-wrap gap-1">
                                                                <div>
                                                                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 me-2">
                                                                        {n.note_text}
                                                                    </span>
                                                                    <span className="text-muted">
                                                                        Date: {n.note_date ? new Date(n.note_date).toLocaleDateString('en-GB') : '-'}
                                                                    </span>
                                                                    {n.created_by && (
                                                                        <span className="text-secondary ms-2">
                                                                            by {n.created_by}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill"
                                                                    style={{ fontSize: '0.72rem' }}
                                                                    onClick={() => handleEditNote(n, s.student_name)}
                                                                    title="Edit or correct this reminder note"
                                                                >
                                                                    <i className="fa fa-pencil me-1"></i> Edit Note
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-glass text-secondary"
                                                    onClick={() => {
                                                        setStatusModalStudent(s);
                                                        setNewStatus(s.is_verified ? 'verified' : s.is_excluded ? 'excluded' : 'pending');
                                                        setExclusionReason(s.exclusion_reason || '');
                                                    }}
                                                    title="Update candidate verification status"
                                                >
                                                    <i className="fa fa-pencil me-1"></i> Status
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification Status Modal */}
            {statusModalStudent && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0 rounded-4">
                            <div className="modal-header bg-light border-bottom px-4 py-3">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        <i className="fa fa-user-check me-2 text-indigo"></i>
                                        Update Verification Status
                                    </h5>
                                    <small className="text-muted">
                                        {statusModalStudent.student_name} (Case: {statusModalStudent.eligibility_case_no || 'N/A'})
                                    </small>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setStatusModalStudent(null)}
                                    disabled={isUpdatingStatus}
                                />
                            </div>
                            <form onSubmit={handleSaveStatus}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Verification Status <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value as any)}
                                            required
                                        >
                                            <option value="pending">Pending Verification (Eligible for reminders)</option>
                                            <option value="verified">Verified / Completed (Mark received marksheets)</option>
                                            <option value="excluded">Explicitly Excluded (Do not send reminders)</option>
                                        </select>
                                    </div>

                                    {newStatus === 'excluded' && (
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small fw-semibold">
                                                Exclusion Reason <span className="text-danger">*</span>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                placeholder="e.g. Student canceled admission, court case, university exception..."
                                                value={exclusionReason}
                                                onChange={(e) => setExclusionReason(e.target.value)}
                                                required
                                            />
                                        </div>
                                    )}

                                    {newStatus === 'verified' && (
                                        <div className="alert alert-success small mb-0">
                                            <i className="fa fa-info-circle me-1"></i>
                                            Marking this candidate as verified will record the verification timestamp and exclude them from all future reminder dispatches.
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer bg-light px-4 py-3 border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setStatusModalStudent(null)}
                                        disabled={isUpdatingStatus}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-indigo px-4"
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Reminder Email Modal */}
            {showEmailModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content shadow-lg border-0 rounded-4">
                            <div className="modal-header bg-light border-bottom px-4 py-3">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        <i className="fa fa-paper-plane me-2 text-indigo"></i>
                                        Send University Marksheet Reminder Email
                                    </h5>
                                    <small className="text-muted">
                                        Dispatch reminder notice with candidate table and official PDF attachment
                                    </small>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowEmailModal(false)}
                                    disabled={isSending}
                                    aria-label="Close"
                                />
                            </div>

                            <form onSubmit={handleSendEmail}>
                                <div className="modal-body p-4">
                                    {!mailReady && (
                                        <div className="alert alert-warning mb-3">
                                            <i className="fa fa-exclamation-triangle me-2"></i>
                                            <strong>Mail Settings Notice:</strong> SMTP server is not fully configured.
                                            You can configure SMTP credentials under <strong>Settings &gt; Email</strong>.
                                        </div>
                                    )}

                                    {verifiedStudents.length > 0 && (
                                        <div className="alert alert-info py-2 px-3 small mb-3">
                                            <i className="fa fa-check-circle me-1"></i>
                                            <strong>Smart Exclusion:</strong> {verifiedStudents.length} candidate(s) in this batch have already completed verification and will be automatically omitted from the dispatched list and notice.
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Target University / Authority
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control bg-light"
                                            value={batch.university_name}
                                            disabled
                                        />
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-md-7">
                                            <label className="form-label text-secondary small fw-semibold">
                                                Recipient University Email <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                placeholder="e.g. exam@unipune.ac.in or coe@university.ac.in"
                                                value={recipientEmail}
                                                onChange={(e) => setRecipientEmail(e.target.value)}
                                                required
                                            />
                                            <small className="text-muted">
                                                Official email of the Controller of Examinations / Certificate Section
                                            </small>
                                        </div>

                                        <div className="col-md-5">
                                            <label className="form-label text-secondary small fw-semibold">
                                                Reminder Notice Type
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control bg-light"
                                                value={latestNote}
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Email Subject Line <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Custom Notes / Special Instructions (Optional)
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows={2}
                                            placeholder="Add any specific instructions, fee details, or reference numbers..."
                                            value={messageNotes}
                                            onChange={(e) => setMessageNotes(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-check form-switch mb-3 p-3 bg-light rounded border">
                                        <input
                                            className="form-check-input ms-0 me-2"
                                            type="checkbox"
                                            id="attachPdfCheck"
                                            checked={attachPdf}
                                            onChange={(e) => setAttachPdf(e.target.checked)}
                                        />
                                        <label className="form-check-label fw-semibold text-dark" htmlFor="attachPdfCheck">
                                            <i className="fa fa-file-pdf-o text-danger me-1"></i>
                                            Attach Official Consolidated PDF Notice (<code>university_reminder_{batch.id}.pdf</code>)
                                        </label>
                                        <small className="d-block text-muted ms-4">
                                            Automatically compiles and attaches the signed official notice with candidate details
                                        </small>
                                    </div>

                                    {/* Preview of Candidates included */}
                                    <div className="border rounded p-3 bg-light">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="small fw-bold text-dark">
                                                <i className="fa fa-list me-1 text-indigo"></i>
                                                Eligible Candidates Table ({eligibleStudents.length} of {students.length} Student{students.length > 1 ? 's' : ''}):
                                            </span>
                                            <span className="badge bg-secondary">
                                                {Object.keys(courseYearBreakdown).length} Course/Year Group{Object.keys(courseYearBreakdown).length > 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <div className="table-responsive" style={{ maxHeight: '180px' }}>
                                            <table className="table table-sm table-bordered bg-white mb-0 small">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Candidate Name</th>
                                                        <th>Case No</th>
                                                        <th>Course</th>
                                                        <th>Year</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {eligibleStudents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="text-center text-muted py-3">
                                                                No eligible candidates remain to send.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        eligibleStudents.map((s, i) => (
                                                            <tr key={s.id}>
                                                                <td>{i + 1}</td>
                                                                <td className="fw-semibold">{s.student_name}</td>
                                                                <td>{s.eligibility_case_no || '—'}</td>
                                                                <td>{s.admission_taken_in || '—'}</td>
                                                                <td>{s.admission_taken_year || '—'}</td>
                                                                <td>
                                                                    <span className="badge badge-glass-amber">Eligible</span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer bg-light px-4 py-3 border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setShowEmailModal(false)}
                                        disabled={isSending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-indigo px-4"
                                        disabled={isSending || eligibleStudents.length === 0}
                                    >
                                        {isSending ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                                Sending Email...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-paper-plane me-1"></i> Send Email Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
