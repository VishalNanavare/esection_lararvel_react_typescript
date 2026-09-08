import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';

interface ConfBatchSummary {
    array_space: string;
    clg_name: string;
    course: string;
    en_time: string;
    en_user: string;
    dd_no: string | null;
    dd_amount: string | null;
    student_count: number;
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
    filters: {
        year: string;
        stream: string;
        q: string;
        batch: string;
    };
}

export const History: React.FC<HistoryProps> = ({ batches, filters }) => {
    const [batch, setBatch] = useState(filters.batch || '');
    const [stream, setStream] = useState(filters.stream || '');
    const [search, setSearch] = useState(filters.q || '');

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/confirmations/history', { batch, stream, q: search }, { preserveState: true });
    };

    const handleReset = () => {
        setBatch('');
        setStream('');
        setSearch('');
        router.get('/confirmations/history', {}, { preserveState: true });
    };

    return (
        <AppLayout title="Confirmation Batch History - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> Confirmation Batch History
                                </h3>
                                <p className="text-muted small mb-0">
                                    Audit recorded DD confirmations, candidate verifications, and payment batches.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Link href="/confirmations" className="btn btn-indigo">
                                    <i className="fa fa-check-square-o me-1"></i> Pending Confirmations
                                </Link>
                            </div>
                        </div>

                        {/* Filters */}
                        <form onSubmit={handleFilterSubmit} className="mb-4 p-3 bg-light rounded-3 border">
                            <div className="row g-3 align-items-end">
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label small text-muted">Batch #</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="e.g. 172570..."
                                        value={batch}
                                        onChange={(e) => setBatch(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label small text-muted">Program / Course</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="e.g. F.Y.B.Com"
                                        value={stream}
                                        onChange={(e) => setStream(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-md-4">
                                    <label className="form-label small text-muted">Search University / Candidate</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-md-2 d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-glass text-muted w-50" onClick={handleReset}>
                                        Reset
                                    </button>
                                    <button type="submit" className="btn btn-sm btn-indigo w-50">
                                        Filter
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Table */}
                        <div className="table-responsive rounded-3 border mb-4">
                            <table className="table table-glass align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '120px' }}>Batch #</th>
                                        <th>Target University</th>
                                        <th>Program</th>
                                        <th>DD Details</th>
                                        <th className="text-center">Candidates</th>
                                        <th>Confirmed By</th>
                                        <th>Timestamp</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-5">
                                                No confirmation batches found.
                                            </td>
                                        </tr>
                                    ) : (
                                        batches.data.map((b) => (
                                            <tr key={b.array_space}>
                                                <td>
                                                    <span className="font-monospace fw-bold text-indigo">
                                                        #{b.array_space}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '250px' }}>
                                                        {b.clg_name}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-glass-indigo">
                                                        {b.course}
                                                    </span>
                                                </td>
                                                <td>
                                                    {b.dd_no ? (
                                                        <div className="small">
                                                            <div><strong>DD:</strong> {b.dd_no}</div>
                                                            {b.dd_amount && <div className="text-muted">₹{b.dd_amount}</div>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted small">—</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge badge-glass-emerald">
                                                        {b.student_count} Confirmed
                                                    </span>
                                                </td>
                                                <td className="small text-muted">{b.en_user || 'Staff'}</td>
                                                <td className="small font-monospace text-muted">{b.en_time}</td>
                                                <td className="text-end">
                                                    <Link
                                                        href={`/confirmations/batches/${b.array_space}`}
                                                        className="btn btn-sm btn-glass me-1"
                                                    >
                                                        <i className="fa fa-eye me-1"></i> View
                                                    </Link>
                                                    <a
                                                        href={`/pdf/confirmation/${b.array_space}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-sm btn-glass text-indigo"
                                                        title="Print Confirmation Letter"
                                                    >
                                                        <i className="fa fa-print"></i>
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {batches.links && batches.links.length > 3 && (
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
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
