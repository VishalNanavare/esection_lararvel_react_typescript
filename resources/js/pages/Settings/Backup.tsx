import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface BackupItem {
    id: number;
    filename: string;
    type: string;
    file_size: number;
    created_by: string;
    created_at: string;
}

interface Props {
    history: BackupItem[];
    passwordConfigured: boolean;
    encryptionAvailable: boolean;
    retentionCount: number;
    minPasswordLength: number;
    maxRetention: number;
}

export default function Backup({
    history,
    passwordConfigured,
    encryptionAvailable,
    retentionCount: initialRetention,
    minPasswordLength,
    maxRetention,
}: Props) {
    const [retentionCount, setRetentionCount] = useState(initialRetention);
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [isRunningSql, setIsRunningSql] = useState(false);
    const [isRunningExcel, setIsRunningExcel] = useState(false);

    const handleRunSql = (e: React.FormEvent) => {
        e.preventDefault();
        setIsRunningSql(true);

        router.post('/settings/backup/sql', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setIsRunningSql(false);
                Swal.fire({
                    icon: 'success',
                    title: 'System Backup Created',
                    text: 'Complete database backup SQL archive generated successfully.',
                    timer: 2500,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setIsRunningSql(false);
                Swal.fire('Error', 'Failed to generate database backup.', 'error');
            },
        });
    };

    const handleRunExcel = (e: React.FormEvent) => {
        e.preventDefault();
        setIsRunningExcel(true);

        router.post('/settings/backup/excel', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setIsRunningExcel(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Excel Reference Backup',
                    text: 'Reference data exported successfully.',
                    timer: 2500,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setIsRunningExcel(false);
                Swal.fire('Error', 'Failed to export reference data.', 'error');
            },
        });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            Swal.fire('Password Mismatch', 'The passwords do not match.', 'error');
            return;
        }

        setIsSubmittingPassword(true);
        router.post('/settings/backup/password', {
            backup_password: password,
            backup_password_confirm: passwordConfirm,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmittingPassword(false);
                setPassword('');
                setPasswordConfirm('');
                Swal.fire({
                    icon: 'success',
                    title: 'Password Set',
                    text: 'Backup password configured successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmittingPassword(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to set password.', 'error');
            },
        });
    };

    const handleRetentionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/settings/backup/retention', {
            backup_retention_count: retentionCount,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Retention Saved',
                    text: `Backups to keep updated to ${retentionCount}.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <AppLayout>
            <Head title="Settings — Backup" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-database me-2 text-indigo"></i> Backup
                                </h3>
                                <p className="text-muted small mb-0">
                                    Take a complete copy of the system, or export the reference data as a spreadsheet.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {!passwordConfigured && (
                <div className="row">
                    <div className="col-12">
                        <div className="glass-card p-4 mb-4 border border-warning border-opacity-25" id="backup_setup_notice">
                            <h6 className="fw-bold text-amber mb-1">
                                <i className="fa fa-info-circle me-1"></i> Set a backup password first
                            </h6>
                            <p className="text-muted small mb-0">
                                The database backup is delivered as a password-protected file. Set the password below before creating your first backup.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-3 mb-4">
                {/* Create backup panel */}
                <div className="col-lg-7">
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold text-dark mb-3">
                            <i className="fa fa-play-circle me-2 text-indigo"></i> Create a backup
                        </h5>

                        <div className="d-flex align-items-start justify-content-between mb-3 pb-3 border-bottom border-secondary border-opacity-10">
                            <div className="me-3">
                                <div className="fw-semibold text-dark">Complete system backup (SQL)</div>
                                <p className="text-muted small mb-0">
                                    Every table and every row, for restoring the system if something goes wrong. Delivered as a <strong>password-protected</strong> file.
                                </p>
                            </div>
                            <form onSubmit={handleRunSql} className="flex-shrink-0">
                                <button
                                    type="submit"
                                    disabled={isRunningSql || !passwordConfigured}
                                    className="btn btn-indigo"
                                >
                                    <i className="fa fa-database me-1"></i> {isRunningSql ? 'Backing up...' : 'Backup now'}
                                </button>
                            </form>
                        </div>

                        <div className="d-flex align-items-start justify-content-between">
                            <div className="me-3">
                                <div className="fw-semibold text-dark">Reference data (Excel)</div>
                                <p className="text-muted small mb-0">
                                    Universities, courses, academic years, users and settings, one sheet per table. Excludes student records and passwords, and is <strong>not</strong> password-protected.
                                </p>
                            </div>
                            <form onSubmit={handleRunExcel} className="flex-shrink-0">
                                <button
                                    type="submit"
                                    disabled={isRunningExcel}
                                    className="btn btn-glass"
                                >
                                    <i className="fa fa-file-excel-o me-1"></i> {isRunningExcel ? 'Exporting...' : 'Export now'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Password + retention panel */}
                <div className="col-lg-5">
                    <div className="glass-card p-4 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="fw-bold text-dark mb-0">
                                <i className="fa fa-key me-2 text-indigo"></i> Backup password
                            </h5>
                            {passwordConfigured ? (
                                <span className="badge badge-glass-emerald">
                                    <i className="fa fa-check-circle me-1"></i> Configured
                                </span>
                            ) : (
                                <span className="badge badge-glass-amber">Not configured</span>
                            )}
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="mb-4">
                            <div className="mb-2">
                                <label className="form-label text-secondary small fw-semibold">New password</label>
                                <input
                                    type="password"
                                    name="backup_password"
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={minPasswordLength}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <div className="mb-2">
                                <label className="form-label text-secondary small fw-semibold">Confirm password</label>
                                <input
                                    type="password"
                                    name="backup_password_confirm"
                                    className="form-control"
                                    value={passwordConfirm}
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    minLength={minPasswordLength}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <p className="text-muted small mb-2">
                                At least {minPasswordLength} characters. You will need this to open any backup file &mdash;
                                <strong> store it somewhere safe, it cannot be recovered.</strong>
                            </p>
                            <button
                                type="submit"
                                disabled={isSubmittingPassword}
                                className="btn btn-indigo btn-sm w-100"
                            >
                                {isSubmittingPassword ? 'Saving...' : passwordConfigured ? 'Change password' : 'Set password'}
                            </button>
                        </form>

                        <form onSubmit={handleRetentionSubmit}>
                            <label className="form-label text-secondary small fw-semibold">
                                Backups to keep (per type)
                            </label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    name="backup_retention_count"
                                    className="form-control"
                                    value={retentionCount}
                                    onChange={(e) => setRetentionCount(parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={maxRetention}
                                    required
                                />
                                <button type="submit" className="btn btn-glass">Save</button>
                            </div>
                            <p className="text-muted small mb-0 mt-2">
                                Older backups are deleted automatically so the disk cannot fill up.
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <h5 className="fw-bold text-dark mb-3">
                            <i className="fa fa-history me-2 text-indigo"></i> Previous backups
                        </h5>
                        <div className="table-responsive">
                            <table className="table table-glass">
                                <thead>
                                    <tr>
                                        <th>Date &amp; Time</th>
                                        <th>Type</th>
                                        <th>File</th>
                                        <th>Size</th>
                                        <th>Created By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-4">
                                                No backups created yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((item) => (
                                            <tr key={item.id}>
                                                <td className="small text-muted">{item.created_at}</td>
                                                <td>
                                                    <span className={`badge ${item.type === 'sql' ? 'badge-glass-indigo' : 'badge-glass-emerald'}`}>
                                                        {item.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="fw-semibold text-dark">{item.filename}</td>
                                                <td className="small">{formatBytes(item.file_size)}</td>
                                                <td className="small text-muted">{item.created_by || 'System'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
