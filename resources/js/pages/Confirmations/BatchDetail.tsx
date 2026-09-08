import React from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';

interface ConfRecord {
    id: number;
    student_id: number;
    case_no: string;
    name: string;
    course: string;
    clg_name: string;
    mig_tc: string;
    p_degree: string;
    s_marks: string;
    letter_no_date: string | null;
    remark: string | null;
    conf_from: string | null;
    conf_from_text: string | null;
    conf_from_select: string | null;
    etc_data: string | null;
    dd_no: string | null;
    dd_amount: string | null;
    bank_name: string | null;
    dd_date: string | null;
    en_time: string;
    en_user: string;
}

interface BatchDetailProps {
    title: string;
    arraySpace: string;
    confirmations: ConfRecord[];
}

export const BatchDetail: React.FC<BatchDetailProps> = ({ arraySpace, confirmations }) => {
    const { props } = usePage<SharedProps>();
    const { features, auth } = props;
    const canDelete = features.delete || auth.user?.role === 'admin';

    const firstRecord = confirmations[0];

    const handleDelete = (c: ConfRecord) => {
        Swal.fire({
            title: 'Delete Confirmation Record?',
            text: `Are you sure you want to delete eligibility confirmation for ${c.name} (${c.case_no})?`,
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
                router.delete(`/confirmations/${c.id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: 'Confirmation record removed.',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    return (
        <AppLayout title={`Confirmation Batch #${arraySpace} - E-Section Portal`}>
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-folder-open-o me-2 text-indigo"></i>
                                    Confirmation Batch <span className="text-indigo">#{arraySpace}</span>
                                </h3>
                                <div className="text-muted small">
                                    <strong>University:</strong> {firstRecord?.clg_name || 'N/A'} |{' '}
                                    <strong>Program:</strong> {firstRecord?.course || 'N/A'} |{' '}
                                    <strong>Operator:</strong> {firstRecord?.en_user || 'Staff'}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Link href="/confirmations/history" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to History
                                </Link>
                                <a
                                    href={`/pdf/confirmation/${arraySpace}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-indigo"
                                >
                                    <i className="fa fa-print me-1"></i> Print Confirmation Letter
                                </a>
                            </div>
                        </div>

                        {/* DD Info Card if DD exists */}
                        {firstRecord?.dd_no && (
                            <div className="alert bg-light border p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                                <div>
                                    <span className="fw-bold text-dark me-3">
                                        <i className="fa fa-credit-card text-indigo me-1"></i> DD No: {firstRecord.dd_no}
                                    </span>
                                    {firstRecord.dd_amount && (
                                        <span className="text-muted me-3">Amount: ₹{firstRecord.dd_amount}</span>
                                    )}
                                    {firstRecord.bank_name && (
                                        <span className="text-muted me-3">Bank: {firstRecord.bank_name}</span>
                                    )}
                                    {firstRecord.dd_date && (
                                        <span className="text-muted">Dated: {firstRecord.dd_date}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="table-responsive rounded-3 border">
                            <table className="table table-glass align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Candidate Name</th>
                                        <th>Case No.</th>
                                        <th className="text-center">Migration/TC</th>
                                        <th className="text-center">Pass/Degree</th>
                                        <th className="text-center">Marksheet</th>
                                        <th>Letter / Remarks</th>
                                        <th>Clarification</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {confirmations.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-5">
                                                All confirmations in this batch have been deleted.
                                            </td>
                                        </tr>
                                    ) : (
                                        confirmations.map((c, idx) => (
                                            <tr key={c.id}>
                                                <td className="fw-semibold text-muted">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="fw-bold text-dark">{c.name}</td>
                                                <td>
                                                    <span className="badge badge-glass-indigo font-monospace">
                                                        {c.case_no}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${c.mig_tc === 'Yes' ? 'badge-glass-emerald' : 'badge-glass-rose'}`}>
                                                        {c.mig_tc}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${c.p_degree === 'Yes' ? 'badge-glass-emerald' : 'badge-glass-rose'}`}>
                                                        {c.p_degree}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${c.s_marks === 'Yes' ? 'badge-glass-emerald' : 'badge-glass-rose'}`}>
                                                        {c.s_marks}
                                                    </span>
                                                </td>
                                                <td className="small">
                                                    {c.letter_no_date && <div><strong>Letter:</strong> {c.letter_no_date}</div>}
                                                    {c.remark && <div className="text-muted"><strong>Remark:</strong> {c.remark}</div>}
                                                    {!c.letter_no_date && !c.remark && <span className="text-muted">—</span>}
                                                </td>
                                                <td className="small">
                                                    {c.conf_from && <div><strong>From:</strong> {c.conf_from} {c.conf_from_text}</div>}
                                                    {c.conf_from_select && <div className="text-muted">{c.conf_from_select}</div>}
                                                    {c.etc_data && <div className="text-muted"><em>{c.etc_data}</em></div>}
                                                    {!c.conf_from && !c.conf_from_select && !c.etc_data && <span className="text-muted">—</span>}
                                                </td>
                                                <td className="text-end">
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-glass text-danger"
                                                            onClick={() => handleDelete(c)}
                                                            title="Delete Confirmation"
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
        </AppLayout>
    );
};

export default BatchDetail;
