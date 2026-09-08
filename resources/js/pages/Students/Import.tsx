import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { AppLayout } from '../../components/AppLayout';

export const Import: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewRows, setPreviewRows] = useState<any[]>([]);

    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('candidate_sheet', file);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch('/students/read-candidate-sheet', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || data.status === 'error') {
                throw new Error(data.message || 'Failed to read Excel workbook.');
            }

            setPreviewRows(data.data || []);
            Swal.fire({
                icon: 'success',
                title: 'File Parsed',
                text: `Found ${data.count} candidates in workbook.`,
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Import Error',
                text: err.message || 'Failed to parse workbook.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AppLayout title="Import Candidates from Excel - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h3 className="fw-bold mb-1">
                                    <i className="fa fa-file-excel-o me-2 text-emerald"></i> Import Candidates from Excel
                                </h3>
                                <p className="text-muted small mb-0">
                                    Bulk upload candidate sheets to quickly assemble verification dispatch batches.
                                </p>
                            </div>
                            <Link href="/students/new" className="btn btn-glass">
                                <i className="fa fa-arrow-left me-1"></i> Back to New Form
                            </Link>
                        </div>

                        {/* Upload Form */}
                        <div className="p-4 bg-light rounded-3 border mb-4">
                            <form onSubmit={handlePreview}>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-8">
                                        <label className="form-label small fw-semibold text-secondary">
                                            Select Excel Workbook (.xlsx, .xls)
                                        </label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            accept=".xlsx, .xls"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            required
                                        />
                                        <div className="form-text small text-muted mt-1">
                                            Sheet format: Column A (Name), Column B (Nee Name), Column C (Case No), Column D (Remarks), Column E (Email).
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <button
                                            type="submit"
                                            className="btn btn-emerald w-100"
                                            disabled={isUploading || !file}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <i className="fa fa-spinner fa-spin me-2"></i> Reading File...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa fa-search me-2"></i> Preview Workbook
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Preview Table */}
                        {previewRows.length > 0 && (
                            <div className="mt-4">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h5 className="fw-bold mb-0">
                                        <i className="fa fa-table me-2 text-indigo"></i> Workbook Preview ({previewRows.length} Candidates)
                                    </h5>
                                    <Link href="/students/new" className="btn btn-indigo">
                                        <i className="fa fa-arrow-right me-1"></i> Proceed to Verification Form
                                    </Link>
                                </div>

                                <div className="table-responsive rounded-3 border">
                                    <table className="table table-sm table-glass align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Candidate Name</th>
                                                <th>Nee Name</th>
                                                <th>Eligibility Case No</th>
                                                <th>Verification Remarks</th>
                                                <th>Email</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((r, idx) => (
                                                <tr key={idx}>
                                                    <td className="fw-semibold text-muted">{idx + 1}</td>
                                                    <td className="fw-bold">{r.student_name}</td>
                                                    <td className="text-muted">{r.student_nee_name || '—'}</td>
                                                    <td>
                                                        <span className="font-monospace text-indigo fw-semibold">
                                                            {r.eligibility_case_no}
                                                        </span>
                                                    </td>
                                                    <td>{r.verification_of_marksheet_done_by_you}</td>
                                                    <td className="small text-muted">{r.email || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Import;
