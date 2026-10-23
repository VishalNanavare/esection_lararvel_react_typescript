import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface EmailTemplateDef {
    label: string;
    tokens: string[];
    fields: {
        subject: string;
        body: string;
    };
}

interface MailSettings {
    mail_smtp_host: string;
    mail_smtp_port: string;
    mail_smtp_user: string;
    mail_smtp_crypto: string;
    mail_from_email: string;
    mail_from_name: string;
    mail_batch_size: string;
    mail_batch_pause: string;
    password_configured: boolean;
}

interface Props {
    settings: MailSettings;
    templates: Record<string, EmailTemplateDef>;
}

export default function Mail({ settings: initialSettings, templates }: Props) {
    const [smtpSettings, setSmtpSettings] = useState({
        mail_smtp_host: initialSettings.mail_smtp_host || '',
        mail_smtp_port: initialSettings.mail_smtp_port || '587',
        mail_smtp_user: initialSettings.mail_smtp_user || '',
        mail_smtp_password: '',
        mail_smtp_crypto: initialSettings.mail_smtp_crypto || 'tls',
        mail_from_email: initialSettings.mail_from_email || '',
        mail_from_name: initialSettings.mail_from_name || 'IDOL Eligibility Section',
        mail_batch_size: initialSettings.mail_batch_size || '25',
        mail_batch_pause: initialSettings.mail_batch_pause || '5',
    });

    const [testEmail, setTestEmail] = useState('');
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);

    const [templateState, setTemplateState] = useState(() => {
        const state: Record<string, { subject: string; body: string }> = {};
        Object.entries(templates).forEach(([slug, tpl]) => {
            state[slug] = {
                subject: tpl.fields.subject || '',
                body: tpl.fields.body || '',
            };
        });
        return state;
    });

    const [savingTemplate, setSavingTemplate] = useState<Record<string, boolean>>({});
    const [openSlugs, setOpenSlugs] = useState<Record<string, boolean>>({
        university_reminder: true,
        student_document_reminder: false,
        password_reset: false,
    });

    const [previewModal, setPreviewModal] = useState<{
        slug: string;
        title: string;
        subject: string;
        body: string;
        recipientEmail: string;
        recipientName: string;
    } | null>(null);

    const toggleSlug = (slug: string) => {
        setOpenSlugs(prev => ({
            ...prev,
            [slug]: !prev[slug],
        }));
    };

    const expandAll = () => {
        const all: Record<string, boolean> = {};
        Object.keys(templates).forEach(k => { all[k] = true; });
        setOpenSlugs(all);
    };

    const collapseAll = () => {
        const all: Record<string, boolean> = {};
        Object.keys(templates).forEach(k => { all[k] = false; });
        setOpenSlugs(all);
    };

    const SAMPLE_RECIPIENTS: Record<string, { email: string; name: string }> = {
        university_reminder: {
            email: 'controller.exams@gujaratuniversity.ac.in',
            name: 'The Controller of Examinations, Gujarat University',
        },
        student_document_reminder: {
            email: 'jane.doe@student.example.com',
            name: 'Jane Sample Doe',
        },
        password_reset: {
            email: smtpSettings.mail_from_email || 'admin@idol.mu.ac.in',
            name: 'System Administrator',
        },
    };

    const SAMPLE_TOKENS: Record<string, Record<string, string>> = {
        university_reminder: {
            university_name: 'Gujarat University, Ahmedabad',
            academic_year: '2025-2026',
            course: 'M.Com Part-I',
            pending_count: '4',
        },
        student_document_reminder: {
            student_name: 'Jane Sample Doe',
            case_no: 'IDOL-2025/ELIG/0042',
            course: 'M.Com Part-I',
            missing_document: 'Original Degree Marksheet & Migration Certificate',
        },
        password_reset: {
            full_name: 'System Administrator',
            username: 'admin',
            reset_link: typeof window !== 'undefined'
                ? `${window.location.origin}/reset-password/sample-verification-token-987abc`
                : 'http://127.0.0.1:8000/reset-password/sample-verification-token-987abc',
            valid_for: '60 minutes',
        },
    };

    const handlePreviewEmail = (slug: string) => {
        const tpl = templates[slug];
        const cur = templateState[slug] || { subject: '', body: '' };
        const tokens = SAMPLE_TOKENS[slug] || {};
        const recipient = SAMPLE_RECIPIENTS[slug] || { email: 'recipient@example.com', name: 'Sample Recipient' };

        let renderedSubject = cur.subject;
        let renderedBody = cur.body;

        Object.entries(tokens).forEach(([k, v]) => {
            const regex = new RegExp(`\\{${k}\\}`, 'g');
            renderedSubject = renderedSubject.replace(regex, v);
            renderedBody = renderedBody.replace(regex, v);
        });

        setPreviewModal({
            slug,
            title: tpl?.label || 'Email Template',
            subject: renderedSubject,
            body: renderedBody,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
        });
    };

    const handleSmtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSmtp(true);

        router.post('/settings/mail', smtpSettings, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSavingSmtp(false);
                setSmtpSettings(prev => ({ ...prev, mail_smtp_password: '' }));
                Swal.fire({
                    icon: 'success',
                    title: 'Email Settings Saved',
                    text: 'SMTP mail credentials updated successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSavingSmtp(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to save settings.', 'error');
            },
        });
    };

    const handleTestEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmail) return;

        setIsSendingTest(true);
        router.post('/settings/mail/test', { test_email: testEmail }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setIsSendingTest(false);
                const flash = (page.props as any)?.flash;
                if (flash?.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Test Email Failed',
                        text: flash.error,
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Test Email Sent',
                        text: flash?.success || `Test email sent to ${testEmail}. Please check your inbox.`,
                        timer: 4000,
                        showConfirmButton: false,
                    });
                }
            },
            onError: (errs) => {
                setIsSendingTest(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to send test email. Check SMTP settings.', 'error');
            },
            onFinish: () => {
                setIsSendingTest(false);
            },
        });
    };

    const handleTemplateSave = (e: React.FormEvent, slug: string) => {
        e.preventDefault();
        setSavingTemplate(prev => ({ ...prev, [slug]: true }));

        router.post(`/settings/mail/templates/${slug}`, templateState[slug], {
            preserveScroll: true,
            onSuccess: () => {
                setSavingTemplate(prev => ({ ...prev, [slug]: false }));
                Swal.fire({
                    icon: 'success',
                    title: 'Template Saved',
                    text: `Email template '${templates[slug]?.label}' saved.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setSavingTemplate(prev => ({ ...prev, [slug]: false }));
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to save email template.', 'error');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Email" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-envelope me-2 text-indigo"></i> Email
                                </h3>
                                <p className="text-muted small mb-0">
                                    Connect your own mail account, and edit the wording the system sends.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-4">
                {/* SMTP Connection */}
                <div className="col-lg-7">
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold text-dark mb-3">
                            <i className="fa fa-plug me-2 text-indigo"></i> Mail account (SMTP)
                        </h5>

                        <form onSubmit={handleSmtpSubmit}>
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="form-label text-secondary small fw-semibold">SMTP server</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. smtp.gmail.com"
                                        value={smtpSettings.mail_smtp_host}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_smtp_host: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-secondary small fw-semibold">Port</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={smtpSettings.mail_smtp_port}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_smtp_port: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Username</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        autoComplete="off"
                                        value={smtpSettings.mail_smtp_user}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_smtp_user: e.target.value })}
                                    />
                                    <small className="text-muted">
                                        The login your mail provider expects &mdash; e.g. full email address.
                                    </small>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Password
                                        {initialSettings.password_configured && (
                                            <span className="badge badge-glass-emerald ms-1">saved</span>
                                        )}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        autoComplete="new-password"
                                        placeholder={initialSettings.password_configured ? 'Leave blank to keep current' : ''}
                                        value={smtpSettings.mail_smtp_password}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_smtp_password: e.target.value })}
                                    />
                                    <small className="text-muted">
                                        App-specific password for Gmail or external SMTP relay.
                                    </small>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-secondary small fw-semibold">Encryption</label>
                                    <select
                                        className="form-select"
                                        value={smtpSettings.mail_smtp_crypto}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_smtp_crypto: e.target.value })}
                                    >
                                        <option value="tls">TLS</option>
                                        <option value="ssl">SSL</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-secondary small fw-semibold">From address</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={smtpSettings.mail_from_email}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_from_email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-secondary small fw-semibold">From name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="IDOL Eligibility Section"
                                        value={smtpSettings.mail_from_name}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_from_name: e.target.value })}
                                    />
                                </div>

                                <div className="col-12"><hr className="my-1" /></div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Send in batches of</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={1}
                                        max={500}
                                        value={smtpSettings.mail_batch_size}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_batch_size: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Pause between batches (seconds)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={0}
                                        max={300}
                                        value={smtpSettings.mail_batch_pause}
                                        onChange={(e) => setSmtpSettings({ ...smtpSettings, mail_batch_pause: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="text-end mt-3">
                                <button type="submit" disabled={isSavingSmtp} className="btn btn-indigo px-4">
                                    {isSavingSmtp ? 'Saving...' : 'Save email settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Test Send */}
                <div className="col-lg-5">
                    <div className="glass-card p-4 h-100">
                        <h5 className="fw-bold text-dark mb-3">
                            <i className="fa fa-paper-plane me-2 text-indigo"></i> Send a test email
                        </h5>
                        <p className="text-muted small">
                            Check the connection works before any student or university is contacted.
                        </p>
                        <form onSubmit={handleTestEmail}>
                            <div className="input-group mb-3">
                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="your.address@example.com"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    required
                                />
                                <button type="submit" disabled={isSendingTest} className="btn btn-indigo">
                                    <i className={`fa ${isSendingTest ? 'fa-spinner fa-spin' : 'fa-paper-plane'} me-1`}></i>
                                    {isSendingTest ? 'Sending...' : 'Send test'}
                                </button>
                            </div>
                        </form>
                        <hr />
                        <div className="text-muted small">
                            <i className="fa fa-info-circle me-1 text-indigo"></i>
                            <strong>Status:</strong> {initialSettings.mail_smtp_host ? `Configured for ${initialSettings.mail_smtp_host}` : 'SMTP not configured yet'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Wording Templates */}
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                            <div>
                                <h5 className="fw-bold text-dark mb-1">
                                    <i className="fa fa-file-text-o me-2 text-indigo"></i> Email wording
                                </h5>
                                <p className="text-muted small mb-0">
                                    Edit the subject and message for each email type. Anything in <code>{'{curly braces}'}</code> is replaced with real recipient details when dispatched.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    onClick={expandAll}
                                    className="btn btn-sm btn-glass text-secondary"
                                >
                                    <i className="fa fa-expand me-1"></i> Expand All
                                </button>
                                <button
                                    type="button"
                                    onClick={collapseAll}
                                    className="btn btn-sm btn-glass text-secondary"
                                >
                                    <i className="fa fa-compress me-1"></i> Collapse All
                                </button>
                            </div>
                        </div>

                        <div className="accordion" id="emailTemplates">
                            {Object.entries(templates).map(([slug, tpl]) => {
                                const cur = templateState[slug] || { subject: '', body: '' };
                                const isSaving = savingTemplate[slug] || false;
                                const isOpen = !!openSlugs[slug];

                                return (
                                    <div
                                        key={slug}
                                        className="accordion-item bg-white border border-secondary border-opacity-25 rounded shadow-sm mb-3 overflow-hidden"
                                    >
                                        <h2 className="accordion-header mb-0">
                                            <button
                                                className={`accordion-button ${!isOpen ? 'collapsed' : ''} bg-light py-3 px-4 fw-semibold text-dark shadow-none d-flex align-items-center justify-content-between`}
                                                type="button"
                                                onClick={() => toggleSlug(slug)}
                                                style={{ cursor: 'pointer' }}
                                                aria-expanded={isOpen}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <div
                                                        className={`rounded-circle d-flex align-items-center justify-content-center p-2 ${
                                                            slug === 'university_reminder'
                                                                ? 'bg-primary bg-opacity-10 text-primary'
                                                                : slug === 'student_document_reminder'
                                                                ? 'bg-success bg-opacity-10 text-success'
                                                                : 'bg-warning bg-opacity-10 text-warning'
                                                        }`}
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <i
                                                            className={`fa ${
                                                                slug === 'university_reminder'
                                                                    ? 'fa-university'
                                                                    : slug === 'student_document_reminder'
                                                                    ? 'fa-graduation-cap'
                                                                    : 'fa-key'
                                                            }`}
                                                        ></i>
                                                    </div>
                                                    <span className="fs-6 text-dark">{tpl.label}</span>
                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary border small ms-2">
                                                        {tpl.tokens.length} placeholders
                                                    </span>
                                                </div>
                                            </button>
                                        </h2>
                                        <div
                                            id={`tpl_${slug}`}
                                            className={`accordion-collapse ${isOpen ? 'show d-block' : 'd-none'}`}
                                        >
                                            <div className="accordion-body p-4 bg-white border-top">
                                                <div className="mb-3 p-3 bg-light rounded border border-light-subtle">
                                                    <div className="d-flex align-items-center gap-1 mb-2">
                                                        <i className="fa fa-code text-indigo me-1"></i>
                                                        <span className="small fw-semibold text-secondary">
                                                            Available Placeholders (click token to insert):
                                                        </span>
                                                    </div>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {tpl.tokens.map(tok => (
                                                            <button
                                                                key={tok}
                                                                type="button"
                                                                onClick={() => {
                                                                    setTemplateState(prev => ({
                                                                        ...prev,
                                                                        [slug]: {
                                                                            ...prev[slug],
                                                                            body: (prev[slug]?.body || '') + `{${tok}}`,
                                                                        },
                                                                    }));
                                                                }}
                                                                className="badge bg-white text-indigo border text-decoration-none py-1 px-2 cursor-pointer"
                                                                title={`Click to append {${tok}} to message body`}
                                                            >
                                                                {`{${tok}}`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <form onSubmit={(e) => handleTemplateSave(e, slug)}>
                                                    <div className="mb-3">
                                                        <label className="form-label text-secondary small fw-semibold">
                                                            Subject Line
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={cur.subject}
                                                            onChange={(e) =>
                                                                setTemplateState(prev => ({
                                                                    ...prev,
                                                                    [slug]: { ...prev[slug], subject: e.target.value },
                                                                }))
                                                            }
                                                            required
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label text-secondary small fw-semibold">
                                                            Message Body
                                                        </label>
                                                        <textarea
                                                            className="form-control"
                                                            rows={7}
                                                            style={{ fontFamily: 'monospace' }}
                                                            value={cur.body}
                                                            onChange={(e) =>
                                                                setTemplateState(prev => ({
                                                                    ...prev,
                                                                    [slug]: { ...prev[slug], body: e.target.value },
                                                                }))
                                                            }
                                                            required
                                                        ></textarea>
                                                    </div>
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePreviewEmail(slug)}
                                                            className="btn btn-glass"
                                                        >
                                                            <i className="fa fa-eye me-1 text-indigo"></i> Preview Email
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={isSaving}
                                                            className="btn btn-indigo px-4"
                                                        >
                                                            <i className={`fa ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'} me-1`}></i>
                                                            {isSaving ? 'Saving...' : 'Save template'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Preview Modal */}
            {previewModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1055 }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setPreviewModal(null);
                    }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '820px' }}>
                        <div className="modal-content glass-card shadow-lg border-0 overflow-hidden">
                            <div className="modal-header border-bottom py-3 px-4 bg-white d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded-circle p-2 bg-indigo bg-opacity-10 text-indigo d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                        <i className="fa fa-envelope-o fs-5"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">
                                            {previewModal.title} — Live Email Preview
                                        </h5>
                                        <p className="text-muted small mb-0">
                                            Sample demonstration with simulated token substitutions
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setPreviewModal(null)}
                                    aria-label="Close"
                                ></button>
                            </div>
                            <div className="modal-body p-4 bg-light">
                                <div className="bg-white rounded border shadow-sm p-4">
                                    <div className="border-bottom pb-3 mb-3">
                                        <div className="row g-2 small">
                                            <div className="col-sm-2 text-secondary fw-semibold">From:</div>
                                            <div className="col-sm-10 text-dark fw-medium">
                                                {smtpSettings.mail_from_name || 'IDOL Eligibility Section'} &lt;{smtpSettings.mail_from_email || 'eligibility@idol.mu.ac.in'}&gt;
                                            </div>
                                            <div className="col-sm-2 text-secondary fw-semibold">To:</div>
                                            <div className="col-sm-10 text-dark fw-medium">
                                                {previewModal.recipientName} &lt;{previewModal.recipientEmail}&gt;
                                            </div>
                                            <div className="col-sm-2 text-secondary fw-semibold">Subject:</div>
                                            <div className="col-sm-10 text-dark fw-bold fs-6">
                                                {previewModal.subject}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="py-3 px-2 text-dark"
                                        style={{
                                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                                            lineHeight: 1.6,
                                            whiteSpace: 'pre-wrap',
                                            minHeight: '160px',
                                        }}
                                    >
                                        {previewModal.body}
                                    </div>

                                    <div className="mt-4 pt-3 border-top text-muted small">
                                        <div className="fw-semibold text-dark">
                                            Institute of Distance and Open Learning (IDOL)
                                        </div>
                                        <div>University of Mumbai, Vidyanagari, Santacruz (East), Mumbai - 400 098</div>
                                        <div>Email: eligibility@idol.mu.ac.in | Website: mu.ac.in/distance-open-learning</div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-2 px-4 bg-white border-top d-flex justify-content-between align-items-center">
                                <span className="text-muted small">
                                    <i className="fa fa-info-circle text-indigo me-1"></i>
                                    Live Preview reflects any unsaved edits currently in the form fields.
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setPreviewModal(null)}
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
