import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';

interface CandidateWithConf {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    clg_add: string;
    admission_taken_year: string;
    admission_taken_in: string;
    confirmation_id: number | null;
    confirmation_array_space: string | null;
    conf_mig_tc: string | null;
    conf_p_degree: string | null;
    conf_s_marks: string | null;
    conf_dd_no: string | null;
    conf_dd_amount: string | null;
}

interface OptionItem {
    id: string;
    text: string;
    is_current?: boolean;
    stream?: string;
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
    filters: {
        year: string;
        stream: string;
        q: string;
    };
}

export const Index: React.FC<IndexProps> = ({
    students,
    academicYears,
    streams,
    filters,
}) => {
    const { props } = usePage<SharedProps>();
    const { features, auth } = props;
    const permissions = auth.permissions || [];
    const isAdmin = auth.user?.role === 'admin';
    const canCreate = isAdmin || permissions.includes('confirmations.create');
    const canExport = (isAdmin || permissions.includes('confirmations.export')) && features.export;

    const [filterYear, setFilterYear] = useState(filters.year || '');
    const [filterStream, setFilterStream] = useState(filters.stream || '');
    const [searchQuery, setSearchQuery] = useState(filters.q || '');

    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [checklistData, setChecklistData] = useState<
        Record<
            number,
            {
                mig_tc: string;
                p_degree: string;
                s_marks: string;
                letter_no_date: string;
                remark: string;
                conf_from: string;
                conf_from_text: string;
                conf_from_select: string;
                etc_data: string;
            }
        >
    >({});

    // Global DD payment inputs for the batch
    const [ddNo, setDdNo] = useState('');
    const [ddAmount, setDdAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [ddDate, setDdDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/confirmations',
            { year: filterYear, stream: filterStream, q: searchQuery },
            { preserveState: true }
        );
    };

    const handleChecklistChange = (
        studentId: number,
        field: string,
        value: string
    ) => {
        setChecklistData((prev) => ({
            ...prev,
            [studentId]: {
                mig_tc: prev[studentId]?.mig_tc || '',
                p_degree: prev[studentId]?.p_degree || '',
                s_marks: prev[studentId]?.s_marks || '',
                letter_no_date: prev[studentId]?.letter_no_date || '',
                remark: prev[studentId]?.remark || '',
                conf_from: prev[studentId]?.conf_from || '',
                conf_from_text: prev[studentId]?.conf_from_text || '',
                conf_from_select: prev[studentId]?.conf_from_select || '',
                etc_data: prev[studentId]?.etc_data || '',
                [field]: value,
            },
        }));

        // Auto-select candidate when checking options
        if (!selectedStudentIds.includes(studentId)) {
            setSelectedStudentIds((prev) => [...prev, studentId]);
        }
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
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch('/confirmations/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                body: JSON.stringify({
                    student_ids: selectedStudentIds,
                    checklist: checklistData,
                    dd_no: ddNo,
                    dd_amount: ddAmount ? parseFloat(ddAmount) : null,
                    bank_name: bankName,
                    dd_date: ddDate,
                }),
            });

            const data = await res.json();
            if (!res.ok || data.status === 'error') {
                throw new Error(data.message || 'Failed to save confirmation.');
            }

            Swal.fire({
                icon: 'success',
                title: 'Confirmation Recorded',
                html: `Eligibility successfully confirmed for <strong>${data.count}</strong> candidate(s). Batch reference <strong>#${data.array_space}</strong>.`,
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-emerald' },
                buttonsStyling: false,
            }).then(() => {
                setSelectedStudentIds([]);
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

    const exportUrl = `/confirmations/export?year=${encodeURIComponent(
        filterYear
    )}&stream=${encodeURIComponent(filterStream)}`;

    return (
        <AppLayout title="Demand Draft (DD) Payment Confirmation Portal - E-Section">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-check-square-o me-2 text-indigo"></i> Eligibility Confirmation Portal
                                </h3>
                                <p className="text-muted small mb-0">
                                    Confirm Migration/TC, Passing/Degree, and Statement of Marks status for verified candidates.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                {canExport && (
                                    <a href={exportUrl} className="btn btn-glass">
                                        <i className="fa fa-file-excel-o me-1 text-emerald"></i> Export to Excel
                                    </a>
                                )}
                                <Link href="/confirmations/history" className="btn btn-glass">
                                    <i className="fa fa-history me-1"></i> Confirmation History
                                </Link>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        <form onSubmit={handleFilterSubmit} className="row g-3 mb-4 filter-panel p-3 bg-light rounded-3 border">
                            <div className="col-md-4">
                                <label className="form-label text-secondary small fw-semibold">Academic Year</label>
                                <select
                                    className="form-select"
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                >
                                    <option value="">-- All Years --</option>
                                    {academicYears.map((y) => (
                                        <option key={y.id} value={y.id}>
                                            {y.text}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label text-secondary small fw-semibold">Program / Academic Stream</label>
                                <select
                                    className="form-select"
                                    value={filterStream}
                                    onChange={(e) => setFilterStream(e.target.value)}
                                >
                                    <option value="">-- All Streams --</option>
                                    {streams.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.text}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Search Candidate</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Name, case no, or university..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="col-md-1 d-flex align-items-end">
                                <button type="submit" className="btn btn-indigo w-100 py-2">
                                    <i className="fa fa-filter"></i>
                                </button>
                            </div>
                        </form>

                        {/* Candidates Table */}
                        <form onSubmit={handleConfirmSubmit}>
                            <div className="table-responsive mb-4 rounded-3 border">
                                <table className="table table-glass align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                {canCreate && (
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        onChange={toggleSelectAll}
                                                        checked={
                                                            selectedStudentIds.length > 0 &&
                                                            selectedStudentIds.length ===
                                                                students.data.filter((s) => !s.confirmation_id).length
                                                        }
                                                    />
                                                )}
                                            </th>
                                            <th>Candidate</th>
                                            <th>Case No.</th>
                                            <th>Target University</th>
                                            <th style={{ minWidth: '100px' }}>Migration/TC</th>
                                            <th style={{ minWidth: '100px' }}>Pass/Degree</th>
                                            <th style={{ minWidth: '100px' }}>Marksheet</th>
                                            <th style={{ minWidth: '130px' }}>Letter No./Date</th>
                                            <th style={{ minWidth: '140px' }}>Remarks</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center text-muted py-5">
                                                    No candidates pending eligibility confirmation matching your filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            students.data.map((s) => {
                                                const isConfirmed = !!s.confirmation_id;
                                                const check = checklistData[s.id] || {
                                                    mig_tc: '',
                                                    p_degree: '',
                                                    s_marks: '',
                                                    letter_no_date: '',
                                                    remark: '',
                                                    conf_from: '',
                                                    conf_from_text: '',
                                                    conf_from_select: '',
                                                    etc_data: '',
                                                };

                                                return (
                                                    <React.Fragment key={s.id}>
                                                        <tr className={selectedStudentIds.includes(s.id) ? 'table-primary' : ''}>
                                                            <td>
                                                                {!isConfirmed && canCreate ? (
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input"
                                                                        checked={selectedStudentIds.includes(s.id)}
                                                                        onChange={() => toggleSelectStudent(s.id)}
                                                                    />
                                                                ) : isConfirmed ? (
                                                                    <i className="fa fa-check-circle text-emerald"></i>
                                                                ) : null}
                                                            </td>
                                                            <td>
                                                                <div className="fw-bold text-dark">{s.student_name}</div>
                                                                {s.student_nee_name && (
                                                                    <div className="small text-muted">
                                                                        Nee: {s.student_nee_name}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <span className="badge badge-glass-indigo font-monospace">
                                                                    {s.eligibility_case_no}
                                                                </span>
                                                            </td>
                                                            <td className="small text-muted" style={{ maxWidth: '200px' }}>
                                                                <div className="text-truncate">{s.clg_add}</div>
                                                            </td>
                                                            {isConfirmed ? (
                                                                <td colSpan={5} className="text-center small text-muted">
                                                                    Already confirmed &mdash;{' '}
                                                                    <Link
                                                                        href={`/confirmations/batches/${s.confirmation_array_space}`}
                                                                        className="fw-semibold text-indigo"
                                                                    >
                                                                        View Confirmation #{s.confirmation_array_space}
                                                                    </Link>
                                                                </td>
                                                            ) : !canCreate ? (
                                                                <td colSpan={5} className="text-center small text-muted">
                                                                    Awaiting confirmation.
                                                                </td>
                                                            ) : (
                                                                <>
                                                                    <td>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={check.mig_tc}
                                                                            onChange={(e) =>
                                                                                handleChecklistChange(s.id, 'mig_tc', e.target.value)
                                                                            }
                                                                        >
                                                                            <option value="">Select</option>
                                                                            <option value="Yes">Yes</option>
                                                                            <option value="No">No</option>
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={check.p_degree}
                                                                            onChange={(e) =>
                                                                                handleChecklistChange(s.id, 'p_degree', e.target.value)
                                                                            }
                                                                        >
                                                                            <option value="">Select</option>
                                                                            <option value="Yes">Yes</option>
                                                                            <option value="No">No</option>
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={check.s_marks}
                                                                            onChange={(e) =>
                                                                                handleChecklistChange(s.id, 's_marks', e.target.value)
                                                                            }
                                                                        >
                                                                            <option value="">Select</option>
                                                                            <option value="Yes">Yes</option>
                                                                            <option value="No">No</option>
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder="Letter no, date"
                                                                            value={check.letter_no_date}
                                                                            onChange={(e) =>
                                                                                handleChecklistChange(s.id, 'letter_no_date', e.target.value)
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder="Remarks"
                                                                            value={check.remark}
                                                                            onChange={(e) =>
                                                                                handleChecklistChange(s.id, 'remark', e.target.value)
                                                                            }
                                                                        />
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td>
                                                                {isConfirmed ? (
                                                                    <span className="badge badge-glass-emerald">
                                                                        <i className="fa fa-check-circle me-1"></i> Confirmed
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge badge-glass-amber">
                                                                        <i className="fa fa-clock-o me-1"></i> Pending
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {/* Expandable Clarification Row if Mig/TC is Yes */}
                                                        {check.mig_tc === 'Yes' && !isConfirmed && (
                                                            <tr className="bg-light">
                                                                <td colSpan={10} className="p-3 border-bottom">
                                                                    <div className="small fw-bold text-indigo mb-2">
                                                                        <i className="fa fa-level-up fa-rotate-90 me-2"></i>
                                                                        Clarification for {s.student_name} ({s.eligibility_case_no})
                                                                    </div>
                                                                    <div className="row g-2">
                                                                        <div className="col-md-3">
                                                                            <label className="form-label small text-muted">Confirmation From</label>
                                                                            <select
                                                                                className="form-select form-select-sm"
                                                                                value={check.conf_from}
                                                                                onChange={(e) =>
                                                                                    handleChecklistChange(s.id, 'conf_from', e.target.value)
                                                                                }
                                                                            >
                                                                                <option value="">Select source</option>
                                                                                <option value="IDOL">IDOL</option>
                                                                                <option value="University">University</option>
                                                                                <option value="College">College</option>
                                                                                <option value="other">Other</option>
                                                                            </select>
                                                                        </div>
                                                                        {check.conf_from === 'other' && (
                                                                            <div className="col-md-3">
                                                                                <label className="form-label small text-muted">Other Details</label>
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-control form-control-sm"
                                                                                    placeholder="Specify source..."
                                                                                    value={check.conf_from_text}
                                                                                    onChange={(e) =>
                                                                                        handleChecklistChange(s.id, 'conf_from_text', e.target.value)
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="col-md-3">
                                                                            <label className="form-label small text-muted">Clarification Option</label>
                                                                            <select
                                                                                className="form-select form-select-sm"
                                                                                value={check.conf_from_select}
                                                                                onChange={(e) =>
                                                                                    handleChecklistChange(s.id, 'conf_from_select', e.target.value)
                                                                                }
                                                                            >
                                                                                <option value="">None</option>
                                                                                <option value="Migration Certificate Verification">
                                                                                    Migration Certificate Verification
                                                                                </option>
                                                                                <option value="Degree Certificate Verification">
                                                                                    Degree Certificate Verification
                                                                                </option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="col-md-3">
                                                                            <label className="form-label small text-muted">Name Change / Etc Data</label>
                                                                            <select
                                                                                className="form-select form-select-sm"
                                                                                value={check.etc_data}
                                                                                onChange={(e) =>
                                                                                    handleChecklistChange(s.id, 'etc_data', e.target.value)
                                                                                }
                                                                            >
                                                                                <option value="">No name change</option>
                                                                                <option value="Father Name Change">Father Name Change</option>
                                                                                <option value="Self Name Change">Self Name Change</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* DD Payment Details and Confirmation Action Bar */}
                            {canCreate && selectedStudentIds.length > 0 && (
                                <div className="p-3 bg-light rounded-3 border mb-4">
                                    <h6 className="fw-bold mb-3 text-dark">
                                        <i className="fa fa-credit-card me-2 text-indigo"></i> Demand Draft (DD) Payment Details for Batch
                                    </h6>
                                    <div className="row g-3">
                                        <div className="col-sm-6 col-md-3">
                                            <label className="form-label small text-muted">DD Number</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. 123456"
                                                value={ddNo}
                                                onChange={(e) => setDdNo(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <label className="form-label small text-muted">DD Amount (₹)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. 500.00"
                                                value={ddAmount}
                                                onChange={(e) => setDdAmount(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <label className="form-label small text-muted">Bank Name</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. State Bank of India"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <label className="form-label small text-muted">DD Date</label>
                                            <input
                                                type="date"
                                                className="form-control form-control-sm"
                                                value={ddDate}
                                                onChange={(e) => setDdDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-12 text-end pt-2">
                                            <button
                                                type="submit"
                                                className="btn btn-emerald px-4"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <i className="fa fa-spinner fa-spin me-2"></i> Saving Confirmations...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-check me-2"></i> Confirm Eligibility for {selectedStudentIds.length} Candidate(s)
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Pagination Links */}
                        {students.links && students.links.length > 3 && (
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
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
            </div>
        </AppLayout>
    );
};

export default Index;
