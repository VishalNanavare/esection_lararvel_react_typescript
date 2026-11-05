import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';

interface StudentItem {
    id: number;
    form_number: string;
    registration_no?: string | null;
    student_name: string;
    email?: string | null;
    mobile?: string | null;
    gender?: string | null;
    photo_url?: string | null;
    signature_url?: string | null;
    academic_year_id?: number | null;
    academic_year_label?: string | null;
    course_id?: number | null;
    applied_programme_name?: string | null;
    caste_category?: string | null;
    category_id?: string | null;
    family_income_code?: string | null;
    payment_status: string;
    admission_status: string;
    scholarship_status: string;
    not_processed_reason?: string | null;
    manual_recovery_amount?: string | number | null;
    total_fee: number;
    govt_expected_share: number;
    student_expected_share: number;
    admission_fee_paid: number;
    total_collected: number;
    balance_due: number;
    existing_system_status?: string | null;
    internal_remarks?: string | null;
    course?: { id: number; name: string } | null;
    academic_year?: { id: number; year_label: string } | null;
    document?: {
        id: number;
        caste_cert: boolean;
        caste_validity: boolean;
        income_cert: boolean;
        domicile_cert: boolean;
        prev_marksheet: boolean;
        bank_aadhaar_linked: boolean;
        verified_by?: string | null;
        verified_at?: string | null;
        remarks?: string | null;
    } | null;
    installments?: Array<{
        id?: number;
        installment_no: number;
        amount: number;
        status: string;
        paid_date?: string | null;
        reference_no?: string | null;
        remarks?: string | null;
    }>;
}

interface SummaryCounts {
    total_students: number;
    pending_docs: number;
    docs_verified: number;
    fully_settled: number;
    not_processed: number;
    cancelled: number;
}

interface Props {
    students: {
        data: StudentItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    summary: SummaryCounts;
    filters: {
        academic_year_id?: string;
        course_id?: string;
        caste_category?: string;
        scholarship_status?: string;
        search?: string;
    };
    academicYears: Array<{ id: number; year_label: string }>;
    courses: Array<{ id: number; name: string }>;
    categories: string[];
}

export default function ScholarshipIndex({
    students,
    summary,
    filters,
    academicYears,
    courses,
    categories,
}: Props) {
    const [filterState, setFilterState] = useState(filters);
    const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
    const [modalTab, setModalTab] = useState<'docs' | 'installments' | 'recovery'>('docs');
    const [saving, setSaving] = useState(false);

    // Document state in modal
    const [docState, setDocState] = useState({
        caste_cert: false,
        caste_validity: false,
        income_cert: false,
        domicile_cert: false,
        prev_marksheet: false,
        bank_aadhaar_linked: false,
        remarks: '',
    });

    // Installments repeater state
    const [installments, setInstallments] = useState<Array<{
        installment_no: number;
        amount: number;
        status: string;
        paid_date: string;
        reference_no: string;
        remarks: string;
    }>>([]);

    // Recovery notice state
    const [recoveryReason, setRecoveryReason] = useState('');
    const [manualRecoveryAmount, setManualRecoveryAmount] = useState<number | string>('');

    const applyFilters = (newFilters: typeof filterState) => {
        router.get('/scholarship', newFilters, { preserveState: true, replace: true });
    };

    const handleFilterChange = (key: string, value: string) => {
        const updated = { ...filterState, [key]: value };
        setFilterState(updated);
        applyFilters(updated);
    };

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedStudent) {
                setSelectedStudent(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedStudent]);

    const openStudentModal = (student: StudentItem) => {
        setSelectedStudent(student);
        setModalTab('docs');

        // Init docs
        setDocState({
            caste_cert: !!student.document?.caste_cert,
            caste_validity: !!student.document?.caste_validity,
            income_cert: !!student.document?.income_cert,
            domicile_cert: !!student.document?.domicile_cert,
            prev_marksheet: !!student.document?.prev_marksheet,
            bank_aadhaar_linked: !!student.document?.bank_aadhaar_linked,
            remarks: student.document?.remarks || '',
        });

        // Init installments repeater (default 2 rows if empty)
        if (student.installments && student.installments.length > 0) {
            setInstallments(student.installments.map(i => ({
                installment_no: i.installment_no,
                amount: Number(i.amount) || 0,
                status: i.status || 'unpaid',
                paid_date: i.paid_date || '',
                reference_no: i.reference_no || '',
                remarks: i.remarks || '',
            })));
        } else {
            setInstallments([
                { installment_no: 1, amount: 0, status: 'unpaid', paid_date: '', reference_no: '', remarks: '' },
                { installment_no: 2, amount: 0, status: 'unpaid', paid_date: '', reference_no: '', remarks: '' },
            ]);
        }

        // Init recovery form
        setRecoveryReason(student.not_processed_reason || '');
        setManualRecoveryAmount(student.manual_recovery_amount ?? student.balance_due);
    };

    const saveDocuments = async () => {
        if (!selectedStudent) return;
        setSaving(true);
        try {
            const res = await fetch(`/scholarship/student/${selectedStudent.id}/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify(docState),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Checklist Saved',
                    text: 'Document submission checklist has been updated.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2500,
                });
                setSelectedStudent(data.student);
                router.reload({ only: ['students', 'summary'] });
            }
        } catch {
            Swal.fire('Error', 'Failed to save document checklist.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addInstallmentRow = () => {
        const nextNo = installments.length + 1;
        setInstallments([...installments, {
            installment_no: nextNo,
            amount: 0,
            status: 'unpaid',
            paid_date: '',
            reference_no: '',
            remarks: '',
        }]);
    };

    const saveInstallments = async () => {
        if (!selectedStudent) return;
        setSaving(true);
        try {
            const res = await fetch(`/scholarship/student/${selectedStudent.id}/installments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ installments }),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Financials Recalculated',
                    text: 'Installments saved and balance recalculated.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2500,
                });
                setSelectedStudent(data.student);
                router.reload({ only: ['students', 'summary'] });
            }
        } catch {
            Swal.fire('Error', 'Failed to save installments.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const markAsNotProcessed = async () => {
        if (!selectedStudent) return;
        if (!recoveryReason.trim()) {
            Swal.fire('Required', 'Please enter a reason why the scholarship was not processed.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/scholarship/student/${selectedStudent.id}/not-processed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    reason: recoveryReason,
                    manual_recovery_amount: manualRecoveryAmount ? Number(manualRecoveryAmount) : null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Status Updated',
                    text: 'Student marked as Scholarship Not Processed.',
                });
                setSelectedStudent(data.student);
                router.reload({ only: ['students', 'summary'] });
            }
        } catch {
            Swal.fire('Error', 'Failed to update student status.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const downloadDemandLetter = () => {
        if (!selectedStudent) return;
        const url = `/scholarship/student/${selectedStudent.id}/demand-letter?manual_amount=${manualRecoveryAmount || ''}&reason=${encodeURIComponent(recoveryReason || '')}`;
        window.open(url, '_blank');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'docs_verified':
                return <span className="badge bg-info text-dark"><i className="fa fa-check-circle me-1"></i>Docs Verified</span>;
            case 'fully_settled':
                return <span className="badge bg-success"><i className="fa fa-check-double me-1"></i>Fully Settled (100%)</span>;
            case 'not_processed':
                return <span className="badge bg-danger"><i className="fa fa-exclamation-triangle me-1"></i>Not Processed / Due</span>;
            case 'cancelled':
                return <span className="badge bg-secondary"><i className="fa fa-ban me-1"></i>Admission Cancelled</span>;
            default:
                return <span className="badge bg-warning text-dark"><i className="fa fa-clock-o me-1"></i>Pending Docs</span>;
        }
    };

    return (
        <AppLayout title="Scholarship Management">
            <div className="container-fluid px-3 px-md-4 py-4">
                {/* Header Banner */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 className="fw-bold mb-1 text-dark">
                            <i className="fa fa-id-card-o text-primary me-2"></i>
                            Scholarship & Eligibility Management
                        </h3>
                        <p className="text-muted small mb-0">
                            Track student admission data, verify documents, monitor installments, and ensure 100% course fee recovery.
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <Link href="/scholarship/import" className="btn btn-outline-success">
                            <i className="fa fa-upload me-1"></i>
                            Import Admission Excel
                        </Link>
                        <Link href="/scholarship/fees" className="btn btn-outline-primary">
                            <i className="fa fa-cog me-1"></i>
                            Fee Reference Master
                        </Link>
                    </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-6 col-md-2">
                        <div className="card shadow-sm border-0 border-start border-primary border-4 p-3">
                            <div className="text-muted small text-uppercase fw-semibold">Total Admitted</div>
                            <h4 className="fw-bold text-dark mb-0">{summary.total_students.toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="col-6 col-md-2">
                        <div className="card shadow-sm border-0 border-start border-warning border-4 p-3">
                            <div className="text-muted small text-uppercase fw-semibold">Pending Docs</div>
                            <h4 className="fw-bold text-warning mb-0">{summary.pending_docs.toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="col-6 col-md-2">
                        <div className="card shadow-sm border-0 border-start border-info border-4 p-3">
                            <div className="text-muted small text-uppercase fw-semibold">Docs Verified</div>
                            <h4 className="fw-bold text-info mb-0">{summary.docs_verified.toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="col-6 col-md-2">
                        <div className="card shadow-sm border-0 border-start border-success border-4 p-3">
                            <div className="text-muted small text-uppercase fw-semibold">Fully Settled</div>
                            <h4 className="fw-bold text-success mb-0">{summary.fully_settled.toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="col-6 col-md-2">
                        <div className="card shadow-sm border-0 border-start border-danger border-4 p-3">
                            <div className="text-muted small text-uppercase fw-semibold">Not Processed</div>
                            <h4 className="fw-bold text-danger mb-0">{summary.not_processed.toLocaleString()}</h4>
                        </div>
                    </div>
                    <div className="col-6 col-md-2">
                        <div className="card shadow-sm border-0 border-start border-secondary border-4 p-3">
                            <div className="text-muted small text-uppercase fw-semibold">Cancelled</div>
                            <h4 className="fw-bold text-secondary mb-0">{summary.cancelled.toLocaleString()}</h4>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-3">
                        <div className="row g-2 align-items-center">
                            <div className="col-md-3">
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text bg-white"><i className="fa fa-search text-muted"></i></span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search by Name, Form No, Mobile..."
                                        value={filterState.search || ''}
                                        onChange={(e) => setFilterState({ ...filterState, search: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && applyFilters(filterState)}
                                    />
                                </div>
                            </div>
                            <div className="col-md-2">
                                <select
                                    className="form-select form-select-sm"
                                    value={filterState.academic_year_id || ''}
                                    onChange={(e) => handleFilterChange('academic_year_id', e.target.value)}
                                >
                                    <option value="">All Academic Years</option>
                                    {academicYears.map((ay) => (
                                        <option key={ay.id} value={ay.id}>{ay.year_label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <select
                                    className="form-select form-select-sm"
                                    value={filterState.course_id || ''}
                                    onChange={(e) => handleFilterChange('course_id', e.target.value)}
                                >
                                    <option value="">All Courses</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <select
                                    className="form-select form-select-sm"
                                    value={filterState.caste_category || ''}
                                    onChange={(e) => handleFilterChange('caste_category', e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <select
                                    className="form-select form-select-sm"
                                    value={filterState.scholarship_status || ''}
                                    onChange={(e) => handleFilterChange('scholarship_status', e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending_docs">Pending Docs</option>
                                    <option value="docs_verified">Docs Verified</option>
                                    <option value="fully_settled">Fully Settled (100%)</option>
                                    <option value="not_processed">Not Processed / Due</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="col-md-1">
                                <button
                                    className="btn btn-sm btn-outline-secondary w-100"
                                    onClick={() => {
                                        setFilterState({});
                                        applyFilters({});
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students Data Table */}
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light text-uppercase small text-muted">
                                <tr>
                                    <th style={{ width: '50px' }}>Photo</th>
                                    <th>Form No / Reg</th>
                                    <th>Student Name & Contact</th>
                                    <th>Course & Year</th>
                                    <th>Category</th>
                                    <th>E-Section History</th>
                                    <th>Docs (6)</th>
                                    <th>Financial Ledger</th>
                                    <th>Status</th>
                                    <th className="text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-5 text-muted">
                                            <i className="fa fa-folder-open-o fa-3x mb-3 text-muted"></i>
                                            <p className="mb-0">No scholarship records found matching your filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    students.data.map((s) => {
                                        const docCount = (s.document?.caste_cert ? 1 : 0) +
                                                         (s.document?.caste_validity ? 1 : 0) +
                                                         (s.document?.income_cert ? 1 : 0) +
                                                         (s.document?.domicile_cert ? 1 : 0) +
                                                         (s.document?.prev_marksheet ? 1 : 0) +
                                                         (s.document?.bank_aadhaar_linked ? 1 : 0);

                                        return (
                                            <tr key={s.id}>
                                                <td>
                                                    {s.photo_url ? (
                                                        <img
                                                            src={s.photo_url}
                                                            alt={s.student_name}
                                                            className="rounded-circle"
                                                            style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                                                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="rounded-circle bg-light text-muted d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                                            <i className="fa fa-user"></i>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-dark font-monospace">{s.form_number}</span>
                                                    {s.registration_no && (
                                                        <div className="small text-muted font-monospace">Reg: #{s.registration_no}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-dark">{s.student_name}</div>
                                                    <div className="small text-muted">
                                                        <i className="fa fa-phone me-1"></i>{s.mobile || 'N/A'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fw-medium text-dark">{s.course?.name || s.applied_programme_name}</div>
                                                    <span className="badge bg-light text-muted border">{s.academic_year_label || '2026-2027'}</span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary text-uppercase">{s.caste_category || 'General'}</span>
                                                </td>
                                                <td>
                                                    {s.existing_system_status ? (
                                                        <span className="badge bg-warning text-dark text-wrap" style={{ maxWidth: '180px' }} title={s.existing_system_status}>
                                                            <i className="fa fa-history me-1"></i>{s.existing_system_status}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted small">None</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${docCount === 6 ? 'bg-success' : docCount > 0 ? 'bg-warning text-dark' : 'bg-light text-muted border'}`}>
                                                        {docCount}/6 Ticked
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="small">
                                                        <strong>Fee:</strong> ₹{Number(s.total_fee).toLocaleString()}
                                                    </div>
                                                    <div className="small text-success">
                                                        <strong>Paid:</strong> ₹{Number(s.total_collected).toLocaleString()}
                                                    </div>
                                                    {Number(s.balance_due) > 0 ? (
                                                        <div className="small text-danger fw-bold">
                                                            <strong>Due:</strong> ₹{Number(s.balance_due).toLocaleString()}
                                                        </div>
                                                    ) : (
                                                        <div className="small text-success fw-bold">✓ Settled</div>
                                                    )}
                                                </td>
                                                <td>{getStatusBadge(s.scholarship_status)}</td>
                                                <td className="text-end">
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => openStudentModal(s)}
                                                    >
                                                        <i className="fa fa-pencil-square-o me-1"></i>
                                                        Review
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {students.total > 25 && (
                        <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
                            <span className="small text-muted">
                                Showing <strong>{students.data.length}</strong> of <strong>{students.total.toLocaleString()}</strong> applicants
                            </span>
                            <nav>
                                <ul className="pagination pagination-sm mb-0">
                                    {students.links.map((link, idx) => (
                                        <li key={idx} className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}>
                                            <Link
                                                href={link.url || '#'}
                                                className="page-link"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                preserveState
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>

                {/* Full-Screen Student Review & Financial Settlement Enterprise Modal mounted to document.body */}
                {selectedStudent && typeof document !== 'undefined' && createPortal(
                    <div
                        className="modal fade show d-block p-0"
                        tabIndex={-1}
                        role="dialog"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'rgba(15, 23, 42, 0.65)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 2050,
                            overflow: 'hidden',
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedStudent(null);
                        }}
                    >
                        <div className="h-100 w-100 d-flex flex-column m-0 p-0" style={{ background: '#f8fafc' }}>
                                {/* Top Enterprise Navigation Bar */}
                                <div className="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between flex-shrink-0 shadow-sm">
                                    <div className="d-flex align-items-center gap-3">
                                        {selectedStudent.photo_url ? (
                                            <img
                                                src={selectedStudent.photo_url}
                                                alt={selectedStudent.student_name}
                                                className="rounded-circle border border-2 border-indigo"
                                                style={{ width: '46px', height: '46px', objectFit: 'cover' }}
                                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div
                                                className="brand-mark bg-indigo bg-opacity-10 text-indigo rounded-3 d-flex align-items-center justify-content-center"
                                                style={{ width: '46px', height: '46px' }}
                                            >
                                                <i className="fa fa-user fa-lg"></i>
                                            </div>
                                        )}
                                        <div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <h5 className="fw-bold text-dark mb-0">
                                                    {selectedStudent.student_name}
                                                </h5>
                                                <span className="badge bg-light text-dark border font-monospace">
                                                    Form #{selectedStudent.form_number}
                                                </span>
                                                <span className="badge badge-glass-indigo text-uppercase">
                                                    {selectedStudent.caste_category || 'General'}
                                                </span>
                                                {selectedStudent.course && (
                                                    <span className="badge bg-light text-dark border">
                                                        {selectedStudent.course.name}
                                                    </span>
                                                )}
                                                {selectedStudent.existing_system_status && (
                                                    <span className="badge badge-glass-amber">
                                                        <i className="fa fa-history me-1"></i>
                                                        System Match: {selectedStudent.existing_system_status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted small mt-1">
                                                <span><i className="fa fa-phone me-1"></i>{selectedStudent.mobile || 'N/A'}</span>
                                                <span className="mx-2">&bull;</span>
                                                <span><i className="fa fa-envelope-o me-1"></i>{selectedStudent.email || 'N/A'}</span>
                                                <span className="mx-2">&bull;</span>
                                                <span>Year: {selectedStudent.academic_year_label || '2026-2027'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Actions & Close */}
                                    <div className="d-flex align-items-center gap-3">
                                        <span className="text-muted small d-none d-md-inline-block">
                                            Press <kbd className="bg-light text-muted border px-2 py-1 rounded small">ESC</kbd> to exit
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-glass rounded-circle"
                                            style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            aria-label="Close"
                                            onClick={() => setSelectedStudent(null)}
                                        >
                                            <i className="fa fa-times text-muted"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Horizontal Subbar with Navigation Tabs */}
                                <div className="bg-white border-bottom px-4 py-2 flex-shrink-0">
                                    <ul className="nav nav-pills gap-2">
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link py-2 px-3 fw-semibold ${modalTab === 'docs' ? 'btn-indigo text-white' : 'btn-glass text-secondary'}`}
                                                style={{ borderRadius: '0.5rem' }}
                                                onClick={() => setModalTab('docs')}
                                            >
                                                <i className="fa fa-check-square-o me-2"></i>
                                                1. Document Checklist (6 Mandatory Ticks)
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link py-2 px-3 fw-semibold ${modalTab === 'installments' ? 'btn-indigo text-white' : 'btn-glass text-secondary'}`}
                                                style={{ borderRadius: '0.5rem' }}
                                                onClick={() => setModalTab('installments')}
                                            >
                                                <i className="fa fa-money me-2"></i>
                                                2. Installments &amp; Financial Ledger
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link py-2 px-3 fw-semibold ${modalTab === 'recovery' ? 'btn-indigo text-white' : 'btn-glass text-secondary'}`}
                                                style={{ borderRadius: '0.5rem' }}
                                                onClick={() => setModalTab('recovery')}
                                            >
                                                <i className="fa fa-file-pdf-o me-2"></i>
                                                3. Scholarship Not Processed &amp; Fee Demand Notice
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                {/* Modal Body (Full Screen Responsive Content) */}
                                <div className="flex-grow-1 overflow-y-auto px-4 px-xl-5 py-4">
                                    {/* Cross System Match Warning Banner */}
                                    {selectedStudent.existing_system_status && (
                                        <div className="alert bg-amber bg-opacity-10 border-amber border-opacity-25 text-dark d-flex align-items-center gap-3 p-3 mb-4 rounded-3">
                                            <i className="fa fa-info-circle fa-2x text-amber flex-shrink-0"></i>
                                            <div>
                                                <strong className="text-amber">Cross-System Record Match Detected:</strong>
                                                <div className="small text-muted">{selectedStudent.existing_system_status}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 1: Documents Checklist */}
                                    {modalTab === 'docs' && (
                                        <div className="row g-4">
                                            <div className="col-lg-7">
                                                <div className="glass-card p-4 h-100">
                                                    <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                                                        <i className="fa fa-check-circle text-indigo me-2"></i>
                                                        Verify Physical &amp; Digital Submitted Documents (6 Checklist Items)
                                                    </h6>
                                                    <p className="text-muted small mb-4">
                                                        Check off verified original/attested documents submitted by the candidate for MahaDBT compliance.
                                                    </p>

                                                    <div className="p-3 bg-light rounded-3 mb-3 border">
                                                        <div className="form-check form-switch mb-3">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="doc_caste"
                                                                checked={docState.caste_cert}
                                                                onChange={(e) => setDocState({ ...docState, caste_cert: e.target.checked })}
                                                            />
                                                            <label className="form-check-label fw-semibold text-dark ms-2" htmlFor="doc_caste">
                                                                1. Caste Certificate (जात प्रमाणपत्र)
                                                            </label>
                                                            <div className="form-text small text-muted ms-4">Mandatory for SC, ST, VJNT, NT-B, NT-C, NT-D, SBC, OBC, SEBC categories.</div>
                                                        </div>

                                                        <div className="form-check form-switch mb-3">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="doc_validity"
                                                                checked={docState.caste_validity}
                                                                onChange={(e) => setDocState({ ...docState, caste_validity: e.target.checked })}
                                                            />
                                                            <label className="form-check-label fw-semibold text-dark ms-2" htmlFor="doc_validity">
                                                                2. Caste Validity Certificate (जात वैधता प्रमाणपत्र)
                                                            </label>
                                                            <div className="form-text small text-muted ms-4">Issued by Divisional Caste Scrutiny Committee.</div>
                                                        </div>

                                                        <div className="form-check form-switch mb-3">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="doc_income"
                                                                checked={docState.income_cert}
                                                                onChange={(e) => setDocState({ ...docState, income_cert: e.target.checked })}
                                                            />
                                                            <label className="form-check-label fw-semibold text-dark ms-2" htmlFor="doc_income">
                                                                3. Income Certificate (उत्पन्नाचा दाखला - Tahsildar)
                                                            </label>
                                                            <div className="form-text small text-muted ms-4">Valid revenue officer income certificate for the current financial year.</div>
                                                        </div>

                                                        <div className="form-check form-switch mb-3">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="doc_domicile"
                                                                checked={docState.domicile_cert}
                                                                onChange={(e) => setDocState({ ...docState, domicile_cert: e.target.checked })}
                                                            />
                                                            <label className="form-check-label fw-semibold text-dark ms-2" htmlFor="doc_domicile">
                                                                4. Domicile Certificate (महाराष्ट्र अधिवास प्रमाणपत्र)
                                                            </label>
                                                            <div className="form-text small text-muted ms-4">Proof of 15 years domicile in Maharashtra state.</div>
                                                        </div>

                                                        <div className="form-check form-switch mb-3">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="doc_prev"
                                                                checked={docState.prev_marksheet}
                                                                onChange={(e) => setDocState({ ...docState, prev_marksheet: e.target.checked })}
                                                            />
                                                            <label className="form-check-label fw-semibold text-dark ms-2" htmlFor="doc_prev">
                                                                5. Previous Year Marksheet (मागील वर्षाची गुणपत्रिका)
                                                            </label>
                                                            <div className="form-text small text-muted ms-4">HSC / Previous semester marksheet verifying academic eligibility.</div>
                                                        </div>

                                                        <div className="form-check form-switch mb-1">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="doc_aadhaar"
                                                                checked={docState.bank_aadhaar_linked}
                                                                onChange={(e) => setDocState({ ...docState, bank_aadhaar_linked: e.target.checked })}
                                                            />
                                                            <label className="form-check-label fw-semibold text-dark ms-2" htmlFor="doc_aadhaar">
                                                                6. Bank Account Passbook / Aadhaar Seeded DBT Status
                                                            </label>
                                                            <div className="form-text small text-muted ms-4">NPCI Aadhaar mapping confirmed for direct DBT scholarship transfer.</div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4">
                                                        <label className="form-label fw-semibold small text-dark">Clerk Scrutiny Remarks:</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows={3}
                                                            placeholder="Add any verification notes, discrepancy warnings, or pending document submission deadlines..."
                                                            value={docState.remarks}
                                                            onChange={(e) => setDocState({ ...docState, remarks: e.target.value })}
                                                        ></textarea>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="btn btn-indigo px-4"
                                                        onClick={saveDocuments}
                                                        disabled={saving}
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa fa-save me-1"></i> Save Document Checklist
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="col-lg-5">
                                                <div className="glass-card p-4 h-100">
                                                    <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                                                        <i className="fa fa-user-circle text-indigo me-2"></i>
                                                        Candidate Admissions Profile
                                                    </h6>
                                                    <ul className="list-group list-group-flush small">
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Primary Mobile:</span>
                                                            <span className="fw-semibold text-dark">{selectedStudent.mobile || 'N/A'}</span>
                                                        </li>
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Alternate Mobile:</span>
                                                            <span>{selectedStudent.alternate_mobile || 'N/A'}</span>
                                                        </li>
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Email ID:</span>
                                                            <span className="text-break">{selectedStudent.email || 'N/A'}</span>
                                                        </li>
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Date of Birth:</span>
                                                            <span>{selectedStudent.dob || 'N/A'}</span>
                                                        </li>
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Gender:</span>
                                                            <span className="text-capitalize">{selectedStudent.gender || 'N/A'}</span>
                                                        </li>
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Family Income Bracket:</span>
                                                            <span className="badge bg-light text-dark border">
                                                                Category Code #{selectedStudent.family_income_code || 'N/A'}
                                                            </span>
                                                        </li>
                                                        <li className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                                            <span className="text-muted">Admission Fee Paid on Portal:</span>
                                                            <span className="fw-bold text-emerald">₹{Number(selectedStudent.admission_fee_paid).toLocaleString()}</span>
                                                        </li>
                                                    </ul>

                                                    <div className="mt-4 p-3 rounded-3" style={{ background: '#f1f5f9' }}>
                                                        <div className="small fw-semibold text-dark mb-1">
                                                            <i className="fa fa-info-circle text-indigo me-1"></i> Document Checklist Rule:
                                                        </div>
                                                        <div className="small text-muted">
                                                            When all 6 documents are verified and ticked, the student status automatically transitions to <strong>Documents Verified</strong> and becomes eligible for installment disbursement reconciliation.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 2: Installments Repeater & Financial Ledger */}
                                    {modalTab === 'installments' && (
                                        <div>
                                            <div className="row g-3 mb-4">
                                                <div className="col-md-3">
                                                    <div className="glass-card p-3 text-center">
                                                        <div className="text-muted small text-uppercase fw-semibold">Total Prescribed Fee</div>
                                                        <h3 className="fw-bold text-dark mb-0 mt-1">₹{Number(selectedStudent.total_fee).toLocaleString()}</h3>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="glass-card p-3 text-center">
                                                        <div className="text-muted small text-uppercase fw-semibold">Admission Token Paid</div>
                                                        <h3 className="fw-bold text-indigo mb-0 mt-1">₹{Number(selectedStudent.admission_fee_paid).toLocaleString()}</h3>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="glass-card p-3 text-center">
                                                        <div className="text-muted small text-uppercase fw-semibold">Total Money Collected</div>
                                                        <h3 className="fw-bold text-emerald mb-0 mt-1">₹{Number(selectedStudent.total_collected).toLocaleString()}</h3>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className={`glass-card p-3 text-center ${Number(selectedStudent.balance_due) > 0 ? 'border-danger' : 'border-success'}`}>
                                                        <div className="text-muted small text-uppercase fw-semibold">Outstanding Balance Due</div>
                                                        <h3 className={`fw-bold mb-0 mt-1 ${Number(selectedStudent.balance_due) > 0 ? 'text-danger' : 'text-emerald'}`}>
                                                            ₹{Number(selectedStudent.balance_due).toLocaleString()}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Repeater Table */}
                                            <div className="glass-card mb-4 overflow-hidden">
                                                <div className="px-4 py-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="fw-bold mb-0 text-dark">
                                                            <i className="fa fa-list-ol text-indigo me-2"></i>
                                                            Scholarship Installments &amp; Receipt Tracking
                                                        </h6>
                                                        <div className="text-muted small">Record installment receipts disbursed from MahaDBT or collected directly from student.</div>
                                                    </div>
                                                    <button className="btn btn-sm btn-glass text-indigo" onClick={addInstallmentRow}>
                                                        <i className="fa fa-plus me-1"></i> Add Installment
                                                    </button>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle mb-0">
                                                        <thead className="table-light small text-uppercase text-muted">
                                                            <tr>
                                                                <th style={{ width: '90px' }}>Installment</th>
                                                                <th style={{ width: '160px' }}>Amount (₹)</th>
                                                                <th style={{ width: '180px' }}>Status</th>
                                                                <th style={{ width: '160px' }}>Payment Date</th>
                                                                <th style={{ width: '180px' }}>UTR / Reference No</th>
                                                                <th>Remarks</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {installments.map((inst, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="fw-bold text-center">
                                                                        <span className="badge badge-glass-indigo">#{inst.installment_no}</span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="input-group input-group-sm">
                                                                            <span className="input-group-text bg-white fw-bold">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                className="form-control form-control-sm fw-semibold"
                                                                                value={inst.amount}
                                                                                onChange={(e) => {
                                                                                    const updated = [...installments];
                                                                                    updated[idx].amount = Number(e.target.value);
                                                                                    setInstallments(updated);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <select
                                                                            className="form-select form-select-sm"
                                                                            value={inst.status}
                                                                            onChange={(e) => {
                                                                                const updated = [...installments];
                                                                                updated[idx].status = e.target.value;
                                                                                setInstallments(updated);
                                                                            }}
                                                                        >
                                                                            <option value="paid_done">✓ Paid Done</option>
                                                                            <option value="unpaid">Unpaid</option>
                                                                            <option value="no_response">No Response</option>
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="date"
                                                                            className="form-control form-control-sm"
                                                                            value={inst.paid_date}
                                                                            onChange={(e) => {
                                                                                const updated = [...installments];
                                                                                updated[idx].paid_date = e.target.value;
                                                                                setInstallments(updated);
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder="e.g. UTR / NEFT / Voucher"
                                                                            value={inst.reference_no}
                                                                            onChange={(e) => {
                                                                                const updated = [...installments];
                                                                                updated[idx].reference_no = e.target.value;
                                                                                setInstallments(updated);
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            placeholder="Govt scheme voucher notes"
                                                                            value={inst.remarks}
                                                                            onChange={(e) => {
                                                                                const updated = [...installments];
                                                                                updated[idx].remarks = e.target.value;
                                                                                setInstallments(updated);
                                                                            }}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn-indigo px-4"
                                                onClick={saveInstallments}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Recalculating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-calculator me-1"></i> Save Installments &amp; Recalculate Balance
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* Tab 3: Scholarship Not Processed & Recovery Letter */}
                                    {modalTab === 'recovery' && (
                                        <div className="glass-card p-4 border-danger border-opacity-25">
                                            <div className="d-flex align-items-center gap-3 mb-4">
                                                <div className="brand-mark bg-danger bg-opacity-10 text-danger rounded-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                                                    <i className="fa fa-exclamation-triangle fa-lg"></i>
                                                </div>
                                                <div>
                                                    <h5 className="fw-bold text-danger mb-0">Scholarship Failure &amp; Remaining Fee Demand Recovery</h5>
                                                    <p className="text-muted small mb-0">
                                                        If a scholarship cannot be disbursed (invalid caste validity, non-submission, rejection by MahaDBT portal), issue an official recovery notice for the full remaining fee.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="row g-4 mb-4">
                                                <div className="col-lg-8">
                                                    <label className="form-label fw-semibold small text-dark">
                                                        Official Reason for Scholarship Non-Processing / Portal Rejection: <span className="text-danger">*</span>
                                                    </label>
                                                    <textarea
                                                        className="form-control"
                                                        rows={4}
                                                        placeholder="e.g., Non-submission of Caste Validity Certificate within statutory deadline; Application rejected on MahaDBT due to family income exceeding scheme ceiling; Student failed to complete Aadhaar biometric authentication..."
                                                        value={recoveryReason}
                                                        onChange={(e) => setRecoveryReason(e.target.value)}
                                                    ></textarea>
                                                </div>
                                                <div className="col-lg-4">
                                                    <label className="form-label fw-semibold small text-dark">
                                                        Manual Outstanding Fee to Recover (₹):
                                                    </label>
                                                    <div className="input-group input-group-lg">
                                                        <span className="input-group-text bg-white fw-bold text-danger">₹</span>
                                                        <input
                                                            type="number"
                                                            className="form-control fw-bold text-danger"
                                                            value={manualRecoveryAmount}
                                                            onChange={(e) => setManualRecoveryAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-text small text-muted mt-2">
                                                        Auto-defaults to current outstanding institutional balance (₹{Number(selectedStudent.balance_due).toLocaleString()}).
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="d-flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-danger px-4"
                                                    onClick={markAsNotProcessed}
                                                    disabled={saving}
                                                >
                                                    <i className="fa fa-times-circle me-1"></i> Mark as: Scholarship Not Processed
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-glass text-dark px-4"
                                                    onClick={downloadDemandLetter}
                                                >
                                                    <i className="fa fa-file-pdf-o me-2 text-danger"></i> Generate &amp; Download Demand Letter (PDF)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Pinned Bottom Action Toolbar */}
                                <div className="bg-white border-top px-4 py-3 d-flex align-items-center justify-content-between flex-shrink-0 shadow-lg">
                                    <div className="small text-muted">
                                        Reviewing Candidate: <strong className="text-dark">{selectedStudent.student_name}</strong> &bull; Total Prescribed Fee: ₹{Number(selectedStudent.total_fee).toLocaleString()} &bull; Balance Due: <strong className={Number(selectedStudent.balance_due) > 0 ? 'text-danger' : 'text-emerald'}>₹{Number(selectedStudent.balance_due).toLocaleString()}</strong>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-glass px-4"
                                        onClick={() => setSelectedStudent(null)}
                                    >
                                        Close Window
                                    </button>
                                </div>
                            </div>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}
