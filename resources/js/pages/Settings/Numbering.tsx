import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Props {
    settings: Record<string, string>;
}

export default function Numbering({ settings }: Props) {
    const [prefix, setPrefix] = useState(settings.case_no_prefix || 'IDOL');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Format preview: prefix + YY(YY+1) + random digits, e.g. IDOL25261234
    const currentYear = new Date().getFullYear();
    const shortYears = `${String(currentYear).slice(-2)}${String(currentYear + 1).slice(-2)}`;
    const preview = `${prefix || 'IDOL'}${shortYears}1234`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/settings/numbering', { case_no_prefix: prefix }, {
            onSuccess: () => {
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Document Numbering',
                    text: 'Case number prefix updated.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setIsSubmitting(false);
                Swal.fire('Error', 'Failed to update numbering.', 'error');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Document Numbering" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-hashtag me-2 text-indigo"></i> Document Numbering
                                </h3>
                                <p className="text-muted small mb-0">
                                    Set the prefix used on new case numbers. This previews the format only &mdash; each number's last four digits are assigned at random, not in sequence.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Case Number Prefix</label>
                                    <input
                                        type="text"
                                        name="case_no_prefix"
                                        id="case_no_prefix"
                                        className="form-control"
                                        value={prefix}
                                        onChange={(e) => setPrefix(e.target.value)}
                                        required
                                        maxLength={20}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Example (format preview, not the next real number)
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control bg-light"
                                        id="preview_example"
                                        value={preview}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="mt-4 text-end">
                                <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                    <i className="fa fa-check me-1"></i> {isSubmitting ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
