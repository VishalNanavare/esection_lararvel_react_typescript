import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface User {
    id: number;
    username: string;
    full_name: string | null;
    email: string | null;
    role: string;
    is_active: boolean;
    pages?: string[];
}

interface ActionDef {
    key: string;
    action: string;
    label: string;
}

interface ModuleGroup {
    label: string;
    group_label: string;
    actions: ActionDef[];
}

interface Props {
    users: User[];
    permissionGroups: Record<string, ModuleGroup>;
}

export default function Users({ users, permissionGroups }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'staff' | 'admin'>('staff');
    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // All available permission keys
    const allKeys: string[] = Object.values(permissionGroups).flatMap(g => g.actions.map(a => a.key));

    const openAddModal = () => {
        setIsEditing(false);
        setEditingUserId(null);
        setUsername('');
        setPassword('');
        setFullName('');
        setEmail('');
        setRole('staff');
        // Default: grant all or empty
        setSelectedPages([...allKeys]);
        setIsModalOpen(true);
    };

    const openEditModal = (u: User) => {
        setIsEditing(true);
        setEditingUserId(u.id);
        setUsername(u.username);
        setPassword('');
        setFullName(u.full_name || '');
        setEmail(u.email || '');
        setRole((u.role as 'staff' | 'admin') || 'staff');
        setSelectedPages(u.pages ? [...u.pages] : []);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const togglePermission = (key: string, moduleKey: string) => {
        const viewKey = `${moduleKey}.view`;
        let next: string[];

        if (selectedPages.includes(key)) {
            // Removing
            next = selectedPages.filter(k => k !== key);
            if (key === viewKey) {
                const moduleActions = permissionGroups[moduleKey]?.actions.map(a => a.key) || [];
                next = next.filter(k => !moduleActions.includes(k));
            }
        } else {
            // Adding
            next = [...selectedPages, key];
            if (!next.includes(viewKey)) {
                next.push(viewKey);
            }
        }

        setSelectedPages(next);
    };

    const handleSelectAll = () => {
        setSelectedPages([...allKeys]);
    };

    const handleClearAll = () => {
        setSelectedPages([]);
    };

    const handleGroupSelectAll = (moduleKey: string) => {
        const moduleActions = permissionGroups[moduleKey]?.actions.map(a => a.key) || [];
        const allGroupSelected = moduleActions.every(k => selectedPages.includes(k));

        if (allGroupSelected) {
            setSelectedPages(selectedPages.filter(k => !moduleActions.includes(k)));
        } else {
            const combined = Array.from(new Set([...selectedPages, ...moduleActions]));
            setSelectedPages(combined);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!isEditing) {
            // Add User
            router.post('/settings/users', {
                username,
                password,
                full_name: fullName,
                email,
                role,
                pages: role === 'staff' ? selectedPages : [],
            }, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setIsSubmitting(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'User Created',
                        text: `Staff user '${username}' created successfully.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    Swal.fire({
                        icon: 'error',
                        title: 'Creation Failed',
                        text: Object.values(errs).flat().join('\n') || 'Failed to create user.',
                    });
                },
            });
        } else {
            // Edit User
            if (!editingUserId) return;
            router.put(`/settings/users/${editingUserId}`, {
                full_name: fullName,
                email,
                role,
                password: password || null,
                pages: role === 'staff' ? selectedPages : [],
            }, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setIsSubmitting(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'User Updated',
                        text: `Staff account '${username}' updated successfully.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: Object.values(errs).flat().join('\n') || 'Failed to update user.',
                    });
                },
            });
        }
    };

    const handleToggleActive = (u: User) => {
        if (u.username === 'admin') {
            Swal.fire('Restricted', 'Root administrator account cannot be deactivated.', 'warning');
            return;
        }

        const action = u.is_active ? 'deactivate' : 'activate';
        Swal.fire({
            title: `${action.toUpperCase()} Account?`,
            text: `Are you sure you want to ${action} account '${u.username}'?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: u.is_active ? '#dc2626' : '#4f46e5',
            confirmButtonText: `Yes, ${action}!`,
        }).then((res) => {
            if (res.isConfirmed) {
                router.post(`/settings/users/${u.id}/toggle`, {}, {
                    onSuccess: () => {
                        Swal.fire('Updated', `Account status updated.`, 'success');
                    },
                });
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Users - Settings" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-users me-2 text-indigo"></i> Users
                                </h3>
                                <p className="text-muted small mb-0">
                                    Create staff accounts, change roles, and activate or deactivate access. Deactivated accounts can no longer log in.
                                </p>
                            </div>
                            <div>
                                <Link href="/settings" className="btn btn-glass me-2">
                                    <i className="fa fa-arrow-left me-1"></i> Back
                                </Link>
                                <button type="button" onClick={openAddModal} className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> Add User
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-glass" id="user_table">
                                <thead>
                                    <tr>
                                        <th className="col-sr">#</th>
                                        <th>Username</th>
                                        <th>Full Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u, idx) => (
                                        <tr key={u.id}>
                                            <td className="col-sr">{idx + 1}</td>
                                            <td className="fw-semibold text-dark">{u.username}</td>
                                            <td>{u.full_name || '-'}</td>
                                            <td className="text-muted small">{u.email || '-'}</td>
                                            <td>
                                                <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'badge-glass-indigo'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.is_active ? 'bg-success' : 'bg-danger'}`}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(u)}
                                                        className="btn btn-glass text-indigo"
                                                        title="Edit User"
                                                    >
                                                        <i className="fa fa-pencil"></i>
                                                    </button>
                                                    {u.username !== 'admin' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleActive(u)}
                                                            className={`btn btn-glass ${u.is_active ? 'text-danger' : 'text-success'}`}
                                                            title={u.is_active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            <i className={`fa ${u.is_active ? 'fa-ban' : 'fa-check'}`}></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Add / Edit User (Fullscreen Modal) */}
            {isModalOpen && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content glass-card border-secondary border-opacity-25" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="modal-header border-bottom border-secondary border-opacity-25 bg-white">
                                <h5 className="modal-title fw-bold text-dark">
                                    <i className={`fa ${isEditing ? 'fa-edit' : 'fa-users'} me-2 text-indigo`}></i>
                                    {isEditing ? 'Edit User' : 'Add User'}
                                </h5>
                                <button type="button" onClick={closeModal} className="btn-close" aria-label="Close"></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
                                <div className="modal-body p-0" style={{ display: 'flex', flex: '1 1 auto', overflow: 'hidden' }}>
                                    <div className="row g-0 w-100" style={{ flex: '1 1 auto', flexWrap: 'nowrap', margin: 0 }}>

                                        {/* Account details sidebar */}
                                        <div className="col-lg-3 user-modal__aside p-4 border-end border-secondary border-opacity-10 bg-white" style={{ overflowY: 'auto' }}>
                                            <h6 className="fw-bold text-dark mb-3">
                                                <i className="fa fa-user-circle-o me-2 text-indigo"></i> Account
                                            </h6>

                                            <div className="mb-3">
                                                <label className="form-label text-secondary small fw-semibold">Username</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    disabled={isEditing}
                                                    required
                                                />
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label text-secondary small fw-semibold">
                                                    {isEditing ? 'New Password' : 'Password'}
                                                </label>
                                                <div className="input-group">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        className="form-control"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder={isEditing ? 'Leave blank to keep current password' : '••••••••'}
                                                        required={!isEditing}
                                                        minLength={6}
                                                        maxLength={32}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        title={showPassword ? 'Hide password' : 'Show password'}
                                                    >
                                                        <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label text-secondary small fw-semibold">Full Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label text-secondary small fw-semibold">Email</label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="staff@mu.ac.in"
                                                />
                                            </div>

                                            <div className="mb-0">
                                                <label className="form-label text-secondary small fw-semibold">Role</label>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="form-control bg-light"
                                                        value={role === 'admin' ? 'Admin' : 'Staff'}
                                                        readOnly
                                                    />
                                                ) : (
                                                    <select
                                                        className="form-select js-role-select"
                                                        value={role}
                                                        onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
                                                    >
                                                        <option value="staff">Staff</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                )}

                                                {role === 'admin' && (
                                                    <div className="form-text small text-muted mt-2">
                                                        Administrators can reach every page by role, so no permissions are set here.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Permissions Right Area */}
                                        <div className="col-lg-9 user-modal__perms p-4 access-pages-block bg-light" style={{ overflowY: 'auto' }}>
                                            {role === 'admin' ? (
                                                <div className="h-100 d-flex align-items-center justify-content-center p-5 text-center">
                                                    <div className="glass-card p-5 border shadow-sm">
                                                        <i className="fa fa-shield text-indigo fa-3x mb-3"></i>
                                                        <h5 className="fw-bold text-dark">Full System Access</h5>
                                                        <p className="text-muted small mb-0 max-w-md">
                                                            This account has the <strong>Admin</strong> role. Administrators bypass all page restrictions and have full access to every module and feature in the E-Section portal.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                                        <h6 className="fw-bold text-dark mb-0">
                                                            <i className="fa fa-lock me-2 text-indigo"></i> Permission
                                                        </h6>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="badge rounded-pill bg-indigo text-white px-3 py-2">
                                                                {selectedPages.length} selected
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={handleSelectAll}
                                                                className="btn btn-sm btn-outline-secondary"
                                                            >
                                                                Select all
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleClearAll}
                                                                className="btn btn-sm btn-outline-secondary"
                                                            >
                                                                Clear all
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="permission-groups">
                                                        {Object.entries(permissionGroups).map(([moduleKey, group]) => {
                                                            const moduleActionKeys = group.actions.map(a => a.key);
                                                            const allGroupSelected = moduleActionKeys.every(k => selectedPages.includes(k));

                                                            return (
                                                                <div key={moduleKey} className="permission-card bg-white border border-secondary border-opacity-10 rounded-3 p-3 mb-3" data-perm-module={moduleKey}>
                                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                                        <span className="badge rounded-pill bg-indigo bg-opacity-10 text-indigo px-3 py-2 fw-semibold">
                                                                            {group.group_label}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleGroupSelectAll(moduleKey)}
                                                                            className="btn btn-sm btn-outline-secondary"
                                                                        >
                                                                            {allGroupSelected ? 'Deselect all' : 'Select all'}
                                                                        </button>
                                                                    </div>

                                                                    <div className="permission-chips">
                                                                        {group.actions.map((act) => {
                                                                            const isChecked = selectedPages.includes(act.key);
                                                                            const isView = act.action === 'view';
                                                                            const otherActiveInModule = group.actions
                                                                                .filter(a => a.action !== 'view')
                                                                                .some(a => selectedPages.includes(a.key));
                                                                            const isLockedView = isView && otherActiveInModule;

                                                                            return (
                                                                                <label
                                                                                    key={act.key}
                                                                                    className={`permission-chip ${isChecked ? 'is-checked' : ''} ${isLockedView ? 'is-locked' : ''}`}
                                                                                    onClick={() => {
                                                                                        if (!isLockedView) {
                                                                                            togglePermission(act.key, moduleKey);
                                                                                        }
                                                                                    }}
                                                                                    style={{ cursor: isLockedView ? 'not-allowed' : 'pointer' }}
                                                                                >
                                                                                    <i
                                                                                        className="fa fa-check permission-chip__tick"
                                                                                        style={{
                                                                                            opacity: isChecked ? 1 : 0,
                                                                                            transform: isChecked ? 'scale(1)' : 'scale(0.6)',
                                                                                        }}
                                                                                    ></i>
                                                                                    <span>{act.label}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer border-top border-secondary border-opacity-25 justify-content-between bg-white px-4 py-3">
                                    <span className="small text-muted perm-summary">
                                        {role === 'admin' ? 'Administrator (Full Access)' : `${selectedPages.length} permissions selected`}
                                    </span>
                                    <div className="d-flex gap-2">
                                        <button type="button" onClick={closeModal} className="btn btn-glass">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSubmitting} className="btn btn-indigo">
                                            <i className="fa fa-check me-1"></i> {isSubmitting ? 'Saving...' : 'Save User'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
