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
            onSuccess: () => {
                setIsSendingTest(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Test Email Sent',
                    text: `Test email sent to ${testEmail}. Please check your inbox.`,
                    timer: 3000,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setIsSendingTest(false);
                Swal.fire('Error', 'Failed to send test email. Check SMTP settings.', 'error');
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
            onError: () => {
                setSavingTemplate(prev => ({ ...prev, [slug]: false }));
                Swal.fire('Error', 'Failed to save email template.', 'error');
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
                                <button type="submit" disabled={isSendingTest} className="btn btn-glass">
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
                        <h5 className="fw-bold text-dark mb-1">
                            <i className="fa fa-file-text-o me-2 text-indigo"></i> Email wording
                        </h5>
                        <p className="text-muted small mb-3">
                            Edit the subject and message for each email type. Anything in <code>{'{curly braces}'}</code> is replaced with real details when the email is dispatched.
                        </p>

                        <div className="accordion" id="emailTemplates">
                            {Object.entries(templates).map(([slug, tpl], idx) => {
                                const cur = templateState[slug] || { subject: '', body: '' };
                                const isSaving = savingTemplate[slug] || false;

                                return (
                                    <div key={slug} className="accordion-item bg-transparent border-secondary border-opacity-10 mb-2">
                                        <h2 className="accordion-header">
                                            <button
                                                className={`accordion-button ${idx !== 0 ? 'collapsed' : ''} bg-transparent fw-semibold text-dark`}
                                                type="button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#tpl_${slug}`}
                                            >
                                                {tpl.label}
                                            </button>
                                        </h2>
                                        <div
                                            id={`tpl_${slug}`}
                                            className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                                            data-bs-parent="#emailTemplates"
                                        >
                                            <div className="accordion-body">
                                                <p className="small text-muted mb-2">
                                                    Available placeholders:{' '}
                                                    {tpl.tokens.map(tok => (
                                                        <code key={tok} className="me-1">{`{${tok}}`}</code>
                                                    ))}
                                                </p>

                                                <form onSubmit={(e) => handleTemplateSave(e, slug)}>
                                                    <div className="mb-3">
                                                        <label className="form-label text-secondary small fw-semibold">Subject Line</label>
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
                                                        <label className="form-label text-secondary small fw-semibold">Message Body</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows={6}
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
                                                    <div className="text-end">
                                                        <button type="submit" disabled={isSaving} className="btn btn-indigo">
                                                            <i className="fa fa-check me-1"></i> {isSaving ? 'Saving...' : 'Save template'}
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
        </AppLayout>
    );
}
