import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { Select2 } from '../../components/Select2';
import { SharedProps } from '../../types';
import { getCsrfHeaders, isCsrfMismatch } from '../../lib/csrf';
import { showLetterPostCreatePrompt, updateStudentBatchLetter } from '../../lib/letterPrompt';

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

export interface UniversityItem {
    id: number;
    value: string;
    name: string;
    fees?: string;
    label: string;
    address?: string | null;
    head_name?: string | null;
    in_favour_of?: string | null;
    state?: string | null;
}

interface CandidateRow {
    id: string; // temporary unique client key
    student_name: string;
    student_nee_name: string;
    eligibility_case_no: string;
    verification_of_marksheet_done_by_you: string;
    email?: string;
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
        email?: string;
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
    universities?: UniversityItem[];
}

export const NewForm: React.FC<NewFormProps> = ({
    common_no,
    suggestedCaseNo,
    academicYears,
    streams,
    universities = [],
}) => {
    const { props } = usePage<SharedProps>();
    const { features, auth } = props;
    const permissions = auth.permissions || [];
    const isAdmin = auth.user?.role === 'admin';
    const can = (perm: string) => isAdmin || permissions.includes(perm);

    // University state with Select2 support and fees display
    const [localUniversities, setLocalUniversities] = useState<UniversityItem[]>(universities || []);
    const [selectedUniversityId, setSelectedUniversityId] = useState('');
    const [selectedUniversityFees, setSelectedUniversityFees] = useState<string | null>(null);

    // Fallback load from API if not provided in props
    useEffect(() => {
        if (universities && universities.length > 0) {
            setLocalUniversities(universities);
        } else {
            fetch('/api/colleges?active_only=0')
                .then((res) => res.json())
                .then((data) => {
                    if (data.results && Array.isArray(data.results)) {
                        const mapped = data.results.map((c: any) => {
                            const rawFees = (c.fees !== null && c.fees !== '') ? String(c.fees).trim() : '';
                            const feesVal = (rawFees !== '' && rawFees !== '0') ? rawFees : '';
                            const feesText = feesVal !== '' ? `₹${feesVal}` : '—';
                            return {
                                id: c.id,
                                value: String(c.id),
                                name: c.name || c.text,
                                fees: feesVal,
                                label: `${c.name || c.text} | Fees: ${feesText}`,
                                address: c.address,
                                head_name: c.head_name,
                                in_favour_of: c.in_favour_of,
                                state: c.state,
                            };
                        });
                        setLocalUniversities(mapped);
                    }
                })
                .catch((err) => console.error('Failed to load universities fallback', err));
        }
    }, [universities]);

    const handleSelectUniversity = (val: string) => {
        setSelectedUniversityId(val);
        if (!val) {
            setSelectedUniversityFees(null);
            return;
        }
        const found = localUniversities.find(
            (u) => String(u.id) === String(val) || String(u.value) === String(val) || u.name === val
        );
        if (found) {
            const fullAddr = found.address
                ? found.address.toLowerCase().includes(found.name.toLowerCase())
                    ? found.address
                    : `${found.name}\n${found.address}`
                : found.name;
            setClgAdd(fullAddr);
            setToName(found.head_name || 'The Controller of Examinations');
            setInFavourOf(found.in_favour_of || '');
            setSelectedUniversityFees(found.fees || '');
        }
    };

    const universityOptions = useMemo(() => {
        return localUniversities.map((u) => ({
            value: String(u.id),
            name: u.name,
            fees: u.fees,
            label: u.label,
        }));
    }, [localUniversities]);

    const yearOptions = useMemo(() => {
        return academicYears.map((y) => ({
            value: y.id,
            label: `${y.text}${y.is_current ? ' (Current)' : ''}`,
        }));
    }, [academicYears]);

    const streamOptions = useMemo(() => {
        return streams.map((s) => ({
            value: s.id,
            label: `${s.text} - ${s.stream}`,
        }));
    }, [streams]);

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
                              email: '',
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
                email: '',
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
    };

    const handleEditCandidate = (c: CandidateRow) => {
        setEditingCandidateId(c.id);
        setStudName(c.student_name);
        setStudNeeName(c.student_nee_name);
        setCaseNo(c.eligibility_case_no);
        setVerificationRemarks(c.verification_of_marksheet_done_by_you);
    };

    const handleCancelEdit = () => {
        setEditingCandidateId(null);
        setStudName('');
        setStudNeeName('');
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
            const res = await fetch('/students/new/readSheet', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    ...getCsrfHeaders(),
                },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status !== 'success' || !data.data || !data.data.rows?.length) {
                if (isCsrfMismatch(res.status, data.message)) {
                    throw new Error('Your session expired. Please refresh the page and try again.');
                }
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
            const res = await fetch('/students/batch', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...getCsrfHeaders(),
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

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status === 'error') {
                if (isCsrfMismatch(res.status, data.message)) {
                    throw new Error('Your session expired. Please refresh the page and try again.');
                }
                throw new Error(data.message || 'Failed to save batch dispatch.');
            }

            await showLetterPostCreatePrompt({
                letterType: 'Student Verification Letter',
                batchIdOrReference: data.array_space,
                pdfUrl: `/pdf/dispatch/${data.array_space}`,
                historyUrl: '/students/history',
                onSaveLetterDetails: async (letterData) => {
                    await updateStudentBatchLetter(data.array_space, letterData);
                },
                onComplete: () => {
                    router.visit('/students/history');
                },
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
        <AppLayout title="Student Details Data Form - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm border-0 mb-4">
                        {/* Header */}
                        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between border-bottom flex-wrap gap-2">
                            <h5 className="mb-0 fw-semibold text-dark">
                                Student Details Data Form
                            </h5>
                            <div className="d-flex align-items-center gap-2">
                                {can('students.view') && (
                                    <Link href="/students/history" className="btn btn-sm btn-outline-secondary">
                                        <i className="fa fa-history me-1"></i> DD View
                                    </Link>
                                )}
                                <span className="badge bg-light text-dark border fs-6 px-3 py-2">
                                    Batch #: <span className="fw-bold font-monospace">{common_no}</span>
                                </span>
                            </div>
                        </div>

                        <div className="card-body p-4">
                            {/* Top 2-Column Form matching old new_form.php */}
                            <div className="row g-3 mb-4">
                                {/* Left Column: To : & Choose University Address : */}
                                <div className="col-lg-6">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary small">
                                            To :
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={toName}
                                            onChange={(e) => setToName(e.target.value)}
                                            placeholder="Enter To : "
                                        />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label fw-semibold text-secondary small" htmlFor="target_university_select">
                                            Choose University Address :
                                        </label>
                                        <Select2
                                            id="target_university_select"
                                            value={selectedUniversityId}
                                            onChange={handleSelectUniversity}
                                            options={universityOptions}
                                            placeholder="Select University Name"
                                            allowClear={true}
                                        />
                                        {selectedUniversityFees !== null && (
                                            <h6 className="text-success small fw-semibold mt-2 mb-0">
                                                Fees : {selectedUniversityFees && selectedUniversityFees !== '0' ? selectedUniversityFees : '0'}
                                                {clgAdd ? ` | ${clgAdd.split('\n')[0]}` : ''}
                                            </h6>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Admission Taken Year & Admission Taken In */}
                                <div className="col-lg-6">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary small">
                                            Admission Taken Year
                                        </label>
                                        <Select2
                                            id="admission_taken_year_select"
                                            value={admissionTakenYear}
                                            onChange={setAdmissionTakenYear}
                                            options={yearOptions}
                                            placeholder="Select Admission Taken Year"
                                            allowClear={false}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-secondary small">
                                            Admission Taken In
                                        </label>
                                        <Select2
                                            id="admission_taken_in_select"
                                            value={admissionTakenIn}
                                            onChange={setAdmissionTakenIn}
                                            options={streamOptions}
                                            placeholder="Select Admission Taken In"
                                            allowClear={false}
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="my-4" />

                            {/* Candidate Input Entry Panel */}
                            <div className="p-3 mb-4 rounded-3 border bg-light bg-opacity-50">
                                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                    <h5 className="fw-bold mb-0 text-dark">
                                        Student <b>Details</b>
                                    </h5>
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            id="btn_open_candidate_sheet"
                                            onClick={handleOpenExcelModal}
                                        >
                                            <i className="fa fa-file-excel-o me-1"></i> Student Data Upload
                                        </button>
                                    </div>
                                </div>

                                <div className="row g-3 align-items-end">
                                    <div className="col-sm-6 col-lg-3">
                                        <label className="form-label small text-secondary fw-semibold">Student Name *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Student Name"
                                            value={studName}
                                            onChange={(e) => setStudName(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6 col-lg-3">
                                        <label className="form-label small text-secondary fw-semibold">Nee Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Nee Name"
                                            value={studNeeName}
                                            onChange={(e) => setStudNeeName(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6 col-lg-3">
                                        <label className="form-label small text-secondary fw-semibold">E Case No. *</label>
                                        <input
                                            type="text"
                                            className="form-control font-monospace"
                                            placeholder="E Case No."
                                            value={caseNo}
                                            onChange={(e) => setCaseNo(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6 col-lg-3">
                                        <label className="form-label small text-secondary fw-semibold">Verfiy By You</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Verfiy By You"
                                            value={verificationRemarks}
                                            onChange={(e) => setVerificationRemarks(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-12 text-end d-flex justify-content-end align-items-center gap-2 mt-2">
                                        {editingCandidateId && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={handleCancelEdit}
                                            >
                                                <i className="fa fa-times me-1"></i> Cancel Edit
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-info text-white btn-sm px-3"
                                            onClick={handleAddOrUpdateCandidate}
                                        >
                                            <i className="fa fa-plus me-1"></i>{' '}
                                            {editingCandidateId ? 'Update Candidate' : 'Add New'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Table Controls */}
                            <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
                                <div className="d-flex align-items-center gap-2" style={{ maxWidth: '350px' }}>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-white border-end-0">
                                            <i className="fa fa-search text-muted"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control border-start-0"
                                            placeholder="Filter by student name..."
                                            value={filterQuery}
                                            onChange={(e) => setFilterQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                    {selectedIds.length > 0 && (
                                        <span className="badge bg-primary px-3 py-2">
                                            {selectedIds.length} Selected
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={selectedIds.length === 0}
                                        onClick={handleBulkDelete}
                                    >
                                        <i className="fa fa-trash me-1"></i> Remove Selected
                                    </button>
                                </div>
                            </div>

                            {/* Candidates Table matching old new_form.php columns */}
                            <div className="table-responsive mb-4 rounded-3 border" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                                <table className="table table-bordered table-hover align-middle mb-0" id="student-list">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th style={{ width: '40px' }} className="text-center">
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
                                            <th>Student Name</th>
                                            <th>Nee Name</th>
                                            <th>E Case No.</th>
                                            <th>Verfiy By You</th>
                                            <th className="text-end" style={{ width: '100px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCandidates.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="text-center text-muted py-4">
                                                    No students added to this batch yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCandidates.map((c, idx) => (
                                                <tr
                                                    key={c.id}
                                                    className={
                                                        editingCandidateId === c.id
                                                            ? 'table-warning'
                                                            : selectedIds.includes(c.id)
                                                            ? 'table-primary'
                                                            : ''
                                                    }
                                                >
                                                    <td className="text-center">
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
                                                    <td className="text-muted">{c.student_nee_name || '-'}</td>
                                                    <td>
                                                        <span className="font-monospace fw-semibold text-primary">
                                                            {c.eligibility_case_no}
                                                        </span>
                                                    </td>
                                                    <td>{c.verification_of_marksheet_done_by_you || '—'}</td>
                                                    <td className="text-end">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-link text-warning p-1 me-2"
                                                            onClick={() => handleEditCandidate(c)}
                                                            title="Edit"
                                                        >
                                                            <i className="fa fa-pencil fs-6"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-link text-danger p-1"
                                                            onClick={() => handleDeleteCandidate(c.id)}
                                                            title="Delete"
                                                        >
                                                            <i className="fa fa-trash fs-6"></i>
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
                                <Link href="/dashboard" className="btn btn-outline-secondary">
                                    <i className="fa fa-arrow-left me-1"></i> Back to Dashboard
                                </Link>

                                <button
                                    type="button"
                                    className="btn btn-primary px-4 py-2"
                                    onClick={handleSaveBatch}
                                    disabled={isSubmittingBatch || candidates.length === 0}
                                >
                                    {isSubmittingBatch ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-2"></i> Creating PDF...
                                        </>
                                    ) : (
                                        'Create PDF'
                                    )}
                                </button>
                            </div>
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
                                            Upload an <strong>.xlsx</strong> file whose first sheet has these four columns, in this order.
                                            The heading row is ignored, so name the headings whatever you like.
                                        </p>

                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm table-bordered mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>A</th>
                                                        <th>B</th>
                                                        <th>C</th>
                                                        <th>D</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            Student Name <span className="badge bg-primary">required</span>
                                                        </td>
                                                        <td>Nee Name</td>
                                                        <td>
                                                            E Case No. <span className="badge bg-primary">required</span>
                                                        </td>
                                                        <td>Verfiy By You</td>
                                                    </tr>
                                                    <tr className="text-muted small">
                                                        <td>Priya Sharma</td>
                                                        <td>Priya Deshmukh</td>
                                                        <td>CASE-2026/0142</td>
                                                        <td>Marksheet Verification</td>
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
                                                    className="btn btn-primary"
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
                                            <strong>Create PDF</strong> on the form behind this window.
                                        </p>
                                    </div>
                                ) : (
                                    <div id="sheet_step_review">
                                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                                            <div>
                                                <span className="badge bg-success" id="sheet_ok_count">
                                                    {sheetResult?.ok_count ?? 0} usable
                                                </span>
                                                <span className="badge bg-danger ms-1" id="sheet_error_count">
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
                                                    className="btn btn-sm btn-outline-secondary me-1"
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
                                                    className="btn btn-sm btn-outline-secondary me-1"
                                                    id="btn_sheet_select_none"
                                                    onClick={() => setSelectedSheetLines([])}
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
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
                                            <table className="table table-sm table-bordered mb-0" id="sheet_preview_table">
                                                <thead className="table-light">
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
                                                        <th>Student Name</th>
                                                        <th>Nee Name</th>
                                                        <th>E Case No.</th>
                                                        <th>Verfiy By You</th>
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
