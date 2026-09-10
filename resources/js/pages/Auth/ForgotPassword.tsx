import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { SharedProps } from '../../types';

export const ForgotPassword: React.FC = () => {
    const { props } = usePage<SharedProps>();
    const status = props.flash?.success;
    const errorMessage = props.flash?.error;

    const { data, setData, post, processing, errors } = useForm({
        identifier: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 py-5 bg-light">
            <Head title="Forgot Password - E-Section Portal" />

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
                                <h3 className="fw-bold mb-1 text-dark">Forgot Password</h3>
                                <p className="text-muted small">
                                    Enter your username or email and we'll send you a reset link.
                                </p>
                            </div>

                            {status && (
                                <div
                                    className="alert alert-success bg-success bg-opacity-10 text-success border-success border-opacity-25 rounded-3 mb-3 small"
                                    role="status"
                                >
                                    <i className="fa fa-check-circle me-1"></i> {status}
                                </div>
                            )}

                            {errorMessage && (
                                <div
                                    className="alert alert-danger bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 mb-3 small"
                                    role="alert"
                                >
                                    <i className="fa fa-exclamation-circle me-1"></i> {errorMessage}
                                </div>
                            )}

                            {errors.identifier && (
                                <div
                                    className="alert alert-danger bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 mb-3 small"
                                    role="alert"
                                >
                                    <i className="fa fa-exclamation-circle me-1"></i> {errors.identifier}
                                </div>
                            )}

                            <form onSubmit={submit}>
                                <div className="mb-4">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Username or Email
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-secondary border-opacity-25 text-muted">
                                            <i className="fa fa-user"></i>
                                        </span>
                                        <input
                                            type="text"
                                            name="identifier"
                                            value={data.identifier}
                                            onChange={(e) => setData('identifier', e.target.value)}
                                            className="form-control"
                                            placeholder="e.g. esection1 or you@example.com"
                                            required
                                            autoFocus
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
                                            <i className="fa fa-spinner fa-spin me-2"></i> Sending...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-paper-plane me-2"></i> Send Reset Link
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

export default ForgotPassword;
