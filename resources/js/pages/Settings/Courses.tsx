import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Course {
    id: number;
    name: string;
    code: string | null;
    is_active: boolean;
}

interface Props {
    courses: Course[];
}

export default function Courses({ courses }: Props) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openAdd = () => {
        setName('');
        setCode('');
        setShowAddModal(true);
    };

    const openEdit = (course: Course) => {
        setEditId(course.id);
        setName(course.name);
        setCode(course.code || '');
        setShowEditModal(true);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        router.post('/settings/courses', {
            name: name.trim(),
            code: code.trim() ? code.trim() : null,
        }, {
            onSuccess: () => {
                setShowAddModal(false);
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Course Created',
                    text: 'Course created successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to create course.', 'error');
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editId || !name.trim()) return;

        setIsSubmitting(true);
        router.put(`/settings/courses/${editId}`, {
            name: name.trim(),
            code: code.trim() ? code.trim() : null,
        }, {
            onSuccess: () => {
                setShowEditModal(false);
                setIsSubmitting(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Course Updated',
                    text: 'Course updated successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: (errs) => {
                setIsSubmitting(false);
                Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to update course.', 'error');
            },
        });
    };

    const handleToggle = (course: Course) => {
        const action = course.is_active ? 'deactivate' : 'reactivate';
        router.post(`/settings/courses/${course.id}/toggle`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Course Status Updated',
                    text: `Course ${action}d successfully.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Settings — Courses" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-graduation-cap me-2 text-indigo"></i> Courses
                                </h3>
                                <p className="text-muted small mb-0">
                                    Manage the master list of courses. Retired courses stay on historical records but disappear from new entry forms.
                                </p>
                            </div>
                            <div>
                                <Link href="/settings" className="btn btn-glass me-2">
                                    <i className="fa fa-arrow-left me-1"></i> Back
                                </Link>
                                <button type="button" onClick={openAdd} className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> Add Course
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-glass" id="course_table">
                                <thead>
                                    <tr>
                                        <th className="col-sr">#</th>
                                        <th>Course Name</th>
                                        <th>Code</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-4">
                                                No courses recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        courses.map((c, idx) => (
                                            <tr key={c.id}>
                                                <td className="fw-semibold text-muted">{idx + 1}</td>
                                                <td className="fw-bold text-dark">{c.name}</td>
                                                <td className="small text-muted">{c.code || '-'}</td>
                                                <td>
                                                    {c.is_active ? (
                                                        <span className="badge badge-glass-emerald">
                                                            <i className="fa fa-check-circle me-1"></i> Active
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-glass-amber">Inactive</span>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(c)}
                                                        className="btn btn-sm btn-glass text-primary me-1"
                                                    >
                                                        <i className="fa fa-edit"></i> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggle(c)}
                                                        className={`btn btn-sm btn-glass ${c.is_active ? 'text-danger' : 'text-emerald'}`}
                                                        title={c.is_active ? 'Deactivate course' : 'Reactivate course'}
                                                    >
                                                        <i className={`fa ${c.is_active ? 'fa-ban' : 'fa-check'}`}></i>{' '}
                                                        {c.is_active ? 'Deactivate' : 'Reactivate'}
                                                    </button>
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

            {/* Modal Add Course */}
            {showAddModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content glass-card border-secondary border-opacity-25">
                            <div className="modal-header border-bottom border-secondary border-opacity-25">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-graduation-cap me-2 text-indigo"></i> Add Course
                                </h5>
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-close"></button>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Course Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. B.A."
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Course Code (optional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g. BA"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-25">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-glass">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                        {isSubmitting ? 'Saving...' : 'Save Course'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Course */}
            {showEditModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content glass-card border-secondary border-opacity-25">
                            <div className="modal-header border-bottom border-secondary border-opacity-25">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className="fa fa-edit me-2 text-indigo"></i> Edit Course
                                </h5>
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn-close"></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Course Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label text-secondary small fw-semibold">Course Code (optional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top border-secondary border-opacity-25">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-glass">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                        {isSubmitting ? 'Saving...' : 'Update Course'}
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
