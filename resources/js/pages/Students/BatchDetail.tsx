import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { Select2 } from '../../components/Select2';
import { SharedProps, Student } from '../../types';

interface BatchInfo {
    clg_add: string;
    to_name: string;
    admission_taken_in: string;
    admission_taken_year: string;
    university_name?: string;
    in_favour_of?: string;
}

interface BatchDetailProps {
    title: string;
    arraySpace: string;
    students: Student[];
    batchInfo?: BatchInfo;
    years?: string[];
    courses?: string[];
}

export interface UniversityCollegeItem {
    id: number;
    value: string;
    name: string;
    fees?: string;
    label: string;
    address?: string | null;
    head_name?: string | null;
    in_favour_of?: string | null;
}

export const BatchDetail: React.FC<BatchDetailProps> = ({ arraySpace, students, batchInfo, years = [], courses = [] }) => {
    const { props } = usePage<SharedProps>();
    const { features } = props;
    const canDelete = features.delete;

    const firstStudent = students[0];

    // Batch editing state
    const [isEditingBatch, setIsEditingBatch] = useState(false);
    const [collegesList, setCollegesList] = useState<UniversityCollegeItem[]>([]);
    const [editUnivId, setEditUnivId] = useState('');
    const [editClgAdd, setEditClgAdd] = useState(batchInfo?.clg_add || firstStudent?.clg_add || '');
    const [editToName, setEditToName] = useState(batchInfo?.to_name || firstStudent?.to_name || 'The Controller of Examinations');
    const [editCourse, setEditCourse] = useState(batchInfo?.admission_taken_in || firstStudent?.admission_taken_in || '');
    const [editYear, setEditYear] = useState(batchInfo?.admission_taken_year || firstStudent?.admission_taken_year || '');
    const [editInFavourOf, setEditInFavourOf] = useState(batchInfo?.in_favour_of || firstStudent?.in_favour_of || '');
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    // Load available colleges for Select2
    useEffect(() => {
        fetch('/api/colleges?active_only=0')
            .then((res) => res.json())
            .then((data) => {
                if (data.results && Array.isArray(data.results)) {
                    const mapped = data.results.map((c: any) => {
                        const rawFees = c.fees !== null && c.fees !== '' ? String(c.fees).trim() : '';
                        const feesVal = rawFees !== '' && rawFees !== '0' ? rawFees : '';
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
                        };
                    });
                    setCollegesList(mapped);
                }
            })
            .catch((err) => console.error('Failed to load colleges for edit', err));
    }, []);

    const modalYears = years.length > 0
        ? years
        : ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022', '2020-2021', '2019-2020'];

    const modalCourses = courses.length > 0
        ? courses
        : [
              'FYBA',
              'SYBA',
              'TYBA',
              'FYBCOM',
              'SYBCOM',
              'TYBCOM',
              'FYBSC',
              'SYBSC',
              'TYBSC',
              'MA',
              'MCOM',
              'MSC',
              'MCA',
              'PGDFM',
              'PGDORM',
          ];

    const handleOpenBatchEdit = () => {
        const currentAddr = batchInfo?.clg_add || firstStudent?.clg_add || '';
        const currentTo = batchInfo?.to_name || firstStudent?.to_name || 'The Controller of Examinations';
        const currentCourse = batchInfo?.admission_taken_in || firstStudent?.admission_taken_in || '';
        const currentYear = batchInfo?.admission_taken_year || firstStudent?.admission_taken_year || '';
        const currentFavour = batchInfo?.in_favour_of || firstStudent?.in_favour_of || '';

        setEditClgAdd(currentAddr);
        setEditToName(currentTo);
        setEditCourse(currentCourse);
        setEditYear(currentYear);
        setEditInFavourOf(currentFavour);

        const matched = collegesList.find(
            (c) =>
                (batchInfo?.university_name && c.name.toLowerCase() === batchInfo.university_name.toLowerCase()) ||
                (c.address && currentAddr.toLowerCase().includes(c.address.toLowerCase()))
        );
        if (matched) {
            setEditUnivId(String(matched.id));
        } else {
            setEditUnivId('');
        }
        setIsEditingBatch(true);
    };

    const handleSelectEditUniversity = (val: string) => {
        setEditUnivId(val);
        if (!val) return;
        const found = collegesList.find((c) => String(c.id) === String(val) || String(c.value) === String(val));
        if (found) {
            const fullAddr = found.address
                ? found.address.toLowerCase().includes(found.name.toLowerCase())
                    ? found.address
                    : `${found.name}\n${found.address}`
                : found.name;
            setEditClgAdd(fullAddr);
            if (found.head_name) {
                setEditToName(found.head_name);
            }
            if (found.in_favour_of) {
                setEditInFavourOf(found.in_favour_of);
            }
        }
    };

    const handleSaveBatch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editClgAdd.trim()) {
            Swal.fire({ icon: 'warning', title: 'Address Required', text: 'Please enter university address.' });
            return;
        }
        if (!editCourse.trim()) {
            Swal.fire({ icon: 'warning', title: 'Course Required', text: 'Please select a course.' });
            return;
        }
        if (!editYear.trim()) {
            Swal.fire({ icon: 'warning', title: 'Year Required', text: 'Please select an academic year.' });
            return;
        }

        setIsSavingBatch(true);
        router.put(
            `/students/batches/${encodeURIComponent(arraySpace)}`,
            {
                clg_add: editClgAdd.trim(),
                to_name: editToName.trim(),
                admission_taken_in: editCourse.trim(),
                admission_taken_year: editYear.trim(),
                in_favour_of: editInFavourOf.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSavingBatch(false);
                    setIsEditingBatch(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'Batch Updated',
                        text: `Batch #${arraySpace} updated successfully.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                },
                onError: (err) => {
                    setIsSavingBatch(false);
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: (Object.values(err)[0] as string) || 'Failed to update batch details.',
                    });
                },
            }
        );
    };

    const handleDeleteBatch = () => {
        Swal.fire({
            title: 'Delete Entire Batch?',
            text: `Are you sure you want to delete batch #${arraySpace} with all ${students.length} candidates? This cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete Batch',
            cancelButtonText: 'Cancel',
            customClass: {
                confirmButton: 'btn btn-danger',
                cancelButton: 'btn btn-glass ms-2',
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(`/students/batches/${encodeURIComponent(arraySpace)}`, {
                    preserveScroll: false,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Batch Deleted',
                            text: `Batch #${arraySpace} has been completely removed.`,
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                    onError: (err) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete Failed',
                            text: (Object.values(err)[0] as string) || 'Failed to delete batch.',
                        });
                    },
                });
            }
        });
    };

    const handleOpenEdit = (s: Student) => {
        setEditingStudent(s);
        setEditName(s.student_name);
        setEditNeeName(s.student_nee_name || '');
        setEditCaseNo(s.eligibility_case_no || '');
        setEditRemarks(s.verification_of_marksheet_done_by_you || '');
        setEditEmail(s.email || '');
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        setIsSavingEdit(true);
        router.put(
            `/students/${editingStudent.id}`,
            {
                student_name: editName,
                student_nee_name: editNeeName,
                eligibility_case_no: editCaseNo,
                verification_of_marksheet_done_by_you: editRemarks,
                email: editEmail,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSavingEdit(false);
                    setEditingStudent(null);
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated',
                        text: 'Candidate details updated successfully.',
                        timer: 2500,
                        showConfirmButton: false,
                    });
                },
                onError: (err) => {
                    setIsSavingEdit(false);
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: Object.values(err)[0] as string || 'Failed to update candidate.',
                    });
                },
            }
        );
    };

    const handleDelete = (s: Student) => {
        Swal.fire({
            title: 'Delete Candidate?',
            text: `Are you sure you want to delete ${s.student_name} from batch #${arraySpace}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            customClass: {
                confirmButton: 'btn btn-danger',
                cancelButton: 'btn btn-glass ms-2',
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(`/students/${s.id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: 'Candidate removed from batch.',
                            timer: 2500,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    return (
        <AppLayout title={`Batch #${arraySpace} Details - E-Section Portal`}>
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1">
                                    <i className="fa fa-folder-open-o me-2 text-indigo"></i>
                                    Verification Batch <span className="text-indigo">#{arraySpace}</span>
                                </h3>
                                <div className="text-muted small">
                                    <strong>To Head:</strong> {batchInfo?.to_name || firstStudent?.to_name || 'The Controller of Examinations'} |{' '}
                                    <strong>University:</strong> {batchInfo?.university_name || firstStudent?.clg_add || 'N/A'} |{' '}
                                    <strong>Program:</strong> {batchInfo?.admission_taken_in || firstStudent?.admission_taken_in || 'N/A'} |{' '}
                                    <strong>Year:</strong> {batchInfo?.admission_taken_year || firstStudent?.admission_taken_year || 'N/A'}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    className="btn btn-indigo"
                                    onClick={handleOpenBatchEdit}
                                    title="Edit university name, to head name, course, or year"
                                >
                                    <i className="fa fa-pencil me-1"></i> Edit Batch Info
                                </button>
                                {canDelete && (
                                    <button
                                        type="button"
                                        className="btn btn-glass text-danger"
                                        onClick={handleDeleteBatch}
                                        title="Delete this entire batch"
                                    >
                                        <i className="fa fa-trash me-1"></i> Delete Batch
                                    </button>
                                )}
                                <a
                                    href={`/pdf/dispatch/${arraySpace}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-glass text-emerald"
                                >
                                    <i className="fa fa-print me-1"></i> Dispatch Letter
                                </a>
                                <a
                                    href={`/pdf/accounts/${arraySpace}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-glass text-indigo"
                                >
                                    <i className="fa fa-file-text-o me-1"></i> Accounts Copy
                                </a>
                                <Link href="/students/history" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to History
                                </Link>
                            </div>
                        </div>

                        {/* Candidates Table */}
                        <div className="table-responsive rounded-3 border">
                            <table className="table table-glass align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
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
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-5">
                                                All candidates in this batch have been removed.
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((s, idx) => (
                                            <tr key={s.id}>
                                                <td className="fw-semibold text-muted">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="fw-bold text-dark">{s.student_name}</td>
                                                <td className="text-muted">{s.student_nee_name || '—'}</td>
                                                <td>
                                                    <span className="font-monospace fw-semibold text-indigo">
                                                        {s.eligibility_case_no}
                                                    </span>
                                                </td>
                                                <td>{s.verification_of_marksheet_done_by_you || '—'}</td>
                                                <td className="small text-muted">{s.email || '—'}</td>
                                                <td className="text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-glass text-indigo me-1"
                                                        onClick={() => handleOpenEdit(s)}
                                                        title="Edit Candidate"
                                                    >
                                                        <i className="fa fa-pencil"></i>
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-glass text-danger"
                                                            onClick={() => handleDelete(s)}
                                                            title="Delete Candidate"
                                                        >
                                                            <i className="fa fa-trash"></i>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Candidate Modal */}
            {editingStudent && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content glass-card border-secondary border-opacity-25 shadow-lg">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-pencil me-2 text-indigo"></i> Edit Candidate
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setEditingStudent(null)}
                                    disabled={isSavingEdit}
                                ></button>
                            </div>

                            <form onSubmit={handleSaveEdit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Student Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Nee / Maiden Name
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editNeeName}
                                            onChange={(e) => setEditNeeName(e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Eligibility Case No. *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control font-monospace"
                                            value={editCaseNo}
                                            onChange={(e) => setEditCaseNo(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Verification Remarks
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editRemarks}
                                            onChange={(e) => setEditRemarks(e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-1">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setEditingStudent(null)}
                                        disabled={isSavingEdit}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-indigo" disabled={isSavingEdit}>
                                        {isSavingEdit ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-check me-1"></i> Update Candidate
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Batch Modal */}
            {isEditingBatch && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content glass-card border-secondary border-opacity-25 shadow-lg">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-pencil me-2 text-indigo"></i>
                                    Edit Batch <span className="text-indigo">#{arraySpace}</span>
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setIsEditingBatch(false)}
                                    disabled={isSavingBatch}
                                ></button>
                            </div>
                            <form onSubmit={handleSaveBatch}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Target University (Select2)
                                            </label>
                                            <Select2
                                                id="batch_detail_edit_university"
                                                name="batch_detail_university"
                                                value={editUnivId}
                                                onChange={handleSelectEditUniversity}
                                                placeholder="-- Search & Select University --"
                                                options={[
                                                    { value: '', label: '-- Keep / Custom Address --' },
                                                    ...collegesList.map((c) => ({
                                                        value: String(c.id),
                                                        label: c.label,
                                                    })),
                                                ]}
                                            />
                                            <div className="form-text small">
                                                Selecting a university auto-fills address, head name, and fees.
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                University Postal Address *
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                value={editClgAdd}
                                                onChange={(e) => setEditClgAdd(e.target.value)}
                                                placeholder="Enter full university name and address lines..."
                                                required
                                            />
                                        </div>

                                        <div className="col-md-12">
                                            <label className="form-label small fw-semibold text-secondary">
                                                To Head Name *
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={editToName}
                                                onChange={(e) => setEditToName(e.target.value)}
                                                placeholder="e.g. The Controller of Examinations / The Registrar"
                                                required
                                            />
                                            <div className="form-text small">
                                                This exact head name will appear on the printed DD Dispatch PDF.
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Academic Program / Course *
                                            </label>
                                            <select
                                                className="form-select"
                                                value={editCourse}
                                                onChange={(e) => setEditCourse(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Select Course --</option>
                                                {modalCourses.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">
                                                Admission Year *
                                            </label>
                                            <select
                                                className="form-select"
                                                value={editYear}
                                                onChange={(e) => setEditYear(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Select Year --</option>
                                                {modalYears.map((y) => (
                                                    <option key={y} value={y}>
                                                        {y}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setIsEditingBatch(false)}
                                        disabled={isSavingBatch}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-indigo" disabled={isSavingBatch}>
                                        {isSavingBatch ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Saving Batch...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-check me-1"></i> Update Batch Info
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
};

export default BatchDetail;
