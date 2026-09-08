import React, { useState, useEffect } from 'react';
import { usePage, Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ResetPasswordModal } from './ResetPasswordModal';
import { SharedProps } from '../types';

interface AppLayoutProps {
    title?: string;
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ title = 'IDOL Eligibility System', children }) => {
    const { props } = usePage<SharedProps>();
    const { flash } = props;

    const [isRail, setIsRail] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('es_rail') === '1';
        }
        return false;
    });

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

    const toggleRail = () => {
        setIsRail((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('es_rail', next ? '1' : '0');
            }
            return next;
        });
    };

    // Listen to Inertia flash messages
    useEffect(() => {
        if (flash.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: flash.success,
                timer: 3000,
                showConfirmButton: false,
                customClass: { popup: 'es-swal' },
            });
        }
        if (flash.error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: flash.error,
                customClass: { popup: 'es-swal' },
            });
        }
        if (flash.warning) {
            Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: flash.warning,
                customClass: { popup: 'es-swal' },
            });
        }
        if (flash.info) {
            Swal.fire({
                icon: 'info',
                title: 'Notice',
                text: flash.info,
                customClass: { popup: 'es-swal' },
            });
        }
    }, [flash]);

    return (
        <div className={`es-app-container ${isRail ? 'es-rail' : ''} ${isMobileOpen ? 'es-drawer-open' : ''}`}>
            <Head title={title} />

            {/* Sidebar */}
            <Sidebar
                isRail={isRail}
                isMobileOpen={isMobileOpen}
                onCloseMobile={() => setIsMobileOpen(false)}
            />

            {/* Mobile backdrop scrim */}
            {isMobileOpen && (
                <div
                    id="sidebar_backdrop"
                    className="modal-backdrop fade show d-lg-none"
                    style={{ zIndex: 1040 }}
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Content Area */}
            <div id="content-wrapper">
                <Topbar
                    title={title}
                    isRail={isRail}
                    onToggleRail={toggleRail}
                    onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
                    onOpenResetPassword={() => setIsResetPasswordOpen(true)}
                />

                <main className="page-body">
                    {children}
                </main>
            </div>

            {/* Global Reset Password Modal */}
            <ResetPasswordModal
                isOpen={isResetPasswordOpen}
                onClose={() => setIsResetPasswordOpen(false)}
            />
        </div>
    );
};

export default AppLayout;
