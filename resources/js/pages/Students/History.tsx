import React, { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface BatchSummary {
    array_space: string;
    clg_add: string;
    admission_taken_in: string;
    admission_taken_year: string;
    en_time: string;
    formatted_en_time?: string;
    student_count: number;
}

interface StudentDetailItem {
    id: number;
    student_name: string;
    student_nee_name: string;
    eligibility_case_no: string;
    verification_by_you: string;
    email: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedBatches {
    data: BatchSummary[];
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
    links: PaginationLink[];
}

interface FilterOptions {
    years: string[];
    courses: string[];
    universities: string[];
}

interface HistoryProps {
    title: string;
    batches: PaginatedBatches;
    filterOptions?: FilterOptions;
    filters: {
        year: string;
        university: string;
        course: string;
        batch: string;
        name: string;
        date_from: string;
        date_to: string;
    };
}

export const History: React.FC<HistoryProps> = ({ batches, filterOptions, filters }) => {
    const [year, setYear] = useState(filters.year || '');
    const [university, setUniversity] = useState(filters.university || '');
    const [course, setCourse] = useState(filters.course || '');
    const [batch, setBatch] = useState(filters.batch || '');
    const [name, setName] = useState(filters.name || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Batch candidate view modal state
    const [viewingBatch, setViewingBatch] = useState<BatchSummary | null>(null);
    const [batchStudents, setBatchStudents] = useState<StudentDetailItem[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);

    // Flatpickr refs
    const dateFromRef = useRef<HTMLInputElement>(null);
    const dateToRef = useRef<HTMLInputElement>(null);
    const fpFromRef = useRef<flatpickr.Instance | null>(null);
    const fpToRef = useRef<flatpickr.Instance | null>(null);

    useEffect(() => {
        if (dateFromRef.current && dateToRef.current) {
            const fpFrom = flatpickr(dateFromRef.current, {
                dateFormat: 'Y-m-d',
                allowInput: true,
                defaultDate: dateFrom || undefined,
                onChange: (_selectedDates, dateStr) => {
                    setDateFrom(dateStr);
                    if (fpToRef.current) {
                        fpToRef.current.set('minDate', dateStr || undefined);
                    }
                },
            });

            const fpTo = flatpickr(dateToRef.current, {
                dateFormat: 'Y-m-d',
                allowInput: true,
                defaultDate: dateTo || undefined,
                onChange: (_selectedDates, dateStr) => {
                    setDateTo(dateStr);
                    if (fpFromRef.current) {
                        fpFromRef.current.set('maxDate', dateStr || undefined);
                    }
                },
            });

            fpFromRef.current = fpFrom;
            fpToRef.current = fpTo;

            if (dateFrom && fpTo) {
                fpTo.set('minDate', dateFrom);
            }
            if (dateTo && fpFrom) {
                fpFrom.set('maxDate', dateTo);
            }

            return () => {
                fpFrom.destroy();
                fpTo.destroy();
            };
        }
    }, []);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/students/history',
            {
                year,
                university,
                course,
                batch,
                name,
                date_from: dateFrom,
                date_to: dateTo,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setYear('');
        setUniversity('');
        setCourse('');
        setBatch('');
        setName('');
        setDateFrom('');
        setDateTo('');

        if (fpFromRef.current) {
            fpFromRef.current.clear();
            fpFromRef.current.set('maxDate', undefined as any);
        }
        if (fpToRef.current) {
            fpToRef.current.clear();
            fpToRef.current.set('minDate', undefined as any);
        }

        router.get('/students/history', {}, { preserveState: true });
    };

    const handleOpenBatchModal = async (batchItem: BatchSummary) => {
        setViewingBatch(batchItem);
        setBatchStudents([]);
        setBatchLoading(true);

        try {
            const res = await fetch(`/students/batches/${encodeURIComponent(batchItem.array_space)}`, {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            if (data.status === 'success' && Array.isArray(data.students)) {
                setBatchStudents(data.students);
            }
        } catch (err) {
            console.error('Failed to load batch candidates', err);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleCloseBatchModal = () => {
        setViewingBatch(null);
        setBatchStudents([]);
    };

    const flattenAddress = (addr: string): string => {
        if (!addr) return '';
        return addr
            .replace(/<br\s*\/?>/gi, ', ')
            .replace(/\s+/g, ' ')
            .replace(/\s*,(?=\s*,)|,\s*$/g, '')
            .trim();
    };

    const renderAddress = (addr: string) => {
        if (!addr) return '-';
        const lines = addr.split(/<br\s*\/?>/i);
        return lines.map((line, idx) => (
            <React.Fragment key={idx}>
                {line.trim()}
                {idx < lines.length - 1 && <br />}
            </React.Fragment>
        ));
    };

    const isFiltered = Boolean(year || university || course || batch || name || dateFrom || dateTo);

    const exportUrl = `/students/history/export?year=${encodeURIComponent(year)}&university=${encodeURIComponent(
        university
    )}&course=${encodeURIComponent(course)}&batch=${encodeURIComponent(batch)}&name=${encodeURIComponent(
        name
    )}&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;

    return (
        <AppLayout title="Verification Batch History - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        {/* Header matching CI4 */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> Verification Batch History
                                </h3>
                                <p className="text-muted small mb-0">
                                    Browse, edit, or delete previously submitted candidate batches.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <a href={exportUrl} className="btn btn-glass me-1">
                                    <i className="fa fa-file-excel-o me-1"></i> Export to Excel
                                </a>
                                <Link href="/students/new" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to New Entry Form
                                </Link>
                            </div>
                        </div>

                        {/* Search and Filters matching CI4 */}
                        <form onSubmit={handleFilterSubmit} className="row g-3 mb-4 filter-panel" id="batch_history_filters">
                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Admission Year</label>
                                <select
                                    name="year"
                                    className="form-select form-select-sm"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                >
                                    <option value="">-- All Years --</option>
                                    {filterOptions?.years?.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">University</label>
                                <select
                                    name="university"
                                    className="form-select form-select-sm"
                                    value={university}
                                    onChange={(e) => setUniversity(e.target.value)}
                                >
                                    <option value="">-- All Universities --</option>
                                    {filterOptions?.universities?.map((u) => (
                                        <option key={u} value={u}>
                                            {flattenAddress(u)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Course</label>
                                <select
                                    name="course"
                                    className="form-select form-select-sm"
                                    value={course}
                                    onChange={(e) => setCourse(e.target.value)}
                                >
                                    <option value="">-- All Courses --</option>
                                    {filterOptions?.courses?.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Batch No.</label>
                                <input
                                    type="text"
                                    name="batch"
                                    className="form-control form-control-sm"
                                    placeholder="e.g. esection1_47"
                                    value={batch}
                                    onChange={(e) => setBatch(e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Candidate Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control form-control-sm"
                                    placeholder="Any part of the name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Created From</label>
                                <input
                                    ref={dateFromRef}
                                    type="text"
                                    name="date_from"
                                    className="form-control form-control-sm es-datepicker bg-white"
                                    autoComplete="off"
                                    placeholder="YYYY-MM-DD"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Created To</label>
                                <input
                                    ref={dateToRef}
                                    type="text"
                                    name="date_to"
                                    className="form-control form-control-sm es-datepicker bg-white"
                                    autoComplete="off"
                                    placeholder="YYYY-MM-DD"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>

                            <div className="col-12 d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-glass" onClick={handleReset}>
                                    <i className="fa fa-refresh me-1"></i> Reset
                                </button>
                                <button type="submit" className="btn btn-indigo px-4">
                                    <i className="fa fa-filter me-1"></i> Filter
                                </button>
                            </div>
                        </form>

                        {/* Batches Table matching CI4 */}
                        <div className="table-responsive position-relative" id="batch_history_wrap">
                            <table className="table table-glass align-middle mb-0" id="batch_history_table">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '170px' }}>BATCH / CREATED</th>
                                        <th>TARGET UNIVERSITY</th>
                                        <th>COURSE &amp; YEAR</th>
                                        <th className="text-center" style={{ width: '120px' }}>SIZE</th>
                                        <th className="text-end" style={{ width: '180px' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody id="batch_history_rows">
                                    {batches.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-5">
                                                {isFiltered ? (
                                                    <>
                                                        <i className="fa fa-filter fa-2x d-block mb-2 opacity-25"></i>
                                                        No batch matches the current filters.
                                                        <div className="small mt-1">
                                                            <a
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleReset();
                                                                }}
                                                                className="text-indigo"
                                                            >
                                                                Clear the filters
                                                            </a>{' '}
                                                            to see every batch.
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-inbox fa-2x d-block mb-2 opacity-25"></i>
                                                        No batches submitted yet.
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        batches.data.map((b) => (
                                            <tr key={b.array_space}>
                                                <td>
                                                    <span className="fw-bold text-dark d-block">{b.array_space}</span>
                                                    <span className="small text-muted">
                                                        <i className="fa fa-clock-o me-1"></i>
                                                        {b.formatted_en_time || b.en_time}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="d-block">{renderAddress(b.clg_add)}</span>
                                                </td>

                                                <td>
                                                    <span className="d-block text-dark fw-medium">{b.admission_taken_in}</span>
                                                    <span className="badge badge-glass-indigo mt-1">
                                                        {b.admission_taken_year}
                                                    </span>
                                                </td>

                                                <td className="text-center">
                                                    <span className="badge badge-glass-emerald">
                                                        {b.student_count}
                                                    </span>
                                                    <span className="d-block small text-muted mt-1">
                                                        {b.student_count === 1 ? 'candidate' : 'candidates'}
                                                    </span>
                                                </td>

                                                <td className="text-end text-nowrap">
                                                    <div className="btn-group btn-group-sm" role="group" aria-label="Batch actions">
                                                        <button
                                                            type="button"
                                                            className="btn btn-glass text-primary js-view-batch"
                                                            onClick={() => handleOpenBatchModal(b)}
                                                            title="View candidates in this batch"
                                                        >
                                                            <i className="fa fa-eye"></i>
                                                            <span className="d-none d-xl-inline ms-1">View</span>
                                                        </button>

                                                        <a
                                                            href={`/pdf/dispatch/${encodeURIComponent(b.array_space)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-glass text-emerald"
                                                            title="Dispatch letter (PDF)"
                                                        >
                                                            <i className="fa fa-file-pdf-o"></i>
                                                            <span className="d-none d-xl-inline ms-1">PDF</span>
                                                        </a>

                                                        <a
                                                            href={`/pdf/dispatchAccounts/${encodeURIComponent(b.array_space)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-glass text-emerald"
                                                            title="Accounts copy (PDF)"
                                                        >
                                                            <i className="fa fa-file-text-o"></i>
                                                            <span className="d-none d-xl-inline ms-1">AC</span>
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination matching CI4 */}
                        {batches.links && batches.links.length > 3 && (
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4" id="batch_history_pager">
                                <div className="small text-muted">
                                    Showing {batches.from ? batches.from.toLocaleString() : 0} to {batches.to ? batches.to.toLocaleString() : 0} of {batches.total ? batches.total.toLocaleString() : 0} batches
                                </div>
                                <ul className="pagination pagination-sm mb-0">
                                    {batches.links.map((link, idx) => (
                                        <li
                                            key={idx}
                                            className={`page-item ${link.active ? 'active' : ''} ${
                                                !link.url ? 'disabled' : ''
                                            }`}
                                        >
                                            <Link
                                                href={link.url || '#'}
                                                preserveState
                                                preserveScroll
                                                className="page-link"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Batch Candidates View Modal matching CI4 #batchViewModal */}
            {viewingBatch && (
                <div
                    className="modal fade show d-block"
                    id="batchViewModal"
                    tabIndex={-1}
                    aria-labelledby="batchViewModalLabel"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 1055 }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                        <div className="modal-content glass-card border-secondary border-opacity-25 shadow-lg">
                            <div className="modal-header border-bottom border-secondary border-opacity-25">
                                <div>
                                    <h5 className="modal-title fw-bold text-dark" id="batchViewModalLabel">
                                        <i className="fa fa-users me-2 text-indigo"></i>
                                        Batch <span>{viewingBatch.array_space}</span>
                                    </h5>
                                    <p className="text-muted small mb-0">
                                        {flattenAddress(viewingBatch.clg_add)}
                                        {batchStudents.length > 0 && ` · ${batchStudents.length} candidate${batchStudents.length === 1 ? '' : 's'}`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseBatchModal}
                                    aria-label="Close"
                                ></button>
                            </div>

                            <div className="modal-body">
                                {batchLoading ? (
                                    <div className="text-center text-muted py-5">
                                        <i className="fa fa-circle-o-notch fa-spin fa-2x d-block mb-2 opacity-50"></i>
                                        Loading candidates...
                                    </div>
                                ) : batchStudents.length === 0 ? (
                                    <div className="text-center text-muted py-5">
                                        <i className="fa fa-inbox fa-2x d-block mb-2 opacity-25"></i>
                                        No candidates found in this batch.
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-glass mb-0">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '50px' }}>#</th>
                                                    <th>Candidate</th>
                                                    <th>Nee Name</th>
                                                    <th>Case No.</th>
                                                    <th>Verification Remark</th>
                                                    <th>Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {batchStudents.map((s, idx) => (
                                                    <tr key={s.id || idx}>
                                                        <td className="text-muted small">{idx + 1}</td>
                                                        <td className="fw-semibold text-dark">{s.student_name}</td>
                                                        <td className="text-muted">{s.student_nee_name || '-'}</td>
                                                        <td>
                                                            <span className="badge badge-glass-indigo">
                                                                {s.eligibility_case_no}
                                                            </span>
                                                        </td>
                                                        <td className="small">{s.verification_by_you || '-'}</td>
                                                        <td className="small text-muted">{s.email || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-top border-secondary border-opacity-25 d-flex justify-content-between">
                                <Link
                                    href={`/students/batches/${encodeURIComponent(viewingBatch.array_space)}`}
                                    className="btn btn-glass text-indigo"
                                >
                                    <i className="fa fa-external-link me-1"></i> Open Full Batch Page
                                </Link>
                                <button
                                    type="button"
                                    className="btn btn-glass"
                                    onClick={handleCloseBatchModal}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
};

export default History;
