import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface User {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
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
    grants: Record<number, string[]>;
    permissionGroups: Record<string, ModuleGroup>;
}

export default function AccessRights({ users, grants, permissionGroups }: Props) {
    const [selectedUser, setSelectedUser] = useState<User | null>(users.length > 0 ? users[0] : null);
    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Sync selected pages when selected user changes
    useEffect(() => {
        if (selectedUser) {
            const userGrants = grants[selectedUser.id] || [];
            setSelectedPages([...userGrants]);
            setIsDirty(false);
        }
    }, [selectedUser, grants]);

    // All available keys across all modules
    const allKeys: string[] = Object.values(permissionGroups).flatMap(g => g.actions.map(a => a.key));

    const handleStaffPick = (u: User) => {
        if (selectedUser?.id === u.id) return;
        if (isDirty) {
            Swal.fire({
                title: 'Discard unsaved changes?',
                text: `The permissions you changed for ${selectedUser?.username || 'this account'} have not been saved yet.`,
                icon: 'warning',
                showCancelButton: true,
                focusCancel: true,
                confirmButtonText: 'Yes, discard them',
                cancelButtonText: 'Keep editing',
            }).then((res) => {
                if (res.isConfirmed) {
                    setIsDirty(false);
                    setSelectedUser(u);
                }
            });
            return;
        }
        setSelectedUser(u);
    };

    const togglePermission = (key: string, moduleKey: string) => {
        setIsDirty(true);
        const viewKey = `${moduleKey}.view`;
        let next: string[];

        if (selectedPages.includes(key)) {
            // Removing
            next = selectedPages.filter(k => k !== key);
            // If we removed the viewKey, also remove all other actions in this module
            if (key === viewKey) {
                const moduleActions = permissionGroups[moduleKey]?.actions.map(a => a.key) || [];
                next = next.filter(k => !moduleActions.includes(k));
            }
        } else {
            // Adding
            next = [...selectedPages, key];
            // Rule: Holding any action implies holding view
            if (!next.includes(viewKey)) {
                next.push(viewKey);
            }
        }

        setSelectedPages(next);
    };

    const handleSelectAll = () => {
        setIsDirty(true);
        setSelectedPages([...allKeys]);
    };

    const handleClearAll = () => {
        setIsDirty(true);
        setSelectedPages([]);
    };

    const handleGroupSelectAll = (moduleKey: string) => {
        setIsDirty(true);
        const moduleActions = permissionGroups[moduleKey]?.actions.map(a => a.key) || [];
        const allAlreadySelected = moduleActions.every(k => selectedPages.includes(k));

        if (allAlreadySelected) {
            // Clear group
            setSelectedPages(selectedPages.filter(k => !moduleActions.includes(k)));
        } else {
            // Select group
            const combined = Array.from(new Set([...selectedPages, ...moduleActions]));
            setSelectedPages(combined);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setIsSaving(true);
        router.post('/settings/access-rights', {
            user_id: selectedUser.id,
            pages: selectedPages,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSaving(false);
                setIsDirty(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Permissions Saved',
                    text: `Access rights for ${selectedUser.username} have been updated.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                setIsSaving(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Save Failed',
                    text: 'Unable to save permissions. Please check server logs.',
                });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Access Rights - Settings" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-shield me-2 text-indigo"></i> Access Rights
                                </h3>
                                <p className="text-muted small mb-0">
                                    Choose a staff account, then grant it only the actions it needs.
                                    Administrators are not listed &mdash; they can reach everything by role.
                                </p>
                            </div>
                            <Link href="/settings" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to Settings
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {users.length === 0 ? (
                <div className="row">
                    <div className="col-12">
                        <div className="glass-card p-5 text-center text-muted">
                            <i className="fa fa-users fs-1 mb-3 text-secondary"></i>
                            <p className="mb-0">No staff accounts yet. Create one in Settings &rarr; Users.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row g-3">
                    {/* Staff picker sidebar */}
                    <div className="col-lg-3">
                        <div className="glass-card p-3 h-100">
                            <h6 className="fw-bold text-dark mb-3">
                                <i className="fa fa-user-circle-o me-2 text-indigo"></i> Staff accounts
                            </h6>
                            <div className="list-group list-group-flush" id="staff_list">
                                {users.map((u) => {
                                    const isSelected = selectedUser?.id === u.id;
                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => handleStaffPick(u)}
                                            className={`list-group-item list-group-item-action border-0 rounded-3 mb-1 px-3 py-2 js-staff-pick ${isSelected ? 'is-selected' : ''}`}
                                        >
                                            <span className="fw-semibold d-block">{u.username}</span>
                                            {u.full_name && (
                                                <span className="small text-muted">{u.full_name}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Permission cards for the selected staff member */}
                    <div className="col-lg-9">
                        <div className="glass-card p-4">
                            {selectedUser && (
                                <form onSubmit={handleSave}>
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4 pb-3 border-bottom border-secondary border-opacity-10">
                                        <div>
                                            <span className="text-muted small d-block">Editing permissions for</span>
                                            <span className="fw-bold text-dark fs-5">{selectedUser.username}</span>
                                            {selectedUser.full_name && (
                                                <span className="text-secondary small ms-2">({selectedUser.full_name})</span>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="btn btn-indigo"
                                        >
                                            <i className="fa fa-check me-1"></i> {isSaving ? 'Saving...' : 'Save Permissions'}
                                        </button>
                                    </div>

                                    {/* Toolbar */}
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                        <h6 className="fw-bold text-dark mb-0">
                                            <i className="fa fa-lock me-2 text-indigo"></i> Permission
                                        </h6>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge badge-glass-indigo perm-count">
                                                {selectedPages.length} selected
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleSelectAll}
                                                className="btn btn-sm btn-glass js-perm-all"
                                            >
                                                Select all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleClearAll}
                                                className="btn btn-sm btn-glass js-perm-none"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grouped Permission Cards */}
                                    <div className="permission-groups">
                                        {Object.entries(permissionGroups).map(([moduleKey, group]) => {
                                            const moduleActionKeys = group.actions.map(a => a.key);
                                            const allGroupSelected = moduleActionKeys.every(k => selectedPages.includes(k));

                                            return (
                                                <div key={moduleKey} className="permission-card" data-perm-module={moduleKey}>
                                                    <div className="permission-card__head">
                                                        <span className="badge badge-glass-indigo">{group.group_label}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGroupSelectAll(moduleKey)}
                                                            className="btn btn-sm btn-glass js-perm-group-all"
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
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
