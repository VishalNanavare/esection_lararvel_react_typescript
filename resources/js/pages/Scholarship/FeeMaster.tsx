import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, router, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';

interface FeeMasterItem {
    id: number;
    academic_year_id: number;
    course_id: number;
    caste_category: string;
    total_college_fee: number;
    govt_share_amount: number;
    student_share_amount: number;
    admission_token_amount: number;
    remarks?: string | null;
    academic_year?: { id: number; year_label: string; is_current?: boolean };
    course?: { id: number; name: string };
}

interface AcademicYearOption {
    id: number;
    year_label: string;
    is_current?: boolean;
}

interface Props {
    feeMasters: FeeMasterItem[];
    academicYears: AcademicYearOption[];
    courses: Array<{ id: number; name: string }>;
    categories: string[];
    filters: {
        academic_year_id?: string;
        course_id?: string;
    };
}

export default function ScholarshipFeeMasterPage({
    feeMasters,
    academicYears,
    courses,
    categories,
    filters,
}: Props) {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Default to the current academic year if available
    const defaultYearId = academicYears.find((ay) => ay.is_current)?.id || academicYears[0]?.id || '';
    const defaultCourseId = courses[0]?.id || '';

    const { data, setData, post, processing, errors, reset } = useForm({
        academic_year_id: defaultYearId,
        course_id: defaultCourseId,
        caste_category: categories[0] || 'SC',
        total_college_fee: '',
        govt_share_amount: '',
        student_share_amount: '',
        admission_token_amount: '0',
        remarks: '',
    });

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showModal) {
                setShowModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal]);

    const openAddModal = () => {
        setEditingId(null);
        reset();
        setData({
            academic_year_id: defaultYearId,
            course_id: defaultCourseId,
            caste_category: categories[0] || 'SC',
            total_college_fee: '',
            govt_share_amount: '',
            student_share_amount: '',
            admission_token_amount: '0',
            remarks: '',
        });
        setShowModal(true);
    };

    const openEditModal = (fm: FeeMasterItem) => {
        setEditingId(fm.id);
        setData({
            academic_year_id: fm.academic_year_id,
            course_id: fm.course_id,
            caste_category: fm.caste_category,
            total_college_fee: String(fm.total_college_fee),
            govt_share_amount: String(fm.govt_share_amount),
            student_share_amount: String(fm.student_share_amount),
            admission_token_amount: String(fm.admission_token_amount || 0),
            remarks: fm.remarks || '',
        });
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/scholarship/fees', {
            onSuccess: () => {
                setShowModal(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: editingId ? 'Rule Updated' : 'Rule Created',
                    text: 'Scholarship fee structure rule saved successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    const handleDelete = (id: number) => {
        Swal.fire({
            title: 'Delete Rule?',
            text: 'Are you sure you want to delete this fee structure rule?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Cancel',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(`/scholarship/fees/${id}`, {
                    onSuccess: () => {
                        Swal.fire('Deleted', 'Fee structure rule removed.', 'success');
                    },
                });
            }
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        router.get('/scholarship/fees', { ...filters, [key]: value }, { preserveState: true });
    };

    // Live financial computations
    const totalFee = parseFloat(String(data.total_college_fee)) || 0;
    const govtShare = parseFloat(String(data.govt_share_amount)) || 0;
    const studentShare = parseFloat(String(data.student_share_amount)) || 0;
    const tokenFee = parseFloat(String(data.admission_token_amount)) || 0;
    const sumShares = govtShare + studentShare;
    const diff = totalFee - sumShares;
    const isBalanced = totalFee > 0 && Math.abs(diff) < 0.01;

    const autoBalanceStudentShare = () => {
        const remaining = Math.max(0, totalFee - govtShare);
        setData('student_share_amount', String(remaining));
    };

    const autoBalanceGovtShare = () => {
        const remaining = Math.max(0, totalFee - studentShare);
        setData('govt_share_amount', String(remaining));
    };

    const selectedCourse = courses.find((c) => String(c.id) === String(data.course_id));
    const selectedYear = academicYears.find((ay) => String(ay.id) === String(data.academic_year_id));

    const remarkPresets = [
        '100% Tuition waiver by Social Welfare Dept; Exam fees payable by student.',
        '50% Tuition fee concession for OBC / SEBC category under MahaDBT.',
        'Post-Matric Scholarship Scheme for SC/ST candidates; 100% Govt share.',
        'Tribal Development Department Freeship Scheme.',
        'No concession - General / Open category candidate.',
    ];

    return (
        <AppLayout title="Scholarship Fee Reference Settings">
            <div className="container-fluid px-3 px-md-4 py-4">
                {/* Header Banner */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 className="fw-bold mb-1 text-dark">
                            <i className="fa fa-cogs text-indigo me-2"></i>
                            Scholarship Fee Reference Master
                        </h3>
                        <p className="text-muted small mb-0">
                            Configure total college fees, government scholarship amounts, student payable shares, and concession rules by course and category.
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <Link href="/scholarship" className="btn btn-glass">
                            <i className="fa fa-arrow-left me-1"></i> Back to Roster
                        </Link>
                        <button className="btn btn-indigo" onClick={openAddModal}>
                            <i className="fa fa-plus me-1"></i> Add Fee Structure Rule
                        </button>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="glass-card mb-4">
                    <div className="card-body p-3">
                        <div className="row g-3 align-items-center">
                            <div className="col-md-5">
                                <label className="form-label small text-muted mb-1 fw-semibold">Filter by Academic Year:</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={filters.academic_year_id || ''}
                                    onChange={(e) => handleFilterChange('academic_year_id', e.target.value)}
                                >
                                    <option value="">All Academic Years</option>
                                    {academicYears.map((ay) => (
                                        <option key={ay.id} value={ay.id}>
                                            {ay.year_label} {ay.is_current ? '(Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-5">
                                <label className="form-label small text-muted mb-1 fw-semibold">Filter by Course:</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={filters.course_id || ''}
                                    onChange={(e) => handleFilterChange('course_id', e.target.value)}
                                >
                                    <option value="">All Courses</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2 d-flex align-items-end">
                                <button
                                    className="btn btn-sm btn-glass w-100"
                                    onClick={() => router.get('/scholarship/fees')}
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fee Rules Table */}
                <div className="glass-card overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small text-uppercase text-muted">
                                <tr>
                                    <th style={{ width: '130px' }} className="text-nowrap">Academic Year</th>
                                    <th style={{ minWidth: '160px' }}>Course</th>
                                    <th style={{ width: '130px' }}>Caste Category</th>
                                    <th style={{ width: '150px' }} className="text-end text-nowrap">Total Fee</th>
                                    <th style={{ width: '160px' }} className="text-end text-nowrap">Govt Share</th>
                                    <th style={{ width: '150px' }} className="text-end text-nowrap">Student Share</th>
                                    <th style={{ width: '120px' }} className="text-end text-nowrap">Token Fee</th>
                                    <th style={{ minWidth: '220px' }}>Settlement Remarks</th>
                                    <th style={{ width: '110px' }} className="text-end text-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feeMasters.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-5 text-muted">
                                            <i className="fa fa-folder-open-o fa-3x mb-2 text-muted"></i>
                                            <p className="mb-0">No fee structure rules defined yet. Click "Add Fee Structure Rule" above to create one.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    feeMasters.map((fm) => (
                                        <tr key={fm.id}>
                                            <td className="fw-medium text-nowrap">
                                                <span className="badge bg-light text-dark border">
                                                    {fm.academic_year?.year_label}
                                                </span>
                                            </td>
                                            <td className="fw-semibold text-dark">{fm.course?.name}</td>
                                            <td>
                                                <span className="badge badge-glass-indigo text-uppercase">{fm.caste_category}</span>
                                            </td>
                                            <td className="text-end fw-bold text-dark text-nowrap">₹ {Number(fm.total_college_fee).toLocaleString()}</td>
                                            <td className="text-end text-emerald fw-medium text-nowrap">₹ {Number(fm.govt_share_amount).toLocaleString()}</td>
                                            <td className="text-end text-indigo fw-medium text-nowrap">₹ {Number(fm.student_share_amount).toLocaleString()}</td>
                                            <td className="text-end text-muted text-nowrap">₹ {Number(fm.admission_token_amount).toLocaleString()}</td>
                                            <td className="small text-muted">{fm.remarks || '-'}</td>
                                            <td className="text-end text-nowrap">
                                                <button
                                                    className="btn btn-sm btn-glass me-1 text-indigo"
                                                    onClick={() => openEditModal(fm)}
                                                    title="Edit rule"
                                                >
                                                    <i className="fa fa-pencil"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-glass text-danger"
                                                    onClick={() => handleDelete(fm.id)}
                                                    title="Delete rule"
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
                </div>

                {/* Full-Screen Enterprise Modal mounted to document.body */}
                {showModal && typeof document !== 'undefined' && createPortal(
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
                            if (e.target === e.currentTarget) setShowModal(false);
                        }}
                    >
                        <div className="h-100 w-100 d-flex flex-column m-0 p-0" style={{ background: '#f8fafc' }}>
                                {/* Top Enterprise Navigation Bar */}
                                <div className="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between flex-shrink-0 shadow-sm">
                                    <div className="d-flex align-items-center gap-3">
                                        <div
                                            className="brand-mark bg-indigo bg-opacity-10 text-indigo rounded-3 d-flex align-items-center justify-content-center"
                                            style={{ width: '44px', height: '44px' }}
                                        >
                                            <i className={`fa ${editingId ? 'fa-pencil-square-o' : 'fa-plus-circle'} fa-lg`}></i>
                                        </div>
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <h5 className="fw-bold text-dark mb-0">
                                                    {editingId ? 'Update Scholarship Fee Structure Rule' : 'Add Scholarship Fee Structure Rule'}
                                                </h5>
                                                <span className={`badge ${editingId ? 'badge-glass-amber' : 'badge-glass-indigo'} text-uppercase small`}>
                                                    {editingId ? 'Edit Mode' : 'New Rule'}
                                                </span>
                                            </div>
                                            <div className="text-muted small">
                                                IDOL Accounts &bull; Course Prescribed Fee, MahaDBT Govt Share &amp; Student Share Reference Master
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
                                            onClick={() => setShowModal(false)}
                                        >
                                            <i className="fa fa-times text-muted"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Form Body (Full Screen Responsive 2-Column Utilization) */}
                                <form onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1 overflow-hidden m-0">
                                    <div className="flex-grow-1 overflow-y-auto px-4 px-xl-5 py-4">
                                        <div className="row g-4">
                                            {/* Left Column: Academic & Category & Scheme Rules */}
                                            <div className="col-lg-5">
                                                {/* Panel 1: Program & Category Mapping */}
                                                <div className="glass-card p-4 mb-4">
                                                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                                                        <i className="fa fa-graduation-cap text-indigo me-2"></i>
                                                        Academic &amp; Program Classification
                                                    </h6>

                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold small text-dark">
                                                            Academic Year: <span className="text-danger">*</span>
                                                        </label>
                                                        <select
                                                            className={`form-select ${errors.academic_year_id ? 'is-invalid' : ''}`}
                                                            value={data.academic_year_id}
                                                            onChange={(e) => setData('academic_year_id', e.target.value)}
                                                            required
                                                        >
                                                            {academicYears.map((ay) => (
                                                                <option key={ay.id} value={ay.id}>
                                                                    {ay.year_label} {ay.is_current ? '(Current Academic Year)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {errors.academic_year_id && <div className="invalid-feedback">{errors.academic_year_id}</div>}
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label fw-semibold small text-dark">
                                                            Course / Programme: <span className="text-danger">*</span>
                                                        </label>
                                                        <select
                                                            className={`form-select ${errors.course_id ? 'is-invalid' : ''}`}
                                                            value={data.course_id}
                                                            onChange={(e) => setData('course_id', e.target.value)}
                                                            required
                                                        >
                                                            {courses.map((c) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                        {errors.course_id && <div className="invalid-feedback">{errors.course_id}</div>}
                                                    </div>

                                                    <div className="mb-2">
                                                        <label className="form-label fw-semibold small text-dark">
                                                            Caste / Reservation Category: <span className="text-danger">*</span>
                                                        </label>
                                                        <select
                                                            className={`form-select mb-2 ${errors.caste_category ? 'is-invalid' : ''}`}
                                                            value={data.caste_category}
                                                            onChange={(e) => setData('caste_category', e.target.value)}
                                                            required
                                                        >
                                                            {categories.map((cat) => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                        {errors.caste_category && <div className="invalid-feedback">{errors.caste_category}</div>}

                                                        {/* Quick Select Pill Selector */}
                                                        <div className="d-flex flex-wrap gap-1 mt-2">
                                                            {categories.map((cat) => (
                                                                <button
                                                                    key={cat}
                                                                    type="button"
                                                                    className={`btn btn-xs py-1 px-2 rounded-pill small ${
                                                                        data.caste_category === cat
                                                                            ? 'btn-indigo'
                                                                            : 'btn-glass text-muted'
                                                                    }`}
                                                                    style={{ fontSize: '0.75rem' }}
                                                                    onClick={() => setData('caste_category', cat)}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Panel 2: Scheme Concession Rules & Remarks */}
                                                <div className="glass-card p-4">
                                                    <h6 className="fw-bold text-dark mb-2 d-flex align-items-center">
                                                        <i className="fa fa-file-text-o text-indigo me-2"></i>
                                                        Concession Scheme &amp; Settlement Remarks
                                                    </h6>
                                                    <p className="text-muted small mb-3">
                                                        Enter guidelines or select a preset template below for quick fill.
                                                    </p>

                                                    <div className="d-flex flex-wrap gap-1 mb-3">
                                                        {remarkPresets.map((preset, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                className="btn btn-sm btn-glass text-start py-1 px-2 small text-secondary"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => setData('remarks', preset)}
                                                            >
                                                                <i className="fa fa-tag me-1 text-indigo"></i>
                                                                {preset.length > 40 ? preset.substring(0, 40) + '...' : preset}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <textarea
                                                        className="form-control"
                                                        rows={4}
                                                        placeholder="e.g. 100% Tuition waiver by Social Welfare Dept; Exam fees payable by student."
                                                        value={data.remarks}
                                                        onChange={(e) => setData('remarks', e.target.value)}
                                                    ></textarea>
                                                </div>
                                            </div>

                                            {/* Right Column: Financial Breakdown & Live Reconciliation */}
                                            <div className="col-lg-7">
                                                {/* Panel 3: Institutional Fee Matrix */}
                                                <div className="glass-card p-4 mb-4">
                                                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                                                        <i className="fa fa-calculator text-indigo me-2"></i>
                                                        Institutional Fee Structure Breakdown
                                                    </h6>

                                                    {/* Total College Fee Input */}
                                                    <div className="p-3 rounded-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                        <label className="form-label fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
                                                            <span>Total Prescribed College Fee: <span className="text-danger">*</span></span>
                                                            <span className="badge bg-light text-dark border">Institutional Target Fee</span>
                                                        </label>
                                                        <div className="input-group input-group-lg">
                                                            <span className="input-group-text bg-white fw-bold text-dark border-end-0">₹</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={`form-control border-start-0 fw-bold fs-4 text-dark ${errors.total_college_fee ? 'is-invalid' : ''}`}
                                                                placeholder="e.g. 5500"
                                                                value={data.total_college_fee}
                                                                onChange={(e) => setData('total_college_fee', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="form-text small text-muted mt-1">
                                                            Full course fee mandated by University of Mumbai / IDOL for this academic programme.
                                                        </div>
                                                        {errors.total_college_fee && <div className="text-danger small mt-1">{errors.total_college_fee}</div>}
                                                    </div>

                                                    {/* Split Shares: Govt Share vs Student Share */}
                                                    <div className="row g-3 mb-3">
                                                        <div className="col-md-6">
                                                            <div className="p-3 rounded-3 h-100" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                                                <label className="form-label fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
                                                                    <span><i className="fa fa-university text-emerald me-1"></i> Expected Govt Share:</span>
                                                                    <span className="badge bg-emerald text-white small">MahaDBT</span>
                                                                </label>
                                                                <div className="input-group">
                                                                    <span className="input-group-text bg-white text-emerald fw-bold">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className={`form-control fw-bold text-emerald ${errors.govt_share_amount ? 'is-invalid' : ''}`}
                                                                        placeholder="e.g. 5000"
                                                                        value={data.govt_share_amount}
                                                                        onChange={(e) => setData('govt_share_amount', e.target.value)}
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="form-text small text-muted mt-1">
                                                                    Disbursed by Samaj Kalyan / Tribal Development Dept.
                                                                </div>
                                                                {errors.govt_share_amount && <div className="text-danger small mt-1">{errors.govt_share_amount}</div>}
                                                            </div>
                                                        </div>

                                                        <div className="col-md-6">
                                                            <div className="p-3 rounded-3 h-100" style={{ background: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.25)' }}>
                                                                <label className="form-label fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
                                                                    <span><i className="fa fa-user text-indigo me-1"></i> Student Payable Share:</span>
                                                                    <span className="badge bg-indigo text-white small">Student Liability</span>
                                                                </label>
                                                                <div className="input-group">
                                                                    <span className="input-group-text bg-white text-indigo fw-bold">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className={`form-control fw-bold text-indigo ${errors.student_share_amount ? 'is-invalid' : ''}`}
                                                                        placeholder="e.g. 500"
                                                                        value={data.student_share_amount}
                                                                        onChange={(e) => setData('student_share_amount', e.target.value)}
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="form-text small text-muted mt-1">
                                                                    Exam / Gymkhana / Non-tuition fees paid by student.
                                                                </div>
                                                                {errors.student_share_amount && <div className="text-danger small mt-1">{errors.student_share_amount}</div>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Admission Token Fee Input */}
                                                    <div className="p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                        <label className="form-label fw-semibold small text-dark mb-1 d-flex justify-content-between align-items-center">
                                                            <span>Admission Token Fee Paid on Portal:</span>
                                                            <span className="badge bg-light text-muted border">Portal Advance</span>
                                                        </label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-white fw-bold">₹</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="form-control"
                                                                placeholder="e.g. 0 or 500"
                                                                value={data.admission_token_amount}
                                                                onChange={(e) => setData('admission_token_amount', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="form-text small text-muted mt-1">
                                                            Initial token fee collected during online application submission (credited against Student Payable Share).
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Panel 4: Live Zero-Loss Balance & Reconciliation Ledger */}
                                                <div className="glass-card p-4">
                                                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center justify-content-between">
                                                        <span>
                                                            <i className="fa fa-shield text-indigo me-2"></i>
                                                            Zero-Loss Institutional Reconciliation Ledger
                                                        </span>
                                                        {isBalanced ? (
                                                            <span className="badge badge-glass-emerald">
                                                                <i className="fa fa-check me-1"></i> 100% Balanced
                                                            </span>
                                                        ) : totalFee > 0 ? (
                                                            <span className="badge badge-glass-amber">
                                                                <i className="fa fa-exclamation-triangle me-1"></i> Discrepancy: ₹{Math.abs(diff).toLocaleString()}
                                                            </span>
                                                        ) : null}
                                                    </h6>

                                                    {/* Proportion Visual Bar */}
                                                    {totalFee > 0 && (
                                                        <div className="mb-3">
                                                            <div className="d-flex justify-content-between small text-muted mb-1">
                                                                <span>Govt Share ({((govtShare / totalFee) * 100).toFixed(0)}%)</span>
                                                                <span>Student Share ({((studentShare / totalFee) * 100).toFixed(0)}%)</span>
                                                            </div>
                                                            <div className="progress" style={{ height: '10px' }}>
                                                                <div
                                                                    className="progress-bar bg-emerald"
                                                                    role="progressbar"
                                                                    style={{ width: `${Math.min(100, (govtShare / totalFee) * 100)}%` }}
                                                                    title={`Govt Share: ₹${govtShare.toLocaleString()}`}
                                                                ></div>
                                                                <div
                                                                    className="progress-bar bg-indigo"
                                                                    role="progressbar"
                                                                    style={{ width: `${Math.min(100 - (govtShare / totalFee) * 100, (studentShare / totalFee) * 100)}%` }}
                                                                    title={`Student Share: ₹${studentShare.toLocaleString()}`}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Live Audit Status Box */}
                                                    {isBalanced ? (
                                                        <div className="alert bg-emerald bg-opacity-10 border-emerald border-opacity-25 text-dark d-flex align-items-center p-3 mb-0 rounded-3">
                                                            <i className="fa fa-check-circle fa-2x text-emerald me-3 flex-shrink-0"></i>
                                                            <div>
                                                                <div className="fw-bold text-emerald">Reconciled: Zero Institutional Loss Guaranteed</div>
                                                                <div className="small text-muted">
                                                                    Govt Scholarship Share (₹{govtShare.toLocaleString()}) + Student Share (₹{studentShare.toLocaleString()}) = ₹{totalFee.toLocaleString()} Total College Fee.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : totalFee > 0 ? (
                                                        <div className="alert bg-amber bg-opacity-10 border-amber border-opacity-25 text-dark p-3 mb-0 rounded-3">
                                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                                <div className="d-flex align-items-center">
                                                                    <i className="fa fa-exclamation-triangle fa-2x text-amber me-3 flex-shrink-0"></i>
                                                                    <div>
                                                                        <div className="fw-bold text-amber">
                                                                            Fee Discrepancy of ₹{Math.abs(diff).toLocaleString()} {diff > 0 ? '(Under-allocated)' : '(Over-allocated)'}
                                                                        </div>
                                                                        <div className="small text-muted">
                                                                            Shares sum to ₹{sumShares.toLocaleString()}, which does not match total prescribed fee of ₹{totalFee.toLocaleString()}.
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-indigo text-nowrap"
                                                                        onClick={autoBalanceStudentShare}
                                                                    >
                                                                        <i className="fa fa-magic me-1"></i> Auto-Balance Student Share
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-emerald text-nowrap"
                                                                        onClick={autoBalanceGovtShare}
                                                                    >
                                                                        <i className="fa fa-magic me-1"></i> Auto-Balance Govt Share
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 rounded-3 bg-light text-muted small text-center">
                                                            <i className="fa fa-info-circle me-1"></i> Enter the total college fee and expected shares above to view live audit reconciliation.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer - Always Pinned & Clear */}
                                    <div className="bg-white border-top px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3 flex-shrink-0 shadow-lg">
                                        <div className="d-flex align-items-center gap-2 small text-muted">
                                            <span className="fw-semibold text-dark">{selectedCourse?.name || 'Selected Course'}</span>
                                            <span>&bull;</span>
                                            <span>Year: {selectedYear?.year_label || 'Current'}</span>
                                            <span>&bull;</span>
                                            <span>Category: <strong className="text-dark">{data.caste_category}</strong></span>
                                            <span>&bull;</span>
                                            <span>Total Fee: <strong className="text-dark">₹{totalFee.toLocaleString()}</strong></span>
                                        </div>

                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-glass px-4"
                                                onClick={() => setShowModal(false)}
                                                disabled={processing}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-indigo px-5 fw-semibold shadow-sm"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        Saving Rule...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-check-circle me-2"></i>
                                                        {editingId ? 'Update Structure Rule' : 'Save Fee Structure Rule'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}

