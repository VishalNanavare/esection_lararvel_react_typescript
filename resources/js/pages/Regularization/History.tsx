import React, { useState } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';
import Swal from 'sweetalert2';
import { promptLetterDetailsModal, updateRegularizationLetter } from '../../lib/letterPrompt';

interface RegularizationRecord {
    id: number;
    gender: string | null;
    student_name: string;
    eligibility_case_no: string | null;
    admission_taken_in: string | null;
    admission_taken_year: string | null;
    university_name: string | null;
    admission_letter_for: string | null;
    admission_letter_date: string | null;
    letter_no?: string | null;
    letter_date?: string | null;
    remarks?: string | null;
    created_by: string | null;
    created_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface Props {
    records: PaginatedData<RegularizationRecord>;
    filters: {
        name: string;
        case_no: string;
        university: string;
        year: string;
    };
}

export default function History({ records, filters }: Props) {
    const { props } = usePage<SharedProps>();
    const canDelete = props.features.delete;
    const canExport = props.features.export;

    const [name, setName] = useState(filters.name || '');
    const [caseNo, setCaseNo] = useState(filters.case_no || '');
    const [university, setUniversity] = useState(filters.university || '');
    const [year, setYear] = useState(filters.year || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/regularization/history', {
            name,
            case_no: caseNo,
            university,
            year,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setName('');
        setCaseNo('');
        setUniversity('');
        setYear('');
        router.get('/regularization/history');
    };

    const handleDelete = (id: number, studentName: string) => {
        Swal.fire({
            title: 'Delete Letter?',
            text: `Are you sure you want to delete the regularization letter for "${studentName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete!',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(`/regularization/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Regularization letter deleted.', 'success');
                    },
                });
            }
        });
    };

    const handleOpenLetterModal = (r: RegularizationRecord) => {
        promptLetterDetailsModal({
            initialLetterNo: r.letter_no || '',
            initialLetterDate: r.letter_date || '',
            initialRemarks: r.remarks || '',
            title: `Letter Details - ${r.student_name} (#${r.id})`,
            onSave: async (letterData) => {
                await updateRegularizationLetter(r.id, letterData);
                router.reload();
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Regularization Letter History" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> Regularization Letter History
                                </h3>
                                <p className="text-muted small mb-0">
                                    Browse, reprint, or manage past student eligibility regularization letters.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                {canExport && (
                                    <a
                                        href="/regularization/export"
                                        className="btn btn-glass"
                                        title="Export all regularization letters"
                                    >
                                        <i className="fa fa-file-excel-o me-1 text-emerald"></i> Export CSV
                                    </a>
                                )}
                                <Link href="/regularization" className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> New Regularization
                                </Link>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <form onSubmit={handleFilter} className="row g-3 mb-4 filter-panel p-3 bg-light rounded border">
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold text-secondary">Student Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by student name..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold text-secondary">Case No.</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by case no..."
                                    value={caseNo}
                                    onChange={(e) => setCaseNo(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold text-secondary">University</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by university..."
                                    value={university}
                                    onChange={(e) => setUniversity(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 d-flex align-items-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-glass"
                                    onClick={handleReset}
                                    title="Reset filters"
                                >
                                    <i className="fa fa-refresh"></i>
                                </button>
                                <button type="submit" className="btn btn-indigo flex-grow-1">
                                    <i className="fa fa-filter me-1"></i> Filter
                                </button>
                            </div>
                        </form>

                        {/* Table */}
                        <div className="table-responsive">
                            <table className="table table-glass table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Student Name</th>
                                        <th>Case No.</th>
                                        <th>Course / Year</th>
                                        <th>Target University</th>
                                        <th>Letter Details</th>
                                        <th>Admission Letter Date</th>
                                        <th>Issued By</th>
                                        <th className="text-end" style={{ width: '180px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-5">
                                                <i className="fa fa-file-text-o fa-2x mb-2 d-block text-secondary opacity-50"></i>
                                                No regularization letters found.
                                            </td>
                                        </tr>
                                    ) : (
                                        records.data.map((r, idx) => {
                                            const srNo = ((records.current_page - 1) * records.per_page) + idx + 1;
                                            return (
                                                <tr key={r.id}>
                                                    <td className="text-muted fw-semibold">{srNo}</td>
                                                    <td>
                                                        <strong>{r.gender} {r.student_name}</strong>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {r.eligibility_case_no || '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="d-block fw-semibold text-dark">{r.admission_taken_in || '-'}</span>
                                                        <small className="text-muted">{r.admission_taken_year || ''}</small>
                                                    </td>
                                                    <td className="small text-muted">{r.university_name || '-'}</td>
                                                    <td>
                                                        {r.letter_no ? (
                                                            <div>
                                                                <span className="badge bg-light text-primary border" title="Outward / Letter No.">
                                                                    <i className="fa fa-envelope-o me-1"></i>{r.letter_no}
                                                                </span>
                                                                {r.letter_date && (
                                                                    <div className="small text-muted mt-0.5">
                                                                        <i className="fa fa-calendar me-1"></i>{r.letter_date}
                                                                    </div>
                                                                )}
                                                                {r.remarks && (
                                                                    <div className="small text-secondary fst-italic mt-0.5 text-truncate" style={{ maxWidth: '170px' }} title={r.remarks}>
                                                                        <i className="fa fa-commenting-o me-1"></i>{r.remarks}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-link text-decoration-none text-muted p-0"
                                                                onClick={() => handleOpenLetterModal(r)}
                                                                title="Click to add Letter No., Date and Remarks"
                                                                style={{ fontSize: '0.78rem' }}
                                                            >
                                                                <i className="fa fa-plus-circle me-1 text-primary"></i>Add Letter No
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="small">
                                                        {r.admission_letter_date ? new Date(r.admission_letter_date).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="small text-secondary">{r.created_by || 'staff'}</td>
                                                    <td className="text-end">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-glass text-primary me-1"
                                                            onClick={() => handleOpenLetterModal(r)}
                                                            title="Add / Edit Letter No., Date and Remarks"
                                                        >
                                                            <i className="fa fa-file-text-o"></i> Letter
                                                        </button>
                                                        <a
                                                            href={`/pdf/regularization/${r.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-glass text-indigo me-1"
                                                            title="Print Letter"
                                                        >
                                                            <i className="fa fa-print"></i> Print
                                                        </a>
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-glass text-danger"
                                                                onClick={() => handleDelete(r.id, r.student_name)}
                                                                title="Delete letter"
                                                            >
                                                                <i className="fa fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {records.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                <small className="text-muted">
                                    Page {records.current_page} of {records.last_page} (Total {records.total})
                                </small>
                                <ul className="pagination pagination-sm mb-0">
                                    {records.links.map((link, i) => (
                                        <li
                                            key={i}
                                            className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                        >
                                            <Link
                                                href={link.url || '#'}
                                                className="page-link"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                preserveScroll
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
}
