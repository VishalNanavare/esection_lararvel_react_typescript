import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { SharedProps } from '../../types';
import { AppLayout } from '../../components/AppLayout';
import { Select2, Select2Option } from '../../components/Select2';
import Swal from 'sweetalert2';

interface Student {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    admission_taken_in: string;
    admission_taken_year: string;
    clg_add: string;
    to_name: string | null;
    reminder_note_count?: number;
    university_name?: string;
    fees?: string;
    verification_status?: string;
    exclusion_reason?: string | null;
    is_verified?: boolean;
    is_excluded?: boolean;
    is_eligible?: boolean;
    computed_status?: 'pending' | 'reminder_sent' | 'verified' | 'excluded';
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface UniversityItem {
    value: string;
    label: string;
    name?: string;
    fees?: string;
    head_name?: string;
}

interface YearItem {
    id: string;
    text: string;
    is_current?: boolean;
}

interface StreamItem {
    id: string;
    text: string;
    stream?: string;
}

interface SummaryData {
    total: number;
    verified: number;
    pending: number;
    eligible: number;
    excluded: number;
}

interface Props {
    students: PaginatedData<Student>;
    academicYears?: YearItem[];
    streams?: StreamItem[];
    universities?: UniversityItem[];
    summary?: SummaryData;
    filters: {
        acd_year: string;
        stream: string;
        clg_add: string;
        student_name?: string;
        reminder_status?: string;
        verification_status?: string;
    };
}

export default function University({
    students,
    academicYears,
    streams,
    universities,
    summary,
    filters,
}: Props) {
    const { props } = usePage<SharedProps>();
    const canExport = props.features.export;
    const [year, setYear] = useState(filters.acd_year || '');
    const [stream, setStream] = useState(filters.stream || '');
    const [university, setUniversity] = useState(filters.clg_add || '');
    const [studentName, setStudentName] = useState(filters.student_name || '');
    const [verificationStatus, setVerificationStatus] = useState(filters.verification_status || 'pending');
    const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

    const hasUniversity = Boolean(university.trim() || (filters.clg_add && filters.clg_add.trim()));

    // Select eligible candidates by default
    const [selectedIds, setSelectedIds] = useState<number[]>(() => {
        return students.data.filter((s) => s.is_eligible !== false).map((s) => s.id);
    });
    const [reminderType, setReminderType] = useState('1st Reminder Notice');
    const [headName, setHeadName] = useState('');

    const [years, setYears] = useState<Select2Option[]>(() => {
        if (academicYears && academicYears.length > 0) {
            return academicYears.map((y) => ({ value: y.id, label: y.text }));
        }
        return [];
    });

    const [streamOptions, setStreamOptions] = useState<Select2Option[]>(() => {
        if (streams && streams.length > 0) {
            return streams.map((s) => ({ value: s.id, label: s.text }));
        }
        return [];
    });

    const [universityOptions, setUniversityOptions] = useState<Select2Option[]>(() => {
        if (universities && universities.length > 0) {
            return universities.map((u) => {
                const feesStr = u.fees ? `₹${u.fees}` : '—';
                return {
                    value: u.value,
                    name: u.name || u.value,
                    fees: u.fees,
                    label: u.label || `${u.name || u.value} | Fees: ${feesStr}`,
                };
            });
        }
        return [];
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync with props if updated via Inertia navigation
    useEffect(() => {
        if (academicYears && academicYears.length > 0) {
            setYears(academicYears.map((y) => ({ value: y.id, label: y.text })));
        }
    }, [academicYears]);

    useEffect(() => {
        if (streams && streams.length > 0) {
            setStreamOptions(streams.map((s) => ({ value: s.id, label: s.text })));
        }
    }, [streams]);

    useEffect(() => {
        if (universities && universities.length > 0) {
            setUniversityOptions(
                universities.map((u) => {
                    const feesStr = u.fees ? `₹${u.fees}` : '—';
                    return {
                        value: u.value,
                        name: u.name || u.value,
                        fees: u.fees,
                        label: u.label || `${u.name || u.value} | Fees: ${feesStr}`,
                    };
                })
            );
        }
    }, [universities]);

    // Sync filter state when Inertia props change
    useEffect(() => {
        setYear(filters.acd_year || '');
    }, [filters.acd_year]);

    useEffect(() => {
        setStream(filters.stream || '');
    }, [filters.stream]);

    useEffect(() => {
        setUniversity(filters.clg_add || '');
    }, [filters.clg_add]);

    useEffect(() => {
        setStudentName(filters.student_name || '');
    }, [filters.student_name]);

    useEffect(() => {
        setVerificationStatus(filters.verification_status || 'pending');
    }, [filters.verification_status]);

    // AJAX fallbacks if not provided in page props
    useEffect(() => {
        if (!academicYears || academicYears.length === 0) {
            fetch('/api/academic-years')
                .then((res) => res.json())
                .then((data) => {
                    const list = (data.results || []).map((item: any) => ({
                        value: item.id || item.year_label,
                        label: item.text || item.year_label || item.id,
                    }));
                    if (list.length > 0) setYears(list);
                })
                .catch(() => {});
        }

        if (!streams || streams.length === 0) {
            fetch('/api/streams')
                .then((res) => res.json())
                .then((data) => {
                    const list = (data.results || []).map((item: any) => ({
                        value: item.Division || item.id || item.text,
                        label: item.stream || item.Division || item.text || item.id,
                    }));
                    if (list.length > 0) setStreamOptions(list);
                })
                .catch(() => {});
        }

        if (!universities || universities.length === 0) {
            fetch('/api/colleges?active_only=1&all=1')
                .then((res) => res.json())
                .then((data) => {
                    const list = (data.results || []).map((item: any) => {
                        const rawFees = item.fees !== null && item.fees !== '' ? String(item.fees).trim() : '';
                        const feesVal = rawFees !== '' && rawFees !== '0' ? rawFees : '';
                        const feesText = feesVal !== '' ? `₹${feesVal}` : '—';
                        const name = item.name || item.text || item.id;
                        return {
                            value: name,
                            name: name,
                            fees: feesVal,
                            label: `${name} | Fees: ${feesText}`,
                        };
                    });
                    if (list.length > 0) setUniversityOptions(list);
                })
                .catch(() => {});
        }
    }, []);

    // Update selectedIds when student data changes
    useEffect(() => {
        setSelectedIds(students.data.filter((s) => s.is_eligible !== false).map((s) => s.id));
    }, [students.data]);

    const handleFilter = (e?: React.FormEvent, overrideStatus?: string) => {
        if (e) e.preventDefault();
        const statusToUse = overrideStatus !== undefined ? overrideStatus : verificationStatus;
        router.get(
            '/reminders/university',
            {
                acd_year: year,
                stream,
                clg_add: university,
                student_name: studentName,
                verification_status: statusToUse,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleResetFilters = () => {
        setYear('');
        setStream('');
        setUniversity('');
        setStudentName('');
        setVerificationStatus('pending');
        router.get(
            '/reminders/university',
            {
                verification_status: 'pending',
            },
            {
                preserveState: false,
                replace: true,
            }
        );
    };

    const handleUpdateStatus = (
        studentId: number,
        candidateName: string,
        newStatus: 'verified' | 'pending' | 'excluded'
    ) => {
        const isVerifying = newStatus === 'verified';
        Swal.fire({
            title: isVerifying ? 'Mark as Verified?' : `Change Status to ${newStatus}?`,
            html: `Are you sure you want to update verification status for <strong>${candidateName}</strong> to <strong class="${
                isVerifying ? 'text-success' : 'text-primary'
            }">${newStatus.toUpperCase()}</strong>?`,
            icon: isVerifying ? 'question' : 'info',
            showCancelButton: true,
            confirmButtonColor: isVerifying ? '#10b981' : '#4f46e5',
            cancelButtonColor: '#6c757d',
            confirmButtonText: isVerifying
                ? '<i class="fa fa-check me-1"></i> Yes, Mark Verified'
                : `Yes, Set ${newStatus}`,
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                setUpdatingStatusId(studentId);
                router.post(
                    `/reminders/university/students/${studentId}/status`,
                    { status: newStatus },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setUpdatingStatusId(null);
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'success',
                                title: `Candidate marked as ${newStatus}!`,
                                showConfirmButton: false,
                                timer: 2500,
                            });
                        },
                        onError: (errs) => {
                            setUpdatingStatusId(null);
                            Swal.fire(
                                'Error',
                                Object.values(errs).flat().join('\n') || 'Failed to update candidate status.',
                                'error'
                            );
                        },
                    }
                );
            }
        });
    };

    const eligibleStudents = students.data.filter((s) => s.is_eligible !== false);
    const isAllSelected = eligibleStudents.length > 0 && eligibleStudents.every((s) => selectedIds.includes(s.id));

    const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(eligibleStudents.map((s) => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const activeUnivOption = universityOptions.find(
        (u) => u.value === university || u.name === university
    );
    const activeUnivName = activeUnivOption?.name || activeUnivOption?.value || university || filters.clg_add || '';
    const activeUnivFees = activeUnivOption?.fees;

    const handleGenerateReminder = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedIds.length === 0) {
            Swal.fire('No Candidates Selected', 'Please check at least one candidate from the table.', 'warning');
            return;
        }

        const selectedStudentsList = students.data.filter((s) => selectedIds.includes(s.id));

        // Determine target university: from filter or inferred from selected candidates
        let targetUniv = activeUnivName.trim();
        if (!targetUniv) {
            const candidateUnivs = Array.from(
                new Set(
                    selectedStudentsList
                        .map((s) => (s.university_name || s.clg_add || '').trim())
                        .filter(Boolean)
                )
            );

            if (candidateUnivs.length === 1) {
                targetUniv = candidateUnivs[0];
            } else if (candidateUnivs.length > 1) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Multiple Universities Selected',
                    text: 'The selected candidates belong to different institutions (' + candidateUnivs.slice(0, 3).join(', ') + (candidateUnivs.length > 3 ? '...' : '') + '). Please select candidates from the same university or filter by Target University first.',
                });
                return;
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Target University Required',
                    text: 'Please select a Target University before generating a reminder notice.',
                });
                return;
            }
        }

        setIsSubmitting(true);
        const academicYear = year || selectedStudentsList[0]?.admission_taken_year || '';

        router.post(
            '/reminders/university',
            {
                student_ids: selectedIds,
                note_text: reminderType,
                note_date: new Date().toISOString().split('T')[0],
                academic_year: academicYear,
                university_name: targetUniv,
                admission_taken_in: stream || null,
                head_name: headName || 'The Controller of Examinations',
            },
            {
                onSuccess: (page) => {
                    setIsSubmitting(false);
                    const flash = (page.props as any).flash;
                    const pdfUrl = flash?.pdf_url;

                    Swal.fire({
                        icon: 'success',
                        title: 'University Reminder Recorded!',
                        text: 'Reminder notes recorded and notice prepared.',
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
                    Swal.fire(
                        'Error',
                        Object.values(errs).flat().join('\n') || 'Failed to record reminders.',
                        'error'
                    );
                },
            }
        );
    };

    const renderAddress = (addr: string | null | undefined) => {
        if (!addr) return '—';
        const lines = addr.split(/<br\s*\/?>/i);
        return lines.map((line, idx) => (
            <React.Fragment key={idx}>
                {line.trim()}
                {idx < lines.length - 1 && <br />}
            </React.Fragment>
        ));
    };

    const exportUrl = `/reminders/university/export?acd_year=${encodeURIComponent(
        year
    )}&stream=${encodeURIComponent(stream)}&clg_add=${encodeURIComponent(
        university
    )}&student_name=${encodeURIComponent(studentName)}&verification_status=${encodeURIComponent(
        verificationStatus
    )}`;

    return (
        <AppLayout>
            <Head title="University Marksheet Reminder Portal" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-clock-o me-2 text-indigo"></i> University Verification Reminder Portal
                                </h3>
                                <p className="text-muted small mb-0">
                                    Generate 1st and 2nd reminder notice PDF letters for pending eligibility verifications.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                {canExport && (
                                    <a href={exportUrl} className="btn btn-outline-success" id="export_excel_btn" title="Download filtered candidates spreadsheet in Microsoft Excel (.xlsx) format">
                                        <i className="fa fa-file-excel-o me-1"></i> Export to Excel (.xlsx)
                                    </a>
                                )}
                                <Link href="/reminders/university/history" className="btn btn-indigo">
                                    <i className="fa fa-history me-1"></i> Reminder History
                                </Link>
                            </div>
                        </div>

                        {/* Summary Metrics Cards / Interactive Status Filter */}
                        {summary && (
                            <div className="row g-3 mb-4">
                                <div className="col-md-4 col-12">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 transition-all ${
                                            verificationStatus === 'pending' || verificationStatus === 'eligible'
                                                ? 'border-start border-4 border-warning bg-warning bg-opacity-10 shadow'
                                                : 'bg-light'
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setVerificationStatus('pending');
                                            handleFilter(undefined, 'pending');
                                        }}
                                        title="Click to view pending candidates (Default)"
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-secondary small fw-semibold text-uppercase d-flex align-items-center gap-1">
                                                    <span>Pending Candidates</span>
                                                    <span className="badge bg-warning text-dark py-0 px-1" style={{ fontSize: '0.65rem' }}>Default</span>
                                                </div>
                                                <h3 className="fw-bold text-amber mb-0 mt-1">{summary.eligible}</h3>
                                            </div>
                                            <div className="rounded-circle p-3 bg-amber bg-opacity-10 text-amber">
                                                <i className="fa fa-clock-o fs-4"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-4 col-12">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 transition-all ${
                                            verificationStatus === 'verified'
                                                ? 'border-start border-4 border-emerald bg-emerald bg-opacity-10 shadow'
                                                : 'bg-light'
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setVerificationStatus('verified');
                                            handleFilter(undefined, 'verified');
                                        }}
                                        title="Click to view verified candidates"
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-secondary small fw-semibold text-uppercase">Verified / Completed</div>
                                                <h3 className="fw-bold text-emerald mb-0 mt-1">{summary.verified}</h3>
                                            </div>
                                            <div className="rounded-circle p-3 bg-emerald bg-opacity-10 text-emerald">
                                                <i className="fa fa-check-circle fs-4"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-4 col-12">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 transition-all ${
                                            verificationStatus === 'all'
                                                ? 'border-start border-4 border-indigo bg-indigo bg-opacity-10 shadow'
                                                : 'bg-light'
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setVerificationStatus('all');
                                            handleFilter(undefined, 'all');
                                        }}
                                        title="Click to view all candidates"
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-secondary small fw-semibold text-uppercase">Total Students (All)</div>
                                                <h3 className="fw-bold text-dark mb-0 mt-1">{summary.total}</h3>
                                            </div>
                                            <div className="rounded-circle p-3 bg-indigo bg-opacity-10 text-indigo">
                                                <i className="fa fa-users fs-4"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Filter Bar */}
                        <form onSubmit={(e) => handleFilter(e)} className="row g-3 mb-4 filter-panel p-3 bg-light rounded-3 border">
                            <div className="col-md-2">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_acd_year">
                                    Academic Year
                                </label>
                                <Select2
                                    id="filter_acd_year"
                                    name="acd_year"
                                    value={year}
                                    onChange={(val) => setYear(val)}
                                    placeholder="-- All Years --"
                                    options={[
                                        { value: '', label: '-- All Years --' },
                                        ...years,
                                    ]}
                                    allowClear={true}
                                />
                            </div>

                            <div className="col-md-2">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_stream">
                                    Program / Stream
                                </label>
                                <Select2
                                    id="filter_stream"
                                    name="stream"
                                    value={stream}
                                    onChange={(val) => setStream(val)}
                                    placeholder="-- All Streams --"
                                    options={[
                                        { value: '', label: '-- All Streams --' },
                                        ...streamOptions,
                                    ]}
                                    allowClear={true}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_university">
                                    Target University <span className="text-danger fw-bold">* (Required)</span>
                                </label>
                                <Select2
                                    id="filter_university"
                                    name="clg_add"
                                    value={university}
                                    onChange={(val) => setUniversity(val)}
                                    placeholder="-- Select Target University --"
                                    options={[
                                        { value: '', label: '-- Select Target University --' },
                                        ...universityOptions,
                                    ]}
                                    allowClear={true}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_student_name">
                                    Student Name (Search)
                                </label>
                                <input
                                    type="text"
                                    id="filter_student_name"
                                    name="student_name"
                                    className="form-control"
                                    placeholder="Search by student name..."
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                />
                            </div>

                            <div className="col-md-2">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_verification_status">
                                    Verification Status
                                </label>
                                <select
                                    id="filter_verification_status"
                                    name="verification_status"
                                    className="form-select"
                                    value={verificationStatus}
                                    onChange={(e) => {
                                        setVerificationStatus(e.target.value);
                                        handleFilter(undefined, e.target.value);
                                    }}
                                >
                                    <option value="pending">Pending (Default)</option>
                                    <option value="verified">Verified Only</option>
                                    <option value="excluded">Excluded Only</option>
                                    <option value="all">All Candidates</option>
                                </select>
                            </div>

                            <div className="col-12 text-end d-flex align-items-center justify-content-end pt-2">
                                <div className="d-flex gap-2">
                                    {(year || stream || university || studentName || (verificationStatus && verificationStatus !== 'pending')) && (
                                        <button
                                            type="button"
                                            className="btn btn-glass"
                                            onClick={handleResetFilters}
                                        >
                                            <i className="fa fa-times me-1"></i> Clear Filters
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-indigo px-4">
                                        <i className="fa fa-search me-1"></i> Filter Candidates
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Target University Selection Notice / Badge */}
                        {activeUnivName ? (
                            <div className="card border-0 shadow-sm rounded-3 p-3 mb-4 bg-light border-start border-4 border-indigo">
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="rounded-circle p-2 bg-indigo bg-opacity-10 text-indigo flex-shrink-0">
                                            <i className="fa fa-university fs-4"></i>
                                        </div>
                                        <div>
                                            <span className="text-secondary small fw-bold text-uppercase">Target University for Reminder Notice</span>
                                            <h5 className="fw-bold text-dark mb-0">{activeUnivName}</h5>
                                        </div>
                                    </div>
                                    {activeUnivFees && (
                                        <span className="badge badge-glass-indigo px-3 py-2 fs-6">
                                            <i className="fa fa-inr me-1"></i>Verification Fees: ₹{activeUnivFees}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="alert alert-warning border-0 shadow-sm rounded-3 p-3 mb-4 d-flex align-items-center gap-3">
                                <div className="rounded-circle p-2 bg-warning bg-opacity-25 text-warning flex-shrink-0">
                                    <i className="fa fa-university fs-4"></i>
                                </div>
                                <div>
                                    <div className="fw-bold text-dark">Target University Selection Required</div>
                                    <div className="small text-muted">
                                        University reminders are official verification notices addressed directly to a specific institution. Please select a <strong>Target University</strong> above to filter candidates for that institution and generate reminder letters.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reminder Notice Form & Student Selection Table */}
                        {students.data.length > 0 ? (
                            <form onSubmit={handleGenerateReminder}>
                                <div className="row g-3 mb-4 entry-panel p-3 bg-white rounded-3 border">
                                    <div className="col-md-6">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Reminder Notice Type
                                        </label>
                                        <select
                                            className="form-select"
                                            value={reminderType}
                                            onChange={(e) => setReminderType(e.target.value)}
                                            required
                                        >
                                            <option value="1st Reminder Notice">1st Reminder Notice</option>
                                            <option value="2nd Reminder Notice">2nd Reminder Notice</option>
                                            <option value="Final Urgent Reminder Notice">Final Urgent Reminder Notice</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Head Name (To)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="The Controller of Examinations"
                                            value={headName}
                                            onChange={(e) => setHeadName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Student Selection Table */}
                                <div className="table-responsive mb-4">
                                    <table className="table table-glass table-hover table-sticky-id">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }} className="col-sr">
                                                    <input
                                                        type="checkbox"
                                                        id="check_all"
                                                        checked={isAllSelected}
                                                        onChange={handleToggleSelectAll}
                                                        disabled={eligibleStudents.length === 0}
                                                        aria-label="Select all eligible students"
                                                        title="Select all eligible candidates"
                                                    />
                                                </th>
                                                <th>CANDIDATE NAME & STATUS</th>
                                                <th>ELIGIBILITY CASE NO.</th>
                                                <th>UNIVERSITY / BOARD NAME</th>
                                                <th>ACADEMIC YEAR</th>
                                                <th>PROGRAM / STREAM</th>
                                                <th>PRIOR NOTICES</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.data.map((stud) => {
                                                const isEligible = stud.is_eligible !== false;
                                                const isSelected = selectedIds.includes(stud.id);

                                                return (
                                                    <tr key={stud.id} className={isSelected ? 'table-primary-subtle' : (!isEligible ? 'opacity-75' : '')}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                disabled={!isEligible}
                                                                onChange={() => handleToggleSelect(stud.id)}
                                                                aria-label={`Select student ${stud.student_name}`}
                                                                title={
                                                                    !isEligible
                                                                        ? (stud.is_verified ? 'Candidate already verified' : 'Candidate explicitly excluded')
                                                                        : 'Select for reminder notice'
                                                                }
                                                            />
                                                        </td>
                                                        <td style={{ minWidth: '220px' }}>
                                                            {/* Status badge and Change Status button directly above candidate name */}
                                                            <div className="d-flex align-items-center justify-content-between gap-2 mb-1 flex-wrap">
                                                                <div>
                                                                    {stud.is_verified || stud.computed_status === 'verified' ? (
                                                                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                                            <i className="fa fa-check-circle me-1"></i>Verified
                                                                        </span>
                                                                    ) : stud.is_excluded || stud.computed_status === 'excluded' ? (
                                                                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">
                                                                            <i className="fa fa-ban me-1"></i>Excluded
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                                                                            <i className="fa fa-clock-o me-1"></i>Pending
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {(!stud.is_verified && stud.computed_status !== 'verified') ? (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-success py-0 px-2 rounded-pill fw-semibold shadow-xs"
                                                                            style={{ fontSize: '0.74rem', lineHeight: '1.6' }}
                                                                            onClick={() => handleUpdateStatus(stud.id, stud.student_name, 'verified')}
                                                                            disabled={updatingStatusId === stud.id}
                                                                            title="Change candidate status to Verified"
                                                                        >
                                                                            {updatingStatusId === stud.id ? (
                                                                                <><i className="fa fa-spinner fa-spin me-1"></i>Updating...</>
                                                                            ) : (
                                                                                <><i className="fa fa-check me-1"></i>Change to Verified</>
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-secondary py-0 px-2 rounded-pill fw-semibold shadow-xs"
                                                                            style={{ fontSize: '0.72rem', lineHeight: '1.6' }}
                                                                            onClick={() => handleUpdateStatus(stud.id, stud.student_name, 'pending')}
                                                                            disabled={updatingStatusId === stud.id}
                                                                            title="Change candidate status back to Pending"
                                                                        >
                                                                            {updatingStatusId === stud.id ? (
                                                                                <><i className="fa fa-spinner fa-spin me-1"></i>Updating...</>
                                                                            ) : (
                                                                                <><i className="fa fa-undo me-1"></i>Set to Pending</>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="fw-bold text-dark fs-6">{stud.student_name || '—'}</div>
                                                            {stud.student_nee_name && (
                                                                <div className="small text-muted">
                                                                    Nee: {stud.student_nee_name}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {stud.eligibility_case_no ? (
                                                                <span className="badge badge-glass-indigo font-monospace">
                                                                    {stud.eligibility_case_no}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted small">—</span>
                                                            )}
                                                        </td>
                                                        <td style={{ minWidth: '220px', maxWidth: '340px' }}>
                                                            {stud.university_name ? (
                                                                <div className="fw-bold text-dark mb-1">
                                                                    {stud.university_name}
                                                                </div>
                                                            ) : null}
                                                            {stud.fees ? (
                                                                <div className="mb-1">
                                                                    <span className="badge badge-glass-indigo">
                                                                        <i className="fa fa-inr me-1"></i>Fees: ₹{stud.fees}
                                                                    </span>
                                                                </div>
                                                            ) : null}
                                                            <div className="small text-muted" style={{ lineHeight: '1.45' }}>
                                                                {renderAddress(stud.clg_add)}
                                                            </div>
                                                        </td>
                                                        <td className="fw-bold text-dark">{stud.admission_taken_year || '—'}</td>
                                                        <td>{stud.admission_taken_in || '—'}</td>
                                                        <td>
                                                            {stud.reminder_note_count && stud.reminder_note_count > 0 ? (
                                                                <span className="badge badge-glass-amber">
                                                                    {stud.reminder_note_count} notice(s)
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted small">None yet</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div className="text-muted small">
                                        Selected: <strong>{selectedIds.length}</strong> of <strong>{eligibleStudents.length}</strong> eligible candidate(s)
                                        {activeUnivName ? <> for <strong>{activeUnivName}</strong></> : ''}
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn btn-emerald py-2 px-4"
                                        disabled={isSubmitting || selectedIds.length === 0}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Generating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-file-pdf-o me-1"></i> Generate University Reminder PDF Notice
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center text-muted py-5">
                                <i className="fa fa-clock-o fs-1 mb-3 text-secondary"></i>
                                <p className="mb-0">
                                    {activeUnivName
                                        ? `No candidate records match the current filters for ${activeUnivName}.`
                                        : 'No candidate records match the current filters.'}
                                </p>
                            </div>
                        )}

                        {/* Pager */}
                        {students.links && students.links.length > 3 && (
                            <div className="d-flex justify-content-center mt-4">
                                <ul className="pagination pagination-sm">
                                    {students.links.map((link, idx) => (
                                        <li
                                            key={idx}
                                            className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                        >
                                            {link.url ? (
                                                <Link
                                                    href={link.url}
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ) : (
                                                <span
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
