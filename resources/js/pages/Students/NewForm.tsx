import React, { useState, useEffect, useRef } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';

interface AcademicYearOption {
    id: string;
    text: string;
    is_current: boolean;
}

interface StreamOption {
    id: string;
    text: string;
    stream: string;
}

interface CollegeResult {
    id: number;
    text: string;
    name: string;
    state: string | null;
    address: string | null;
    fees: string | null;
    head_name: string | null;
    in_favour_of: string | null;
}

interface CandidateRow {
    id: string; // temporary unique client key
    student_name: string;
    student_nee_name: string;
    eligibility_case_no: string;
    verification_of_marksheet_done_by_you: string;
    email: string;
}

interface SheetRow {
    line: number;
    status: 'ok' | 'error';
    messages: string[];
    data: {
        student_name: string;
        student_nee_name: string;
        eligibility_case_no: string;
        verification_by_you: string;
        email: string;
    };
}

interface SheetResult {
    rows: SheetRow[];
    ok_count: number;
    error_count: number;
    sheet: string;
    truncated: boolean;
}

interface NewFormProps {
    title: string;
    common_no: number;
    suggestedCaseNo: string;
    academicYears: AcademicYearOption[];
    streams: StreamOption[];
}

export const NewForm: React.FC<NewFormProps> = ({
    common_no,
    suggestedCaseNo,
    academicYears,
    streams,
}) => {
    const { props } = usePage<SharedProps>();
    const { features, auth } = props;
    const permissions = auth.permissions || [];
    const isAdmin = auth.user?.role === 'admin';
    const can = (perm: string) => isAdmin || permissions.includes(perm);

    // University search state
    const [universityQuery, setUniversityQuery] = useState('');
    const [collegeResults, setCollegeResults] = useState<CollegeResult[]>([]);
    const [isSearchingColleges, setIsSearchingColleges] = useState(false);
    const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
    const collegeDropdownRef = useRef<HTMLDivElement>(null);

    // Batch metadata
    const [toName, setToName] = useState('The Controller of Examinations');
    const [clgAdd, setClgAdd] = useState('');
    const [admissionTakenYear, setAdmissionTakenYear] = useState(() => {
        const curr = academicYears.find((y) => y.is_current);
        return curr ? curr.id : academicYears[0]?.id || '';
    });
    const [admissionTakenIn, setAdmissionTakenIn] = useState(streams[0]?.id || '');
    const [inFavourOf, setInFavourOf] = useState('');

    // Single candidate input
    const [studName, setStudName] = useState('');
    const [studNeeName, setStudNeeName] = useState('');
    const [caseNo, setCaseNo] = useState(suggestedCaseNo);
    const [verificationRemarks, setVerificationRemarks] = useState('Marksheet Verification');
    const [studEmail, setStudEmail] = useState('');

    // Editing mode for a candidate
    const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

    // Candidates list
    const [candidates, setCandidates] = useState<CandidateRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filterQuery, setFilterQuery] = useState('');

    // Excel modal
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [excelStep, setExcelStep] = useState<'pick' | 'review'>('pick');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isReadingSheet, setIsReadingSheet] = useState(false);
    const [sheetResult, setSheetResult] = useState<SheetResult | null>(null);
    const [selectedSheetLines, setSelectedSheetLines] = useState<number[]>([]);

    // Saving batch
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    // Search colleges with debounce
    useEffect(() => {
        if (!universityQuery.trim() || universityQuery.length < 2) {
            setCollegeResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingColleges(true);
            try {
                const res = await fetch(`/api/colleges?q=${encodeURIComponent(universityQuery)}`);
                const data = await res.json();
                setCollegeResults(data.results || []);
                setShowCollegeDropdown(true);
            } catch (err) {
                console.error('Error searching colleges', err);
            } finally {
                setIsSearchingColleges(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [universityQuery]);

    // Close college dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (collegeDropdownRef.current && !collegeDropdownRef.current.contains(e.target as Node)) {
                setShowCollegeDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectCollege = (col: CollegeResult) => {
        setUniversityQuery(col.name);
        setClgAdd(col.address || col.name);
        setToName(col.head_name || 'The Controller of Examinations');
        setInFavourOf(col.in_favour_of || '');
        setShowCollegeDropdown(false);
    };

    // Add or Update Candidate
    const handleAddOrUpdateCandidate = async () => {
        if (!studName.trim()) {
            Swal.fire({ icon: 'warning', title: 'Candidate Name Required', text: 'Please enter the student full name.' });
            return;
        }
        if (!caseNo.trim()) {
            Swal.fire({ icon: 'warning', title: 'Case Number Required', text: 'Please provide an eligibility case number.' });
            return;
        }

        if (editingCandidateId) {
            // Update existing candidate
            setCandidates((prev) =>
                prev.map((c) =>
                    c.id === editingCandidateId
                        ? {
                              ...c,
                              student_name: studName.trim(),
                              student_nee_name: studNeeName.trim(),
                              eligibility_case_no: caseNo.trim(),
                              verification_of_marksheet_done_by_you: verificationRemarks.trim(),
                              email: studEmail.trim(),
                          }
                        : c
                )
            );
            setEditingCandidateId(null);
        } else {
            // Add new candidate
            const newRow: CandidateRow = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                student_name: studName.trim(),
                student_nee_name: studNeeName.trim(),
                eligibility_case_no: caseNo.trim(),
                verification_of_marksheet_done_by_you: verificationRemarks.trim(),
                email: studEmail.trim(),
            };
            setCandidates((prev) => [...prev, newRow]);

            // Fetch next suggested case number
            try {
                const res = await fetch('/api/students/next-case-no');
                const data = await res.json();
                if (data.case_no) {
                    setCaseNo(data.case_no);
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Reset single candidate input fields (keep case number updated)
        setStudName('');
        setStudNeeName('');
        setStudEmail('');
    };

    const handleEditCandidate = (c: CandidateRow) => {
        setEditingCandidateId(c.id);
        setStudName(c.student_name);
        setStudNeeName(c.student_nee_name);
        setCaseNo(c.eligibility_case_no);
        setVerificationRemarks(c.verification_of_marksheet_done_by_you);
        setStudEmail(c.email);
    };

    const handleCancelEdit = () => {
        setEditingCandidateId(null);
        setStudName('');
        setStudNeeName('');
        setStudEmail('');
    };

    const handleDeleteCandidate = (id: string) => {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredCandidates.map((c) => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setCandidates((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
        setSelectedIds([]);
    };

    // Excel modal actions
    const handleOpenExcelModal = () => {
        setIsExcelModalOpen(true);
        setExcelStep('pick');
        setExcelFile(null);
        setSheetResult(null);
        setSelectedSheetLines([]);
    };

    const handleCloseExcelModal = () => {
        setIsExcelModalOpen(false);
        setExcelStep('pick');
        setExcelFile(null);
        setSheetResult(null);
        setSelectedSheetLines([]);
    };

    const handleResetToPicker = () => {
        setExcelStep('pick');
        setExcelFile(null);
        setSheetResult(null);
        setSelectedSheetLines([]);
    };

    const handleReadSheet = async () => {
        if (!excelFile) {
            Swal.fire({
                icon: 'warning',
                title: 'No file chosen',
                text: 'Pick an .xlsx file first.',
            });
            return;
        }

        setIsReadingSheet(true);
        const formData = new FormData();
        formData.append('candidate_sheet', excelFile);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch('/students/new/readSheet', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || data.status !== 'success' || !data.data || !data.data.rows?.length) {
                throw new Error(data.message || 'That sheet had no candidate rows.');
            }

            const result: SheetResult = data.data;
            setSheetResult(result);
            const usableLines = result.rows.filter((r) => r.status === 'ok').map((r) => r.line);
            setSelectedSheetLines(usableLines);
            setExcelStep('review');
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Sheet not accepted',
                text: err.message || 'That sheet could not be read.',
            });
        } finally {
            setIsReadingSheet(false);
        }
    };

    const handleAddSelectedToList = () => {
        if (!sheetResult || selectedSheetLines.length === 0) return;

        const existingCaseNos = new Set(
            candidates.map((c) => (c.eligibility_case_no || '').trim().toLowerCase())
        );
        const toAdd: CandidateRow[] = [];
        let skipped = 0;

        sheetResult.rows.forEach((row) => {
            if (row.status === 'ok' && selectedSheetLines.includes(row.line)) {
                const caseLower = (row.data.eligibility_case_no || '').trim().toLowerCase();
                if (existingCaseNos.has(caseLower)) {
                    skipped++;
                } else {
                    existingCaseNos.add(caseLower);
                    toAdd.push({
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 7)}-${row.line}`,
                        student_name: row.data.student_name,
                        student_nee_name: row.data.student_nee_name || '-',
                        eligibility_case_no: row.data.eligibility_case_no,
                        verification_of_marksheet_done_by_you:
                            row.data.verification_by_you || 'Marksheet Verification',
                        email: row.data.email || '',
                    });
                }
            }
        });

        if (toAdd.length > 0) {
            setCandidates((prev) => [...prev, ...toAdd]);
        }

        handleCloseExcelModal();

        Swal.fire({
            icon: 'success',
            title: 'Candidates Added',
            text: `Added ${toAdd.length} candidate(s) to the list${
                skipped > 0 ? ` (${skipped} duplicate case number(s) skipped)` : ''
            }.`,
            timer: 2500,
            showConfirmButton: false,
        });
    };

    // Save batch to database
    const handleSaveBatch = async () => {
        if (!clgAdd.trim()) {
            Swal.fire({ icon: 'warning', title: 'University Required', text: 'Please select a university or enter an address.' });
            return;
        }
        if (!admissionTakenYear) {
            Swal.fire({ icon: 'warning', title: 'Academic Year Required', text: 'Please select an academic year.' });
            return;
        }
        if (!admissionTakenIn) {
            Swal.fire({ icon: 'warning', title: 'Academic Stream Required', text: 'Please select an admitted program.' });
            return;
        }
        if (candidates.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No Candidates', text: 'Please add at least one candidate to this batch dispatch.' });
            return;
        }

        setIsSubmittingBatch(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch('/students/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                body: JSON.stringify({
                    to_name: toName,
                    clg_add: clgAdd,
                    admission_taken_year: admissionTakenYear,
                    admission_taken_in: admissionTakenIn,
                    in_favour_of: inFavourOf,
                    students: candidates,
                }),
            });

            const data = await res.json();
            if (!res.ok || data.status === 'error') {
                throw new Error(data.message || 'Failed to save batch');
            }

            Swal.fire({
                icon: 'success',
                title: 'Batch Saved Successfully',
                html: `<strong>${data.count}</strong> student verification cases saved under Batch Reference <strong>#${data.array_space}</strong>.`,
                showCancelButton: true,
                confirmButtonText: '<i class="fa fa-file-pdf-o me-1"></i> View Dispatch Letter PDF',
                cancelButtonText: 'Batch History',
                customClass: {
                    confirmButton: 'btn btn-indigo',
                    cancelButton: 'btn btn-glass ms-2',
                },
                buttonsStyling: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open(`/pdf/dispatch/${data.array_space}`, '_blank');
                    router.visit('/students/history');
                } else {
                    router.visit('/students/history');
                }
            });
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: err.message || 'An unexpected error occurred while saving the batch.',
            });
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    const filteredCandidates = candidates.filter((c) =>
        c.student_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        c.eligibility_case_no.toLowerCase().includes(filterQuery.toLowerCase())
    );

    return (
        <AppLayout title="New Student Verification Form - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1">
                                    <i className="fa fa-plus-circle me-2 text-indigo"></i> New Student Verification Form
                                </h3>
                                <p className="text-muted small mb-0">
                                    Create eligibility verification dispatch cases for target universities across India.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                {features.import && can('students.import') && (
                                    <Link href="/students/import" className="btn btn-glass">
                                        <i className="fa fa-file-excel-o me-1"></i> Import from Excel
                                    </Link>
                                )}
                                {can('students.view') && (
                                    <Link href="/students/history" className="btn btn-glass">
                                        <i className="fa fa-history me-1"></i> Batch History
                                    </Link>
                                )}
                                <span className="badge badge-glass-indigo fs-6 px-3 py-2">
                                    Batch #: <span className="fw-bold font-monospace">{common_no}</span>
                                </span>
                            </div>
                        </div>

                        {/* University & Program Details */}
                        <div className="row g-3 mb-4 filter-panel p-3 bg-light rounded-3 border">
                            <div className="col-md-6 position-relative" ref={collegeDropdownRef}>
                                <label className="form-label text-secondary small fw-semibold">
                                    Target University Name (Live Search)
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0">
                                        <i className={`fa ${isSearchingColleges ? 'fa-spinner fa-spin text-indigo' : 'fa-search text-muted'}`}></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Type to search 469 verified universities..."
                                        value={universityQuery}
                                        onChange={(e) => setUniversityQuery(e.target.value)}
                                        onFocus={() => {
                                            if (collegeResults.length > 0) setShowCollegeDropdown(true);
                                        }}
                                    />
                                </div>

                                {showCollegeDropdown && collegeResults.length > 0 && (
                                    <ul
                                        className="dropdown-menu show shadow w-100 mt-1"
                                        style={{ maxHeight: '250px', overflowY: 'auto', zIndex: 1060 }}
                                    >
                                        {collegeResults.map((col) => (
                                            <li key={col.id}>
                                                <button
                                                    type="button"
                                                    className="dropdown-item py-2"
                                                    onClick={() => handleSelectCollege(col)}
                                                >
                                                    <div className="fw-bold text-dark">{col.name}</div>
                                                    <div className="text-muted small">
                                                        {col.state ? `${col.state} | ` : ''}
                                                        {col.address ? col.address.substring(0, 70) + '...' : ''}
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label text-secondary small fw-semibold">
                                    To (Addressed Authority Title)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={toName}
                                    onChange={(e) => setToName(e.target.value)}
                                    placeholder="e.g. The Controller of Examinations"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label text-secondary small fw-semibold">
                                    Academic Admission Year
                                </label>
                                <select
                                    className="form-select"
                                    value={admissionTakenYear}
                                    onChange={(e) => setAdmissionTakenYear(e.target.value)}
                                >
                                    <option value="">-- Select Academic Year --</option>
                                    {academicYears.map((y) => (
                                        <option key={y.id} value={y.id}>
                                            {y.text} {y.is_current ? '(Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label text-secondary small fw-semibold">
                                    Admitted Program / Stream
                                </label>
                                <select
                                    className="form-select"
                                    value={admissionTakenIn}
                                    onChange={(e) => setAdmissionTakenIn(e.target.value)}
                                >
                                    <option value="">-- Select Academic Program --</option>
                                    {streams.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.text} - {s.stream}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-12">
                                <label className="form-label text-secondary small fw-semibold">
                                    Favoring Authority Payment Instruction (In Favour Of)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={inFavourOf}
                                    onChange={(e) => setInFavourOf(e.target.value)}
                                    placeholder="Auto-populated payment title"
                                />
                            </div>

                            <div className="col-12">
                                <label className="form-label text-secondary small fw-semibold">
                                    Full Postal Address
                                </label>
                                <textarea
                                    className="form-control"
                                    rows={2}
                                    value={clgAdd}
                                    onChange={(e) => setClgAdd(e.target.value)}
                                    placeholder="University full postal address"
                                ></textarea>
                            </div>
                        </div>

                        {/* Candidate Input Entry Panel */}
                        <div className="p-3 mb-4 rounded-3 border bg-white shadow-sm">
                            <h5 className="fw-bold mb-3">
                                <i className="fa fa-user-plus me-2 text-emerald"></i>{' '}
                                {editingCandidateId ? 'Edit Candidate Details' : 'Add Candidate to Batch Dispatch'}
                            </h5>
                            <div className="row g-3">
                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small text-muted">Student Full Name *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Student Full Name"
                                        value={studName}
                                        onChange={(e) => setStudName(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small text-muted">Nee / Maiden Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Nee / Maiden Name (Optional)"
                                        value={studNeeName}
                                        onChange={(e) => setStudNeeName(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small text-muted">Eligibility Case No. *</label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        placeholder="Eligibility Case No."
                                        value={caseNo}
                                        onChange={(e) => setCaseNo(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small text-muted">Verification Remarks</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Verification Remarks"
                                        value={verificationRemarks}
                                        onChange={(e) => setVerificationRemarks(e.target.value)}
                                    />
                                </div>
                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small text-muted">Email (Optional)</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="Email (Optional)"
                                        value={studEmail}
                                        onChange={(e) => setStudEmail(e.target.value)}
                                    />
                                </div>
                                <div className="col-12 text-end d-flex justify-content-end align-items-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        id="btn_open_candidate_sheet"
                                        onClick={handleOpenExcelModal}
                                    >
                                        <i className="fa fa-file-excel-o me-1 text-emerald"></i> Fill from Excel
                                    </button>
                                    {editingCandidateId && (
                                        <button
                                            type="button"
                                            className="btn btn-glass text-muted"
                                            onClick={handleCancelEdit}
                                        >
                                            <i className="fa fa-times me-1"></i> Cancel Edit
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-emerald"
                                        onClick={handleAddOrUpdateCandidate}
                                    >
                                        <i className="fa fa-plus me-1"></i>{' '}
                                        {editingCandidateId ? 'Save Candidate' : 'Add Candidate to List'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Table Controls */}
                        <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-2" style={{ maxWidth: '350px' }}>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0">
                                        <i className="fa fa-search text-muted"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Filter by candidate name..."
                                        value={filterQuery}
                                        onChange={(e) => setFilterQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                {selectedIds.length > 0 && (
                                    <span className="badge badge-glass-indigo px-3 py-2">
                                        {selectedIds.length} Selected
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-glass text-danger"
                                    disabled={selectedIds.length === 0}
                                    onClick={handleBulkDelete}
                                >
                                    <i className="fa fa-trash me-1"></i> Remove Selected
                                </button>
                            </div>
                        </div>

                        {/* Candidates Table */}
                        <div className="table-responsive mb-4 rounded-3 border" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            <table className="table table-glass align-middle mb-0">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th style={{ width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={
                                                    filteredCandidates.length > 0 &&
                                                    selectedIds.length === filteredCandidates.length
                                                }
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Student Full Name</th>
                                        <th>Nee / Maiden Name</th>
                                        <th>Eligibility Case No.</th>
                                        <th>Verification Remarks</th>
                                        <th>Email</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCandidates.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-5">
                                                No candidates added to this batch yet. Use the form above to add students.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCandidates.map((c, idx) => (
                                            <tr
                                                key={c.id}
                                                className={
                                                    editingCandidateId === c.id
                                                        ? 'table-success'
                                                        : selectedIds.includes(c.id)
                                                        ? 'table-primary'
                                                        : ''
                                                }
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedIds.includes(c.id)}
                                                        onChange={() => handleToggleSelect(c.id)}
                                                    />
                                                </td>
                                                <td className="fw-semibold text-muted">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="fw-bold text-dark">{c.student_name}</td>
                                                <td className="text-muted">{c.student_nee_name || '—'}</td>
                                                <td>
                                                    <span className="font-monospace fw-semibold text-indigo">
                                                        {c.eligibility_case_no}
                                                    </span>
                                                </td>
                                                <td>{c.verification_of_marksheet_done_by_you || '—'}</td>
                                                <td className="small text-muted">{c.email || '—'}</td>
                                                <td className="text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-glass text-indigo me-1"
                                                        onClick={() => handleEditCandidate(c)}
                                                        title="Edit Candidate"
                                                    >
                                                        <i className="fa fa-pencil"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-glass text-danger"
                                                        onClick={() => handleDeleteCandidate(c.id)}
                                                        title="Remove Candidate"
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Actions */}
                        <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                            <Link href="/dashboard" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Dashboard
                            </Link>

                            <button
                                type="button"
                                className="btn btn-indigo px-4 py-2"
                                onClick={handleSaveBatch}
                                disabled={isSubmittingBatch || candidates.length === 0}
                            >
                                {isSubmittingBatch ? (
                                    <>
                                        <i className="fa fa-spinner fa-spin me-2"></i> Saving Dispatch Case...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa fa-file-pdf-o me-2"></i> Create PDF &amp; Save Dispatch Case
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Excel Candidate Sheet Modal */}
            {isExcelModalOpen && (
                <div
                    className="modal fade show d-block"
                    id="candidateSheetModal"
                    tabIndex={-1}
                    aria-labelledby="candidateSheetLabel"
                    aria-hidden="true"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                        <div className="modal-content glass-card border-secondary border-opacity-25 shadow-lg">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold text-dark" id="candidateSheetLabel">
                                    <i className="fa fa-file-excel-o me-2 text-emerald"></i>Fill Candidates from Excel
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseExcelModal}
                                    disabled={isReadingSheet}
                                    aria-label="Close"
                                ></button>
                            </div>

                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {excelStep === 'pick' ? (
                                    <div id="sheet_step_pick">
                                        <p className="text-muted small">
                                            Upload an <strong>.xlsx</strong> file whose first sheet has these five columns, in this order.
                                            The heading row is ignored, so name the headings whatever you like.
                                        </p>

                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm table-glass mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>A</th>
                                                        <th>B</th>
                                                        <th>C</th>
                                                        <th>D</th>
                                                        <th>E</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            Candidate name <span className="badge badge-glass-indigo">required</span>
                                                        </td>
                                                        <td>Nee / maiden name</td>
                                                        <td>
                                                            Eligibility case no. <span className="badge badge-glass-indigo">required</span>
                                                        </td>
                                                        <td>Verification remarks</td>
                                                        <td>Email</td>
                                                    </tr>
                                                    <tr className="text-muted small">
                                                        <td>Priya Sharma</td>
                                                        <td>Priya Deshmukh</td>
                                                        <td>IDOL/2026/0142</td>
                                                        <td>Marksheet Verification</td>
                                                        <td>priya@example.com</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="row g-2 align-items-center">
                                            <div className="col-sm-8">
                                                <input
                                                    type="file"
                                                    className="form-control"
                                                    id="candidate_sheet_file"
                                                    accept=".xlsx"
                                                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                                    disabled={isReadingSheet}
                                                />
                                            </div>
                                            <div className="col-sm-4 d-grid">
                                                <button
                                                    type="button"
                                                    className="btn btn-emerald"
                                                    id="btn_read_sheet"
                                                    onClick={handleReadSheet}
                                                    disabled={isReadingSheet || !excelFile}
                                                >
                                                    {isReadingSheet ? (
                                                        <>
                                                            <i className="fa fa-spinner fa-spin me-1"></i> Reading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa fa-search me-1"></i> Read Sheet
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-muted small mt-2 mb-0">
                                            Blank rows are skipped. Nothing is saved until you press{' '}
                                            <strong>Save &amp; Generate PDF</strong> on the form behind this window.
                                        </p>
                                    </div>
                                ) : (
                                    <div id="sheet_step_review">
                                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                                            <div>
                                                <span className="badge badge-glass-emerald" id="sheet_ok_count">
                                                    {sheetResult?.ok_count ?? 0} usable
                                                </span>
                                                <span className="badge badge-glass-danger ms-1" id="sheet_error_count">
                                                    {sheetResult?.error_count ?? 0} with problems
                                                </span>
                                                {sheetResult?.sheet && (
                                                    <span className="text-muted small ms-2" id="sheet_name_label">
                                                        {sheetResult.sheet}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-glass me-1"
                                                    id="btn_sheet_select_all"
                                                    onClick={() => {
                                                        const usable =
                                                            sheetResult?.rows
                                                                .filter((r) => r.status === 'ok')
                                                                .map((r) => r.line) || [];
                                                        setSelectedSheetLines(usable);
                                                    }}
                                                >
                                                    Select all usable
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-glass me-1"
                                                    id="btn_sheet_select_none"
                                                    onClick={() => setSelectedSheetLines([])}
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-glass text-primary"
                                                    id="btn_sheet_back"
                                                    onClick={handleResetToPicker}
                                                >
                                                    <i className="fa fa-arrow-left me-1"></i> Choose another file
                                                </button>
                                            </div>
                                        </div>

                                        {sheetResult?.truncated && (
                                            <div className="alert alert-warning py-2 small" id="sheet_truncated_note">
                                                This sheet has more rows than the limit of 300. Displaying the first 300 rows.
                                            </div>
                                        )}

                                        <div className="table-responsive" style={{ maxHeight: '46vh', overflowY: 'auto' }}>
                                            <table className="table table-sm table-glass table-sticky-id mb-0" id="sheet_preview_table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '2.5rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                id="sheet_check_all"
                                                                title="Select all usable rows"
                                                                checked={
                                                                    (sheetResult?.ok_count ?? 0) > 0 &&
                                                                    selectedSheetLines.length === (sheetResult?.ok_count ?? 0)
                                                                }
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        const usable =
                                                                            sheetResult?.rows
                                                                                .filter((r) => r.status === 'ok')
                                                                                .map((r) => r.line) || [];
                                                                        setSelectedSheetLines(usable);
                                                                    } else {
                                                                        setSelectedSheetLines([]);
                                                                    }
                                                                }}
                                                            />
                                                        </th>
                                                        <th style={{ width: '4rem' }}>Row</th>
                                                        <th>Candidate name</th>
                                                        <th>Nee / maiden</th>
                                                        <th>Case no.</th>
                                                        <th>Remarks</th>
                                                        <th>Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sheetResult?.rows.map((row) => {
                                                        const isOk = row.status === 'ok';
                                                        const isSelected = selectedSheetLines.includes(row.line);
                                                        return (
                                                            <tr
                                                                key={row.line}
                                                                className={!isOk ? 'table-danger bg-opacity-10' : ''}
                                                            >
                                                                <td>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input sheet-row-check"
                                                                        disabled={!isOk}
                                                                        checked={isSelected}
                                                                        onChange={() => {
                                                                            if (!isOk) return;
                                                                            setSelectedSheetLines((prev) =>
                                                                                prev.includes(row.line)
                                                                                    ? prev.filter((l) => l !== row.line)
                                                                                    : [...prev, row.line]
                                                                            );
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="text-muted small">{row.line}</td>
                                                                <td>
                                                                    <div className={!row.data.student_name ? 'text-danger fw-semibold' : ''}>
                                                                        {row.data.student_name || '(missing name)'}
                                                                    </div>
                                                                </td>
                                                                <td className="text-muted">{row.data.student_nee_name}</td>
                                                                <td>
                                                                    <div className={!row.data.eligibility_case_no ? 'text-danger fw-semibold' : ''}>
                                                                        {row.data.eligibility_case_no || '(missing case no)'}
                                                                    </div>
                                                                    {row.messages.length > 0 && (
                                                                        <div className="small text-danger">
                                                                            {row.messages.join(', ')}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td>{row.data.verification_by_you}</td>
                                                                <td className="text-muted">{row.data.email || '—'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <span className="text-muted small me-auto" id="sheet_selection_label">
                                    {excelStep === 'review'
                                        ? `${selectedSheetLines.length} candidate(s) selected`
                                        : ''}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-glass"
                                    onClick={handleCloseExcelModal}
                                    disabled={isReadingSheet}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-emerald"
                                    id="btn_sheet_add"
                                    disabled={excelStep !== 'review' || selectedSheetLines.length === 0}
                                    onClick={handleAddSelectedToList}
                                >
                                    <i className="fa fa-plus me-1"></i> Add Selected to List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
};

export default NewForm;
