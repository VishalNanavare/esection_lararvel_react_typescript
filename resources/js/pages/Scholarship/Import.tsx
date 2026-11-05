import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';

interface DiffItem {
    form_number: string;
    name: string;
    type: 'modified' | 'cancelled';
    description: string;
}

interface AnalysisStats {
    total_rows: number;
    new_count: number;
    unchanged_count: number;
    modified_count: number;
    cancelled_count: number;
    sample_diffs: DiffItem[];
}

export default function ScholarshipImport() {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [tempPath, setTempPath] = useState<string | null>(null);
    const [stats, setStats] = useState<AnalysisStats | null>(null);

    // Conflict Resolution Options
    const [skipUnchanged, setSkipUnchanged] = useState(true);
    const [updateModified, setUpdateModified] = useState(true);
    const [addNew, setAddNew] = useState(true);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
            setTempPath(null);
        }
    };

    const runAnalysis = async () => {
        if (!file) {
            Swal.fire('Please Select File', 'Choose a student admission Excel file (e.g. PAIDAPPLICANTREPORTS_*.xlsx).', 'warning');
            return;
        }

        setAnalyzing(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/scholarship/import/analyze', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setTempPath(data.temp_path);
                Swal.fire({
                    icon: 'success',
                    title: 'Analysis Complete',
                    text: `Scanned ${data.stats.total_rows.toLocaleString()} rows. Review the comparison below before executing.`,
                    timer: 2500,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire('Scan Error', data.message || 'Failed to inspect file.', 'error');
            }
        } catch {
            Swal.fire('Error', 'Server error while analyzing spreadsheet.', 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    const executeImport = async () => {
        if (!tempPath) return;

        const confirm = await Swal.fire({
            title: 'Confirm Import Execution',
            text: `Import will add ${stats?.new_count} new applicants and update ${stats?.modified_count} modified records. Manual staff checklists and payment receipts are 100% protected.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Execute Import',
            confirmButtonColor: '#2563eb',
            cancelButtonText: 'Cancel',
        });

        if (!confirm.isConfirmed) return;

        setExecuting(true);
        try {
            const res = await fetch('/scholarship/import/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    temp_path: tempPath,
                    skip_unchanged: skipUnchanged,
                    update_modified: updateModified,
                    add_new: addNew,
                }),
            });

            const data = await res.json();
            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Sync Complete!',
                    text: data.message,
                    confirmButtonText: 'Go to Scholarship Roster',
                });
                router.visit('/scholarship');
            } else {
                Swal.fire('Import Error', data.message || 'Failed to execute import.', 'error');
            }
        } catch {
            Swal.fire('Error', 'Network or server error during import.', 'error');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <AppLayout title="Import Student Admission Excel">
            <div className="container-fluid px-3 px-md-4 py-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <h3 className="fw-bold mb-1 text-dark">
                            <i className="fa fa-cloud-upload text-primary me-2"></i>
                            Import Student Admission Data (Scholarship)
                        </h3>
                        <p className="text-muted small mb-0">
                            Upload admission exports (e.g. <code>PAIDAPPLICANTREPORTS_*.xlsx</code>). System automatically links Academic Years, Courses, and Reservation Categories.
                        </p>
                    </div>
                    <Link href="/scholarship" className="btn btn-outline-secondary">
                        <i className="fa fa-arrow-left me-1"></i> Back to Roster
                    </Link>
                </div>

                {/* Upload Card */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-4">
                        <h6 className="fw-bold text-dark mb-3">1. Select Admission Spreadsheet</h6>
                        <div className="row g-3 align-items-center">
                            <div className="col-md-8">
                                <input
                                    type="file"
                                    className="form-control form-control-lg"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                    disabled={analyzing || executing}
                                />
                                <div className="form-text small">
                                    Supported format: Microsoft Excel (<code>.xlsx</code>, <code>.xls</code>). Up to 50MB.
                                </div>
                            </div>
                            <div className="col-md-4">
                                <button
                                    className="btn btn-primary btn-lg w-100"
                                    onClick={runAnalysis}
                                    disabled={!file || analyzing || executing}
                                >
                                    {analyzing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Scanning 13,000+ Rows...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-search me-2"></i>
                                            Pre-Scan & Check Differences
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis & Conflict Resolution Area */}
                {stats && (
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-dark text-white py-3">
                            <h5 className="fw-bold mb-0 text-white">
                                <i className="fa fa-balance-scale me-2"></i>
                                2. Comparison Analysis & Decision Matrix
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            {/* Summary Metrics */}
                            <div className="row g-3 mb-4 text-center">
                                <div className="col-md-3">
                                    <div className="card bg-light border p-3">
                                        <div className="small text-muted text-uppercase">Total Rows in File</div>
                                        <h3 className="fw-bold text-dark mb-0">{stats.total_rows.toLocaleString()}</h3>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-success bg-opacity-10 border-success p-3">
                                        <div className="small text-success text-uppercase fw-semibold">➕ Brand New Students</div>
                                        <h3 className="fw-bold text-success mb-0">{stats.new_count.toLocaleString()}</h3>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-primary bg-opacity-10 border-primary p-3">
                                        <div className="small text-primary text-uppercase fw-semibold">⏩ Unchanged / Identical</div>
                                        <h3 className="fw-bold text-primary mb-0">{stats.unchanged_count.toLocaleString()}</h3>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-warning bg-opacity-10 border-warning p-3">
                                        <div className="small text-warning text-dark text-uppercase fw-semibold">⚠️ Modified / Changed</div>
                                        <h3 className="fw-bold text-dark mb-0">{stats.modified_count.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* User Selection Options */}
                            <div className="card bg-light border-0 p-3 mb-4">
                                <h6 className="fw-bold text-dark mb-3">Configure Import Policies:</h6>

                                <div className="form-check form-switch mb-2">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="opt_skip"
                                        checked={skipUnchanged}
                                        onChange={(e) => setSkipUnchanged(e.target.checked)}
                                    />
                                    <label className="form-check-label fw-medium" htmlFor="opt_skip">
                                        <strong>Skip Unchanged Records</strong> (Recommended: Fast & safe, discards identical rows)
                                    </label>
                                </div>

                                <div className="form-check form-switch mb-2">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="opt_mod"
                                        checked={updateModified}
                                        onChange={(e) => setUpdateModified(e.target.checked)}
                                    />
                                    <label className="form-check-label fw-medium" htmlFor="opt_mod">
                                        <strong>Update Modified Records</strong> (Updates portal changes like course transfer or payment status, while <strong>100% protecting existing clerk document ticks & installment receipts</strong>)
                                    </label>
                                </div>

                                <div className="form-check form-switch mb-2">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="opt_new"
                                        checked={addNew}
                                        onChange={(e) => setAddNew(e.target.checked)}
                                    />
                                    <label className="form-check-label fw-medium" htmlFor="opt_new">
                                        <strong>Insert Brand New Students</strong> (Adds newly admitted candidates to the scholarship roster)
                                    </label>
                                </div>
                            </div>

                            {/* Diffs Preview Table */}
                            {stats.sample_diffs.length > 0 && (
                                <div className="mb-4">
                                    <h6 className="fw-bold text-dark mb-2">Sample Detected Differences in Uploaded File:</h6>
                                    <div className="table-responsive border rounded">
                                        <table className="table table-sm table-hover mb-0">
                                            <thead className="table-light small">
                                                <tr>
                                                    <th>Form Number</th>
                                                    <th>Student Name</th>
                                                    <th>Change Type</th>
                                                    <th>Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.sample_diffs.map((d, idx) => (
                                                    <tr key={idx}>
                                                        <td className="font-monospace fw-bold">{d.form_number}</td>
                                                        <td>{d.name}</td>
                                                        <td>
                                                            <span className={`badge ${d.type === 'cancelled' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                                                {d.type.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="small text-muted">{d.description}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Execution Button */}
                            <div className="d-flex justify-content-end gap-2">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => { setStats(null); setTempPath(null); }}
                                    disabled={executing}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-success btn-lg px-4"
                                    onClick={executeImport}
                                    disabled={executing}
                                >
                                    {executing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Syncing Database...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-check me-2"></i>
                                            Confirm & Execute Import
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
