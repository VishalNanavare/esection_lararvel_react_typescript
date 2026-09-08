import React from 'react';
import { Head, Link } from '@inertiajs/react';
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
    notes: ReminderNote[];
}

interface Batch {
    id: number;
    academic_year: string;
    university_name: string;
    admission_taken_in: string | null;
    head_name: string | null;
    created_by: string | null;
    created_at: string | null;
}

interface Props {
    batch: Batch;
    students: StudentWithNotes[];
}

export default function UniversityBatchDetail({ batch, students }: Props) {
    return (
        <AppLayout>
            <Head title={`Reminder Batch #${batch.id}`} />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        {/* Header */}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <h3 className="fw-bold mb-0 text-dark">
                                        <i className="fa fa-envelope-o me-2 text-indigo"></i> Reminder Batch #{batch.id}
                                    </h3>
                                    <span className="badge badge-glass-indigo fs-6">
                                        {batch.academic_year}
                                    </span>
                                </div>
                                <p className="text-muted small mb-0">
                                    <i className="fa fa-university me-1 text-secondary"></i> {batch.university_name}
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <Link href="/reminders/university/history" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to Batches
                                </Link>
                                <a
                                    href={`/pdf/reminders/university/${batch.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-indigo"
                                >
                                    <i className="fa fa-print me-1"></i> Print Consolidated Notice
                                </a>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border">
                                    <small className="text-secondary d-block">Target University</small>
                                    <span className="fw-bold text-dark">{batch.university_name}</span>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border">
                                    <small className="text-secondary d-block">Academic Year</small>
                                    <span className="fw-bold text-dark">{batch.academic_year}</span>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border">
                                    <small className="text-secondary d-block">Total Candidates</small>
                                    <span className="fw-bold text-indigo fs-5">{students.length}</span>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="p-3 bg-light rounded border">
                                    <small className="text-secondary d-block">Created By</small>
                                    <span className="fw-bold text-dark">{batch.created_by || 'staff'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Students & History Table */}
                        <h5 className="fw-bold text-dark mb-3">
                            <i className="fa fa-users me-2 text-indigo"></i> Candidates &amp; Reminder Dispatch History
                        </h5>

                        <div className="table-responsive">
                            <table className="table table-glass align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Candidate Name</th>
                                        <th>Eligibility Case No.</th>
                                        <th>Program</th>
                                        <th>Reminder Notes History</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, idx) => (
                                        <tr key={s.id}>
                                            <td className="text-muted fw-semibold">{idx + 1}</td>
                                            <td>
                                                <strong className="text-dark d-block">{s.student_name}</strong>
                                                {s.student_nee_name && s.student_nee_name !== '-' && (
                                                    <small className="text-muted">(Nee: {s.student_nee_name})</small>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge badge-glass-indigo">
                                                    {s.eligibility_case_no}
                                                </span>
                                            </td>
                                            <td>{s.admission_taken_in}</td>
                                            <td>
                                                {s.notes.length === 0 ? (
                                                    <span className="text-muted small">No reminder notes recorded</span>
                                                ) : (
                                                    <div className="d-flex flex-column gap-1">
                                                        {s.notes.map((n, i) => (
                                                            <div key={i} className="small bg-white p-2 rounded border">
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
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
