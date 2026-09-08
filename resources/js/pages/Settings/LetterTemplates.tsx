import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface TemplateDef {
    label: string;
    tokens: string[];
    fields: {
        subject: string;
        body: string;
        closing: string;
    };
}

interface Props {
    templates: Record<string, TemplateDef>;
    footerDepartment: string;
}

export default function LetterTemplates({ templates, footerDepartment: initialFooter }: Props) {
    const [footerDepartment, setFooterDepartment] = useState(initialFooter);
    const [savingFooter, setSavingFooter] = useState(false);

    const [formState, setFormState] = useState(() => {
        const state: Record<string, { subject: string; body: string; closing: string }> = {};
        Object.entries(templates).forEach(([slug, tpl]) => {
            state[slug] = {
                subject: tpl.fields.subject || '',
                body: tpl.fields.body || '',
                closing: tpl.fields.closing || '',
            };
        });
        return state;
    });

    const [savingSlugs, setSavingSlugs] = useState<Record<string, boolean>>({});

    const handleFooterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSavingFooter(true);

        router.post('/settings/letter-templates/footer', {
            footer_department: footerDepartment,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSavingFooter(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Department Name Saved',
                    text: 'Department signature footer updated.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setSavingFooter(false);
                Swal.fire('Error', 'Failed to update department name.', 'error');
            },
        });
    };

    const handleTemplateSave = (e: React.FormEvent, slug: string) => {
        e.preventDefault();
        setSavingSlugs(prev => ({ ...prev, [slug]: true }));

        const data = formState[slug];
        router.post(`/settings/letter-templates/${slug}`, data, {
            preserveScroll: true,
            onSuccess: () => {
                setSavingSlugs(prev => ({ ...prev, [slug]: false }));
                Swal.fire({
                    icon: 'success',
                    title: 'Template Saved',
                    text: `Letter template '${templates[slug]?.label}' saved successfully.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setSavingSlugs(prev => ({ ...prev, [slug]: false }));
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to save template.', 'error');
            },
        });
    };

    const handlePreview = (slug: string) => {
        Swal.fire({
            icon: 'info',
            title: 'PDF Template Preview',
            text: `Preview for '${templates[slug]?.label}' uses real template substitutions during batch generation and download.`,
            confirmButtonColor: '#4f46e5',
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Letter Templates" />

            {/* Header and Department Form */}
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-file-text-o me-2 text-indigo"></i> Letter Templates
                                </h3>
                                <p className="text-muted small mb-0">
                                    Edit the subject, main paragraph and closing sentence printed on each of the letter types.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>

                        <form onSubmit={handleFooterSubmit} className="row g-3 align-items-end">
                            <div className="col-md-8">
                                <label className="form-label text-secondary small fw-semibold">
                                    Department Name (shown under the signature on every letter)
                                </label>
                                <input
                                    type="text"
                                    name="footer_department"
                                    className="form-control"
                                    value={footerDepartment}
                                    onChange={(e) => setFooterDepartment(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <button type="submit" disabled={savingFooter} className="btn btn-indigo w-100">
                                    <i className="fa fa-check me-1"></i> {savingFooter ? 'Saving...' : 'Save Department Name'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Template Cards */}
            {Object.entries(templates).map(([slug, tpl]) => {
                const current = formState[slug] || { subject: '', body: '', closing: '' };
                const isSaving = savingSlugs[slug] || false;

                return (
                    <div className="row" key={slug}>
                        <div className="col-12">
                            <div className="glass-card p-4 mb-4">
                                <h5 className="fw-bold text-dark mb-1">{tpl.label}</h5>
                                <p className="small text-muted mb-3">
                                    Available placeholders:{' '}
                                    {tpl.tokens.map((tok) => (
                                        <code key={tok} className="me-1">
                                            {`{${tok}}`}
                                        </code>
                                    ))}
                                </p>

                                <form onSubmit={(e) => handleTemplateSave(e, slug)}>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Subject Line</label>
                                            <input
                                                type="text"
                                                name="subject"
                                                className="form-control"
                                                value={current.subject}
                                                onChange={(e) =>
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        [slug]: { ...prev[slug], subject: e.target.value },
                                                    }))
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Main Paragraph</label>
                                            <textarea
                                                name="body"
                                                className="form-control"
                                                rows={4}
                                                style={{ fontFamily: 'monospace' }}
                                                value={current.body}
                                                onChange={(e) =>
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        [slug]: { ...prev[slug], body: e.target.value },
                                                    }))
                                                }
                                                required
                                            ></textarea>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Closing Sentence</label>
                                            <textarea
                                                name="closing"
                                                className="form-control"
                                                rows={2}
                                                style={{ fontFamily: 'monospace' }}
                                                value={current.closing}
                                                onChange={(e) =>
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        [slug]: { ...prev[slug], closing: e.target.value },
                                                    }))
                                                }
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-end">
                                        <button
                                            type="button"
                                            onClick={() => handlePreview(slug)}
                                            className="btn btn-glass me-2"
                                        >
                                            <i className="fa fa-file-pdf-o me-1"></i> Preview PDF
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="btn btn-indigo letter-save-btn"
                                        >
                                            <i className="fa fa-check me-1"></i> {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                );
            })}
        </AppLayout>
    );
}
