import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { SharedProps } from '../types';

interface SidebarProps {
    isRail: boolean;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isRail, isMobileOpen, onCloseMobile }) => {
    const { url, props } = usePage<SharedProps>();
    const { auth, features } = props;
    const permissions = auth.permissions || [];
    const isAdmin = auth.user?.role === 'admin';

    const can = (perm: string) => isAdmin || permissions.includes(perm);
    const canAny = (perms: string[]) => isAdmin || perms.some(p => permissions.includes(p));

    const isActive = (path: string) => {
        if (path === '/dashboard') {
            return url === '/dashboard' || url === '/';
        }
        return url.startsWith(path);
    };

    return (
        <>
            {isMobileOpen && (
                <div
                    id="sidebar_backdrop"
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                id="sidebar"
                className={`${isRail ? 'sidebar-rail' : ''} ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
                style={{
                    width: isRail ? '70px' : '250px',
                    transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                <Link href="/dashboard" className="sidebar-brand">
                    <span className="brand-mark me-2 text-indigo-600">
                        <i className="fa fa-graduation-cap text-indigo"></i>
                    </span>
                    {!isRail && <span className="brand-text">ESection Portal</span>}
                </Link>

                <ul className="sidebar-menu">
                    <li className="nav-item">
                        <Link
                            href="/dashboard"
                            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                            title="Dashboard"
                        >
                            <i className="fa fa-dashboard me-3 w-5 text-center"></i>
                            {!isRail && <span className="link-text">Dashboard</span>}
                        </Link>
                    </li>

                    {can('students.create') && (
                        <li className="nav-item">
                            <Link
                                href="/students/new"
                                className={`nav-link ${isActive('/students/new') ? 'active' : ''}`}
                                title="New Form"
                            >
                                <i className="fa fa-plus-circle me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">New Form</span>}
                            </Link>
                        </li>
                    )}

                    {features.import && can('students.import') && (
                        <li className="nav-item">
                            <Link
                                href="/students/import"
                                className={`nav-link ${isActive('/students/import') ? 'active' : ''}`}
                                title="Import Excel"
                            >
                                <i className="fa fa-file-excel-o me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">Import Excel</span>}
                            </Link>
                        </li>
                    )}

                    {can('students.view') && (
                        <li className="nav-item">
                            <Link
                                href="/students/history"
                                className={`nav-link ${isActive('/students/history') || isActive('/students/batch') ? 'active' : ''}`}
                                title="Batch History"
                            >
                                <i className="fa fa-list-alt me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">Batch History</span>}
                            </Link>
                        </li>
                    )}

                    {can('confirmations.view') && (
                        <li className="nav-item">
                            <Link
                                href="/confirmations"
                                className={`nav-link ${isActive('/confirmations') ? 'active' : ''}`}
                                title="Eligibility Confirmation"
                            >
                                <i className="fa fa-check-square-o me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">Confirmations</span>}
                            </Link>
                        </li>
                    )}

                    {can('universities.view') && (
                        <li className="nav-item">
                            <Link
                                href="/universities"
                                className={`nav-link ${isActive('/universities') ? 'active' : ''}`}
                                title="University Directory"
                            >
                                <i className="fa fa-university me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">University Directory</span>}
                            </Link>
                        </li>
                    )}

                    {can('regularization.view') && (
                        <li className="nav-item">
                            <Link
                                href={can('regularization.create') ? '/regularization' : '/regularization/history'}
                                className={`nav-link ${isActive('/regularization') ? 'active' : ''}`}
                                title="Regularization"
                            >
                                <i className="fa fa-file-text-o me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">Regularization</span>}
                            </Link>
                        </li>
                    )}

                    {canAny(['reminders_university.view', 'reminders_student.view']) && (
                        <li className="nav-item">
                            <Link
                                href={can('reminders_university.view') ? '/reminders/university' : '/reminders/student'}
                                className={`nav-link ${isActive('/reminders') ? 'active' : ''}`}
                                title="Reminders"
                            >
                                <i className="fa fa-clock-o me-3 w-5 text-center"></i>
                                {!isRail && <span className="link-text">Reminders</span>}
                            </Link>
                        </li>
                    )}

                    {isAdmin && (
                        <>
                            <li className="nav-item">
                                <Link
                                    href="/bulk-email"
                                    className={`nav-link ${isActive('/bulk-email') ? 'active' : ''}`}
                                    title="Send Emails"
                                >
                                    <i className="fa fa-paper-plane me-3 w-5 text-center"></i>
                                    {!isRail && <span className="link-text">Send Emails</span>}
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link
                                    href="/settings"
                                    className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                                    title="Settings"
                                >
                                    <i className="fa fa-cog me-3 w-5 text-center"></i>
                                    {!isRail && <span className="link-text">Settings</span>}
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </aside>
        </>
    );
};
