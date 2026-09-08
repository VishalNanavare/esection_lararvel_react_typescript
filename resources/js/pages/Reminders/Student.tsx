import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Stream {
    Division: string;
}

export default function Student() {
    const [formData, setFormData] = useState({
        student_name: '',
        eligibility_case_no: '',
        course_name: '',
        missing_doc: 'Migration Certificate / Transfer Certificate (T.C.)',
    });

    const [streams, setStreams] = useState<Stream[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetch('/api/streams')
            .then(res => res.json())
            .then(data => setStreams(data.results || []))
            .catch(() => {});
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.student_name.trim() || !formData.eligibility_case_no.trim() || !formData.missing_doc.trim()) {
            Swal.fire('Required Fields', 'Please complete all required fields.', 'warning');
            return;
        }

        setIsSubmitting(true);
        router.post('/reminders/student', formData, {
            onSuccess: (page) => {
                setIsSubmitting(false);
                const flash = (page.props as any).flash;
                const pdfUrl = flash?.pdf_url;

                Swal.fire({
                    icon: 'success',
                    title: 'Candidate Reminder Issued!',
                    text: 'The notice has been saved.',
                    showCancelButton: !!pdfUrl,
                    confirmButtonText: pdfUrl ? '<i class="fa fa-print me-1"></i> Open PDF Notice' : 'OK',
                    cancelButtonText: 'View History',
                }).then((result) => {
                    if (result.isConfirmed && pdfUrl) {
                        window.open(pdfUrl, '_blank');
                    }
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to generate reminder.', 'error');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Candidate Document Reminder Portal" />

            <div className="row justify-content-center">
                <div className="col-lg-9 col-xl-8">
                    <div className="glass-card p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-envelope-open-o me-2 text-indigo"></i> Candidate Document Reminder
                                </h3>
                                <p className="text-muted small mb-0">
                                    Issue urgent reminder notices to individual admitted candidates for submitting pending migration/certificates.
                                </p>
                            </div>
                            <div>
                                <Link href="/reminders/student/history" className="btn btn-glass">
                                    <i className="fa fa-history me-1"></i> View Notice History
                                </Link>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-3 bg-light rounded border">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="form-label small fw-semibold text-secondary">
                                        Candidate Full Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Aarav Sharma"
                                        value={formData.student_name}
                                        onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label small fw-semibold text-secondary">
                                        Eligibility Case No. <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. 1024/2026"
                                        value={formData.eligibility_case_no}
                                        onChange={(e) => setFormData({ ...formData, eligibility_case_no: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label small fw-semibold text-secondary">Admitted Course / Program</label>
                                    <select
                                        className="form-select"
                                        value={formData.course_name}
                                        onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                    >
                                        <option value="">-- Select Course --</option>
                                        {streams.map(s => (
                                            <option key={s.Division} value={s.Division}>{s.Division}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label small fw-semibold text-secondary">
                                        Pending / Missing Document(s) <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        placeholder="e.g. Original Migration Certificate, Passing Certificate, Semester 6 Statement of Marks"
                                        value={formData.missing_doc}
                                        onChange={(e) => setFormData({ ...formData, missing_doc: e.target.value })}
                                        required
                                    />
                                    <small className="text-muted">
                                        Specify the exact documents the student must submit within 15 days.
                                    </small>
                                </div>

                                <div className="col-12 text-end pt-3 border-top mt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-indigo px-4 py-2"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <><i className="fa fa-spinner fa-spin me-1"></i> Issuing...</>
                                        ) : (
                                            <><i className="fa fa-paper-plane me-1"></i> Save &amp; Generate Candidate Notice</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
