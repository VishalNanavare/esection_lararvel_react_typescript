import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps, Student } from '../../types';

interface BatchDetailProps {
    title: string;
    arraySpace: string;
    students: Student[];
}

export const BatchDetail: React.FC<BatchDetailProps> = ({ arraySpace, students }) => {
    const { props } = usePage<SharedProps>();
    const { features } = props;
    const canDelete = features.delete;

    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState('');
    const [editNeeName, setEditNeeName] = useState('');
    const [editCaseNo, setEditCaseNo] = useState('');
    const [editRemarks, setEditRemarks] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const firstStudent = students[0];

    const handleOpenEdit = (s: Student) => {
        setEditingStudent(s);
        setEditName(s.student_name);
        setEditNeeName(s.student_nee_name || '');
        setEditCaseNo(s.eligibility_case_no || '');
        setEditRemarks(s.verification_of_marksheet_done_by_you || '');
        setEditEmail(s.email || '');
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        setIsSavingEdit(true);
        router.put(
            `/students/${editingStudent.id}`,
            {
                student_name: editName,
                student_nee_name: editNeeName,
                eligibility_case_no: editCaseNo,
                verification_of_marksheet_done_by_you: editRemarks,
                email: editEmail,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSavingEdit(false);
                    setEditingStudent(null);
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated',
                        text: 'Candidate details updated successfully.',
                        timer: 2500,
                        showConfirmButton: false,
                    });
                },
                onError: (err) => {
                    setIsSavingEdit(false);
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: Object.values(err)[0] as string || 'Failed to update candidate.',
                    });
                },
            }
        );
    };

    const handleDelete = (s: Student) => {
        Swal.fire({
            title: 'Delete Candidate?',
            text: `Are you sure you want to delete ${s.student_name} from batch #${arraySpace}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            customClass: {
                confirmButton: 'btn btn-danger',
                cancelButton: 'btn btn-glass ms-2',
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(`/students/${s.id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: 'Candidate removed from batch.',
                            timer: 2500,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    return (
        <AppLayout title={`Batch #${arraySpace} Details - E-Section Portal`}>
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1">
                                    <i className="fa fa-folder-open-o me-2 text-indigo"></i>
                                    Verification Batch <span className="text-indigo">#{arraySpace}</span>
                                </h3>
                                <div className="text-muted small">
                                    <strong>University:</strong> {firstStudent?.clg_add || 'N/A'} |{' '}
                                    <strong>Program:</strong> {firstStudent?.admission_taken_in || 'N/A'} |{' '}
                                    <strong>Year:</strong> {firstStudent?.admission_taken_year || 'N/A'}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Link href="/students/history" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to History
                                </Link>
                                <a
                                    href={`/pdf/dispatch/${arraySpace}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-indigo"
                                >
                                    <i className="fa fa-print me-1"></i> Print Dispatch Letter
                                </a>
                                <a
                                    href={`/pdf/accounts/${arraySpace}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-glass text-indigo"
                                >
                                    <i className="fa fa-file-text-o me-1"></i> Accounts Copy
                                </a>
                            </div>
                        </div>

                        {/* Candidates Table */}
                        <div className="table-responsive rounded-3 border">
                            <table className="table table-glass align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Student Full Name</th>
                                        <th>Nee / Maiden Name</th>
                                        <th>Eligibility Case No.</th>
                                        <th>Verification Remarks</th>
                                        <th>Email</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-5">
                                                All candidates in this batch have been removed.
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((s, idx) => (
                                            <tr key={s.id}>
                                                <td className="fw-semibold text-muted">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="fw-bold text-dark">{s.student_name}</td>
                                                <td className="text-muted">{s.student_nee_name || '—'}</td>
                                                <td>
                                                    <span className="font-monospace fw-semibold text-indigo">
                                                        {s.eligibility_case_no}
                                                    </span>
                                                </td>
                                                <td>{s.verification_of_marksheet_done_by_you || '—'}</td>
                                                <td className="small text-muted">{s.email || '—'}</td>
                                                <td className="text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-glass text-indigo me-1"
                                                        onClick={() => handleOpenEdit(s)}
                                                        title="Edit Candidate"
                                                    >
                                                        <i className="fa fa-pencil"></i>
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-glass text-danger"
                                                            onClick={() => handleDelete(s)}
                                                            title="Delete Candidate"
                                                        >
                                                            <i className="fa fa-trash"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Candidate Modal */}
            {editingStudent && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content glass-card border-secondary border-opacity-25 shadow-lg">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-pencil me-2 text-indigo"></i> Edit Candidate
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setEditingStudent(null)}
                                    disabled={isSavingEdit}
                                ></button>
                            </div>

                            <form onSubmit={handleSaveEdit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Student Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Nee / Maiden Name
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editNeeName}
                                            onChange={(e) => setEditNeeName(e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Eligibility Case No. *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control font-monospace"
                                            value={editCaseNo}
                                            onChange={(e) => setEditCaseNo(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Verification Remarks
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editRemarks}
                                            onChange={(e) => setEditRemarks(e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-1">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setEditingStudent(null)}
                                        disabled={isSavingEdit}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-indigo" disabled={isSavingEdit}>
                                        {isSavingEdit ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-check me-1"></i> Update Candidate
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
};

export default BatchDetail;
