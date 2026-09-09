import React, { useState } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { SharedProps } from '../../types';
import Swal from 'sweetalert2';

interface AcademicYear {
    id: number;
    year_label: string;
    is_current: boolean;
}

interface Props {
    years: AcademicYear[];
}

export default function AcademicYears({ years }: Props) {
    const { props } = usePage<SharedProps>();
    const canDelete = props.features.delete;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const [yearLabel, setYearLabel] = useState('');
    const [isCurrent, setIsCurrent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openAddModal = () => {
        setYearLabel('');
        setIsCurrent(false);
        setIsAddModalOpen(true);
    };

    const openEditModal = (y: AcademicYear) => {
        setEditId(y.id);
        setYearLabel(y.year_label);
        setIsCurrent(y.is_current);
        setIsEditModalOpen(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!yearLabel.trim()) return;

        setIsSubmitting(true);
        router.post('/settings/academic-years', {
            year_label: yearLabel.trim(),
            is_current: isCurrent,
        }, {
            onSuccess: () => {
                setIsAddModalOpen(false);
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Academic Year Added',
                    text: `Academic year '${yearLabel}' created successfully.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to add year.', 'error');
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId || !yearLabel.trim()) return;

        setIsSubmitting(true);
        router.put(`/settings/academic-years/${editId}`, {
            year_label: yearLabel.trim(),
            is_current: isCurrent,
        }, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Academic Year Updated',
                    text: `Academic year '${yearLabel}' updated successfully.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to update year.', 'error');
            },
        });
    };

    const handleSetActive = (id: number, yearName: string) => {
        router.post(`/settings/academic-years/${id}/activate`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Active Year Updated',
                    text: `'${yearName}' set as active academic year.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    const handleDelete = (id: number, yearName: string) => {
        Swal.fire({
            title: 'Delete this academic year?',
            text: `${yearName} will be permanently removed.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Yes, delete it',
        }).then((res) => {
            if (res.isConfirmed) {
                router.delete(`/settings/academic-years/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: 'Academic year removed.',
                            timer: 2000,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Academic Years" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-calendar me-2 text-indigo"></i> Academic Years
                                </h3>
                                <p className="text-muted small mb-0">
                                    Add academic years and mark the current one. The current year becomes the default across the system.
                                </p>
                            </div>
                            <div>
                                <Link href="/settings" className="btn btn-glass me-2">
                                    <i className="fa fa-arrow-left me-1"></i> Back
                                </Link>
                                <button type="button" onClick={openAddModal} className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> Add Academic Year
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-glass" id="academic_year_table">
                                <thead>
                                    <tr>
                                        <th className="col-sr">#</th>
                                        <th>Academic Year</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {years.map((y, idx) => (
                                        <tr key={y.id}>
                                            <td className="col-sr">{idx + 1}</td>
                                            <td className="fw-semibold text-dark">{y.year_label}</td>
                                            <td>
                                                {y.is_current ? (
                                                    <span className="badge badge-glass-emerald">
                                                        <i className="fa fa-check-circle me-1"></i> Current
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-glass-indigo">Archived</span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                {!y.is_current && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetActive(y.id, y.year_label)}
                                                        className="btn btn-sm btn-glass text-emerald me-1"
                                                        title="Mark as current year"
                                                    >
                                                        <i className="fa fa-check"></i> Set Current
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(y)}
                                                    className="btn btn-sm btn-glass text-primary me-1"
                                                    title="Edit"
                                                >
                                                    <i className="fa fa-edit"></i> Edit
                                                </button>
                                                {!y.is_current && canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(y.id, y.year_label)}
                                                        className="btn btn-sm btn-glass text-danger"
                                                        title="Delete academic year"
                                                    >
                                                        <i className="fa fa-trash"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Add Academic Year */}
            {isAddModalOpen && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content glass-card border-secondary border-opacity-25">
                            <div className="modal-header border-bottom border-secondary border-opacity-25">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-calendar me-2 text-indigo"></i> Add Academic Year
                                </h5>
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-close"></button>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Academic Year</label>
                                            <input
                                                type="text"
                                                name="year_label"
                                                className="form-control"
                                                placeholder="e.g. 2025-2026"
                                                value={yearLabel}
                                                onChange={(e) => setYearLabel(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 form-check mt-2 ms-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="add_is_current"
                                                checked={isCurrent}
                                                onChange={(e) => setIsCurrent(e.target.checked)}
                                            />
                                            <label className="form-check-label small" htmlFor="add_is_current">
                                                Mark as the current academic year
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-25">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-glass">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                        {isSubmitting ? 'Saving...' : 'Save Academic Year'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Academic Year */}
            {isEditModalOpen && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content glass-card border-secondary border-opacity-25">
                            <div className="modal-header border-bottom border-secondary border-opacity-25">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-edit me-2 text-indigo"></i> Edit Academic Year
                                </h5>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-close"></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Academic Year</label>
                                            <input
                                                type="text"
                                                name="year_label"
                                                className="form-control"
                                                value={yearLabel}
                                                onChange={(e) => setYearLabel(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 form-check mt-2 ms-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="edit_is_current"
                                                checked={isCurrent}
                                                onChange={(e) => setIsCurrent(e.target.checked)}
                                            />
                                            <label className="form-check-label small" htmlFor="edit_is_current">
                                                Mark as the current academic year
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-25">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-glass">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                        {isSubmitting ? 'Saving...' : 'Update Academic Year'}
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
