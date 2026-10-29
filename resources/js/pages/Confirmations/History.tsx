import React, { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { Select2 } from '../../components/Select2';
import { promptLetterDetailsModal, updateConfirmationBatchLetter } from '../../lib/letterPrompt';

interface CandidateItem {
    id: number;
    student_id: number | null;
    student_name: string;
    student_nee_name: string | null;
    university_name: string;
    college_address?: string | null;
    case_no: string | null;
    mig_tc: string | null;
    p_degree: string | null;
    s_marks: string | null;
    letter_no_date: string | null;
    remark: string | null;
    conf_from: string | null;
    conf_from_select: string | null;
    conf_from_text: string | null;
    etc_data: string | null;
}

interface ConfBatchSummary {
    array_space: string;
    uni_add: string;
    stream: string;
    en_time: string;
    en_by: string;
    dd_no: string | null;
    bank_name: string | null;
    dd_date: string | null;
    dd_amount: string | null;
    student_count: number;
    letter_no?: string | null;
    letter_date?: string | null;
    remarks?: string | null;
    candidates: CandidateItem[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedBatches {
    data: ConfBatchSummary[];
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
    links: PaginationLink[];
}

interface HistoryProps {
    title: string;
    batches: PaginatedBatches;
    streams?: Array<{ id: string; text: string; value: string; label: string }>;
    universities?: Array<{ id: string; text: string; value: string; label: string }>;
    filters: {
        year?: string;
        stream?: string;
        university?: string;
        student_name?: string;
        batch?: string;
        q?: string;
    };
}

export const History: React.FC<HistoryProps> = ({
    batches,
    streams = [],
    universities = [],
    filters,
}) => {
    const [batch, setBatch] = useState(filters.batch || '');
    const [stream, setStream] = useState(filters.stream || '');
    const [university, setUniversity] = useState(filters.university || '');
    const [studentName, setStudentName] = useState(filters.student_name || '');

    const streamOptions = useMemo(() => {
        return [
            { value: '', label: '-- All Programs / Courses --' },
            ...streams.map((s) => ({ value: s.value, label: s.label || s.text })),
        ];
    }, [streams]);

    const universityOptions = useMemo(() => {
        return [
            { value: '', label: '-- All Universities --' },
            ...universities.map((u) => ({ value: u.value, label: u.label || u.text })),
        ];
    }, [universities]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/confirmations/history',
            {
                batch: batch.trim(),
                stream: stream.trim(),
                university: university.trim(),
                student_name: studentName.trim(),
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setBatch('');
        setStream('');
        setUniversity('');
        setStudentName('');
        router.get('/confirmations/history', {}, { preserveState: false });
    };

    const handleDeleteCandidate = (id: number, caseOrName: string) => {
        Swal.fire({
            title: 'Delete Confirmation?',
            text: `Are you sure you want to delete confirmation for ${caseOrName || 'this candidate'}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(`/confirmations/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Confirmation record has been deleted.',
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

    const hasActiveFilters = Boolean(batch || stream || university || studentName);

    const handleOpenLetterModal = (b: ConfBatchSummary) => {
        promptLetterDetailsModal({
            initialLetterNo: b.letter_no || '',
            initialLetterDate: b.letter_date || '',
            initialRemarks: b.remarks || '',
            title: `Letter Details - Confirmation Batch #${b.array_space}`,
            onSave: async (letterData) => {
                await updateConfirmationBatchLetter(b.array_space, letterData);
                router.reload();
            },
        });
    };

    return (
        <AppLayout title="Confirmation Batch History - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> Confirmation Data View
                                </h3>
                                <p className="text-muted small mb-0">
                                    View confirmed eligibility batches, candidates, DD records, and print official letters.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Link href="/confirmations" className="btn btn-indigo">
                                    <i className="fa fa-check-square-o me-1"></i> Pending Confirmations
                                </Link>
                            </div>
                        </div>

                        {/* Search & Filter Panel */}
                        <form onSubmit={handleFilterSubmit} className="mb-4 p-3 bg-light rounded-3 border">
                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-sm-6 col-lg-2">
                                    <label className="form-label text-secondary small fw-semibold" htmlFor="filter_batch">
                                        Batch #
                                    </label>
                                    <input
                                        type="text"
                                        id="filter_batch"
                                        className="form-control"
                                        placeholder="e.g. 5761"
                                        value={batch}
                                        onChange={(e) => setBatch(e.target.value)}
                                    />
                                </div>
                                <div className="col-12 col-sm-6 col-lg-3">
                                    <label className="form-label text-secondary small fw-semibold" htmlFor="filter_stream">
                                        Program / Course
                                    </label>
                                    <Select2
                                        id="filter_stream"
                                        name="stream"
                                        value={stream}
                                        onChange={setStream}
                                        options={streamOptions}
                                        placeholder="-- All Programs / Courses --"
                                        allowClear={true}
                                    />
                                </div>
                                <div className="col-12 col-sm-6 col-lg-4">
                                    <label className="form-label text-secondary small fw-semibold" htmlFor="filter_university">
                                        Search University
                                    </label>
                                    <Select2
                                        id="filter_university"
                                        name="university"
                                        value={university}
                                        onChange={setUniversity}
                                        options={universityOptions}
                                        placeholder="-- All Target Universities --"
                                        allowClear={true}
                                    />
                                </div>
                                <div className="col-12 col-sm-6 col-lg-3">
                                    <label className="form-label text-secondary small fw-semibold" htmlFor="filter_student_name">
                                        Student Name
                                    </label>
                                    <input
                                        type="text"
                                        id="filter_student_name"
                                        className="form-control"
                                        placeholder="Search candidate name..."
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                    />
                                </div>
                                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                                    {hasActiveFilters && (
                                        <button type="button" className="btn btn-glass" onClick={handleReset}>
                                            <i className="fa fa-times me-1"></i> Clear Filters
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-indigo px-4">
                                        <i className="fa fa-search me-1"></i> Search Confirmations
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Confirmation Batch Tables */}
                        {batches.data.length === 0 ? (
                            <div className="text-center text-muted py-5 border rounded-3 bg-light mb-4">
                                <i className="fa fa-folder-open-o fs-1 mb-2 text-secondary opacity-50"></i>
                                <h5 className="fw-bold text-dark mb-1">No Confirmation Records Found</h5>
                                <p className="small text-muted mb-0">
                                    No confirmation batches match the search criteria. Try modifying your filter options.
                                </p>
                            </div>
                        ) : (
                            batches.data.map((b) => (
                                <div key={b.array_space} className="card border shadow-sm rounded-3 mb-4 overflow-hidden">
                                    {/* Batch Header Bar */}
                                    <div className="card-header bg-light py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2 border-bottom">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="badge bg-indigo text-white font-monospace fs-6 px-2.5 py-1.5">
                                                Batch #{b.array_space}
                                            </span>
                                            {b.stream && (
                                                <span className="badge bg-secondary-subtle text-dark border">
                                                    {b.stream}
                                                </span>
                                            )}
                                            {b.uni_add && (
                                                <span className="text-secondary small fw-semibold">
                                                    <i className="fa fa-university text-indigo me-1"></i>
                                                    {b.uni_add}
                                                </span>
                                            )}
                                            {b.dd_no && (
                                                <span className="badge bg-success-subtle text-success border">
                                                    <i className="fa fa-money me-1"></i>
                                                    DD: {b.dd_no} {b.dd_amount ? `(₹${b.dd_amount})` : ''} {b.bank_name ? `• ${b.bank_name}` : ''}
                                                </span>
                                            )}
                                            <span className="badge bg-primary-subtle text-primary border">
                                                {b.student_count || b.candidates?.length || 0} Candidate(s)
                                            </span>
                                            {b.letter_no ? (
                                                <span className="badge bg-light text-primary border" title="Outward / Letter No.">
                                                    <i className="fa fa-envelope-o me-1"></i>Letter: {b.letter_no}
                                                    {b.letter_date && <span className="ms-1 text-muted">({b.letter_date})</span>}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-link text-decoration-none text-muted p-0"
                                                    onClick={() => handleOpenLetterModal(b)}
                                                    title="Click to add Letter No, Date & Remarks"
                                                    style={{ fontSize: '0.78rem' }}
                                                >
                                                    <i className="fa fa-plus-circle me-1 text-primary"></i>Add Letter No
                                                </button>
                                            )}
                                            {b.remarks && (
                                                <span className="badge bg-light text-secondary border" title={`Remarks: ${b.remarks}`}>
                                                    <i className="fa fa-commenting-o me-1"></i>{b.remarks}
                                                </span>
                                            )}
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            {b.en_time && (
                                                <span className="text-muted small">
                                                    <i className="fa fa-clock-o me-1"></i> {b.en_time}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleOpenLetterModal(b)}
                                                title="Add / Edit Letter No., Date and Remarks"
                                            >
                                                <i className="fa fa-file-text-o me-1"></i> Letter Details
                                            </button>
                                            <a
                                                href={`/pdf/confirmation/${b.array_space}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-sm btn-indigo"
                                                title="Print Confirmation Letter (PDF)"
                                            >
                                                <i className="fa fa-file-pdf-o me-1"></i> Print Confirmation Letter
                                            </a>
                                        </div>
                                    </div>

                                    {/* Batch Candidate Table */}
                                    <div className="table-responsive">
                                        <table className="table table-striped table-bordered table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                                            <thead className="table-light">
                                                <tr className="text-secondary text-uppercase" style={{ fontSize: '12px' }}>
                                                    <th style={{ width: '45px' }} className="text-center">No.</th>
                                                    <th style={{ minWidth: '180px' }}>Name</th>
                                                    <th style={{ minWidth: '220px' }}>University Name</th>
                                                    <th style={{ width: '130px' }} className="text-center">Case No.</th>
                                                    <th style={{ width: '80px' }} className="text-center">Mig / TC</th>
                                                    <th style={{ width: '80px' }} className="text-center">Pass/Dgr</th>
                                                    <th style={{ width: '100px' }} className="text-center">Statement of Marks</th>
                                                    <th style={{ minWidth: '180px' }}>Letter No. Dated</th>
                                                    <th style={{ minWidth: '160px' }}>Remark</th>
                                                    <th style={{ width: '130px' }} className="text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(!b.candidates || b.candidates.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={10} className="text-center text-muted py-3">
                                                            No candidate records found in this batch.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    b.candidates.map((c, idx) => (
                                                        <tr key={c.id}>
                                                            <td className="text-center text-muted fw-semibold">{idx + 1}</td>
                                                            <td>
                                                                <div className="fw-bold text-dark">{c.student_name || '—'}</div>
                                                                {c.student_nee_name && (
                                                                    <div className="small text-muted mt-0.5">
                                                                        <b>( Nee Name : {c.student_nee_name} )</b>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div className="fw-semibold text-dark" style={{ lineHeight: '1.4' }}>
                                                                    {c.university_name || b.uni_add || '—'}
                                                                </div>
                                                                {c.college_address && c.college_address !== c.university_name && (
                                                                    <div className="text-muted mt-0.5" style={{ fontSize: '11px', lineHeight: '1.3' }}>
                                                                        {c.college_address.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="text-center font-monospace fw-bold text-indigo">
                                                                {c.case_no || '—'}
                                                            </td>
                                                            <td className="text-center">
                                                                <span className={`badge ${c.mig_tc === 'Yes' ? 'bg-success-subtle text-success' : 'bg-light text-muted border'}`}>
                                                                    {c.mig_tc || 'No'}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className={`badge ${c.p_degree === 'Yes' ? 'bg-success-subtle text-success' : 'bg-light text-muted border'}`}>
                                                                    {c.p_degree || 'No'}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className={`badge ${c.s_marks === 'Yes' ? 'bg-success-subtle text-success' : 'bg-light text-muted border'}`}>
                                                                    {c.s_marks || 'No'}
                                                                </span>
                                                            </td>
                                                            <td className="small">
                                                                {c.letter_no_date || '—'}
                                                            </td>
                                                            <td className="small">
                                                                <div>{c.remark || 'OK'}</div>
                                                                {c.conf_from && (
                                                                    <div className="text-muted mt-1" style={{ fontSize: '11.5px' }}>
                                                                        <div><b>Conf. From :</b> {c.conf_from}</div>
                                                                        {c.conf_from_select && <div>{c.conf_from_select}</div>}
                                                                        {c.etc_data && <div>{c.etc_data}</div>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="d-flex justify-content-center gap-1">
                                                                    <a
                                                                        href={`/pdf/confirmation/${b.array_space}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="btn btn-sm btn-primary py-0.5 px-2"
                                                                        style={{ fontSize: '12px' }}
                                                                        title="View official confirmation letter"
                                                                    >
                                                                        View
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-dark py-0.5 px-2"
                                                                        style={{ fontSize: '12px' }}
                                                                        onClick={() => handleDeleteCandidate(c.id, c.case_no || c.student_name)}
                                                                        title="Delete candidate confirmation"
                                                                    >
                                                                        delete
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Pagination */}
                        {batches.links && batches.links.length > 3 && (
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4">
                                <div className="small text-muted">
                                    Showing {batches.from || 0} to {batches.to || 0} of {batches.total} batches
                                </div>
                                <ul className="pagination pagination-sm mb-0">
                                    {batches.links.map((link, idx) => (
                                        <li
                                            key={idx}
                                            className={`page-item ${link.active ? 'active' : ''} ${
                                                !link.url ? 'disabled' : ''
                                            }`}
                                        >
                                            <Link
                                                href={link.url || '#'}
                                                className="page-link"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default History;
