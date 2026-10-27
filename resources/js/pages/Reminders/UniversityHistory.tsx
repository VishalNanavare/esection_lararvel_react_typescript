import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface BatchSummary {
    id: number;
    academic_year: string;
    university_name: string;
    admission_taken_in: string | null;
    student_count?: number;
    legacy_array_space?: number | null;
    is_consolidated?: boolean;
    consolidated_meta?: any;
    created_at: string | null;
}

interface PreviewCandidate {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    admission_taken_in: string;
    admission_taken_year: string;
    source_batch_ids: number[];
}

interface ExcludedCandidate {
    id: number;
    student_name: string;
    eligibility_case_no: string;
    reason: string;
}

interface SourceBatchInfo {
    id: number;
    academic_year: string;
    admission_taken_in: string | null;
    head_name: string | null;
    created_by: string | null;
    created_at: string | null;
    candidate_count: number;
}

interface PreviewResponse {
    university_name: string;
    source_batches: SourceBatchInfo[];
    academic_years: string[];
    courses: string[];
    pre_dedup_count: number;
    unique_candidates_count: number;
    duplicates_removed_count: number;
    verified_excluded_count: number;
    explicitly_excluded_count: number;
    other_ineligible_count: number;
    final_eligible_count: number;
    eligible_candidates: PreviewCandidate[];
    excluded_candidates: ExcludedCandidate[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
}

interface Props {
    batches: PaginatedData<BatchSummary>;
    filters: {
        university: string;
        year: string;
        student_name?: string;
    };
}

export default function UniversityHistory({ batches, filters }: Props) {
    const [university, setUniversity] = useState(filters.university || '');
    const [year, setYear] = useState(filters.year || '');
    const [studentName, setStudentName] = useState(filters.student_name || '');

    // Batch consolidation selection state
    const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
    const [consolidatedHeadName, setConsolidatedHeadName] = useState('The Controller of Examinations');
    const [consolidatedNoteText, setConsolidatedNoteText] = useState('Consolidated Reminder Notice');
    const [isCombining, setIsCombining] = useState(false);
    const [showExcludedTab, setShowExcludedTab] = useState(false);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/reminders/university/history', {
            university,
            year,
            student_name: studentName,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    // Toggle individual batch selection
    const handleToggleBatchSelect = (batch: BatchSummary) => {
        const id = batch.id;
        setSelectedBatchIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            }
            // If already selecting batches, check if this batch belongs to the same university
            if (prev.length > 0) {
                const firstSelectedBatch = batches.data.find((b) => prev.includes(b.id));
                if (firstSelectedBatch && firstSelectedBatch.university_name.trim().toLowerCase() !== batch.university_name.trim().toLowerCase()) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Same University Required',
                        text: `You cannot combine batches across different universities. Currently selecting batches for "${firstSelectedBatch.university_name}".`,
                    });
                    return prev;
                }
            }
            return [...prev, id];
        });
    };

    // Determine eligible batches that match the current selection's university
    const targetUnivForSelection = selectedBatchIds.length > 0
        ? batches.data.find((b) => selectedBatchIds.includes(b.id))?.university_name
        : (filters.university || (batches.data[0]?.university_name ?? null));

    const eligibleBatchesOnPage = targetUnivForSelection
        ? batches.data.filter((b) => b.university_name.trim().toLowerCase() === targetUnivForSelection.trim().toLowerCase())
        : batches.data;

    const isAllEligibleSelected = eligibleBatchesOnPage.length > 0 && eligibleBatchesOnPage.every((b) => selectedBatchIds.includes(b.id));

    const handleToggleSelectAllEligible = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedBatchIds(eligibleBatchesOnPage.map((b) => b.id));
        } else {
            setSelectedBatchIds([]);
        }
    };

    // Open Consolidation Preview Modal
    const handleOpenCombinePreview = async () => {
        if (selectedBatchIds.length === 0) {
            Swal.fire('No Batches Selected', 'Please check at least one batch to combine.', 'warning');
            return;
        }

        // Validate on client that all selected batches belong to the same university
        const selectedBatches = batches.data.filter((b) => selectedBatchIds.includes(b.id));
        const uniqueUnivs = Array.from(new Set(selectedBatches.map((b) => b.university_name.trim())));
        if (uniqueUnivs.length > 1) {
            Swal.fire({
                icon: 'error',
                title: 'Cross-University Consolidation Disallowed',
                text: `Selected batches belong to different universities: ${uniqueUnivs.join(', ')}. Please select batches belonging to only one university.`,
            });
            return;
        }

        setIsPreviewLoading(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/reminders/university/batches/preview-combine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    batch_ids: selectedBatchIds,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to generate preview for batch consolidation.');
            }

            setPreviewData(data);
            setConsolidatedHeadName(data.source_batches?.[0]?.head_name || 'The Controller of Examinations');
            setShowPreviewModal(true);
        } catch (err: any) {
            Swal.fire('Consolidation Preview Error', err.message || 'An error occurred while preparing preview.', 'error');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // Execute Consolidation
    const handleExecuteConsolidation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!previewData || previewData.final_eligible_count === 0) {
            Swal.fire('No Eligible Candidates', 'All candidates in the selected batches have completed verification or are excluded.', 'warning');
            return;
        }

        setIsCombining(true);
        router.post(
            '/reminders/university/batches/combine',
            {
                batch_ids: selectedBatchIds,
                note_text: consolidatedNoteText,
                head_name: consolidatedHeadName,
                note_date: new Date().toISOString().split('T')[0],
            },
            {
                onSuccess: (page) => {
                    setIsCombining(false);
                    setShowPreviewModal(false);
                    setSelectedBatchIds([]);
                    const flash = (page.props as any).flash;
                    const pdfUrl = flash?.pdf_url;

                    Swal.fire({
                        icon: 'success',
                        title: 'Consolidated Reminder Batch Created!',
                        text: `Consolidated campaign created with ${previewData.final_eligible_count} eligible candidate(s).`,
                        showCancelButton: !!pdfUrl,
                        confirmButtonText: pdfUrl ? '<i class="fa fa-print me-1"></i> Print Consolidated Notice' : 'View Batch',
                        cancelButtonText: 'View Batch Detail',
                    }).then((result) => {
                        if (result.isConfirmed && pdfUrl) {
                            window.open(pdfUrl, '_blank');
                        }
                    });
                },
                onError: (errs) => {
                    setIsCombining(false);
                    Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to combine batches.', 'error');
                },
            }
        );
    };

    return (
        <AppLayout>
            <Head title="University Reminder History" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> University Reminder Batches
                                </h3>
                                <p className="text-muted small mb-0">
                                    Historical reminder notices generated for target universities. Select multiple batches to combine into a consolidated campaign.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-emerald"
                                    disabled={selectedBatchIds.length === 0 || isPreviewLoading}
                                    onClick={handleOpenCombinePreview}
                                    title="Combine selected batches from the same university into a consolidated reminder notice"
                                >
                                    {isPreviewLoading ? (
                                        <>
                                            <i className="fa fa-spinner fa-spin me-1"></i> Preparing Preview...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-object-group me-1"></i> Combine Pending Batches
                                            {selectedBatchIds.length > 0 && ` (${selectedBatchIds.length})`}
                                        </>
                                    )}
                                </button>
                                <Link href="/reminders/university" className="btn btn-indigo">
                                    <i className="fa fa-plus me-1"></i> New University Reminder
                                </Link>
                            </div>
                        </div>

                        {/* Filter */}
                        <form onSubmit={handleFilter} className="row g-3 mb-4 filter-panel p-3 bg-light rounded border">
                            <div className="col-md-4">
                                <label className="form-label small fw-semibold text-secondary">University Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by university..."
                                    value={university}
                                    onChange={(e) => setUniversity(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold text-secondary">Academic Year</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. 2025-2026"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold text-secondary">Student Name / Case No</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search student or case no..."
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                />
                            </div>
                            <div className="col-md-2 d-flex align-items-end gap-2">
                                <Link href="/reminders/university/history" className="btn btn-glass" title="Reset">
                                    <i className="fa fa-refresh"></i>
                                </Link>
                                <button type="submit" className="btn btn-indigo flex-grow-1">
                                    <i className="fa fa-filter me-1"></i> Filter
                                </button>
                            </div>
                        </form>

                        {/* Batch Selection Banner */}
                        {selectedBatchIds.length > 0 && (
                            <div className="alert alert-indigo d-flex align-items-center justify-content-between p-3 mb-3 border-0 bg-indigo bg-opacity-10 text-indigo rounded-3">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="fa fa-check-square-o fs-5"></i>
                                    <span>
                                        <strong>{selectedBatchIds.length}</strong> batch(es) selected for university: <strong>{targetUnivForSelection}</strong>
                                    </span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-glass text-secondary"
                                        onClick={() => setSelectedBatchIds([])}
                                    >
                                        Deselect All
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-indigo"
                                        onClick={handleOpenCombinePreview}
                                    >
                                        <i className="fa fa-object-group me-1"></i> Preview & Combine
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="table-responsive">
                            <table className="table table-glass table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }} className="col-sr">
                                            <input
                                                type="checkbox"
                                                id="check_all_eligible"
                                                checked={isAllEligibleSelected}
                                                onChange={handleToggleSelectAllEligible}
                                                aria-label="Select all eligible batches"
                                                title="Select all eligible batches for this university"
                                            />
                                        </th>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th>Target University</th>
                                        <th>Academic Year</th>
                                        <th>Course / Division</th>
                                        <th>Candidates Included</th>
                                        <th>Created Date</th>
                                        <th className="text-end" style={{ width: '180px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-5">
                                                <i className="fa fa-folder-open-o fa-2x mb-2 d-block text-secondary opacity-50"></i>
                                                No reminder batches found.
                                            </td>
                                        </tr>
                                    ) : (
                                        batches.data.map((b, idx) => {
                                            const srNo = ((batches.current_page - 1) * batches.per_page) + idx + 1;
                                            const isSelected = selectedBatchIds.includes(b.id);

                                            return (
                                                <tr key={b.id} className={isSelected ? 'table-primary-subtle' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleBatchSelect(b)}
                                                            aria-label={`Select Batch #${b.id}`}
                                                        />
                                                    </td>
                                                    <td className="text-muted fw-semibold">{srNo}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <strong className="text-dark fs-6">{b.university_name}</strong>
                                                            {b.is_consolidated && (
                                                                <span className="badge badge-glass-indigo" title="Consolidated from multiple source batches">
                                                                    <i className="fa fa-object-group me-1"></i>Consolidated
                                                                </span>
                                                            )}
                                                            {b.legacy_array_space !== undefined && b.legacy_array_space !== null && b.legacy_array_space > 0 && (
                                                                <span className="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-0" title={`Old Batch ID array_space #${b.legacy_array_space} (from rem_view.php)`}>
                                                                    Old Batch #{b.legacy_array_space}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {b.academic_year}
                                                        </span>
                                                    </td>
                                                    <td className="small text-secondary">{b.admission_taken_in || '-'}</td>
                                                    <td>
                                                        <span className="badge bg-indigo bg-opacity-10 text-indigo border border-indigo border-opacity-25 px-2 py-1">
                                                            {b.student_count || 0} Candidates
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted">
                                                        {b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="text-end">
                                                        <Link
                                                            href={`/reminders/university/batches/${b.id}`}
                                                            className="btn btn-sm btn-glass text-indigo me-1"
                                                        >
                                                            <i className="fa fa-eye me-1"></i> View
                                                        </Link>
                                                        <a
                                                            href={`/pdf/reminders/university/${b.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-glass text-secondary"
                                                            title="Print Notice"
                                                        >
                                                            <i className="fa fa-print"></i> Print
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {batches.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                <small className="text-muted">
                                    Page {batches.current_page} of {batches.last_page}
                                </small>
                                <ul className="pagination pagination-sm mb-0">
                                    {batches.links.map((link, i) => (
                                        <li
                                            key={i}
                                            className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                        >
                                            <Link
                                                href={link.url || '#'}
                                                className="page-link"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                preserveScroll
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Consolidated Reminder Preview Modal */}
            {showPreviewModal && previewData && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content glass-card border-0 shadow">
                            <form onSubmit={handleExecuteConsolidation}>
                                <div className="modal-header border-bottom bg-light py-3">
                                    <div>
                                        <h5 className="modal-title fw-bold text-dark mb-0">
                                            <i className="fa fa-object-group me-2 text-indigo"></i>
                                            Consolidated Reminder Preview — {previewData.university_name}
                                        </h5>
                                        <small className="text-muted">
                                            Combining {previewData.source_batches.length} selected batches into one unified reminder notice
                                        </small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowPreviewModal(false)}
                                        aria-label="Close"
                                    ></button>
                                </div>
                                <div className="modal-body p-4">
                                    {/* Source Batches Tags */}
                                    <div className="mb-3">
                                        <label className="form-label text-secondary small fw-semibold text-uppercase">
                                            Source Batches Selected ({previewData.source_batches.length})
                                        </label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {previewData.source_batches.map((sb) => (
                                                <span key={sb.id} className="badge badge-glass-indigo p-2 fs-6">
                                                    Batch #{sb.id} ({sb.academic_year}) — {sb.admission_taken_in || 'All Programs'} [{sb.candidate_count} candidates]
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Consolidation Metrics Breakdown */}
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-2 col-4">
                                            <div className="card border-0 bg-light p-2 text-center rounded-3">
                                                <small className="text-secondary">Pre-Dedup Total</small>
                                                <h4 className="fw-bold text-dark mb-0">{previewData.pre_dedup_count}</h4>
                                            </div>
                                        </div>
                                        <div className="col-md-2 col-4">
                                            <div className="card border-0 bg-light p-2 text-center rounded-3">
                                                <small className="text-secondary">Unique Students</small>
                                                <h4 className="fw-bold text-indigo mb-0">{previewData.unique_candidates_count}</h4>
                                            </div>
                                        </div>
                                        <div className="col-md-2 col-4">
                                            <div className="card border-0 bg-light p-2 text-center rounded-3">
                                                <small className="text-secondary">Duplicates Removed</small>
                                                <h4 className="fw-bold text-secondary mb-0">{previewData.duplicates_removed_count}</h4>
                                            </div>
                                        </div>
                                        <div className="col-md-2 col-4">
                                            <div className="card border-0 bg-emerald bg-opacity-10 p-2 text-center rounded-3">
                                                <small className="text-emerald">Verified Excluded</small>
                                                <h4 className="fw-bold text-emerald mb-0">{previewData.verified_excluded_count}</h4>
                                            </div>
                                        </div>
                                        <div className="col-md-2 col-4">
                                            <div className="card border-0 bg-danger bg-opacity-10 p-2 text-center rounded-3">
                                                <small className="text-danger">Explicitly Excluded</small>
                                                <h4 className="fw-bold text-danger mb-0">{previewData.explicitly_excluded_count}</h4>
                                            </div>
                                        </div>
                                        <div className="col-md-2 col-4">
                                            <div className="card border-0 bg-amber bg-opacity-15 p-2 text-center rounded-3">
                                                <small className="text-amber fw-semibold">Final Send List</small>
                                                <h4 className="fw-bold text-amber mb-0">{previewData.final_eligible_count}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Empty state warning if no eligible candidates */}
                                    {previewData.final_eligible_count === 0 ? (
                                        <div className="alert alert-warning d-flex align-items-center gap-2 p-3 my-3">
                                            <i className="fa fa-exclamation-triangle fs-4 text-warning"></i>
                                            <div>
                                                <strong>All candidates excluded:</strong> All students in the selected batches have completed verification or are otherwise ineligible for a reminder.
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Form Options */}
                                    <div className="row g-3 mb-4 p-3 bg-light rounded-3 border">
                                        <div className="col-md-6">
                                            <label className="form-label text-secondary small fw-semibold">
                                                Reminder Notice Title / Type
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={consolidatedNoteText}
                                                onChange={(e) => setConsolidatedNoteText(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-secondary small fw-semibold">
                                                Head Name (To Address)
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={consolidatedHeadName}
                                                onChange={(e) => setConsolidatedHeadName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Tab toggle between Eligible and Excluded */}
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <ul className="nav nav-pills">
                                            <li className="nav-item">
                                                <button
                                                    type="button"
                                                    className={`nav-link py-1 px-3 ${!showExcludedTab ? 'active btn-indigo' : ''}`}
                                                    onClick={() => setShowExcludedTab(false)}
                                                >
                                                    Eligible Candidates ({previewData.eligible_candidates.length})
                                                </button>
                                            </li>
                                            {previewData.excluded_candidates.length > 0 && (
                                                <li className="nav-item ms-2">
                                                    <button
                                                        type="button"
                                                        className={`nav-link py-1 px-3 ${showExcludedTab ? 'active btn-danger' : 'text-danger'}`}
                                                        onClick={() => setShowExcludedTab(true)}
                                                    >
                                                        Excluded / Skipped ({previewData.excluded_candidates.length})
                                                    </button>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Candidates Table */}
                                    {!showExcludedTab ? (
                                        <div className="table-responsive" style={{ maxHeight: '320px' }}>
                                            <table className="table table-sm table-glass align-middle mb-0">
                                                <thead className="table-light sticky-top">
                                                    <tr>
                                                        <th style={{ width: '40px' }}>#</th>
                                                        <th>Candidate Name</th>
                                                        <th>Eligibility Case No.</th>
                                                        <th>Course / Program</th>
                                                        <th>Academic Year</th>
                                                        <th>Originating Batches</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewData.eligible_candidates.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="text-center text-muted py-4">
                                                                No eligible candidates remain to send.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        previewData.eligible_candidates.map((c, i) => (
                                                            <tr key={c.id}>
                                                                <td className="text-muted small">{i + 1}</td>
                                                                <td>
                                                                    <div className="fw-bold text-dark">{c.student_name}</div>
                                                                    {c.student_nee_name && (
                                                                        <small className="text-muted">Nee: {c.student_nee_name}</small>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <span className="badge badge-glass-indigo font-monospace">
                                                                        {c.eligibility_case_no || '—'}
                                                                    </span>
                                                                </td>
                                                                <td>{c.admission_taken_in || '—'}</td>
                                                                <td>{c.admission_taken_year || '—'}</td>
                                                                <td>
                                                                    <div className="d-flex flex-wrap gap-1">
                                                                        {c.source_batch_ids.map((bId) => (
                                                                            <span key={bId} className="badge bg-secondary bg-opacity-10 text-secondary">
                                                                                Batch #{bId}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="table-responsive" style={{ maxHeight: '320px' }}>
                                            <table className="table table-sm table-glass align-middle mb-0">
                                                <thead className="table-light sticky-top">
                                                    <tr>
                                                        <th style={{ width: '40px' }}>#</th>
                                                        <th>Candidate Name</th>
                                                        <th>Eligibility Case No.</th>
                                                        <th>Exclusion Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewData.excluded_candidates.map((c, i) => (
                                                        <tr key={c.id}>
                                                            <td className="text-muted small">{i + 1}</td>
                                                            <td className="fw-bold text-dark">{c.student_name}</td>
                                                            <td>
                                                                <span className="badge badge-glass-indigo font-monospace">
                                                                    {c.eligibility_case_no || '—'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="badge badge-glass-danger">
                                                                    {c.reason}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top bg-light">
                                    <button
                                        type="button"
                                        className="btn btn-glass"
                                        onClick={() => setShowPreviewModal(false)}
                                    >
                                        Cancel / Return to Batch Selection
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-emerald"
                                        disabled={isCombining || previewData.final_eligible_count === 0}
                                    >
                                        {isCombining ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Generating Campaign...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-check-circle me-1"></i> Generate Consolidated Reminder ({previewData.final_eligible_count} Candidates)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
