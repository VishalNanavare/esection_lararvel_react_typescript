import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6 || newPassword.length > 64) {
            setError('New password must be between 6 and 64 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('The two new passwords do not match.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('New password must differ from your current one.');
            return;
        }

        setIsSubmitting(true);

        router.post(
            '/change-password',
            {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    onClose();
                    Swal.fire({
                        icon: 'success',
                        title: 'Password Changed',
                        text: 'Your account password has been updated successfully.',
                        timer: 3000,
                        showConfirmButton: false,
                    });
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const msg =
                        errors.current_password ||
                        errors.new_password ||
                        errors.confirm_password ||
                        errors.error ||
                        'Failed to change password. Please check your current password.';
                    setError(String(msg));
                },
            }
        );
    };

    return (
        <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content glass-card border-secondary border-opacity-25 shadow-lg">
                    <div className="modal-header border-bottom border-secondary border-opacity-25">
                        <h5 className="modal-title fw-bold text-dark">
                            <i className="fa fa-key me-2 text-indigo"></i> Reset Password
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            aria-label="Close"
                            disabled={isSubmitting}
                        ></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="alert bg-info bg-opacity-10 text-info border-info border-opacity-25 rounded-3 small mb-3">
                                <i className="fa fa-info-circle me-1"></i>
                                Your new password must be between <strong>6</strong> and{' '}
                                <strong>64</strong> characters, and must differ from your current one.
                            </div>

                            {error && (
                                <div className="alert bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 small mb-3">
                                    <i className="fa fa-exclamation-circle me-1"></i> {error}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="rp_current">
                                    Current password
                                </label>
                                <input
                                    type="password"
                                    id="rp_current"
                                    className="form-control"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="rp_new">
                                    New password
                                </label>
                                <input
                                    type="password"
                                    id="rp_new"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                    maxLength={64}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            <div className="mb-1">
                                <label className="form-label text-secondary small fw-semibold" htmlFor="rp_confirm">
                                    Confirm new password
                                </label>
                                <input
                                    type="password"
                                    id="rp_confirm"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={6}
                                    maxLength={64}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="modal-footer border-top border-secondary border-opacity-25">
                            <button
                                type="button"
                                className="btn btn-glass"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-indigo" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <i className="fa fa-spinner fa-spin me-1"></i> Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa fa-check me-1"></i> Change password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
