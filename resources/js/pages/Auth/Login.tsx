import React from 'react';
import { Head, useForm } from '@inertiajs/react';

interface LoginProps {
    status?: string;
}

export const Login: React.FC<LoginProps> = ({ status }) => {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 py-5 bg-light">
            <Head title="Login - E-Section Verification Portal" />

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
                                    <i className="fa fa-shield fa-2x text-indigo"></i>
                                </div>
                                <h3 className="fw-bold mb-1 text-dark">E-Section Portal</h3>
                                <p className="text-muted small">
                                    Institute of Distance &amp; Open Learning (IDOL)
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

                            {errors.username && (
                                <div
                                    className="alert alert-danger bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 mb-3 small"
                                    role="alert"
                                >
                                    <i className="fa fa-exclamation-circle me-1"></i> {errors.username}
                                </div>
                            )}

                            {errors.password && (
                                <div
                                    className="alert alert-danger bg-danger bg-opacity-10 text-danger border-danger border-opacity-25 rounded-3 mb-3 small"
                                    role="alert"
                                >
                                    <i className="fa fa-exclamation-circle me-1"></i> {errors.password}
                                </div>
                            )}

                            <form onSubmit={submit}>
                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Username
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-secondary border-opacity-25 text-muted">
                                            <i className="fa fa-user"></i>
                                        </span>
                                        <input
                                            type="text"
                                            name="username"
                                            value={data.username}
                                            onChange={(e) => setData('username', e.target.value)}
                                            className="form-control"
                                            placeholder="e.g. esection1 or admin"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Password
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
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-3 form-check">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        className="form-check-input"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                    />
                                    <label className="form-check-label text-muted small" htmlFor="remember">
                                        Remember this device
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-indigo w-100 py-2 fw-semibold"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-2"></i> Signing In...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-sign-in me-2"></i> Log In to Dashboard
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-4 text-center">
                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    &copy; {new Date().getFullYear()} IDOL Eligibility Section. All rights reserved.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
