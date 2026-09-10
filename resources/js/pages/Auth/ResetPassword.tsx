import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

interface ResetPasswordProps {
    token: string;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ token }) => {
    const { data, setData, post, processing, errors } = useForm({
        token,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/reset-password');
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 py-5 bg-light">
            <Head title="Reset Password - E-Section Portal" />

            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-11 col-sm-8 col-md-6 col-lg-4">
                        <div className="card glass-card p-4 shadow-sm border-0 rounded-4">
                            <div className="text-center mb-4">
                                <div
                                    className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3"
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        background: '#e0e7ff',
                                        border: '1px solid #c7d2fe',
                                    }}
                                >
                                    <i className="fa fa-lock fa-2x text-indigo"></i>
                                </div>
                                <h3 className="fw-bold mb-1 text-dark">Reset Password</h3>
                                <p className="text-muted small">
                                    Choose a new password for your account (8-10 characters).
                                </p>
                            </div>

                            {errors.password && (
                                <div
                                    className="alert alert-danger bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 mb-3 small"
                                    role="alert"
                                >
                                    <i className="fa fa-exclamation-circle me-1"></i> {errors.password}
                                </div>
                            )}

                            {errors.password_confirmation && (
                                <div
                                    className="alert alert-danger bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 mb-3 small"
                                    role="alert"
                                >
                                    <i className="fa fa-exclamation-circle me-1"></i> {errors.password_confirmation}
                                </div>
                            )}

                            <form onSubmit={submit}>
                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">
                                        New Password
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-secondary border-opacity-25 text-muted">
                                            <i className="fa fa-lock"></i>
                                        </span>
                                        <input
                                            type="password"
                                            name="password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className="form-control"
                                            placeholder="••••••••"
                                            minLength={8}
                                            maxLength={10}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Confirm New Password
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-secondary border-opacity-25 text-muted">
                                            <i className="fa fa-lock"></i>
                                        </span>
                                        <input
                                            type="password"
                                            name="password_confirmation"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className="form-control"
                                            placeholder="••••••••"
                                            minLength={8}
                                            maxLength={10}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-indigo w-100 py-2 fw-semibold"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-2"></i> Resetting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-check me-2"></i> Reset Password
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-center">
                                <Link href="/login" className="small text-indigo">
                                    <i className="fa fa-arrow-left me-1"></i> Back to Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
