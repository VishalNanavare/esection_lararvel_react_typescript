import React, { useState } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';
import Swal from 'sweetalert2';

interface StudentReminderRecord {
    id: number;
    student_name: string;
    eligibility_case_no: string;
    course_name: string | null;
    missing_doc: string;
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
    links: PaginationLink[];
}

interface Props {
    records: PaginatedData<StudentReminderRecord>;
    filters: {
        search: string;
    };
}

export default function StudentHistory({ records, filters }: Props) {
    const { props } = usePage<SharedProps>();
    const canDelete = props.features.delete;
    const canExport = props.features.export;

    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/reminders/student/history', { search }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = (id: number, name: string) => {
        Swal.fire({
            title: 'Delete Notice?',
            text: `Are you sure you want to delete the notice for "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete!',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(`/reminders/student/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', 'Candidate notice removed.', 'success');
                    },
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Candidate Reminder History" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> Candidate Reminder Notices
                                </h3>
                                <p className="text-muted small mb-0">
                                    Historical record of direct document reminder notices issued to candidates.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                {canExport && (
                                    <a
                                        href="/reminders/student/export"
                                        className="btn btn-glass"
                                        title="Export to CSV"
                                    >
                                        <i className="fa fa-file-excel-o me-1 text-emerald"></i> Export CSV
                                    </a>
                                )}
                                <Link href="/reminders/student" className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> Issue New Notice
                                </Link>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="row g-3 mb-4 filter-panel p-3 bg-light rounded border">
                            <div className="col-md-9">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by candidate name or case no..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 d-flex gap-2">
                                <Link href="/reminders/student/history" className="btn btn-glass" title="Reset">
                                    <i className="fa fa-refresh"></i>
                                </Link>
                                <button type="submit" className="btn btn-indigo flex-grow-1">
                                    <i className="fa fa-search me-1"></i> Search
                                </button>
                            </div>
                        </form>

                        {/* Table */}
                        <div className="table-responsive">
                            <table className="table table-glass table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Candidate Name</th>
                                        <th>Case No.</th>
                                        <th>Course</th>
                                        <th>Missing Document(s)</th>
                                        <th>Issued On</th>
                                        <th className="text-end" style={{ width: '160px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-5">
                                                <i className="fa fa-folder-open-o fa-2x mb-2 d-block text-secondary opacity-50"></i>
                                                No candidate notices found.
                                            </td>
                                        </tr>
                                    ) : (
                                        records.data.map((r, idx) => {
                                            const srNo = ((records.current_page - 1) * records.per_page) + idx + 1;
                                            return (
                                                <tr key={r.id}>
                                                    <td className="text-muted fw-semibold">{srNo}</td>
                                                    <td>
                                                        <strong className="text-dark">{r.student_name}</strong>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {r.eligibility_case_no}
                                                        </span>
                                                    </td>
                                                    <td className="small text-secondary">{r.course_name || '-'}</td>
                                                    <td className="small text-muted" style={{ maxWidth: '300px' }}>
                                                        {r.missing_doc}
                                                    </td>
                                                    <td className="small text-muted">
                                                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="text-end">
                                                        <a
                                                            href={`/pdf/reminders/student/${r.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-glass text-indigo me-1"
                                                            title="Print Notice"
                                                        >
                                                            <i className="fa fa-print"></i> Print
                                                        </a>
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-glass text-danger"
                                                                onClick={() => handleDelete(r.id, r.student_name)}
                                                                title="Delete"
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
