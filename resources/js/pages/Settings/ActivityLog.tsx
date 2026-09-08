import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';

interface LogEntry {
    id: number;
    username: string;
    action: string;
    description: string;
    ip_address: string | null;
    created_at: string;
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
    logs: PaginatedData<LogEntry>;
}

export default function ActivityLog({ logs }: Props) {
    return (
        <AppLayout>
            <Head title="Activity Audit Log" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-list-alt me-2 text-indigo"></i> Administrative Activity Log
                                </h3>
                                <p className="text-muted small mb-0">
                                    Comprehensive audit trail of configuration updates and system events.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-glass table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Date &amp; Time</th>
                                        <th>Staff User</th>
                                        <th>Action</th>
                                        <th>Description</th>
                                        <th>IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-5">
                                                No activity logs recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.data.map((l, idx) => {
                                            const srNo = ((logs.current_page - 1) * logs.per_page) + idx + 1;
                                            return (
                                                <tr key={l.id}>
                                                    <td className="text-muted fw-semibold">{srNo}</td>
                                                    <td className="small text-muted">
                                                        {new Date(l.created_at).toLocaleString('en-GB')}
                                                    </td>
                                                    <td>
                                                        <strong className="text-dark">{l.username}</strong>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {l.action}
                                                        </span>
                                                    </td>
                                                    <td className="text-secondary">{l.description}</td>
                                                    <td className="small text-muted font-monospace">{l.ip_address || '-'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {logs.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                <small className="text-muted">
                                    Page {logs.current_page} of {logs.last_page} (Total {logs.total} entries)
                                </small>
                                <ul className="pagination pagination-sm mb-0">
                                    {logs.links.map((link, i) => (
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
