import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Props {
    settings: Record<string, string>;
}

export default function Features({ settings }: Props) {
    const [features, setFeatures] = useState({
        feature_export_enabled: settings.feature_export_enabled === '1',
        feature_bulk_email_enabled: settings.feature_bulk_email_enabled === '1',
        feature_delete_enabled: settings.feature_delete_enabled === '1',
        feature_import_enabled: settings.feature_import_enabled === '1',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const flags = [
        { key: 'feature_export_enabled' as const, label: 'Excel Export' },
        { key: 'feature_bulk_email_enabled' as const, label: 'Bulk Email' },
        { key: 'feature_delete_enabled' as const, label: 'Delete Records' },
        { key: 'feature_import_enabled' as const, label: 'Excel Import' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/settings/features', features, {
            onSuccess: () => {
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Feature Toggles',
                    text: 'Feature toggles updated.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setIsSubmitting(false);
                Swal.fire('Error', 'Failed to update feature toggles.', 'error');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Feature Toggles" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-toggle-on me-2 text-indigo"></i> Feature Toggles
                                </h3>
                                <p className="text-muted small mb-0">
                                    Turn features on or off across the system. Switching a feature off hides it for everyone and blocks the action, not just the button.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="list-group">
                                {flags.map((flag) => (
                                    <label
                                        key={flag.key}
                                        className="list-group-item d-flex align-items-center justify-content-between py-3 px-4"
                                    >
                                        <span className="fw-semibold text-dark fs-6">{flag.label}</span>
                                        <input
                                            type="checkbox"
                                            className="form-check-input fs-5"
                                            checked={features[flag.key]}
                                            onChange={(e) => setFeatures({ ...features, [flag.key]: e.target.checked })}
                                        />
                                    </label>
                                ))}
                            </div>

                            <div className="mt-4 text-end">
                                <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                    <i className="fa fa-check me-1"></i> {isSubmitting ? 'Saving...' : 'Save Feature Toggles'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
