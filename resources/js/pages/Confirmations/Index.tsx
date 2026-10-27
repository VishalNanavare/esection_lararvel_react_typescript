import React, { useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { Select2 } from '../../components/Select2';
import { SharedProps } from '../../types';
import { getCsrfHeaders, isCsrfMismatch } from '../../lib/csrf';

interface CandidateWithConf {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    clg_add: string;
    university_name?: string | null;
    fees?: string | null;
    admission_taken_year: string;
    admission_taken_in: string;
    en_time?: string | number | null;
    confirmation_id: number | null;
    confirmation_array_space: string | null;
    conf_mig_tc: string | null;
    conf_p_degree: string | null;
    conf_s_marks: string | null;
}

interface OptionItem {
    id: string;
    text: string;
    is_current?: boolean;
    stream?: string;
}

export interface UniversityOption {
    value: string;
    name?: string;
    fees?: string;
    label?: string;
}

interface PaginatedStudents {
    data: CandidateWithConf[];
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface IndexProps {
    title: string;
    students: PaginatedStudents;
    academicYears: OptionItem[];
    streams: OptionItem[];
    universities: (UniversityOption | string)[];
    filters: {
        year: string;
        stream: string;
        university?: string;
        case_no?: string;
        student_name?: string;
        q: string;
        status?: string;
    };
}

interface RowChecklist {
    mig: string;
    tc: string;
    p_degree: string;
    s_marks: string;
    letter_no_date: string;
    remark: string;
    conf_from: string;
    conf_from_text: string;
    conf_from_select: string;
    etc_data: string;
}

export const Index: React.FC<IndexProps> = ({
    students,
    academicYears,
    streams,
    universities = [],
    filters,
}) => {
    const { props } = usePage<SharedProps>();
    const { features, auth } = props;
    const permissions = auth.permissions || [];
    const isAdmin = auth.user?.role === 'admin';
    const canCreate = isAdmin || permissions.includes('confirmations.create');
    const canExport = (isAdmin || permissions.includes('confirmations.export')) && features.export;

    // View Step: 'list' (Pending For Approval) | 'form' (Student Details Checklist)
    const [viewStep, setViewStep] = useState<'list' | 'form'>('list');

    // Filter states
    const [filterYear, setFilterYear] = useState(filters.year || '');
    const [filterStream, setFilterStream] = useState(filters.stream || '');
    const [filterUniversity, setFilterUniversity] = useState(filters.university || '');
    const [filterCaseNo, setFilterCaseNo] = useState(filters.case_no || '');
    const [filterStudentName, setFilterStudentName] = useState(filters.student_name || '');
    const [filterStatus, setFilterStatus] = useState(filters.status || 'pending');
    const [searchQuery, setSearchQuery] = useState(filters.q || '');

    const universityOptions = useMemo(() => {
        return [
            { value: '', label: '-- All Target Universities --' },
            ...universities.map((u) => {
                if (typeof u === 'string') {
                    return { value: u, label: u };
                }
                return {
                    value: String(u.value || u.name || ''),
                    label: String(u.name || u.label || u.value || ''),
                };
            }),
        ];
    }, [universities]);

    // Selected students for confirmation
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

    // Verification checklist per selected student
    const [checklists, setChecklists] = useState<Record<number, RowChecklist>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Format date of created form
    const formatCreatedDate = (enTime?: string | number | null) => {
        if (!enTime) return '—';
        if (typeof enTime === 'number' || /^\d{10}$/.test(String(enTime).trim())) {
            const date = new Date(Number(enTime) * 1000);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        }
        return String(enTime);
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/confirmations',
            {
                year: filterYear,
                stream: filterStream,
                university: filterUniversity,
                case_no: filterCaseNo.trim(),
                student_name: filterStudentName.trim(),
                status: filterStatus,
                q: searchQuery.trim(),
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setFilterYear('');
        setFilterStream('');
        setFilterUniversity('');
        setFilterCaseNo('');
        setFilterStudentName('');
        setFilterStatus('pending');
        setSearchQuery('');
        router.get('/confirmations', { status: 'pending' }, { preserveState: false });
    };

    const toggleSelectStudent = (id: number) => {
        setSelectedStudentIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const pendingIds = students.data
                .filter((s) => !s.confirmation_id)
                .map((s) => s.id);
            setSelectedStudentIds(pendingIds);
        } else {
            setSelectedStudentIds([]);
        }
    };

    // Transition to Step 2: Student Details
    const handleProceedToForm = () => {
        if (selectedStudentIds.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Candidates Selected',
                text: 'Please select at least one candidate using the checkboxes.',
            });
            return;
        }

        // Initialize empty checklist rows for newly selected students
        setChecklists((prev) => {
            const next = { ...prev };
            selectedStudentIds.forEach((id) => {
                if (!next[id]) {
                    next[id] = {
                        mig: 'sel',
                        tc: 'sel',
                        p_degree: 'sel',
                        s_marks: 'sel',
                        letter_no_date: '',
                        remark: '',
                        conf_from: 'sel',
                        conf_from_text: '',
                        conf_from_select: 'sel',
                        etc_data: 'sel',
                    };
                }
            });
            return next;
        });

        setViewStep('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle interactive changes matching legacy con_view.php behavior
    const handleChecklistChange = (studentId: number, field: keyof RowChecklist, value: string) => {
        setChecklists((prev) => {
            const current = prev[studentId] || {
                mig: 'sel',
                tc: 'sel',
                p_degree: 'sel',
                s_marks: 'sel',
                letter_no_date: '',
                remark: '',
                conf_from: 'sel',
                conf_from_text: '',
                conf_from_select: 'sel',
                etc_data: 'sel',
            };

            const updated = { ...current, [field]: value };

            // Legacy Rule: When TC is Yes, Mig sets to No and disabled
            if (field === 'tc') {
                if (value === 'Yes') {
                    updated.mig = 'No';
                } else {
                    updated.conf_from = 'sel';
                    updated.conf_from_text = '';
                    updated.conf_from_select = 'sel';
                    updated.etc_data = 'sel';
                }
            }

            // Legacy Rule: When Mig is Yes, TC sets to No and disabled
            if (field === 'mig') {
                if (value === 'Yes') {
                    updated.tc = 'No';
                    updated.conf_from = 'sel';
                    updated.conf_from_text = '';
                    updated.conf_from_select = 'sel';
                    updated.etc_data = 'sel';
                }
            }

            return {
                ...prev,
                [studentId]: updated,
            };
        });
    };

    // Quick Fill Helper: Fill Pass/Degree and Statement of Marks as Yes for all selected
    const handleQuickFillPassed = () => {
        setChecklists((prev) => {
            const next = { ...prev };
            selectedStudentIds.forEach((id) => {
                const row = next[id] || {
                    mig: 'sel',
                    tc: 'sel',
                    p_degree: 'sel',
                    s_marks: 'sel',
                    letter_no_date: '',
                    remark: '',
                    conf_from: 'sel',
                    conf_from_text: '',
                    conf_from_select: 'sel',
                    etc_data: 'sel',
                };
                next[id] = {
                    ...row,
                    p_degree: 'Yes',
                    s_marks: 'Yes',
                };
            });
            return next;
        });
    };

    // Submit confirmation batch to backend
    const handleConfirmSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStudentIds.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Selection',
                text: 'Please select at least one candidate to confirm eligibility.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Build mapped checklist for backend
            const payloadChecklist: Record<number, any> = {};
            selectedStudentIds.forEach((id) => {
                const row = checklists[id] || {
                    mig: 'sel',
                    tc: 'sel',
                    p_degree: 'sel',
                    s_marks: 'sel',
                    letter_no_date: '',
                    remark: '',
                    conf_from: 'sel',
                    conf_from_text: '',
                    conf_from_select: 'sel',
                    etc_data: 'sel',
                };

                const isTcYes = row.tc === 'Yes';
                const isMigYes = row.mig === 'Yes';

                payloadChecklist[id] = {
                    mig_tc: isTcYes || isMigYes ? 'Yes' : 'No',
                    p_degree: row.p_degree === 'Yes' ? 'Yes' : 'No',
                    s_marks: row.s_marks === 'Yes' ? 'Yes' : 'No',
                    letter_no_date: row.letter_no_date || '',
                    remark: row.remark || '',
                    conf_from: isTcYes && row.conf_from !== 'sel' ? row.conf_from : '',
                    conf_from_text: isTcYes && row.conf_from === 'other' ? row.conf_from_text : '',
                    conf_from_select: isTcYes && row.conf_from_select !== 'sel' ? row.conf_from_select : '',
                    etc_data: isTcYes && row.etc_data !== 'sel' ? row.etc_data : '',
                };
            });

            const res = await fetch('/confirmations/store', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...getCsrfHeaders(),
                },
                body: JSON.stringify({
                    student_ids: selectedStudentIds,
                    checklist: payloadChecklist,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status === 'error') {
                if (isCsrfMismatch(res.status, data.message)) {
                    throw new Error('Your session expired. Please refresh the page and try again.');
                }
                throw new Error(data.message || 'Failed to save confirmation.');
            }

            Swal.fire({
                icon: 'success',
                title: 'Confirmation Recorded',
                html: `Eligibility successfully confirmed for <strong>${data.count}</strong> candidate(s).<br/>Batch Reference: <strong>#${data.array_space}</strong>.`,
                showCancelButton: true,
                confirmButtonText: '<i class="fa fa-file-pdf-o me-1"></i> View Confirmation PDF',
                cancelButtonText: 'Done',
                customClass: {
                    confirmButton: 'btn btn-primary me-2',
                    cancelButton: 'btn btn-secondary',
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open(`/pdf/confirmation/${data.array_space}`, '_blank');
                }
                setSelectedStudentIds([]);
                setViewStep('list');
                router.reload();
            });
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Could not record confirmation.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFiltered = Boolean(
        filterYear || filterStream || filterUniversity || filterCaseNo || filterStudentName || searchQuery || filterStatus !== 'pending'
    );
    const selectedCandidates = students.data.filter((s) => selectedStudentIds.includes(s.id));
    const pendingCandidatesCount = students.data.filter((s) => !s.confirmation_id).length;

    const exportUrl = `/confirmations/export?year=${encodeURIComponent(
        filterYear
    )}&stream=${encodeURIComponent(filterStream)}&university=${encodeURIComponent(
        filterUniversity
    )}&case_no=${encodeURIComponent(filterCaseNo)}&student_name=${encodeURIComponent(
        filterStudentName
    )}&status=${encodeURIComponent(filterStatus)}&q=${encodeURIComponent(searchQuery)}`;

    return (
        <AppLayout title="Confirmation Portal (Pending For Approval) - E-Section">
            <div className="container-fluid px-0">
                {viewStep === 'list' ? (
                    /* ================= STEP 1: PENDING FOR APPROVAL LIST (dd_page.php style) ================= */
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-white py-3 border-bottom">
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                <div>
                                    <h5 className="fw-bold mb-0 text-dark">
                                        Confirmation Portal <small className="text-muted fw-normal">(Pending For Approval)</small>
                                    </h5>
                                    <p className="text-muted small mb-0">
                                        Search candidate eligibility records, filter by academic year, stream, university, case number, or student name.
                                    </p>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    {canExport && (
                                        <a href={exportUrl} className="btn btn-sm btn-outline-success" title="Export to Excel">
                                            <i className="fa fa-file-excel-o me-1"></i> Excel
                                        </a>
                                    )}
                                    <Link href="/confirmations/history" className="btn btn-sm btn-outline-dark">
                                        <i className="fa fa-history me-1"></i> History
                                    </Link>
                                </div>
                            </div>

                            {/* Search & Filter Panel */}
                            <form onSubmit={handleFilterSubmit} className="p-3 bg-light rounded-3 border">
                                <div className="row g-2 align-items-end">
                                    <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                                        <label className="form-label text-secondary small fw-semibold mb-1" htmlFor="filter_year">
                                            Academic Year
                                        </label>
                                        <Select2
                                            id="filter_year"
                                            name="year"
                                            value={filterYear}
                                            onChange={(val) => setFilterYear(val)}
                                            placeholder="-- All ACD Years --"
                                            options={[
                                                { value: '', label: '-- All ACD Years --' },
                                                ...academicYears.map((y) => ({
                                                    value: y.id,
                                                    label: y.text,
                                                })),
                                            ]}
                                            allowClear={true}
                                        />
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                                        <label className="form-label text-secondary small fw-semibold mb-1" htmlFor="filter_stream">
                                            Program / Stream
                                        </label>
                                        <Select2
                                            id="filter_stream"
                                            name="stream"
                                            value={filterStream}
                                            onChange={(val) => setFilterStream(val)}
                                            placeholder="-- All Programs / Streams --"
                                            options={[
                                                { value: '', label: '-- All Programs / Streams --' },
                                                ...streams.map((s) => ({
                                                    value: s.id,
                                                    label: s.text,
                                                })),
                                            ]}
                                            allowClear={true}
                                        />
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-4 col-lg-3">
                                        <label className="form-label text-secondary small fw-semibold mb-1" htmlFor="filter_university">
                                            Search University
                                        </label>
                                        <Select2
                                            id="filter_university"
                                            name="university"
                                            value={filterUniversity}
                                            onChange={(val) => setFilterUniversity(val)}
                                            placeholder="-- All Target Universities --"
                                            options={universityOptions}
                                            allowClear={true}
                                        />
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-6 col-lg-2">
                                        <label className="form-label text-secondary small fw-semibold mb-1" htmlFor="filter_case_no">
                                            E. Case No.
                                        </label>
                                        <input
                                            type="text"
                                            id="filter_case_no"
                                            name="case_no"
                                            className="form-control"
                                            placeholder="e.g. IDOL 2425..."
                                            value={filterCaseNo}
                                            onChange={(e) => setFilterCaseNo(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-12 col-sm-6 col-md-6 col-lg-3">
                                        <label className="form-label text-secondary small fw-semibold mb-1" htmlFor="filter_student_name">
                                            Student Name
                                        </label>
                                        <input
                                            type="text"
                                            id="filter_student_name"
                                            name="student_name"
                                            className="form-control"
                                            placeholder="Search candidate name..."
                                            value={filterStudentName}
                                            onChange={(e) => setFilterStudentName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 pt-2 border-top">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="text-secondary small fw-semibold">Status:</span>
                                        <div className="btn-group btn-group-sm" role="group">
                                            <button
                                                type="button"
                                                className={`btn ${filterStatus === 'pending' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                onClick={() => setFilterStatus('pending')}
                                            >
                                                Pending Approval
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn ${filterStatus === 'confirmed' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                onClick={() => setFilterStatus('confirmed')}
                                            >
                                                Confirmed
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                onClick={() => setFilterStatus('all')}
                                            >
                                                All Records
                                            </button>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-2">
                                        <button type="submit" className="btn btn-primary px-3" id="btn_search_confirmations">
                                            <i className="fa fa-search me-1"></i> Search Confirmations
                                        </button>
                                        {isFiltered && (
                                            <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
                                                <i className="fa fa-times me-1"></i> Clear Filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="card-body p-3">
                            <div className="row align-items-center mb-3">
                                <div className="col-md-8">
                                    {isFiltered ? (
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="badge bg-light text-dark border">
                                                Found {students.total} {students.total === 1 ? 'candidate' : 'candidates'}
                                            </span>
                                            {filterYear && (
                                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                                    Year: {filterYear}
                                                </span>
                                            )}
                                            {filterStream && (
                                                <span className="badge bg-info-subtle text-info border border-info-subtle">
                                                    Stream: {filterStream}
                                                </span>
                                            )}
                                            {filterUniversity && (
                                                <span className="badge bg-success-subtle text-success border border-success-subtle">
                                                    Univ: {filterUniversity}
                                                </span>
                                            )}
                                            {filterCaseNo && (
                                                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                                                    Case: {filterCaseNo}
                                                </span>
                                            )}
                                            {filterStudentName && (
                                                <span className="badge bg-dark-subtle text-dark border border-dark-subtle">
                                                    Name: {filterStudentName}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-secondary small">
                                            Select candidates using the checkboxes below, then click <strong>Create Confirmation</strong>.
                                        </span>
                                    )}
                                </div>
                                <div className="col-md-4 text-md-end">
                                    <button
                                        type="button"
                                        id="cconf"
                                        className="btn btn-primary"
                                        onClick={handleProceedToForm}
                                        disabled={selectedStudentIds.length === 0}
                                    >
                                        <i className="fa fa-check-square-o me-1"></i> Create Confirmation{' '}
                                        {selectedStudentIds.length > 0 && `(${selectedStudentIds.length})`}
                                    </button>
                                </div>
                            </div>

                            {/* Clean Pending Table */}
                            <div className="table-responsive">
                                <table className="table table-striped table-bordered align-middle mb-0" style={{ fontSize: '14px' }}>
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '40px', textAlign: 'center' }}>
                                                {canCreate && pendingCandidatesCount > 0 && (
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        onChange={toggleSelectAll}
                                                        checked={
                                                            selectedStudentIds.length > 0 &&
                                                            selectedStudentIds.length === pendingCandidatesCount
                                                        }
                                                    />
                                                )}
                                            </th>
                                            <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                                            <th>Name</th>
                                            <th>University / Board Name</th>
                                            <th style={{ textAlign: 'center' }}>E. Case No.</th>
                                            <th style={{ textAlign: 'center' }}>Acd Year</th>
                                            <th style={{ textAlign: 'center' }}>Acd Taken</th>
                                            <th style={{ textAlign: 'center' }}>Date of Created Form</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center text-muted py-5">
                                                    No candidates pending eligibility confirmation matching your criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            students.data.map((row, idx) => {
                                                const isConfirmed = !!row.confirmation_id;
                                                const isSelected = selectedStudentIds.includes(row.id);
                                                return (
                                                    <tr key={row.id} className={isSelected ? 'table-primary' : ''}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {!isConfirmed && canCreate ? (
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleSelectStudent(row.id)}
                                                                />
                                                            ) : isConfirmed ? (
                                                                <span className="badge bg-success" title="Already Confirmed">
                                                                    <i className="fa fa-check"></i>
                                                                </span>
                                                            ) : null}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {String(students.from ? students.from + idx : idx + 1).padStart(2, '0')}
                                                        </td>
                                                        <td>
                                                            <div className="fw-semibold text-dark">{row.student_name}</div>
                                                            {row.student_nee_name && row.student_nee_name !== '-' && (
                                                                <div className="small text-muted">
                                                                    <b>(Nee Name : {row.student_nee_name})</b>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>{row.university_name || row.clg_add || '—'}</td>
                                                        <td style={{ textAlign: 'center' }} className="font-monospace fw-bold text-primary">
                                                            {row.eligibility_case_no}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>{row.admission_taken_year}</td>
                                                        <td style={{ textAlign: 'center' }}>{row.admission_taken_in}</td>
                                                        <td style={{ textAlign: 'center' }} className="text-muted small">
                                                            {formatCreatedDate(row.en_time)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {students.links && students.links.length > 3 && (
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 pt-2 border-top">
                                    <div className="small text-muted">
                                        Showing {students.from || 0} to {students.to || 0} of {students.total} students
                                    </div>
                                    <ul className="pagination pagination-sm mb-0">
                                        {students.links.map((link, idx) => (
                                            <li
                                                key={idx}
                                                className={`page-item ${link.active ? 'active' : ''} ${
                                                    !link.url ? 'disabled' : ''
                                                }`}
                                            >
                                                <Link
                                                    href={link.url || '#'}
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ================= STEP 2: STUDENT DETAILS CHECKLIST (con_view.php style) ================= */
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-3">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setViewStep('list')}
                                >
                                    <i className="fa fa-arrow-left me-1"></i> Back to List
                                </button>
                                <div>
                                    <h5 className="fw-bold mb-0 text-dark">Student Details</h5>
                                    <div className="small text-muted mt-0.5">
                                        {selectedCandidates[0]?.admission_taken_year || filterYear}{' '}
                                        {selectedCandidates[0]?.admission_taken_in || filterStream} &bull;{' '}
                                        <span className="text-primary fw-semibold">{selectedStudentIds.length} candidate(s)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={handleQuickFillPassed}
                                    title="Set Pass/Degree and Statement of Marks to Yes for all selected"
                                >
                                    <i className="fa fa-magic me-1"></i> Fill All Pass &amp; Marks Yes
                                </button>
                            </div>
                        </div>

                        <div className="card-body p-3">
                            <form onSubmit={handleConfirmSubmit}>
                                <div className="table-responsive mb-4">
                                    <table className="table table-striped table-bordered align-middle mb-0" style={{ fontSize: '14px' }}>
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ textAlign: 'center', width: '45px' }}>No.</th>
                                                <th style={{ minWidth: '180px' }}>Name</th>
                                                <th style={{ textAlign: 'center', minWidth: '130px' }}>Case No.</th>
                                                <th style={{ textAlign: 'center', width: '90px' }}>Mig</th>
                                                <th style={{ textAlign: 'center', width: '90px' }}>TC</th>
                                                <th style={{ textAlign: 'center', width: '100px' }}>Pass/Dgr</th>
                                                <th style={{ textAlign: 'center', width: '130px' }}>
                                                    Statement
                                                    <br />
                                                    of Marks
                                                </th>
                                                <th style={{ minWidth: '140px' }}>
                                                    Letter No.
                                                    <br />
                                                    Dated
                                                </th>
                                                <th style={{ minWidth: '220px' }}>Remark</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCandidates.map((stud, idx) => {
                                                const check = checklists[stud.id] || {
                                                    mig: 'sel',
                                                    tc: 'sel',
                                                    p_degree: 'sel',
                                                    s_marks: 'sel',
                                                    letter_no_date: '',
                                                    remark: '',
                                                    conf_from: 'sel',
                                                    conf_from_text: '',
                                                    conf_from_select: 'sel',
                                                    etc_data: 'sel',
                                                };

                                                const isTcYes = check.tc === 'Yes';
                                                const isMigYes = check.mig === 'Yes';

                                                return (
                                                    <tr key={stud.id}>
                                                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                        <td>
                                                            <div className="fw-semibold text-dark">{stud.student_name}</div>
                                                            {stud.student_nee_name && stud.student_nee_name !== '-' && (
                                                                <div className="small text-muted">
                                                                    <b>Nee Name : {stud.student_nee_name}</b>
                                                                </div>
                                                            )}
                                                            <div className="text-muted small mt-0.5">
                                                                {stud.university_name || stud.clg_add}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }} className="font-monospace fw-bold text-primary">
                                                            {stud.eligibility_case_no}
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm"
                                                                value={check.mig}
                                                                disabled={isTcYes}
                                                                onChange={(e) => handleChecklistChange(stud.id, 'mig', e.target.value)}
                                                            >
                                                                <option value="sel">Select</option>
                                                                <option value="Yes">Yes</option>
                                                                <option value="No">No</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm"
                                                                value={check.tc}
                                                                disabled={isMigYes}
                                                                onChange={(e) => handleChecklistChange(stud.id, 'tc', e.target.value)}
                                                            >
                                                                <option value="sel">Select</option>
                                                                <option value="Yes">Yes</option>
                                                                <option value="No">No</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm"
                                                                value={check.p_degree}
                                                                onChange={(e) => handleChecklistChange(stud.id, 'p_degree', e.target.value)}
                                                            >
                                                                <option value="sel">Select</option>
                                                                <option value="Yes">Yes</option>
                                                                <option value="No">No</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm"
                                                                value={check.s_marks}
                                                                onChange={(e) => handleChecklistChange(stud.id, 's_marks', e.target.value)}
                                                            >
                                                                <option value="sel">Select</option>
                                                                <option value="Yes">Yes</option>
                                                                <option value="No">No</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                placeholder="Letter No. Dated"
                                                                value={check.letter_no_date}
                                                                onChange={(e) => handleChecklistChange(stud.id, 'letter_no_date', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                placeholder="Remark"
                                                                value={check.remark}
                                                                onChange={(e) => handleChecklistChange(stud.id, 'remark', e.target.value)}
                                                            />

                                                            {/* Clarification panel (appears ONLY when TC is Yes, exactly like legacy con_view.php) */}
                                                            {isTcYes && (
                                                                <div className="card mt-2 border bg-light p-2 shadow-xs">
                                                                    <div className="mb-2">
                                                                        <label className="form-label small fw-semibold text-secondary mb-1">
                                                                            Confirmation From :
                                                                        </label>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={check.conf_from}
                                                                            onChange={(e) => handleChecklistChange(stud.id, 'conf_from', e.target.value)}
                                                                        >
                                                                            <option value="sel">Select</option>
                                                                            <option value="Ranade Bhavan">Ranade Bhavan</option>
                                                                            <option value="Dr Babasaheb Ambedkar Bhavan">Dr Babasaheb Ambedkar Bhavan</option>
                                                                            <option value="other">other</option>
                                                                        </select>
                                                                        {check.conf_from === 'other' && (
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-sm mt-1"
                                                                                placeholder="confirmation from"
                                                                                value={check.conf_from_text}
                                                                                onChange={(e) =>
                                                                                    handleChecklistChange(stud.id, 'conf_from_text', e.target.value)
                                                                                }
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    <div className="mb-2">
                                                                        <label className="form-label small fw-semibold text-secondary mb-1">
                                                                            Student Clarification :
                                                                        </label>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={check.conf_from_select}
                                                                            onChange={(e) =>
                                                                                handleChecklistChange(stud.id, 'conf_from_select', e.target.value)
                                                                            }
                                                                        >
                                                                            <option value="sel">Select</option>
                                                                            <option value="old">old</option>
                                                                            <option value="TC">TC</option>
                                                                        </select>
                                                                    </div>

                                                                    <div>
                                                                        <label className="form-label small fw-semibold text-secondary mb-1">
                                                                            Name Change :
                                                                        </label>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={check.etc_data}
                                                                            onChange={(e) => handleChecklistChange(stud.id, 'etc_data', e.target.value)}
                                                                        >
                                                                            <option value="sel">Select</option>
                                                                            <option value="Gazette">Gazette</option>
                                                                            <option value="Marriage Certificate">Marriage Certificate</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <hr />
                                <div className="d-flex justify-content-between align-items-center">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setViewStep('list')}
                                    >
                                        <i className="fa fa-arrow-left me-1"></i> Back to Selection
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Submitting...
                                            </>
                                        ) : (
                                            'Submit'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default Index;
