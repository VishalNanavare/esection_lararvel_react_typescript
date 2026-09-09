import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Recipient {
    id: number;
    name: string;
    email: string;
    meta?: {
        state?: string;
        eligibility_case_no?: string;
        admission_taken_in?: string;
    };
}

interface Skipped {
    name: string;
    email: string;
    reason: string;
}

interface PreviewData {
    sendable: Recipient[];
    skipped: Skipped[];
    truncated: boolean;
}

interface Props {
    audience: 'university' | 'student';
    filters: {
        state: string;
        year: string;
        stream: string;
    };
    preview: PreviewData | null;
    slug: string;
    templateLabel: string;
    mailReady: boolean;
    maxRecipients: number;
}

export default function Index({
    audience: initialAudience,
    filters: initialFilters,
    preview,
    slug,
    templateLabel,
    mailReady,
    maxRecipients,
}: Props) {
    const [audience, setAudience] = useState(initialAudience || 'university');
    const [state, setState] = useState(initialFilters.state || '');
    const [year, setYear] = useState(initialFilters.year || '');
    const [stream, setStream] = useState(initialFilters.stream || '');

    const [statesList, setStatesList] = useState<string[]>([]);
    const [yearsList, setYearsList] = useState<{ id: string; text: string }[]>([]);
    const [streamsList, setStreamsList] = useState<{ id: string; text: string }[]>([]);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetch('/api/states')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) =>
                    typeof item === 'string' ? item : item.text || item.id
                );
                setStatesList(list);
            })
            .catch(() => {});

        fetch('/api/academic-years')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) =>
                    typeof item === 'string'
                        ? { id: item, text: item }
                        : { id: item.id || item.year_label, text: item.text || item.year_label || item.id }
                );
                setYearsList(list);
            })
            .catch(() => {});

        fetch('/api/streams')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) => ({
                    id: item.Division || item.id || item.text,
                    text: item.stream || item.Division || item.text || item.id,
                }));
                setStreamsList(list);
            })
            .catch(() => {});
    }, []);

    const handleAudienceChange = (newAudience: 'university' | 'student') => {
        setAudience(newAudience);
        router.get('/bulk-email', { audience: newAudience }, { preserveState: false });
    };

    const handlePreview = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/bulk-email',
            {
                audience,
                state: audience === 'university' ? state : '',
                year: audience === 'student' ? year : '',
                stream: audience === 'student' ? stream : '',
                preview: '1',
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleSend = () => {
        if (!preview || preview.sendable.length === 0) return;

        Swal.fire({
            title: `Send ${preview.sendable.length} email(s)?`,
            text: 'This cannot be undone. Every recipient shown in the list below will receive this message.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, send now',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                setIsSending(true);
                router.post(
                    '/bulk-email/send',
                    {
                        audience,
                        template_slug: slug,
                        state: audience === 'university' ? state : '',
                        year: audience === 'student' ? year : '',
                        stream: audience === 'student' ? stream : '',
                    },
                    {
                        onFinish: () => setIsSending(false),
                    }
                );
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Send Emails" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-paper-plane me-2 text-indigo"></i> Send Emails
                                </h3>
                                <p className="text-muted small mb-0">
                                    Choose who to contact, review the exact list, then send.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <Link href="/bulk-email/log" className="btn btn-glass">
                                    <i className="fa fa-list-alt me-1"></i> Sent Emails
                                </Link>
                                <Link href="/settings/mail" className="btn btn-glass">
                                    <i className="fa fa-cog me-1"></i> Email Settings
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!mailReady && (
                <div className="row">
                    <div className="col-12">
                        <div className="glass-card p-4 mb-4 border border-warning border-opacity-25 bg-warning bg-opacity-10">
                            <h6 className="fw-bold text-amber mb-1">
                                <i className="fa fa-info-circle me-1"></i> Email is not set up yet
                            </h6>
                            <p className="text-muted small mb-0">
                                Set the SMTP server and "from" address in{' '}
                                <Link href="/settings/mail" className="text-indigo fw-semibold">
                                    Settings &gt; Email
                                </Link>{' '}
                                before sending.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <form onSubmit={handlePreview} className="row g-3 mb-3 filter-panel align-items-end">
                            <div className="col-md-4">
                                <label className="form-label text-secondary small fw-semibold">Send to</label>
                                <select
                                    name="audience"
                                    className="form-select"
                                    value={audience}
                                    onChange={(e) => handleAudienceChange(e.target.value as any)}
                                >
                                    <option value="university">Universities (verification reminder)</option>
                                    <option value="student">Candidates (document reminder)</option>
                                </select>
                            </div>

                            {audience === 'university' ? (
                                <div className="col-md-5">
                                    <label className="form-label text-secondary small fw-semibold">State (optional)</label>
                                    <select
                                        className="form-select"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                    >
                                        <option value="">-- All States --</option>
                                        {statesList.map((st) => (
                                            <option key={st} value={st}>
                                                {st}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div className="col-md-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Academic Year (optional)
                                        </label>
                                        <select
                                            className="form-select"
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                        >
                                            <option value="">-- All Years --</option>
                                            {yearsList.map((y) => (
                                                <option key={y.id} value={y.id}>
                                                    {y.text}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Stream (optional)
                                        </label>
                                        <select
                                            className="form-select"
                                            value={stream}
                                            onChange={(e) => setStream(e.target.value)}
                                        >
                                            <option value="">-- All Streams --</option>
                                            {streamsList.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.text}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className={audience === 'university' ? 'col-md-3' : 'col-md-2'}>
                                <button type="submit" className="btn btn-indigo w-100 py-2">
                                    <i className="fa fa-search me-1"></i> Preview recipients
                                </button>
                            </div>
                        </form>

                        <p className="text-muted small mb-0">
                            Message used: <strong className="text-dark">{templateLabel}</strong> &mdash;{' '}
                            <Link href="/settings/mail" className="text-indigo">
                                edit wording
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {preview !== null && (
                <div className="row">
                    <div className="col-12">
                        <div className="glass-card p-4 mb-4">
                            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                <h5 className="fw-bold text-dark mb-0">
                                    <i className="fa fa-eye me-2 text-indigo"></i> Recipients (before sending)
                                </h5>
                                <div>
                                    <span className="badge badge-glass-emerald me-2">
                                        {preview.sendable.length} will be emailed
                                    </span>
                                    {preview.skipped.length > 0 && (
                                        <span className="badge badge-glass-amber">
                                            {preview.skipped.length} skipped
                                        </span>
                                    )}
                                </div>
                            </div>

                            {preview.truncated && (
                                <div className="alert alert-warning small">
                                    This list has more than {maxRecipients} matches. Only the first {maxRecipients} are shown
                                    and will be sent &mdash; narrow the filter above to reach the rest in a second run.
                                </div>
                            )}

                            {preview.sendable.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                    <i className="fa fa-info-circle fs-1 mb-3 text-secondary d-block"></i>
                                    No recipients with a usable email address match this filter.
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive mb-4 border rounded">
                                        <table className="table table-hover table-glass mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '60px' }}>#</th>
                                                    <th>Recipient Name</th>
                                                    <th>Email Address</th>
                                                    <th>Filter Match</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.sendable.map((r, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-muted small">{idx + 1}</td>
                                                        <td className="fw-semibold text-dark">{r.name}</td>
                                                        <td>
                                                            <span className="badge bg-light text-dark border">
                                                                {r.email}
                                                            </span>
                                                        </td>
                                                        <td className="small text-muted">
                                                            {(audience === 'university' ? r.meta?.state : r.meta?.eligibility_case_no) || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="text-end">
                                        <button
                                            type="button"
                                            className="btn btn-emerald py-2 px-4"
                                            onClick={handleSend}
                                            disabled={isSending}
                                        >
                                            {isSending ? (
                                                <>
                                                    <i className="fa fa-spinner fa-spin me-1"></i> Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa fa-paper-plane me-1"></i> Send{' '}
                                                    {preview.sendable.length} Email(s) Now
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}

                            {preview.skipped.length > 0 && (
                                <div className="mt-4 pt-4 border-top">
                                    <details>
                                        <summary className="text-secondary small fw-semibold cursor-pointer mb-2">
                                            View {preview.skipped.length} skipped recipients (no valid email)
                                        </summary>
                                        <div className="table-responsive border rounded mt-2">
                                            <table className="table table-sm table-glass mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Provided Email</th>
                                                        <th>Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {preview.skipped.slice(0, 100).map((s, idx) => (
                                                        <tr key={idx}>
                                                            <td className="small text-muted">{s.name}</td>
                                                            <td className="small text-muted">{s.email || '—'}</td>
                                                            <td className="small text-danger">{s.reason}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
