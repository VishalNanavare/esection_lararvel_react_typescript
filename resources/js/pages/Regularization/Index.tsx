import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface College {
    id: number;
    Name: string;
    States?: string;
}

interface Stream {
    Division: string;
    course_name?: string;
}

export default function Index() {
    const [formData, setFormData] = useState({
        admission_letter_for: '',
        admission_letter_date: new Date().toISOString().split('T')[0],
        admission_passing_course: '',
        clg_add: '',
        admission_taken_in: '',
        admission_taken_year: '',
        gender: '',
        student_name: '',
        eligibility_case_no: '',
    });

    const [colleges, setColleges] = useState<College[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [academicYears, setAcademicYears] = useState<{ id: string; text: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetch('/api/colleges?active_only=1')
            .then(res => res.json())
            .then(data => setColleges(data.results || []))
            .catch(() => {});

        fetch('/api/streams')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) => ({
                    Division: item.Division || item.text || item.id,
                    course_name: item.stream || item.Name || item.text || item.id,
                }));
                setStreams(list);
            })
            .catch(() => {});

        fetch('/api/academic-years')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) =>
                    typeof item === 'string'
                        ? { id: item, text: item }
                        : { id: item.id || item.year_label, text: item.text || item.year_label || item.id }
                );
                setAcademicYears(list);
            })
            .catch(() => {});
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.student_name.trim()) {
            Swal.fire('Required', 'Please enter Student Full Name', 'warning');
            return;
        }

        setIsSubmitting(true);
        router.post('/regularization', formData, {
            onSuccess: (page) => {
                setIsSubmitting(false);
                const flash = (page.props as any).flash;
                const pdfUrl = flash?.pdf_url;

                Swal.fire({
                    icon: 'success',
                    title: 'Regularization Letter Created!',
                    text: 'The regularization letter has been generated.',
                    showCancelButton: !!pdfUrl,
                    confirmButtonText: pdfUrl ? '<i class="fa fa-print me-1"></i> Open PDF' : 'OK',
                    cancelButtonText: 'Stay Here',
                }).then((result) => {
                    if (result.isConfirmed && pdfUrl) {
                        window.open(pdfUrl, '_blank');
                    }
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to generate letter.', 'error');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Student Eligibility Regularization Portal" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-file-text-o me-2 text-indigo"></i> Student Eligibility Regularization Form
                                </h3>
                                <p className="text-muted small mb-0">
                                    Generate official regularization verification letters for candidates requiring eligibility adjustments.
                                </p>
                            </div>
                            <div>
                                <Link href="/regularization/history" className="btn btn-glass">
                                    <i className="fa fa-history me-1"></i> Letter History
                                </Link>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3 mb-4 filter-panel">
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Admission Letter Addressed To
                                    </label>
                                    <input
                                        type="text"
                                        name="admission_letter_for"
                                        className="form-control"
                                        placeholder="e.g. The Principal / Director"
                                        value={formData.admission_letter_for}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_letter_for: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Admission Letter Date
                                    </label>
                                    <input
                                        type="date"
                                        name="admission_letter_date"
                                        className="form-control"
                                        placeholder="YYYY-MM-DD"
                                        value={formData.admission_letter_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_letter_date: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Passing Course / Program (AJAX)
                                    </label>
                                    <select
                                        name="admission_passing_course"
                                        className="form-select"
                                        value={formData.admission_passing_course}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_passing_course: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">-- Select Passing Course --</option>
                                        {streams.map((s, idx) => (
                                            <option key={idx} value={s.Division}>
                                                {s.course_name || s.Division}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Last Attended University (AJAX)
                                    </label>
                                    <select
                                        name="clg_add"
                                        className="form-select"
                                        value={formData.clg_add}
                                        onChange={(e) =>
                                            setFormData({ ...formData, clg_add: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">-- Select University Name --</option>
                                        {colleges.map((c) => (
                                            <option key={c.id} value={c.Name}>
                                                {c.Name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Admission Taken In (IDOL) (AJAX)
                                    </label>
                                    <select
                                        name="admission_taken_in"
                                        className="form-select"
                                        value={formData.admission_taken_in}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_taken_in: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">-- Select Course --</option>
                                        {streams.map((s, idx) => (
                                            <option key={idx} value={s.Division}>
                                                {s.course_name || s.Division}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Academic Year (AJAX)
                                    </label>
                                    <select
                                        name="admission_taken_year"
                                        className="form-select"
                                        value={formData.admission_taken_year}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_taken_year: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">-- Select Academic Year --</option>
                                        {academicYears.map((y) => (
                                            <option key={y.id} value={y.id}>
                                                {y.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label text-secondary small fw-semibold">Gender</label>
                                    <select
                                        name="gender"
                                        className="form-select"
                                        value={formData.gender}
                                        onChange={(e) =>
                                            setFormData({ ...formData, gender: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select</option>
                                        <option value="Mr">Mr.</option>
                                        <option value="Ms">Ms.</option>
                                    </select>
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label text-secondary small fw-semibold">Student Full Name</label>
                                    <input
                                        type="text"
                                        name="student_name"
                                        className="form-control"
                                        placeholder="e.g. Rahul Sharma"
                                        value={formData.student_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, student_name: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Eligibility Case Number</label>
                                    <input
                                        type="text"
                                        name="eligibility_case_no"
                                        className="form-control"
                                        placeholder="e.g. CASE-2025/104"
                                        value={formData.eligibility_case_no}
                                        onChange={(e) =>
                                            setFormData({ ...formData, eligibility_case_no: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div className="text-end">
                                <button
                                    type="submit"
                                    className="btn btn-indigo py-2 px-4"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-1"></i> Generating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-file-pdf-o me-1"></i> Generate Regularization PDF Letter
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
