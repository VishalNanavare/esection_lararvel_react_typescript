import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Props {
    settings: Record<string, string>;
}

export default function Institute({ settings }: Props) {
    const [formData, setFormData] = useState({
        institute_name: settings.institute_name || 'Institute of Distance and Open Learning (IDOL)',
        institute_contact: settings.institute_contact || 'eligibility@idol.mu.ac.in | 8657584307',
        institute_university_title: settings.institute_university_title || 'UNIVERSITY OF MUMBAI',
        institute_address: settings.institute_address || 'Dr. Shankar Dayal Sharma Bhavan, Vidyanagari, Santacruz (East), Mumbai - 400 098.',
        institute_signatory_name: settings.institute_signatory_name || '',
        institute_signatory_designation: settings.institute_signatory_designation || 'Deputy Registrar / Assistant Registrar',
        institute_signature_space_lines: settings.institute_signature_space_lines || '3',
    });

    const [logoPreview, setLogoPreview] = useState<string>(
        settings.institute_logo_path
            ? (settings.institute_logo_path.startsWith('/') ? settings.institute_logo_path : '/' + settings.institute_logo_path)
            : ''
    );
    const [letterheadPreview, setLetterheadPreview] = useState<string>(
        settings.institute_letterhead_path
            ? (settings.institute_letterhead_path.startsWith('/') ? settings.institute_letterhead_path : '/' + settings.institute_letterhead_path)
            : ''
    );

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [letterheadFile, setLetterheadFile] = useState<File | null>(null);

    const [logoError, setLogoError] = useState<string>('');
    const [letterheadError, setLetterheadError] = useState<string>('');
    const [signatureSpaceError, setSignatureSpaceError] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const letterheadInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (settings.institute_logo_path) {
            setLogoPreview(settings.institute_logo_path.startsWith('/') ? settings.institute_logo_path : '/' + settings.institute_logo_path);
        }
        if (settings.institute_letterhead_path) {
            setLetterheadPreview(settings.institute_letterhead_path.startsWith('/') ? settings.institute_letterhead_path : '/' + settings.institute_letterhead_path);
        }
    }, [settings.institute_logo_path, settings.institute_letterhead_path]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setLogoError('');
        if (!file) {
            setLogoFile(null);
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            setLogoError('Only PNG or JPEG images are accepted.');
            if (logoInputRef.current) logoInputRef.current.value = '';
            setLogoFile(null);
            return;
        }

        if (file.size > 2048 * 1024) {
            setLogoError(`This file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 2MB.`);
            if (logoInputRef.current) logoInputRef.current.value = '';
            setLogoFile(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                if (img.naturalWidth !== 300 || img.naturalHeight !== 300) {
                    setLogoError(`The image must be exactly 300x300px (this file is ${img.naturalWidth}x${img.naturalHeight}px).`);
                    if (logoInputRef.current) logoInputRef.current.value = '';
                    setLogoFile(null);
                    return;
                }
                setLogoPreview(dataUrl);
                setLogoFile(file);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleLetterheadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setLetterheadError('');
        if (!file) {
            setLetterheadFile(null);
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            setLetterheadError('Only PNG or JPEG images are accepted.');
            if (letterheadInputRef.current) letterheadInputRef.current.value = '';
            setLetterheadFile(null);
            return;
        }

        if (file.size > 2048 * 1024) {
            setLetterheadError(`This file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 2MB.`);
            if (letterheadInputRef.current) letterheadInputRef.current.value = '';
            setLetterheadFile(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                if (img.naturalWidth !== 1486 || img.naturalHeight !== 368) {
                    setLetterheadError(`The image must be exactly 1486x368px (this file is ${img.naturalWidth}x${img.naturalHeight}px).`);
                    if (letterheadInputRef.current) letterheadInputRef.current.value = '';
                    setLetterheadFile(null);
                    return;
                }
                setLetterheadPreview(dataUrl);
                setLetterheadFile(file);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleSignatureSpaceChange = (val: string) => {
        setFormData({ ...formData, institute_signature_space_lines: val });
        if (val.trim() === '') {
            setSignatureSpaceError('');
            return;
        }
        const num = parseInt(val, 10);
        if (isNaN(num) || String(num) !== val.trim() || num < 1 || num > 5) {
            setSignatureSpaceError('Must be a whole number between 1 and 5.');
        } else {
            setSignatureSpaceError('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (logoError || letterheadError || signatureSpaceError) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Fix the errors before saving',
            });
            return;
        }

        setIsSubmitting(true);

        const data = new FormData();
        Object.entries(formData).forEach(([k, v]) => data.append(k, v));
        if (logoFile) data.append('logo', logoFile);
        if (letterheadFile) data.append('letterhead', letterheadFile);

        router.post('/settings/institute', data, {
            forceFormData: true,
            onSuccess: () => {
                setIsSubmitting(false);
                if (logoInputRef.current) logoInputRef.current.value = '';
                if (letterheadInputRef.current) letterheadInputRef.current.value = '';
                setLogoFile(null);
                setLetterheadFile(null);
                Swal.fire({
                    icon: 'success',
                    title: 'Institute Details',
                    text: 'Institute details updated successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to update.', 'error');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Institute Details" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-university me-2 text-indigo"></i> Institute Details
                                </h3>
                                <p className="text-muted small mb-0">
                                    These details appear on every generated letter &mdash; update them here instead of asking a developer.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>

                        <form onSubmit={handleSubmit} encType="multipart/form-data">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="form-label text-secondary small fw-semibold">Institute Name</label>
                                    <input
                                        type="text"
                                        name="institute_name"
                                        className="form-control"
                                        value={formData.institute_name}
                                        onChange={(e) => setFormData({ ...formData, institute_name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label text-secondary small fw-semibold">Contact Details</label>
                                    <input
                                        type="text"
                                        name="institute_contact"
                                        className="form-control"
                                        value={formData.institute_contact}
                                        onChange={(e) => setFormData({ ...formData, institute_contact: e.target.value })}
                                        placeholder="Phone / email"
                                    />
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-secondary small fw-semibold">Parent University Name</label>
                                    <input
                                        type="text"
                                        name="institute_university_title"
                                        className="form-control"
                                        value={formData.institute_university_title}
                                        onChange={(e) => setFormData({ ...formData, institute_university_title: e.target.value })}
                                        placeholder="UNIVERSITY OF MUMBAI"
                                    />
                                    <div className="form-text small text-muted">
                                        The university-level heading printed above the institute name on every letter. Leave blank to keep printing &quot;UNIVERSITY OF MUMBAI&quot;.
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-secondary small fw-semibold">Full Postal Address</label>
                                    <textarea
                                        name="institute_address"
                                        className="form-control"
                                        rows={3}
                                        value={formData.institute_address}
                                        onChange={(e) => setFormData({ ...formData, institute_address: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Signatory Name</label>
                                    <input
                                        type="text"
                                        name="institute_signatory_name"
                                        className="form-control"
                                        value={formData.institute_signatory_name}
                                        onChange={(e) => setFormData({ ...formData, institute_signatory_name: e.target.value })}
                                        placeholder="e.g. Dr. Jane Doe"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Signatory Designation</label>
                                    <input
                                        type="text"
                                        name="institute_signatory_designation"
                                        className="form-control"
                                        value={formData.institute_signatory_designation}
                                        onChange={(e) => setFormData({ ...formData, institute_signatory_designation: e.target.value })}
                                        placeholder="Deputy Registrar / Assistant Registrar"
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label text-secondary small fw-semibold">Signature Space (blank lines)</label>
                                    <input
                                        type="number"
                                        name="institute_signature_space_lines"
                                        id="signature_space_input"
                                        className="form-control"
                                        value={formData.institute_signature_space_lines}
                                        onChange={(e) => handleSignatureSpaceChange(e.target.value)}
                                        min={1}
                                        max={5}
                                        placeholder="Default"
                                    />
                                    {signatureSpaceError && (
                                        <div className="small text-danger mt-1">{signatureSpaceError}</div>
                                    )}
                                    <div className="form-text small text-muted">
                                        Blank lines above the signature in every letter, to leave room to sign (1&ndash;5). Leave blank to keep the default spacing.
                                    </div>
                                </div>

                                <div className="col-md-8">
                                    <label className="form-label text-secondary small fw-semibold">Logo</label>
                                    {logoPreview && (
                                        <div className="mb-2">
                                            <img
                                                id="logo_preview"
                                                src={logoPreview}
                                                alt="Logo preview"
                                                style={{ maxHeight: '60px', width: 'auto', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        name="logo"
                                        id="logo_input"
                                        ref={logoInputRef}
                                        className="form-control"
                                        accept="image/png,image/jpeg"
                                        onChange={handleLogoChange}
                                    />
                                    {logoError && <div className="small text-danger mt-1">{logoError}</div>}
                                    <div className="form-text small text-muted">
                                        PNG or JPEG, exactly 300&times;300px, up to 2MB. Leave blank to keep the current logo.
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="form-label text-secondary small fw-semibold">Letterhead</label>
                                    {letterheadPreview && (
                                        <div className="mb-2">
                                            <img
                                                id="letterhead_preview"
                                                src={letterheadPreview}
                                                alt="Letterhead preview"
                                                style={{ maxHeight: '60px', width: 'auto', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        name="letterhead"
                                        id="letterhead_input"
                                        ref={letterheadInputRef}
                                        className="form-control"
                                        accept="image/png,image/jpeg"
                                        onChange={handleLetterheadChange}
                                    />
                                    {letterheadError && <div className="small text-danger mt-1">{letterheadError}</div>}
                                    <div className="form-text small text-muted">
                                        PNG or JPEG, exactly 1486&times;368px, up to 2MB. Leave blank to keep the current letterhead.
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-indigo px-4 py-2"
                                    id="institute_submit_btn"
                                >
                                    <i className="fa fa-check me-1"></i> {isSubmitting ? 'Saving...' : 'Save Institute Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
