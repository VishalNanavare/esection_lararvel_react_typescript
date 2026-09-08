import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface EmailLogItem {
    id: number;
    batch_ref: string | null;
    template_slug: string | null;
    recipient_type: string | null;
    recipient_name: string | null;
    recipient_email: string;
    subject: string | null;
    status: string;
    error_message: string | null;
    attempts: number;
    sent_by: string | null;
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
    logs: PaginatedData<EmailLogItem>;
    filters: {
        status: string;
    };
}

export default function Log({ logs, filters }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    const handleFilter = (status: string) => {
        setStatusFilter(status);
        router.get('/bulk-email/log', { status }, { preserveState: true, replace: true });
    };

    const handleRetry = (id: number) => {
        router.post(`/bulk-email/retry/${id}`, {}, {
            onSuccess: () => Swal.fire('Retried', 'Email resend attempt queued.', 'success'),
        });
    };

    const handleRetryAll = () => {
        Swal.fire({
            title: 'Retry all failed emails?',
            text: 'This will attempt to resend every failed email currently in the log.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, retry all',
        }).then((res) => {
            if (res.isConfirmed) {
                router.post('/bulk-email/retry-all', {}, {
                    onSuccess: () => Swal.fire('Done', 'All failed emails have been queued for retry.', 'success'),
                });
            }
        });
    };

    const hasFailed = logs.data.some(l => l.status === 'failed');

    return (
        <AppLayout>
            <Head title="Sent Emails Log" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-list-alt me-2 text-indigo"></i> Sent Emails Log
                                </h3>
                                <p className="text-muted small mb-0">
                                    Inspect all dispatched emails, delivery statuses, and retry any failed deliveries.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                {hasFailed && (
                                    <button
                                        type="button"
                                        onClick={handleRetryAll}
                                        className="btn btn-glass text-warning"
                                    >
                                        <i className="fa fa-refresh me-1"></i> Retry All Failed
                                    </button>
                                )}
                                <Link href="/bulk-email" className="btn btn-indigo">
                                    <i className="fa fa-paper-plane me-1"></i> Send New Batch
                                </Link>
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => handleFilter('')}
                                className={`btn btn-sm ${statusFilter === '' ? 'btn-indigo' : 'btn-glass'}`}
                            >
                                All ({logs.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilter('sent')}
                                className={`btn btn-sm ${statusFilter === 'sent' ? 'btn-indigo' : 'btn-glass'}`}
                            >
                                Sent
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFilter('failed')}
                                className={`btn btn-sm ${statusFilter === 'failed' ? 'btn-indigo' : 'btn-glass'}`}
                            >
                                Failed
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-4 mb-4">
                        <div className="table-responsive">
                            <table className="table table-hover table-glass mb-0">
                                <thead>
                                    <tr>
                                        <th>Date &amp; Time</th>
                                        <th>Batch Ref</th>
                                        <th>Recipient</th>
                                        <th>Subject</th>
                                        <th>Status</th>
                                        <th>Sent By</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-5 text-muted">
                                                <i className="fa fa-envelope-o fs-1 mb-2 d-block text-secondary"></i>
                                                No email logs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.data.map((l) => (
                                            <tr key={l.id}>
                                                <td className="small text-muted">
                                                    {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                                                </td>
                                                <td className="small font-monospace">{l.batch_ref || '—'}</td>
                                                <td>
                                                    <div className="fw-semibold text-dark">{l.recipient_name || '—'}</div>
                                                    <div className="small text-muted">{l.recipient_email}</div>
                                                </td>
                                                <td className="small">{l.subject || '—'}</td>
                                                <td>
                                                    {l.status === 'sent' ? (
                                                        <span className="badge badge-glass-emerald">Sent</span>
                                                    ) : (
                                                        <span
                                                            className="badge badge-glass-amber cursor-pointer"
                                                            title={l.error_message || 'Failed delivery'}
                                                        >
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="small text-muted">{l.sent_by || 'system'}</td>
                                                <td className="text-end">
                                                    {l.status === 'failed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRetry(l.id)}
                                                            className="btn btn-sm btn-glass text-indigo"
                                                            title="Retry Send"
                                                        >
                                                            <i className="fa fa-refresh"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {logs.links && logs.links.length > 3 && (
                            <div className="d-flex justify-content-center mt-4">
                                <ul className="pagination pagination-sm">
                                    {logs.links.map((link, idx) => (
                                        <li
                                            key={idx}
                                            className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                        >
                                            {link.url ? (
                                                <Link
                                                    href={link.url}
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ) : (
                                                <span
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            )}
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
