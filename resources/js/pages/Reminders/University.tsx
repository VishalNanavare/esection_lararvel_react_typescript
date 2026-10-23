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
    const [reminderStatus, setReminderStatus] = useState(filters.reminder_status || '');
    const [verificationStatus, setVerificationStatus] = useState(filters.verification_status || 'all');

    // Only select eligible candidates by default
    const [selectedIds, setSelectedIds] = useState<number[]>(
        students.data.filter((s) => s.is_eligible !== false).map((s) => s.id)
    );
    const [reminderType, setReminderType] = useState('1st Reminder Notice');
    const [headName, setHeadName] = useState('');

    // Status management modal state
    const [statusModalStudent, setStatusModalStudent] = useState<Student | null>(null);
    const [newStatus, setNewStatus] = useState<'pending' | 'verified' | 'excluded'>('pending');
    const [exclusionReason, setExclusionReason] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
                            value: item.address || name,
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

    const handleFilter = (e?: React.FormEvent, customVerificationStatus?: string) => {
        if (e) e.preventDefault();
        const vStatus = customVerificationStatus !== undefined ? customVerificationStatus : verificationStatus;
        router.get(
            '/reminders/university',
            {
                acd_year: year,
                stream,
                clg_add: university,
                reminder_status: reminderStatus,
                verification_status: vStatus,
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
        setReminderStatus('');
        setVerificationStatus('all');
        router.get(
            '/reminders/university',
            {},
            {
                preserveState: false,
                replace: true,
            }
        );
    };

    const eligibleStudents = students.data.filter((s) => s.is_eligible !== false);
    const isAllSelected = eligibleStudents.length > 0 && selectedIds.length === eligibleStudents.length;

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

    const openStatusModal = (student: Student) => {
        setStatusModalStudent(student);
        setNewStatus(student.verification_status === 'verified' ? 'verified' : (student.verification_status === 'excluded' ? 'excluded' : 'pending'));
        setExclusionReason(student.exclusion_reason || '');
    };

    const handleSaveStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModalStudent) return;
        if (newStatus === 'excluded' && !exclusionReason.trim()) {
            Swal.fire('Reason Required', 'Please provide a reason for explicitly excluding this candidate.', 'warning');
            return;
        }

        setIsUpdatingStatus(true);
        router.post(
            `/reminders/university/students/${statusModalStudent.id}/status`,
            {
                status: newStatus,
                reason: exclusionReason.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsUpdatingStatus(false);
                    setStatusModalStudent(null);
                    Swal.fire({
                        icon: 'success',
                        title: 'Verification Status Updated',
                        text: `Candidate status updated to ${newStatus}.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                },
                onError: (errs) => {
                    setIsUpdatingStatus(false);
                    Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to update status', 'error');
                },
            }
        );
    };

    const handleGenerateReminder = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedIds.length === 0) {
            Swal.fire('No Students Selected', 'Please check at least one eligible student from the table.', 'warning');
            return;
        }

        setIsSubmitting(true);
        const academicYear = year || students.data[0]?.admission_taken_year || '2025-2026';
        const matchedUnivOption = universityOptions.find(
            (u) => u.value === university || u.name === university
        );
        const targetUniv = matchedUnivOption?.name || students.data[0]?.university_name || university || students.data[0]?.clg_add || 'Target Universities';

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
    )}&stream=${encodeURIComponent(stream)}&clg_add=${encodeURIComponent(university)}`;

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
                                <Link href="/reminders/university/history" className="btn btn-indigo">
                                    <i className="fa fa-object-group me-1"></i> Combine Pending Batches
                                </Link>
                                {canExport && (
                                    <a href={exportUrl} className="btn btn-glass">
                                        <i className="fa fa-file-excel-o me-1"></i> Export to Excel
                                    </a>
                                )}
                                <Link href="/reminders/university/history" className="btn btn-glass">
                                    <i className="fa fa-history me-1"></i> Reminder History
                                </Link>
                                <Link href="/reminders/student" className="btn btn-glass">
                                    <i className="fa fa-user me-1"></i> Switch to Candidate Reminders
                                </Link>
                            </div>
                        </div>

                        {/* Summary Metrics Cards */}
                        {summary && (
                            <div className="row g-3 mb-4">
                                <div className="col-md-3 col-6">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 cursor-pointer ${verificationStatus === 'all' ? 'border-2 border-indigo' : ''}`}
                                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))' }}
                                        onClick={() => { setVerificationStatus('all'); handleFilter(undefined, 'all'); }}
                                        title="Click to view all candidates"
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-secondary small fw-semibold text-uppercase">Total Students</div>
                                                <h3 className="fw-bold text-dark mb-0 mt-1">{summary.total}</h3>
                                            </div>
                                            <div className="rounded-circle p-3 bg-indigo bg-opacity-10 text-indigo">
                                                <i className="fa fa-users fs-4"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-3 col-6">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 cursor-pointer ${verificationStatus === 'verified' ? 'border-2 border-emerald' : ''}`}
                                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))' }}
                                        onClick={() => { setVerificationStatus('verified'); handleFilter(undefined, 'verified'); }}
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

                                <div className="col-md-3 col-6">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 cursor-pointer ${verificationStatus === 'pending' ? 'border-2 border-primary' : ''}`}
                                        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))' }}
                                        onClick={() => { setVerificationStatus('pending'); handleFilter(undefined, 'pending'); }}
                                        title="Click to view pending verification"
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-secondary small fw-semibold text-uppercase">Pending Verification</div>
                                                <h3 className="fw-bold text-primary mb-0 mt-1">{summary.pending}</h3>
                                            </div>
                                            <div className="rounded-circle p-3 bg-primary bg-opacity-10 text-primary">
                                                <i className="fa fa-clock-o fs-4"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-3 col-6">
                                    <div
                                        className={`card border-0 shadow-sm rounded-3 p-3 cursor-pointer ${verificationStatus === 'eligible' ? 'border-2 border-amber' : ''}`}
                                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))' }}
                                        onClick={() => { setVerificationStatus('eligible'); handleFilter(undefined, 'eligible'); }}
                                        title="Click to view eligible for next reminder"
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-secondary small fw-semibold text-uppercase">Eligible for Reminder</div>
                                                <h3 className="fw-bold text-amber mb-0 mt-1">{summary.eligible}</h3>
                                            </div>
                                            <div className="rounded-circle p-3 bg-amber bg-opacity-10 text-amber">
                                                <i className="fa fa-envelope-o fs-4"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Filter Bar */}
                        <form onSubmit={(e) => handleFilter(e)} className="row g-3 mb-4 filter-panel p-3 bg-light rounded-3 border">
                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_acd_year">
                                    Academic Year (AJAX, optional)
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

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_stream">
                                    Academic Program / Stream (AJAX, optional)
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
                                    University Filter (AJAX Optional)
                                </label>
                                <Select2
                                    id="filter_university"
                                    name="clg_add"
                                    value={university}
                                    onChange={(val) => setUniversity(val)}
                                    placeholder="-- All Target Universities --"
                                    options={[
                                        { value: '', label: '-- All Target Universities --' },
                                        ...universityOptions,
                                    ]}
                                    allowClear={true}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_verification_status">
                                    Verification Status
                                </label>
                                <select
                                    id="filter_verification_status"
                                    className="form-select"
                                    value={verificationStatus}
                                    onChange={(e) => setVerificationStatus(e.target.value)}
                                >
                                    <option value="all">-- All Verification States --</option>
                                    <option value="eligible">Eligible for Next Reminder</option>
                                    <option value="pending">Pending Verification</option>
                                    <option value="verified">Verified / Completed</option>
                                    <option value="excluded">Explicitly Excluded</option>
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="filter_reminder_status">
                                    Prior Reminder Notices Sent
                                </label>
                                <select
                                    id="filter_reminder_status"
                                    className="form-select"
                                    value={reminderStatus}
                                    onChange={(e) => setReminderStatus(e.target.value)}
                                >
                                    <option value="">-- All Reminder Stages --</option>
                                    <option value="0">Pending 1st Reminder (0 Sent)</option>
                                    <option value="1">Pending 2nd Reminder (1 Sent)</option>
                                    <option value="2+">Pending 3rd+ Reminder (2+ Sent)</option>
                                </select>
                            </div>

                            <div className="col-md-9 text-end d-flex align-items-end justify-content-end gap-2">
                                {(year || stream || university || reminderStatus || verificationStatus !== 'all') && (
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
                        </form>

                        {/* Reminder Notice Form */}
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
                                                    />
                                                </th>
                                                <th>CANDIDATE NAME</th>
                                                <th>ELIGIBILITY CASE NO.</th>
                                                <th>TARGET UNIVERSITY ADDRESS</th>
                                                <th>ACADEMIC YEAR</th>
                                                <th>VERIFICATION STATUS</th>
                                                <th>PRIOR NOTICES</th>
                                                <th className="text-end" style={{ width: '130px' }}>ACTIONS</th>
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
                                                                title={!isEligible ? (stud.is_verified ? 'Candidate already verified' : 'Candidate explicitly excluded') : 'Select for reminder notice'}
                                                            />
                                                        </td>
                                                        <td>
                                                            <div className="fw-bold text-dark">{stud.student_name || '—'}</div>
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
                                                        <td>
                                                            {stud.is_verified ? (
                                                                <span className="badge badge-glass-emerald">
                                                                    <i className="fa fa-check-circle me-1"></i>Verified
                                                                </span>
                                                            ) : stud.is_excluded ? (
                                                                <span
                                                                    className="badge badge-glass-danger cursor-pointer"
                                                                    title={stud.exclusion_reason || 'Explicitly excluded from reminders'}
                                                                >
                                                                    <i className="fa fa-ban me-1"></i>Excluded
                                                                </span>
                                                            ) : stud.reminder_note_count && stud.reminder_note_count > 0 ? (
                                                                <span className="badge badge-glass-amber">
                                                                    <i className="fa fa-envelope-o me-1"></i>Reminder Sent
                                                                </span>
                                                            ) : (
                                                                <span className="badge badge-glass-indigo">
                                                                    <i className="fa fa-clock-o me-1"></i>Pending
                                                                </span>
                                                            )}
                                                            {stud.exclusion_reason && (
                                                                <div className="small text-danger mt-1 text-truncate" style={{ maxWidth: '140px' }} title={stud.exclusion_reason}>
                                                                    {stud.exclusion_reason}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {stud.reminder_note_count && stud.reminder_note_count > 0 ? (
                                                                <span className="badge badge-glass-amber">
                                                                    {stud.reminder_note_count} notice(s)
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted small">None yet</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-glass text-indigo py-1 px-2"
                                                                onClick={() => openStatusModal(stud)}
                                                                title="Update verification status"
                                                            >
                                                                <i className="fa fa-pencil me-1"></i> Status
                                                            </button>
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
                                <p className="mb-0">No candidate records match the current filters.</p>
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

            {/* Verification Status Modal */}
            {statusModalStudent && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content glass-card border-0 shadow">
                            <form onSubmit={handleSaveStatus}>
                                <div className="modal-header border-bottom">
                                    <h5 className="modal-title fw-bold text-dark">
                                        <i className="fa fa-shield me-2 text-indigo"></i>
                                        Update Verification Status
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setStatusModalStudent(null)}
                                        aria-label="Close"
                                    ></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="mb-3 p-3 bg-light rounded-3 border">
                                        <div className="fw-bold text-dark fs-6">{statusModalStudent.student_name}</div>
                                        <div className="small text-muted">
                                            Case No: <strong>{statusModalStudent.eligibility_case_no || '—'}</strong> |
                                            Course: <strong>{statusModalStudent.admission_taken_in || '—'}</strong>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Select Status
                                        </label>
                                        <div className="d-flex flex-column gap-2">
                                            <label className="form-check p-3 rounded border cursor-pointer d-flex align-items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="verification_status_choice"
                                                    className="form-check-input mt-0"
                                                    checked={newStatus === 'verified'}
                                                    onChange={() => setNewStatus('verified')}
                                                />
                                                <div>
                                                    <span className="badge badge-glass-emerald me-1">Verified / Completed</span>
                                                    <small className="text-muted d-block mt-0.5">
                                                        Marksheet verification report received and completed. Candidate will be automatically excluded from subsequent reminders.
                                                    </small>
                                                </div>
                                            </label>

                                            <label className="form-check p-3 rounded border cursor-pointer d-flex align-items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="verification_status_choice"
                                                    className="form-check-input mt-0"
                                                    checked={newStatus === 'pending'}
                                                    onChange={() => setNewStatus('pending')}
                                                />
                                                <div>
                                                    <span className="badge badge-glass-indigo me-1">Pending Verification</span>
                                                    <small className="text-muted d-block mt-0.5">
                                                        Verification is pending and candidate remains eligible for reminder notices.
                                                    </small>
                                                </div>
                                            </label>

                                            <label className="form-check p-3 rounded border cursor-pointer d-flex align-items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="verification_status_choice"
                                                    className="form-check-input mt-0"
                                                    checked={newStatus === 'excluded'}
                                                    onChange={() => setNewStatus('excluded')}
                                                />
                                                <div>
                                                    <span className="badge badge-glass-danger me-1">Explicitly Excluded</span>
                                                    <small className="text-muted d-block mt-0.5">
                                                        Manually exclude this candidate from university reminder notices (requires explanation).
                                                    </small>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {newStatus === 'excluded' && (
                                        <div className="mb-3">
                                            <label className="form-label text-secondary small fw-semibold">
                                                Exclusion Reason <span className="text-danger">*</span>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows={2}
                                                required
                                                placeholder="e.g. Admission cancelled / Transferred to other university / Verification waived"
                                                value={exclusionReason}
                                                onChange={(e) => setExclusionReason(e.target.value)}
                                            ></textarea>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setStatusModalStudent(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-indigo"
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-save me-1"></i> Save Status
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
