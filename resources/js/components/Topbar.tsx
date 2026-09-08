import React, { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { SharedProps } from '../types';

interface TopbarProps {
    title?: string;
    isRail: boolean;
    onToggleRail: () => void;
    onToggleMobile: () => void;
    onOpenResetPassword: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
    title = 'IDOL Eligibility System',
    onToggleRail,
    onToggleMobile,
    onOpenResetPassword,
}) => {
    const { props } = usePage<SharedProps>();
    const { auth } = props;
    const [liveDate, setLiveDate] = useState<string>('');
    const [liveClock, setLiveClock] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Live clock updater
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setLiveClock(
                now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hourCycle: 'h12',
                })
            );
            const formattedDate = now.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
            setLiveDate(formattedDate);
        };

        updateClock();
        const intervalId = setInterval(updateClock, 1000);
        return () => clearInterval(intervalId);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSidebarToggle = () => {
        if (window.innerWidth >= 992) {
            onToggleRail();
        } else {
            onToggleMobile();
        }
    };

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDropdownOpen(false);

        Swal.fire({
            title: 'Log Out of E-Section?',
            text: 'Are you sure you want to exit your active staff session?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Log Out',
            cancelButtonText: 'Cancel',
            customClass: {
                confirmButton: 'btn btn-indigo',
                cancelButton: 'btn btn-glass ms-2',
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                router.post('/logout');
            }
        });
    };

    return (
        <header id="topbar" className="d-flex align-items-center justify-content-between px-3 px-md-4 py-2">
            <div className="d-flex align-items-center gap-3 topbar-title">
                <button
                    className="toggle-btn"
                    id="sidebar_toggle"
                    type="button"
                    onClick={handleSidebarToggle}
                    aria-label="Toggle navigation"
                >
                    <i className="fa fa-bars"></i>
                </button>
                <div className="text-truncate">
                    <h6 className="mb-0 fw-bold text-dark text-truncate">{title}</h6>
                    <small className="text-muted d-none d-sm-block" style={{ fontSize: '0.75rem' }}>
                        Institute of Distance &amp; Open Learning
                    </small>
                </div>
            </div>

            <div className="d-flex align-items-center gap-2 gap-md-3">
                {/* Live Clock Pill */}
                <div className="topbar-pill d-none d-md-inline-flex align-items-center px-3 py-1 bg-light rounded-pill border">
                    <i className="fa fa-calendar-o me-2 text-indigo"></i>
                    <span className="text-muted small fw-medium">{liveDate}</span>
                    <span className="text-secondary opacity-50 mx-2">|</span>
                    <i className="fa fa-clock-o me-2 text-indigo"></i>
                    <span className="text-muted font-monospace small fw-semibold">{liveClock}</span>
                </div>

                {/* Account Dropdown */}
                <div className="dropdown position-relative" ref={dropdownRef}>
                    <button
                        className="topbar-pill border-0 bg-transparent d-flex align-items-center px-2 py-1 rounded-pill"
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-expanded={isDropdownOpen}
                    >
                        <i className="fa fa-user-circle-o text-indigo fa-lg"></i>
                        <span className="font-monospace fw-bold text-dark mx-2 d-none d-sm-inline small">
                            {auth.user?.username || 'Staff'}
                        </span>
                        <span
                            className="badge badge-glass-indigo text-uppercase ms-1 ms-sm-0"
                            style={{ fontSize: '0.65rem' }}
                        >
                            {auth.user?.role || 'staff'}
                        </span>
                        <i className="fa fa-caret-down text-muted ms-2"></i>
                    </button>

                    {isDropdownOpen && (
                        <ul
                            className="dropdown-menu dropdown-menu-end glass-card border-secondary border-opacity-25 mt-2 show shadow-sm"
                            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 1050, minWidth: '180px' }}
                        >
                            <li className="px-3 py-2 d-sm-none">
                                <div className="small text-muted">Signed in as</div>
                                <div className="font-monospace fw-bold text-dark">
                                    {auth.user?.username || 'Staff'}
                                </div>
                            </li>
                            <li className="d-sm-none">
                                <hr className="dropdown-divider my-1" />
                            </li>
                            <li>
                                <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center py-2"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        onOpenResetPassword();
                                    }}
                                >
                                    <i className="fa fa-key me-2 text-indigo"></i> Reset Password
                                </button>
                            </li>
                            <li>
                                <hr className="dropdown-divider my-1" />
                            </li>
                            <li>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="dropdown-item d-flex align-items-center py-2 text-danger"
                                >
                                    <i className="fa fa-sign-out me-2"></i> Logout
                                </button>
                            </li>
                        </ul>
                    )}
                </div>
            </div>
        </header>
    );
};
