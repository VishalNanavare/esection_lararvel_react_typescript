import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';
import { promptLetterDetailsModal, updateConfirmationBatchLetter } from '../../lib/letterPrompt';
import {
    EditConfirmationBatchModal,
    EditConfirmationCandidateModal,
    BatchEditData,
    CandidateEditData,
} from '../../components/ConfirmationEditModals';

interface ConfRecord {
    id: number;
    student_id: number;
    case_no: string;
    name: string;
    stream: string;
    uni_add: string;
    mig_TC: string;
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
    en_by: string;
    letter_no?: string | null;
    letter_date?: string | null;
    remarks?: string | null;
}

interface BatchInfo {
    letter_no?: string;
    letter_date?: string;
    remarks?: string;
    stream?: string;
    uni_add?: string;
    acd_year?: string;
    en_time?: string;
    en_by?: string;
    dd_no?: string;
    bank_name?: string;
    dd_date?: string;
    dd_amount?: string;
}

interface BatchDetailProps {
    title: string;
    arraySpace: string;
    confirmations: ConfRecord[];
    batchInfo?: BatchInfo;
}

export const BatchDetail: React.FC<BatchDetailProps> = ({ arraySpace, confirmations, batchInfo }) => {
    const { props } = usePage<SharedProps>();
    const { features } = props;
    const isAdmin = props.auth?.user?.role === 'admin';
    const canDelete = isAdmin && (features?.delete ?? true);

    const [editingBatch, setEditingBatch] = useState<BatchEditData | null>(null);
    const [editingCandidate, setEditingCandidate] = useState<CandidateEditData | null>(null);

    const firstRecord = confirmations[0];

    const handleOpenLetterDetails = () => {
        promptLetterDetailsModal({
            initialLetterNo: batchInfo?.letter_no || firstRecord?.letter_no || '',
            initialLetterDate: batchInfo?.letter_date || firstRecord?.letter_date || '',
            initialRemarks: batchInfo?.remarks || firstRecord?.remarks || firstRecord?.remark || '',
            title: `Letter Details - Confirmation Batch #${arraySpace}`,
            onSave: async (letterData) => {
                await updateConfirmationBatchLetter(arraySpace, letterData);
                router.reload();
            },
        });
    };

    const handleOpenEditBatch = () => {
        setEditingBatch({
            array_space: arraySpace,
            uni_add: batchInfo?.uni_add || firstRecord?.uni_add || '',
            stream: batchInfo?.stream || firstRecord?.stream || '',
            acd_year: batchInfo?.acd_year || '',
            dd_no: batchInfo?.dd_no || firstRecord?.dd_no || null,
            bank_name: batchInfo?.bank_name || firstRecord?.bank_name || null,
            dd_date: batchInfo?.dd_date || firstRecord?.dd_date || null,
            dd_amount: batchInfo?.dd_amount || firstRecord?.dd_amount || null,
            letter_no: batchInfo?.letter_no || firstRecord?.letter_no || null,
            letter_date: batchInfo?.letter_date || firstRecord?.letter_date || null,
            remarks: batchInfo?.remarks || firstRecord?.remarks || firstRecord?.remark || null,
        });
    };

    const handleOpenEditCandidate = (c: ConfRecord) => {
        setEditingCandidate({
            id: c.id,
            name: c.name,
            student_name: c.name,
            case_no: c.case_no,
            uni_add: c.uni_add,
            university_name: c.uni_add,
            stream: c.stream,
            mig_tc: c.mig_TC,
            p_degree: c.p_degree,
            s_marks: c.s_marks,
            letter_no_date: c.letter_no_date,
            remark: c.remark,
            conf_from: c.conf_from,
            conf_from_select: c.conf_from_select,
            conf_from_text: c.conf_from_text,
            etc_data: c.etc_data,
            dd_no: c.dd_no,
            bank_name: c.bank_name,
            dd_date: c.dd_date,
            dd_amount: c.dd_amount,
            letter_no: c.letter_no,
            letter_date: c.letter_date,
            remarks: c.remarks,
        });
    };

    const handleDeleteBatch = () => {
        Swal.fire({
            title: `Delete Confirmation Batch #${arraySpace}?`,
            html: `Are you sure you want to delete this entire batch and all <strong>${confirmations.length}</strong> confirmation record(s)?<br/><span class="text-danger small">This action is restricted to administrators and cannot be undone.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Delete Batch',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(`/confirmations/batches/${encodeURIComponent(arraySpace)}`, {
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: `Confirmation Batch #${arraySpace} has been deleted.`,
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                    onError: (err) => {
                        Swal.fire('Error', Object.values(err).flat().join('\n') || 'Failed to delete batch.', 'error');
                    },
                });
            }
        });
    };

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
                    onError: (err) => {
                        Swal.fire('Error', Object.values(err).flat().join('\n') || 'Failed to delete record.', 'error');
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
                                    <strong>University:</strong> {firstRecord?.uni_add || 'N/A'} |{' '}
                                    <strong>Program:</strong> {firstRecord?.stream || 'N/A'} |{' '}
                                    <strong>Operator:</strong> {firstRecord?.en_by || 'Staff'}
                                </div>
                                <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
                                    <span className="badge bg-light text-primary border px-2.5 py-1.5" title="Letter / Outward Number">
                                        <i className="fa fa-envelope-o me-1"></i>
                                        <strong>Letter No:</strong> {batchInfo?.letter_no || firstRecord?.letter_no || 'Not Set'}
                                    </span>
                                    <span className="badge bg-light text-muted border px-2.5 py-1.5" title="Letter Date">
                                        <i className="fa fa-calendar me-1"></i>
                                        <strong>Date:</strong> {batchInfo?.letter_date || firstRecord?.letter_date || 'Not Set'}
                                    </span>
                                    {(batchInfo?.remarks || firstRecord?.remarks || firstRecord?.remark) && (
                                        <span className="badge bg-light text-secondary border px-2.5 py-1.5" title="Remarks">
                                            <i className="fa fa-commenting-o me-1"></i>
                                            <strong>Remarks:</strong> {batchInfo?.remarks || firstRecord?.remarks || firstRecord?.remark}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={handleOpenLetterDetails}
                                    title="Add or edit Letter No., Date and Remarks"
                                >
                                    <i className="fa fa-file-text-o me-1"></i> Letter Details
                                </button>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-warning text-dark fw-semibold"
                                        onClick={handleOpenEditBatch}
                                        title="Edit Batch & DD Details (Admin Only)"
                                    >
                                        <i className="fa fa-pencil me-1 text-warning"></i> Edit Batch
                                    </button>
                                )}
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
                                {canDelete && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={handleDeleteBatch}
                                        title="Delete Entire Confirmation Batch (Admin Only)"
                                    >
                                        <i className="fa fa-trash-o me-1"></i> Delete Batch
                                    </button>
                                )}
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
                                                    <span className={`badge ${c.mig_TC === 'Yes' ? 'badge-glass-emerald' : 'badge-glass-rose'}`}>
                                                        {c.mig_TC}
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
                                                    <div className="d-flex justify-content-end gap-1">
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-warning text-dark py-1 px-2"
                                                                onClick={() => handleOpenEditCandidate(c)}
                                                                title="Edit Candidate Details (Admin Only)"
                                                            >
                                                                <i className="fa fa-pencil me-1"></i> Edit
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger py-1 px-2"
                                                                onClick={() => handleDelete(c)}
                                                                title="Delete Confirmation Record (Admin Only)"
                                                            >
                                                                <i className="fa fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
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

            {editingBatch && (
                <EditConfirmationBatchModal
                    batch={editingBatch}
                    onClose={() => setEditingBatch(null)}
                    onSuccess={() => {
                        setEditingBatch(null);
                        router.reload();
                    }}
                />
            )}

            {editingCandidate && (
                <EditConfirmationCandidateModal
                    candidate={editingCandidate}
                    onClose={() => setEditingCandidate(null)}
                    onSuccess={() => {
                        setEditingCandidate(null);
                        router.reload();
                    }}
                />
            )}
        </AppLayout>
    );
};

export default BatchDetail;
