import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { Select2, Select2Option } from '../../components/Select2';
import Swal from 'sweetalert2';

interface College {
    id: number;
    Name?: string;
    name?: string;
    text?: string;
    value?: string;
    States?: string;
}

interface Stream {
    id?: string;
    text?: string;
    Division?: string;
    stream?: string;
    course_name?: string;
}

interface AcademicYearItem {
    id: string;
    text: string;
    is_current?: boolean;
}

interface Props {
    academicYears?: AcademicYearItem[];
    streams?: Stream[];
    universities?: College[];
}

export default function Index({
    academicYears: academicYearsProp = [],
    streams: streamsProp = [],
    universities: universitiesProp = [],
}: Props) {
    const [formData, setFormData] = useState({
        admission_letter_for: '',
        admission_letter_date: new Date().toISOString().split('T')[0],
        admission_passing_course: '',
        passing_course: '',
        clg_add: '',
        university_name: '',
        admission_taken_in: '',
        admission_taken_year: '',
        gender: '',
        student_name: '',
    });

    const [colleges, setColleges] = useState<College[]>(universitiesProp);
    const [streams, setStreams] = useState<Stream[]>(streamsProp);
    const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>(academicYearsProp);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!universitiesProp || universitiesProp.length === 0) {
            fetch('/api/colleges?active_only=1&all=1')
                .then((res) => res.json())
                .then((data) => setColleges(data.results || []))
                .catch(() => {});
        } else {
            setColleges(universitiesProp);
        }

        if (!streamsProp || streamsProp.length === 0) {
            fetch('/api/streams')
                .then((res) => res.json())
                .then((data) => {
                    const list = (data.results || []).map((item: any) => ({
                        id: item.Division || item.text || item.id,
                        Division: item.Division || item.text || item.id,
                        text: item.Division || item.text || item.id,
                        stream: item.stream || item.Name || item.text || item.id,
                    }));
                    setStreams(list);
                })
                .catch(() => {});
        } else {
            setStreams(streamsProp);
        }

        if (!academicYearsProp || academicYearsProp.length === 0) {
            fetch('/api/academic-years')
                .then((res) => res.json())
                .then((data) => {
                    const list = (data.results || []).map((item: any) =>
                        typeof item === 'string'
                            ? { id: item, text: item }
                            : { id: item.id || item.year_label, text: item.text || item.year_label || item.id }
                    );
                    setAcademicYears(list);
                })
                .catch(() => {});
        } else {
            setAcademicYears(academicYearsProp);
        }
    }, [universitiesProp, streamsProp, academicYearsProp]);

    const streamOptions = useMemo<Select2Option[]>(() => {
        return streams.map((s) => {
            const val = s.Division || s.text || s.id || '';
            return {
                value: val,
                label: val,
                name: s.stream,
            };
        });
    }, [streams]);

    const universityOptions = useMemo<Select2Option[]>(() => {
        return colleges.map((u) => {
            const name = (u.Name || u.name || u.text || u.value || '').trim();
            return {
                value: name,
                label: name,
                name: name,
            };
        });
    }, [colleges]);

    const yearOptions = useMemo<Select2Option[]>(() => {
        return academicYears.map((y) => {
            const text = y.text || y.id;
            return {
                value: text,
                label: text,
            };
        });
    }, [academicYears]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.admission_letter_for.trim()) {
            Swal.fire('Required', 'Please enter Admission Letter For', 'warning');
            return;
        }
        if (!formData.admission_passing_course) {
            Swal.fire('Required', 'Please select Passing Course', 'warning');
            return;
        }
        if (!formData.clg_add) {
            Swal.fire('Required', 'Please select Last Attended University', 'warning');
            return;
        }
        if (!formData.admission_letter_date) {
            Swal.fire('Required', 'Please select Admission Letter Date', 'warning');
            return;
        }
        if (!formData.gender) {
            Swal.fire('Required', 'Please select Gender (Mr. / Ms.)', 'warning');
            return;
        }
        if (!formData.student_name.trim()) {
            Swal.fire('Required', 'Please enter Student Full Name', 'warning');
            return;
        }
        if (!formData.admission_taken_year) {
            Swal.fire('Required', 'Please select Academic Year', 'warning');
            return;
        }
        if (!formData.admission_taken_in) {
            Swal.fire('Required', 'Please select Admission Taken In CDOE', 'warning');
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
            <Head title="Regulation Form - E-Section" />

            <div className="container-fluid px-0">
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between border-bottom">
                        <h5 className="mb-0 fw-semibold text-dark">
                            Regulation Form
                        </h5>
                        <Link href="/regularization/history" className="btn btn-sm btn-outline-secondary">
                            <i className="fa fa-history me-1"></i> Letter History
                        </Link>
                    </div>

                    <div className="card-body p-4">
                        <form onSubmit={handleSubmit}>
                            {/* Row 1: Admission Letter For : | Passing Course From University of Mumbai / IDOL : | Last Attended University : */}
                            <div className="row g-3 mb-3">
                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Admission Letter For :
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Admission Letter For"
                                        name="admission_letter_for"
                                        value={formData.admission_letter_for}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_letter_for: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Passing Course From University of Mumbai / IDOL :
                                    </label>
                                    <Select2
                                        id="admission_passing_course"
                                        name="admission_passing_course"
                                        value={formData.admission_passing_course}
                                        onChange={(val) =>
                                            setFormData({
                                                ...formData,
                                                admission_passing_course: val,
                                                passing_course: val,
                                            })
                                        }
                                        options={streamOptions}
                                        placeholder="Select Passing Course"
                                        allowClear={true}
                                    />
                                </div>

                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Last Attended University :
                                    </label>
                                    <Select2
                                        id="clg_add"
                                        name="clg_add"
                                        value={formData.clg_add}
                                        onChange={(val) =>
                                            setFormData({
                                                ...formData,
                                                clg_add: val,
                                                university_name: val,
                                            })
                                        }
                                        options={universityOptions}
                                        placeholder="Select University Name"
                                        allowClear={true}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Admission Letter Date : */}
                            <div className="row g-3 mb-3">
                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Admission Letter Date :
                                    </label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="admission_letter_date"
                                        value={formData.admission_letter_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admission_letter_date: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="col-lg-4 d-none d-lg-block"></div>
                                <div className="col-lg-4 d-none d-lg-block"></div>
                            </div>

                            {/* Row 3: Name Of Student : | Acadmic Year | Admission Taken In CDOE : */}
                            <div className="row g-3 mb-4">
                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Name Of Student :
                                    </label>
                                    <div className="input-group">
                                        <select
                                            name="gender"
                                            id="gender"
                                            className="form-select"
                                            style={{ maxWidth: '120px' }}
                                            value={formData.gender}
                                            onChange={(e) =>
                                                setFormData({ ...formData, gender: e.target.value })
                                            }
                                            required
                                        >
                                            <option value="">Select Gen</option>
                                            <option value="Mr">Mr.</option>
                                            <option value="Ms">Ms.</option>
                                        </select>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="student_name"
                                            placeholder="Student Name"
                                            value={formData.student_name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, student_name: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Acadmic Year
                                    </label>
                                    <Select2
                                        id="admission_taken_year"
                                        name="admission_taken_year"
                                        value={formData.admission_taken_year}
                                        onChange={(val) =>
                                            setFormData({ ...formData, admission_taken_year: val })
                                        }
                                        options={yearOptions}
                                        placeholder="Select Admission Taken Year"
                                        allowClear={true}
                                    />
                                </div>

                                <div className="col-lg-4">
                                    <label className="form-label fw-semibold text-secondary small">
                                        Admission Taken In CDOE :
                                    </label>
                                    <Select2
                                        id="admission_taken_in"
                                        name="admission_taken_in"
                                        value={formData.admission_taken_in}
                                        onChange={(val) =>
                                            setFormData({ ...formData, admission_taken_in: val })
                                        }
                                        options={streamOptions}
                                        placeholder="Select Admission For Course In"
                                        allowClear={true}
                                    />
                                </div>
                            </div>

                            <hr className="my-4" />

                            {/* Submit button on bottom right */}
                            <div className="d-flex justify-content-end">
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 py-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-1"></i> Creating...
                                        </>
                                    ) : (
                                        'Create Regularization Letter'
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
