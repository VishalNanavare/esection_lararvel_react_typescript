import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';

interface StreamMetric {
    stream: string;
    total: number;
    confirmed: number;
    pending: number;
}

interface ActivityItem {
    id: number;
    action: string;
    description: string;
    username?: string;
    created_at: string;
}

interface DashboardProps {
    title: string;
    stats: {
        total_students: number;
        total_confirmed: number;
        total_pending: number;
        total_colleges: number;
        total_regularizations: number;
    };
    metrics: StreamMetric[];
    recent_activity?: ActivityItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, metrics, recent_activity = [] }) => {
    const { props } = usePage<SharedProps>();
    const { auth } = props;
    const permissions = auth.permissions || [];
    const isAdmin = auth.user?.role === 'admin';

    const can = (perm: string) => isAdmin || permissions.includes(perm);

    const statCards = [
        {
            label: 'Total Verification Cases',
            value: stats.total_students,
            icon: 'fa-users',
            tone: 'indigo',
            meta: (
                <>
                    <i className="fa fa-arrow-up me-1 text-success"></i> System records
                </>
            ),
        },
        {
            label: 'DD Confirmed',
            value: stats.total_confirmed,
            icon: 'fa-check-circle',
            tone: 'emerald',
            meta: (
                <>
                    <i className="fa fa-check me-1 text-success"></i> Processed &amp; paid
                </>
            ),
        },
        {
            label: 'Pending Approval',
            value: stats.total_pending,
            icon: 'fa-clock-o',
            tone: 'warning',
            meta: (
                <>
                    <i className="fa fa-exclamation-triangle me-1 text-warning"></i> Awaiting verification
                </>
            ),
        },
        {
            label: 'Registered Universities',
            value: stats.total_colleges,
            icon: 'fa-university',
            tone: 'info',
            meta: (
                <>
                    <i className="fa fa-map-marker me-1 text-muted"></i> Nationwide directory
                </>
            ),
        },
    ];

    return (
        <AppLayout title="Dashboard - E-Section Portal">
            {/* Header Banner */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="glass-card p-4 page-header mb-0">
                        <div>
                            <h2 className="fw-bold mb-1">
                                Welcome,{' '}
                                <span className="text-indigo">
                                    {auth.user?.full_name || auth.user?.username || 'E-Section Staff'}
                                </span>
                            </h2>
                            <p className="text-muted mb-0">
                                IDOL Eligibility &amp; Document Verification Analytics System
                            </p>
                        </div>
                        <div className="d-grid d-sm-flex gap-2 mt-3 mt-sm-0">
                            {can('students.create') && (
                                <Link href="/students/new" className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> New Eligibility Form
                                </Link>
                            )}
                            {can('confirmations.view') && (
                                <Link href="/confirmations" className="btn btn-emerald">
                                    <i className="fa fa-check-square-o me-1"></i> Confirmations
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Stat Cards */}
            <div className="row g-3 g-md-4 mb-4">
                {statCards.map((card, idx) => (
                    <div className="col-6 col-xl-3" key={idx}>
                        <div className="glass-card stat-card h-100 p-3">
                            <div className="stat-card__head d-flex align-items-center justify-content-between mb-2">
                                <span className="stat-card__label text-muted small fw-medium">
                                    {card.label}
                                </span>
                                <span
                                    className={`stat-card__icon p-2 rounded-3 text-${card.tone}`}
                                    style={{ background: 'rgba(79, 70, 229, 0.08)' }}
                                >
                                    <i className={`fa ${card.icon}`}></i>
                                </span>
                            </div>
                            <h3 className="stat-card__value fw-bold mb-1 text-dark">
                                {card.value.toLocaleString()}
                            </h3>
                            <div className="stat-card__meta small text-muted">{card.meta}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Program Breakdown Table */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <h4 className="fw-bold mb-0">
                                <i className="fa fa-list-alt me-2 text-indigo"></i> Verification Status by Academic Program
                            </h4>
                            <span className="badge badge-glass-indigo px-3 py-2">
                                {metrics.length} Programs Tracked
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-glass align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th className="col-sr" style={{ width: '60px' }}>Sr. No.</th>
                                        <th>Program / Academic Stream</th>
                                        <th className="text-center">Total Students</th>
                                        <th className="text-center">DD Confirmed</th>
                                        <th className="text-center">Pending Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-4">
                                                No student records found in database.
                                            </td>
                                        </tr>
                                    ) : (
                                        metrics.map((m, idx) => (
                                            <tr key={idx}>
                                                <td className="fw-semibold text-muted">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="fw-bold text-dark">
                                                    <i className="fa fa-graduation-cap me-2 text-indigo"></i>
                                                    {m.stream}
                                                </td>
                                                <td className="text-center fw-semibold">
                                                    {m.total.toLocaleString()}
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge badge-glass-emerald">
                                                        <i className="fa fa-check me-1"></i> {m.confirmed.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {m.pending > 0 ? (
                                                        <span className="badge badge-glass-amber">
                                                            <i className="fa fa-clock-o me-1"></i> {m.pending.toLocaleString()} Pending
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-glass-emerald">
                                                            <i className="fa fa-check-circle me-1"></i> Complete
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {can('confirmations.view') && (
                                                        <Link
                                                            href={`/confirmations?stream=${encodeURIComponent(m.stream)}`}
                                                            className="btn btn-sm btn-glass"
                                                        >
                                                            <i className="fa fa-search me-1"></i> Review
                                                        </Link>
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

            {/* Recent Activity Log */}
            {recent_activity.length > 0 && (
                <div className="row">
                    <div className="col-12">
                        <div className="glass-card p-4">
                            <h5 className="fw-bold mb-3">
                                <i className="fa fa-history me-2 text-indigo"></i> Recent System Activity
                            </h5>
                            <div className="table-responsive">
                                <table className="table table-sm table-glass mb-0">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recent_activity.map((act) => (
                                            <tr key={act.id}>
                                                <td className="text-muted small font-monospace">
                                                    {new Date(act.created_at).toLocaleString()}
                                                </td>
                                                <td className="fw-semibold small">{act.username || 'System'}</td>
                                                <td>
                                                    <span className="badge badge-glass-indigo small">{act.action}</span>
                                                </td>
                                                <td className="small text-secondary">{act.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
};

export default Dashboard;
