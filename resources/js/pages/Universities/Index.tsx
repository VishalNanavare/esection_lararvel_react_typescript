import React, { useState } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';
import Swal from 'sweetalert2';

interface College {
    id: number;
    Name: string;
    States: string;
    head_name: string | null;
    fees: number | string | null;
    in_favour_of: string | null;
    Address: string | null;
    email_id: string | null;
    mobile_no: string | null;
    is_active: boolean;
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

interface Props {
    colleges: PaginatedData<College>;
    states: string[];
    filters: {
        name: string;
        state: string;
    };
}

const INDIAN_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
    'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
    'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
    'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
    'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function Index({ colleges, states, filters }: Props) {
    const { props } = usePage<SharedProps>();
    const canExport = props.features.export;
    const [nameFilter, setNameFilter] = useState(filters.name || '');
    const [stateFilter, setStateFilter] = useState(filters.state || '');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCollege, setEditingCollege] = useState<College | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        state: '',
        head_name: 'The Controller of Examinations',
        fees: '0',
        in_favour_of: '',
        address: '',
        email_id: '',
        mobile_no: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/universities', {
            name: nameFilter,
            state: stateFilter,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleResetFilters = () => {
        setNameFilter('');
        setStateFilter('');
        router.get('/universities');
    };

    const openAddModal = () => {
        setFormData({
            name: '',
            state: '',
            head_name: 'The Controller of Examinations',
            fees: '0',
            in_favour_of: '',
            address: '',
            email_id: '',
            mobile_no: '',
        });
        setShowAddModal(true);
    };

    const openEditModal = (college: College) => {
        setEditingCollege(college);
        setFormData({
            name: college.Name || '',
            state: college.States || '',
            head_name: college.head_name || 'The Controller of Examinations',
            fees: college.fees !== null && college.fees !== undefined ? String(college.fees) : '0',
            in_favour_of: college.in_favour_of || '',
            address: college.Address || '',
            email_id: college.email_id || '',
            mobile_no: college.mobile_no || '',
        });
        setShowEditModal(true);
    };

    const handleSaveNew = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.state) {
            Swal.fire({
                icon: 'warning',
                title: 'Required Fields',
                text: 'Please enter the University Full Name and select a State.',
            });
            return;
        }

        setIsSubmitting(true);
        router.post('/universities', formData, {
            onSuccess: () => {
                setShowAddModal(false);
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'University has been created successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Error',
                    text: Object.values(errs).flat().join('\n') || 'Failed to save university.',
                });
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCollege) return;
        if (!formData.name.trim() || !formData.state) {
            Swal.fire({
                icon: 'warning',
                title: 'Required Fields',
                text: 'Please enter the University Full Name and select a State.',
            });
            return;
        }

        setIsSubmitting(true);
        router.put(`/universities/${editingCollege.id}`, formData, {
            onSuccess: () => {
                setShowEditModal(false);
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'University details updated successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Error',
                    text: Object.values(errs).flat().join('\n') || 'Failed to update university.',
                });
            },
        });
    };

    const handleToggleStatus = (college: College) => {
        const action = college.is_active ? 'deactivate' : 'reactivate';
        Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} University?`,
            text: `Are you sure you want to ${action} "${college.Name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: college.is_active ? '#e11d48' : '#059669',
            cancelButtonColor: '#64748b',
            confirmButtonText: `Yes, ${action}!`,
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(`/universities/${college.id}/toggle`, {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Status Changed',
                            text: `University has been ${college.is_active ? 'deactivated' : 'activated'}.`,
                            timer: 1800,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    const formatCurrency = (val: number | string | null) => {
        const num = parseFloat(String(val || 0));
        return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AppLayout>
            <Head title="University Master Directory" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        {/* Header */}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-university me-2 text-indigo"></i> University Master Directory
                                </h3>
                                <p className="text-muted small mb-0">
                                    Manage postal addresses, fees, favoring authority titles, and contact information for nationwide target universities.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                {canExport && (
                                    <a
                                        href={`/universities/export?name=${encodeURIComponent(nameFilter)}&state=${encodeURIComponent(stateFilter)}`}
                                        className="btn btn-glass"
                                        title="Export current view to CSV"
                                    >
                                        <i className="fa fa-file-excel-o me-1 text-emerald"></i> Export CSV
                                    </a>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-indigo"
                                    onClick={openAddModal}
                                >
                                    <i className="fa fa-plus me-1"></i> Add New University
                                </button>
                            </div>
                        </div>

                        {/* Search & State Filter Bar */}
                        <form onSubmit={handleFilterSubmit} className="row g-3 mb-4 filter-panel p-3 bg-light rounded border">
                            <div className="col-md-5">
                                <label className="form-label text-secondary small fw-semibold">State</label>
                                <select
                                    className="form-select"
                                    value={stateFilter}
                                    onChange={(e) => setStateFilter(e.target.value)}
                                >
                                    <option value="">-- All States --</option>
                                    {states.map((st) => (
                                        <option key={st} value={st}>
                                            {st}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-5">
                                <label className="form-label text-secondary small fw-semibold">University Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by any part of university name..."
                                    value={nameFilter}
                                    onChange={(e) => setNameFilter(e.target.value)}
                                />
                            </div>

                            <div className="col-md-2 d-flex align-items-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-glass"
                                    onClick={handleResetFilters}
                                    title="Reset filters"
                                >
                                    <i className="fa fa-refresh"></i>
                                </button>
                                <button type="submit" className="btn btn-indigo flex-grow-1">
                                    <i className="fa fa-filter me-1"></i> Filter
                                </button>
                            </div>
                        </form>

                        {/* Counter info */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <small className="text-muted fw-semibold">
                                {filters.name !== '' || filters.state !== '' ? (
                                    <>
                                        <i className="fa fa-filter me-1 text-indigo"></i>
                                        Found {colleges.total} matching {colleges.total === 1 ? 'university' : 'universities'}
                                    </>
                                ) : (
                                    <>Total {colleges.total} universities registered</>
                                )}
                                {colleges.from && colleges.to && (
                                    <span className="ms-2 text-secondary">
                                        (Showing {colleges.from} - {colleges.to})
                                    </span>
                                )}
                            </small>
                        </div>

                        {/* Table */}
                        <div className="table-responsive">
                            <table className="table table-glass table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>University Name</th>
                                        <th>State</th>
                                        <th>Head Title</th>
                                        <th>Verification Fees</th>
                                        <th>Payment In Favour Of</th>
                                        <th>Status</th>
                                        <th className="text-end" style={{ width: '190px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {colleges.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-5">
                                                <i className="fa fa-university fa-2x mb-2 d-block text-secondary opacity-50"></i>
                                                {filters.name || filters.state ? 'No universities match the current search filters.' : 'No universities recorded in database.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        colleges.data.map((col, idx) => {
                                            const srNo = ((colleges.current_page - 1) * colleges.per_page) + idx + 1;
                                            return (
                                                <tr key={col.id}>
                                                    <td className="fw-semibold text-muted">{srNo}</td>
                                                    <td>
                                                        <span className="fw-bold text-dark fs-6 d-block">{col.Name}</span>
                                                        {col.Address && (
                                                            <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: '350px' }}>
                                                                <i className="fa fa-map-marker me-1 text-secondary"></i> {col.Address}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {col.States}
                                                        </span>
                                                    </td>
                                                    <td className="small text-secondary">
                                                        {col.head_name || 'The Controller of Examinations'}
                                                    </td>
                                                    <td>
                                                        <span className="fw-semibold text-emerald">
                                                            {formatCurrency(col.fees)}
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted">
                                                        {col.in_favour_of || '-'}
                                                    </td>
                                                    <td>
                                                        {col.is_active ? (
                                                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">
                                                                <i className="fa fa-circle me-1 small"></i> Active
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
                                                                <i className="fa fa-ban me-1 small"></i> Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-end">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-glass text-primary me-1"
                                                            onClick={() => openEditModal(col)}
                                                            title="Edit details"
                                                        >
                                                            <i className="fa fa-edit me-1"></i> Edit
                                                        </button>
                                                        {col.is_active ? (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-glass text-danger"
                                                                onClick={() => handleToggleStatus(col)}
                                                                title="Deactivate university"
                                                            >
                                                                <i className="fa fa-ban"></i>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-glass text-emerald"
                                                                onClick={() => handleToggleStatus(col)}
                                                                title="Reactivate university"
                                                            >
                                                                <i className="fa fa-check"></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {colleges.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                <small className="text-muted">
                                    Page {colleges.current_page} of {colleges.last_page}
                                </small>
                                <ul className="pagination pagination-sm mb-0">
                                    {colleges.links.map((link, i) => (
                                        <li
                                            key={i}
                                            className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                        >
                                            <Link
                                                href={link.url || '#'}
                                                className="page-link"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                preserveScroll
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add University Modal */}
            {showAddModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content glass-card border-0 shadow-lg">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-university me-2 text-indigo"></i> Add Target University Details
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                            </div>
                            <form onSubmit={handleSaveNew}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-8">
                                            <label className="form-label small fw-semibold text-secondary">
                                                University Full Name <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. Shivaji University"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">
                                                State <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className="form-select"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Select State --</option>
                                                {INDIAN_STATES.map((st) => (
                                                    <option key={st} value={st}>{st}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Head Title (To)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. The Controller of Examinations"
                                                value={formData.head_name}
                                                onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Verification Fees Amount (₹)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="e.g. 500"
                                                value={formData.fees}
                                                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Payment Favoring Title (In Favour Of)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Finance & Accounts Officer, Shivaji University"
                                                value={formData.in_favour_of}
                                                onChange={(e) => setFormData({ ...formData, in_favour_of: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Full Postal Address</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                placeholder="Vidyanagar, Kolhapur - 416004, Maharashtra"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Email (Optional)</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                placeholder="registrar@university.ac.in"
                                                value={formData.email_id}
                                                onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Mobile No. (Optional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="+91 9876543210"
                                                value={formData.mobile_no}
                                                onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setShowAddModal(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-indigo"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <><i className="fa fa-spinner fa-spin me-1"></i> Saving...</>
                                        ) : (
                                            <><i className="fa fa-check me-1"></i> Save University Details</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit University Modal */}
            {showEditModal && editingCollege && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content glass-card border-0 shadow-lg">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-edit me-2 text-indigo"></i> Edit University Details
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-8">
                                            <label className="form-label small fw-semibold text-secondary">
                                                University Full Name <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold text-secondary">
                                                State <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                className="form-select"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Select State --</option>
                                                {INDIAN_STATES.map((st) => (
                                                    <option key={st} value={st}>{st}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Head Title (To)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.head_name}
                                                onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Verification Fees Amount (₹)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={formData.fees}
                                                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Payment Favoring Title (In Favour Of)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.in_favour_of}
                                                onChange={(e) => setFormData({ ...formData, in_favour_of: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold text-secondary">Full Postal Address</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Email (Optional)</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={formData.email_id}
                                                onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-semibold text-secondary">Mobile No. (Optional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.mobile_no}
                                                onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setShowEditModal(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-indigo"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <><i className="fa fa-spinner fa-spin me-1"></i> Updating...</>
                                        ) : (
                                            <><i className="fa fa-save me-1"></i> Update University Details</>
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
