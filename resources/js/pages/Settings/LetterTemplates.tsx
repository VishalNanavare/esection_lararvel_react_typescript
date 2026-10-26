import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { getCsrfHeaders } from '../../lib/csrf';
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
    const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
    const [previewModal, setPreviewModal] = useState<{
        slug: string;
        title: string;
        pdfUrl: string | null;
    } | null>(null);

    const handleClosePreview = () => {
        if (previewModal?.pdfUrl) {
            URL.revokeObjectURL(previewModal.pdfUrl);
        }
        setPreviewModal(null);
    };

    // Clean up active blob URL on unmount
    useEffect(() => {
        return () => {
            if (previewModal?.pdfUrl) {
                URL.revokeObjectURL(previewModal.pdfUrl);
            }
        };
    }, [previewModal]);

    const applyTag = (
        slug: string,
        field: 'subject' | 'body' | 'closing',
        openTag: string,
        closeTag: string,
        defaultText: string = 'text'
    ) => {
        const el = document.getElementById(`field-${slug}-${field}`) as HTMLTextAreaElement | HTMLInputElement | null;
        if (!el) return;

        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const value = formState[slug]?.[field] || '';
        const selected = value.substring(start, end);
        const replacement = selected ? `${openTag}${selected}${closeTag}` : `${openTag}${defaultText}${closeTag}`;
        const nextVal = value.substring(0, start) + replacement + value.substring(end);

        setFormState(prev => ({
            ...prev,
            [slug]: { ...prev[slug], [field]: nextVal },
        }));

        setTimeout(() => {
            el.focus();
            if (selected) {
                el.setSelectionRange(start, start + replacement.length);
            } else {
                el.setSelectionRange(start + openTag.length, start + openTag.length + defaultText.length);
            }
        }, 0);
    };

    const insertTextAtCursor = (
        slug: string,
        field: 'subject' | 'body' | 'closing',
        textToInsert: string
    ) => {
        const el = document.getElementById(`field-${slug}-${field}`) as HTMLTextAreaElement | HTMLInputElement | null;
        if (!el) return;

        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const value = formState[slug]?.[field] || '';
        const nextVal = value.substring(0, start) + textToInsert + value.substring(end);

        setFormState(prev => ({
            ...prev,
            [slug]: { ...prev[slug], [field]: nextVal },
        }));

        setTimeout(() => {
            el.focus();
            const newPos = start + textToInsert.length;
            el.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        slug: string,
        field: 'body' | 'closing'
    ) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            insertTextAtCursor(slug, field, '        '); // 8 spaces for paragraph indentation
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            applyTag(slug, field, '<b>', '</b>', 'Bold Text');
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            applyTag(slug, field, '<i>', '</i>', 'Italic Text');
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            applyTag(slug, field, '<u>', '</u>', 'Underline Text');
        }
    };

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

    const handlePreview = async (slug: string) => {
        const tpl = templates[slug];
        const title = tpl ? `${tpl.label} — PDF Preview` : 'Letter Template Preview';
        setPreviewLoading(prev => ({ ...prev, [slug]: true }));

        try {
            const currentFields = formState[slug] || { subject: '', body: '', closing: '' };
            const response = await fetch(`/settings/letter-templates/${slug}/preview`, {
                method: 'POST',
                headers: {
                    ...getCsrfHeaders(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/pdf, application/json',
                },
                body: JSON.stringify(currentFields),
            });

            if (!response.ok) {
                let errorMsg = `Server error (HTTP ${response.status})`;
                try {
                    const json = await response.json();
                    if (json.message) errorMsg = json.message;
                } catch {
                    // response is not json
                }
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            if (blob.type && !blob.type.includes('pdf') && blob.size < 500) {
                const text = await blob.text();
                throw new Error(text || 'Failed to generate PDF preview.');
            }

            if (previewModal?.pdfUrl) {
                URL.revokeObjectURL(previewModal.pdfUrl);
            }

            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const pdfUrl = URL.createObjectURL(pdfBlob);

            setPreviewModal({
                slug,
                title,
                pdfUrl,
            });
        } catch (err: any) {
            console.error('Preview PDF error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Preview Failed',
                text: err.message || 'Unable to generate PDF preview. Please try again.',
            });
        } finally {
            setPreviewLoading(prev => ({ ...prev, [slug]: false }));
        }
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
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                    <h5 className="fw-bold text-dark mb-0">{tpl.label}</h5>
                                    <span className="badge bg-light text-primary border">
                                        <i className="fa fa-code me-1"></i>HTML Formatting &amp; Indentation Supported
                                    </span>
                                </div>
                                <p className="small text-muted mb-3">
                                    Available placeholders (click to insert into text):{' '}
                                    {tpl.tokens.map((tok) => (
                                        <button
                                            key={tok}
                                            type="button"
                                            className="btn btn-sm btn-light border py-0 px-2 me-1 mb-1 font-monospace text-primary"
                                            title={`Click to insert {${tok}} at cursor`}
                                            onClick={() => insertTextAtCursor(slug, 'body', `{${tok}}`)}
                                        >
                                            + {`{${tok}}`}
                                        </button>
                                    ))}
                                </p>

                                <form onSubmit={(e) => handleTemplateSave(e, slug)}>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <label className="form-label text-secondary small fw-semibold mb-0">Subject Line</label>
                                                <span className="small text-muted">{current.subject.length} chars</span>
                                            </div>
                                            <input
                                                type="text"
                                                id={`field-${slug}-subject`}
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
                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                                <label className="form-label text-secondary small fw-semibold mb-0">Main Paragraph</label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="btn-group btn-group-sm" role="group" aria-label="Editor toolbar">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Bold: wrap in <b>...</b> (Ctrl+B)"
                                                            onClick={() => applyTag(slug, 'body', '<b>', '</b>', 'Bold Text')}
                                                        >
                                                            <i className="fa fa-bold"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Italic: wrap in <i>...</i> (Ctrl+I)"
                                                            onClick={() => applyTag(slug, 'body', '<i>', '</i>', 'Italic Text')}
                                                        >
                                                            <i className="fa fa-italic"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Underline: wrap in <u>...</u> (Ctrl+U)"
                                                            onClick={() => applyTag(slug, 'body', '<u>', '</u>', 'Underline Text')}
                                                        >
                                                            <i className="fa fa-underline"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Indent: insert 8 spaces at cursor (Tab key also works)"
                                                            onClick={() => insertTextAtCursor(slug, 'body', '        ')}
                                                        >
                                                            <i className="fa fa-indent me-1"></i>Indent
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2 font-monospace"
                                                            title="Line Break (<br>)"
                                                            onClick={() => insertTextAtCursor(slug, 'body', '<br>')}
                                                        >
                                                            &lt;br&gt;
                                                        </button>
                                                    </div>
                                                    <span className="small text-muted">{current.body.length} chars</span>
                                                </div>
                                            </div>
                                            <textarea
                                                id={`field-${slug}-body`}
                                                name="body"
                                                className="form-control"
                                                rows={6}
                                                style={{ fontFamily: 'monospace' }}
                                                value={current.body}
                                                onKeyDown={(e) => handleKeyDown(e, slug, 'body')}
                                                onChange={(e) =>
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        [slug]: { ...prev[slug], body: e.target.value },
                                                    }))
                                                }
                                                placeholder="Enter letter main body. Supports HTML tags like <b>, <i>, <u> and spaces/Tab for paragraph indentation."
                                                required
                                            ></textarea>
                                            <div className="form-text small text-muted">
                                                Tip: Press <strong>Tab</strong> in the editor to indent paragraphs. Use <code>&lt;b&gt;text&lt;/b&gt;</code> to bold words.
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                                <label className="form-label text-secondary small fw-semibold mb-0">Closing Sentence</label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="btn-group btn-group-sm" role="group" aria-label="Closing toolbar">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Bold: wrap in <b>...</b>"
                                                            onClick={() => applyTag(slug, 'closing', '<b>', '</b>', 'Bold Text')}
                                                        >
                                                            <i className="fa fa-bold"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Italic: wrap in <i>...</i>"
                                                            onClick={() => applyTag(slug, 'closing', '<i>', '</i>', 'Italic Text')}
                                                        >
                                                            <i className="fa fa-italic"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Underline: wrap in <u>...</u>"
                                                            onClick={() => applyTag(slug, 'closing', '<u>', '</u>', 'Underline Text')}
                                                        >
                                                            <i className="fa fa-underline"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Indent: insert 8 spaces at cursor"
                                                            onClick={() => insertTextAtCursor(slug, 'closing', '        ')}
                                                        >
                                                            <i className="fa fa-indent me-1"></i>Indent
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2 font-monospace"
                                                            title="Line Break (<br>)"
                                                            onClick={() => insertTextAtCursor(slug, 'closing', '<br>')}
                                                        >
                                                            &lt;br&gt;
                                                        </button>
                                                    </div>
                                                    <span className="small text-muted">{current.closing.length} chars</span>
                                                </div>
                                            </div>
                                            <textarea
                                                id={`field-${slug}-closing`}
                                                name="closing"
                                                className="form-control"
                                                rows={3}
                                                style={{ fontFamily: 'monospace' }}
                                                value={current.closing}
                                                onKeyDown={(e) => handleKeyDown(e, slug, 'closing')}
                                                onChange={(e) =>
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        [slug]: { ...prev[slug], closing: e.target.value },
                                                    }))
                                                }
                                                placeholder="Enter closing sentence (e.g. Thanking you in anticipation)."
                                            ></textarea>
                                            <div className="form-text small text-muted">
                                                Tip: Each closing line is automatically formatted with standard paragraph indentation in the PDF.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-end">
                                        <button
                                            type="button"
                                            disabled={previewLoading[slug] || false}
                                            onClick={() => handlePreview(slug)}
                                            className="btn btn-glass me-2"
                                        >
                                            <i className={`fa ${previewLoading[slug] ? 'fa-spinner fa-spin' : 'fa-file-pdf-o'} me-1 text-danger`}></i>
                                            {previewLoading[slug] ? 'Generating Preview...' : 'Preview PDF'}
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

            {/* PDF Preview Modal */}
            {previewModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1055 }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleClosePreview();
                    }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '1050px', width: '95%' }}>
                        <div className="modal-content glass-card shadow-lg border-0 overflow-hidden">
                            <div className="modal-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded-circle p-2 bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                        <i className="fa fa-file-pdf-o fs-5"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">
                                            {previewModal.title}
                                        </h5>
                                        <p className="text-muted small mb-0">
                                            Sample demonstration with active template substitutions and institute letterhead
                                        </p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    {previewModal.pdfUrl && (
                                        <>
                                            <a
                                                href={previewModal.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-outline-primary"
                                                title="Open preview in new tab"
                                            >
                                                <i className="fa fa-external-link me-1"></i> Open in New Tab
                                            </a>
                                            <a
                                                href={previewModal.pdfUrl}
                                                download={`${previewModal.slug}-preview.pdf`}
                                                className="btn btn-sm btn-outline-secondary"
                                                title="Download preview PDF"
                                            >
                                                <i className="fa fa-download me-1"></i> Download
                                            </a>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        className="btn-close ms-2"
                                        onClick={handleClosePreview}
                                        aria-label="Close"
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-0 bg-secondary bg-opacity-10 position-relative" style={{ height: '75vh', minHeight: '520px' }}>
                                {previewModal.pdfUrl ? (
                                    <iframe
                                        src={previewModal.pdfUrl}
                                        title={previewModal.title}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 'none', display: 'block' }}
                                    />
                                ) : (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                                        <i className="fa fa-spinner fa-spin fa-2x mb-2 text-indigo"></i>
                                        <span>Rendering PDF preview...</span>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer py-2 px-4 bg-white border-top d-flex justify-content-between align-items-center">
                                <span className="text-muted small">
                                    <i className="fa fa-info-circle text-indigo me-1"></i>
                                    Live Preview reflects any unsaved edits made in the template fields above.
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleClosePreview}
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
