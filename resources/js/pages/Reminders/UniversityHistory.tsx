import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';

interface BatchSummary {
    id: number;
    academic_year: string;
    university_name: string;
    admission_taken_in: string | null;
    student_count?: number;
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
    batches: PaginatedData<BatchSummary>;
    filters: {
        university: string;
        year: string;
    };
}

export default function UniversityHistory({ batches, filters }: Props) {
    const [university, setUniversity] = useState(filters.university || '');
    const [year, setYear] = useState(filters.year || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/reminders/university/history', {
            university,
            year,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout>
            <Head title="University Reminder History" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> University Reminder Batches
                                </h3>
                                <p className="text-muted small mb-0">
                                    List of historical reminder notices generated for target universities.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <Link href="/reminders/university" className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> New University Reminder
                                </Link>
                            </div>
                        </div>

                        {/* Filter */}
                        <form onSubmit={handleFilter} className="row g-3 mb-4 filter-panel p-3 bg-light rounded border">
                            <div className="col-md-5">
                                <label className="form-label small fw-semibold text-secondary">University Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by university..."
                                    value={university}
                                    onChange={(e) => setUniversity(e.target.value)}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-semibold text-secondary">Academic Year</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. 2025-2026"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 d-flex align-items-end gap-2">
                                <Link href="/reminders/university/history" className="btn btn-glass" title="Reset">
                                    <i className="fa fa-refresh"></i>
                                </Link>
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
                                        <th>Target University</th>
                                        <th>Academic Year</th>
                                        <th>Course / Division</th>
                                        <th>Candidates Included</th>
                                        <th>Created Date</th>
                                        <th className="text-end" style={{ width: '180px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-5">
                                                <i className="fa fa-folder-open-o fa-2x mb-2 d-block text-secondary opacity-50"></i>
                                                No reminder batches found.
                                            </td>
                                        </tr>
                                    ) : (
                                        batches.data.map((b, idx) => {
                                            const srNo = ((batches.current_page - 1) * batches.per_page) + idx + 1;
                                            return (
                                                <tr key={b.id}>
                                                    <td className="text-muted fw-semibold">{srNo}</td>
                                                    <td>
                                                        <strong className="text-dark fs-6 d-block">{b.university_name}</strong>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {b.academic_year}
                                                        </span>
                                                    </td>
                                                    <td className="small text-secondary">{b.admission_taken_in || '-'}</td>
                                                    <td>
                                                        <span className="badge bg-indigo bg-opacity-10 text-indigo border border-indigo border-opacity-25 px-2 py-1">
                                                            {b.student_count || 0} Candidates
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted">
                                                        {b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="text-end">
                                                        <Link
                                                            href={`/reminders/university/batches/${b.id}`}
                                                            className="btn btn-sm btn-glass text-indigo me-1"
                                                        >
                                                            <i className="fa fa-eye me-1"></i> View
                                                        </Link>
                                                        <a
                                                            href={`/pdf/reminders/university/${b.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-glass text-secondary"
                                                            title="Print Notice"
                                                        >
                                                            <i className="fa fa-print"></i> Print
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {batches.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                <small className="text-muted">
                                    Page {batches.current_page} of {batches.last_page}
                                </small>
                                <ul className="pagination pagination-sm mb-0">
                                    {batches.links.map((link, i) => (
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
