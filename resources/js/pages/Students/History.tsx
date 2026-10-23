import React, { useState, useEffect, useRef } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { Select2 } from '../../components/Select2';
import { SharedProps } from '../../types';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface StudentDetailItem {
    id: number;
    student_name: string;
    student_nee_name?: string | null;
    eligibility_case_no?: string | null;
    verification_of_marksheet_done_by_you?: string | null;
    verification_by_you?: string | null;
    email?: string | null;
}

interface BatchSummary {
    array_space: string;
    clg_add: string;
    university_name?: string;
    fees?: string;
    admission_taken_in: string;
    admission_taken_year: string;
    en_time: string;
    formatted_en_time?: string;
    student_count: number;
    students?: StudentDetailItem[];
}

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
];

const getAvatarGradient = (idx: number) => {
    return AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
};

const getInitials = (name: string): string => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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

export interface UniversityOption {
    value: string;
    name?: string;
    fees?: string;
    label?: string;
}

export interface BatchCombo {
    y: string;
    c: string;
    u: string;
}

interface FilterOptions {
    years: string[];
    courses: string[];
    universities: (UniversityOption | string)[];
    combos?: BatchCombo[];
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
    const { props } = usePage<SharedProps>();
    const canExport = props.features.export;

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

    // Cascading filter options strictly constrained to batch history
    const combos = filterOptions?.combos || [];

    const availableYears = React.useMemo(() => {
        if (!combos.length || (!university && !course)) {
            return filterOptions?.years || [];
        }
        const set = new Set<string>();
        combos.forEach((cb) => {
            if ((!university || cb.u === university) && (!course || cb.c === course)) {
                set.add(cb.y);
            }
        });
        return (filterOptions?.years || []).filter((y) => set.has(y));
    }, [combos, university, course, filterOptions?.years]);

    const availableUniversities = React.useMemo(() => {
        if (!combos.length || (!year && !course)) {
            return filterOptions?.universities || [];
        }
        const set = new Set<string>();
        combos.forEach((cb) => {
            if ((!year || cb.y === year) && (!course || cb.c === course)) {
                set.add(cb.u);
            }
        });
        return (filterOptions?.universities || []).filter((u) => {
            const val = typeof u === 'string' ? u : u.value;
            return set.has(val);
        });
    }, [combos, year, course, filterOptions?.universities]);

    const availableCourses = React.useMemo(() => {
        if (!combos.length || (!year && !university)) {
            return filterOptions?.courses || [];
        }
        const set = new Set<string>();
        combos.forEach((cb) => {
            if ((!year || cb.y === year) && (!university || cb.u === university)) {
                set.add(cb.c);
            }
        });
        return (filterOptions?.courses || []).filter((c) => set.has(c));
    }, [combos, year, university, filterOptions?.courses]);

    // Gracefully clear active selection if it is no longer valid in current combination
    useEffect(() => {
        if (course && availableCourses.length > 0 && !availableCourses.includes(course)) {
            setCourse('');
        }
    }, [availableCourses, course]);

    useEffect(() => {
        if (university && availableUniversities.length > 0) {
            const hasUniv = availableUniversities.some((u) => (typeof u === 'string' ? u : u.value) === university);
            if (!hasUniv) {
                setUniversity('');
            }
        }
    }, [availableUniversities, university]);

    useEffect(() => {
        if (year && availableYears.length > 0 && !availableYears.includes(year)) {
            setYear('');
        }
    }, [availableYears, year]);

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

    const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Initialize all current batches as expanded by default so details are immediately visible
    useEffect(() => {
        setExpandedBatches((prev) => {
            const next = { ...prev };
            batches.data.forEach((b) => {
                if (next[b.array_space] === undefined) {
                    next[b.array_space] = true;
                }
            });
            return next;
        });
    }, [batches.data]);

    const allExpanded =
        batches.data.length > 0 && batches.data.every((b) => expandedBatches[b.array_space]);

    const toggleAllExpanded = () => {
        const targetState = !allExpanded;
        const next: Record<string, boolean> = {};
        batches.data.forEach((b) => {
            next[b.array_space] = targetState;
        });
        setExpandedBatches(next);
    };

    const toggleBatch = (arraySpace: string) => {
        setExpandedBatches((prev) => ({
            ...prev,
            [arraySpace]: !prev[arraySpace],
        }));
    };

    const copyToClipboard = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => {
            setCopiedKey((curr) => (curr === key ? null : curr));
        }, 2000);
    };

    const handleOpenBatchModal = async (batchItem: BatchSummary) => {
        setViewingBatch(batchItem);
        if (batchItem.students && batchItem.students.length > 0) {
            setBatchStudents(batchItem.students);
            setBatchLoading(false);
            return;
        }

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
        <AppLayout title="DD View History - E-Section Portal">
            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4">
                        {/* Header matching CI4 */}
                        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-history me-2 text-indigo"></i> DD View History
                                </h3>
                                <p className="text-muted small mb-0">
                                    Browse, edit, or delete previously submitted candidate batches.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                {batches.data.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-glass me-1"
                                        onClick={toggleAllExpanded}
                                        title={allExpanded ? 'Collapse all batch details' : 'Expand all batch details'}
                                    >
                                        <i className={`fa fa-${allExpanded ? 'compress' : 'expand'} me-1.5 text-indigo`}></i>
                                        <span>{allExpanded ? 'Collapse All Details' : 'Expand All Details'}</span>
                                    </button>
                                )}
                                {canExport && (
                                    <a
                                        href={exportUrl}
                                        download="student_batches.xlsx"
                                        data-inertia="false"
                                        className="btn btn-glass me-1"
                                    >
                                        <i className="fa fa-file-excel-o me-1"></i> Export to Excel
                                    </a>
                                )}
                                <Link href="/students/new" className="btn btn-glass">
                                    <i className="fa fa-arrow-left me-1"></i> Back to New Entry Form
                                </Link>
                            </div>
                        </div>

                        {/* Search and Filters matching CI4 */}
                        <form onSubmit={handleFilterSubmit} className="row g-3 mb-4 filter-panel" id="batch_history_filters">
                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Admission Year</label>
                                <Select2
                                    id="filter_year"
                                    name="year"
                                    value={year}
                                    onChange={(val) => setYear(val)}
                                    placeholder="-- All Years --"
                                    options={[
                                        { value: '', label: '-- All Years --' },
                                        ...availableYears.map((y) => ({ value: y, label: y })),
                                    ]}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">University</label>
                                <Select2
                                    id="filter_university"
                                    name="university"
                                    value={university}
                                    onChange={(val) => setUniversity(val)}
                                    placeholder="-- All Universities --"
                                    options={[
                                        { value: '', label: '-- All Universities --' },
                                        ...availableUniversities.map((u) => {
                                            if (typeof u === 'string') {
                                                return { value: u, label: u };
                                            }
                                            const feesStr = u.fees ? `₹${u.fees}` : '—';
                                            return {
                                                value: u.value,
                                                label: u.label || `${u.name || u.value} | Fees: ${feesStr}`,
                                                name: u.name,
                                                fees: u.fees,
                                            };
                                        }),
                                    ]}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Course</label>
                                <Select2
                                    id="filter_course"
                                    name="course"
                                    value={course}
                                    onChange={(val) => setCourse(val)}
                                    placeholder="-- All Courses --"
                                    options={[
                                        { value: '', label: '-- All Courses --' },
                                        ...availableCourses.map((c) => ({ value: c, label: c })),
                                    ]}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">Batch No.</label>
                                <input
                                    type="text"
                                    name="batch"
                                    className="form-control"
                                    placeholder="e.g. esection1_47"
                                    value={batch}
                                    onChange={(e) => setBatch(e.target.value)}
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label text-secondary small fw-semibold">
                                    Candidate Name / Keyword
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    placeholder="Name, case no. or university"
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
                                    className="form-control es-datepicker bg-white"
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
                                    className="form-control es-datepicker bg-white"
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
                                        batches.data.map((b) => {
                                            const isExpanded = Boolean(expandedBatches[b.array_space]);
                                            const students = b.students || [];

                                            return (
                                                <React.Fragment key={b.array_space}>
                                                    <tr className={`batch-row-main ${isExpanded ? 'is-expanded' : ''}`}>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-glass p-1 d-inline-flex align-items-center justify-content-center"
                                                                    style={{ width: '28px', height: '28px', flexShrink: 0 }}
                                                                    onClick={() => toggleBatch(b.array_space)}
                                                                    title={isExpanded ? 'Collapse batch details' : 'Expand batch details'}
                                                                >
                                                                    <i
                                                                        className="fa fa-chevron-down text-indigo"
                                                                        style={{
                                                                            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                                            fontSize: '0.75rem',
                                                                        }}
                                                                    ></i>
                                                                </button>
                                                                <div>
                                                                    <div className="d-flex align-items-center gap-1.5">
                                                                        <span className="fw-bold text-dark font-monospace fs-6">
                                                                            #{b.array_space}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link text-muted p-0 opacity-75 hover-opacity-100"
                                                                            onClick={() => copyToClipboard(b.array_space, `batch_${b.array_space}`)}
                                                                            title="Copy Batch Number"
                                                                        >
                                                                            <i
                                                                                className={`fa fa-${copiedKey === `batch_${b.array_space}` ? 'check text-emerald' : 'clone'} small`}
                                                                            ></i>
                                                                        </button>
                                                                    </div>
                                                                    <span className="small text-muted d-block mt-0.5">
                                                                        <i className="fa fa-clock-o me-1"></i>
                                                                        {b.formatted_en_time || b.en_time}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {b.university_name ? (
                                                                <div className="fw-bold text-dark mb-1">
                                                                    {b.university_name}
                                                                </div>
                                                            ) : null}

                                                            <div className="mb-1.5">
                                                                {b.fees ? (
                                                                    <span className="badge badge-glass-indigo">
                                                                        <i className="fa fa-inr me-1"></i>Fees: ₹{b.fees}
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge bg-light text-secondary border">
                                                                        Fees: —
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="small text-muted" style={{ lineHeight: '1.45' }}>
                                                                {renderAddress(b.clg_add)}
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span className="d-block text-dark fw-semibold">{b.admission_taken_in}</span>
                                                            <span className="badge badge-glass-indigo mt-1">
                                                                {b.admission_taken_year}
                                                            </span>
                                                        </td>

                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleBatch(b.array_space)}
                                                                className={`btn btn-sm border-0 ${isExpanded ? 'badge-glass-indigo' : 'badge-glass-emerald'} px-2.5 py-1 rounded-pill`}
                                                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                                                title={isExpanded ? 'Click to collapse details' : 'Click to expand details'}
                                                            >
                                                                <i className="fa fa-users me-1"></i>
                                                                <strong>{b.student_count}</strong> {b.student_count === 1 ? 'candidate' : 'candidates'}
                                                                <i
                                                                    className="fa fa-chevron-down ms-1.5 small opacity-75"
                                                                    style={{
                                                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                        transition: 'transform 0.2s',
                                                                    }}
                                                                ></i>
                                                            </button>
                                                        </td>

                                                        <td className="text-end text-nowrap">
                                                            <div className="btn-group btn-group-sm" role="group" aria-label="Batch actions">
                                                                <button
                                                                    type="button"
                                                                    className={`btn btn-glass ${isExpanded ? 'text-indigo bg-indigo-50 border-indigo' : 'text-primary'} js-view-batch`}
                                                                    onClick={() => toggleBatch(b.array_space)}
                                                                    title={isExpanded ? 'Hide details under batch' : 'Show details under batch'}
                                                                >
                                                                    <i className={`fa fa-${isExpanded ? 'chevron-up' : 'eye'}`}></i>
                                                                    <span className="d-none d-xl-inline ms-1">{isExpanded ? 'Hide' : 'Details'}</span>
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

                                                                <Link
                                                                    href={`/students/batches/${encodeURIComponent(b.array_space)}`}
                                                                    className="btn btn-glass text-secondary"
                                                                    title="Open batch management page"
                                                                >
                                                                    <i className="fa fa-external-link"></i>
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {isExpanded && (
                                                        <tr className="batch-details-expanded-row">
                                                            <td colSpan={5} className="p-0 border-0">
                                                                <div className="batch-details-panel mx-2 mx-md-3 my-2 p-3 p-md-4 rounded-3">
                                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-3 mb-3 border-bottom">
                                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                            <span className="badge bg-indigo text-white px-2.5 py-1.5 rounded-pill shadow-xs">
                                                                                <i className="fa fa-users me-1.5"></i>
                                                                                {students.length} Candidate{students.length === 1 ? '' : 's'} in Batch #{b.array_space}
                                                                            </span>
                                                                            {b.university_name && (
                                                                                <span className="badge bg-white text-dark border px-2.5 py-1.5 rounded-pill">
                                                                                    <i className="fa fa-university me-1 text-indigo"></i>
                                                                                    {b.university_name}
                                                                                </span>
                                                                            )}
                                                                            {b.fees ? (
                                                                                <span className="badge badge-glass-indigo px-2.5 py-1.5 rounded-pill">
                                                                                    <i className="fa fa-inr me-1"></i>Fee: ₹{b.fees}
                                                                                </span>
                                                                            ) : null}
                                                                            <span className="badge bg-light text-secondary border px-2.5 py-1.5 rounded-pill">
                                                                                {b.admission_taken_in} ({b.admission_taken_year})
                                                                            </span>
                                                                        </div>

                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-glass text-primary py-1 px-2.5"
                                                                                onClick={() => handleOpenBatchModal(b)}
                                                                                title="Open candidate modal view"
                                                                            >
                                                                                <i className="fa fa-expand me-1"></i>
                                                                                Modal View
                                                                            </button>
                                                                            <Link
                                                                                href={`/students/batches/${encodeURIComponent(b.array_space)}`}
                                                                                className="btn btn-sm btn-glass text-indigo py-1 px-2.5"
                                                                                title="Open full batch page with edit & delete tools"
                                                                            >
                                                                                <i className="fa fa-pencil me-1"></i>
                                                                                Edit / Manage
                                                                            </Link>
                                                                            <a
                                                                                href={`/pdf/dispatch/${encodeURIComponent(b.array_space)}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="btn btn-sm btn-glass text-emerald py-1 px-2.5"
                                                                                title="Print / View dispatch letter PDF"
                                                                            >
                                                                                <i className="fa fa-file-pdf-o me-1"></i>
                                                                                Dispatch PDF
                                                                            </a>
                                                                        </div>
                                                                    </div>

                                                                    {students.length === 0 ? (
                                                                        <div className="text-center py-4 text-muted bg-white rounded-3 border">
                                                                            <i className="fa fa-inbox fa-2x d-block mb-2 opacity-30"></i>
                                                                            No candidate records currently found in this batch.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="table-responsive bg-white rounded-3 border shadow-xs">
                                                                            <table className="table table-hover align-middle mb-0">
                                                                                <thead
                                                                                    className="bg-light text-secondary small fw-bold text-uppercase"
                                                                                    style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}
                                                                                >
                                                                                    <tr>
                                                                                        <th style={{ width: '48px' }} className="text-center">#</th>
                                                                                        <th>Candidate Name</th>
                                                                                        <th>Eligibility Case No.</th>
                                                                                        <th>Verification Remark</th>
                                                                                        <th>Email ID</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {students.map((s, sIdx) => {
                                                                                        const initials = getInitials(s.student_name);
                                                                                        const remark = s.verification_of_marksheet_done_by_you || s.verification_by_you || 'Marksheet Verification';

                                                                                        return (
                                                                                            <tr key={s.id || sIdx}>
                                                                                                <td className="text-center text-muted fw-semibold small">
                                                                                                    {String(sIdx + 1).padStart(2, '0')}
                                                                                                </td>
                                                                                                <td>
                                                                                                    <div className="d-flex align-items-center gap-2.5">
                                                                                                        <div
                                                                                                            className="candidate-avatar flex-shrink-0"
                                                                                                            style={{
                                                                                                                width: '32px',
                                                                                                                height: '32px',
                                                                                                                borderRadius: '50%',
                                                                                                                background: getAvatarGradient(sIdx),
                                                                                                                color: '#fff',
                                                                                                                display: 'flex',
                                                                                                                alignItems: 'center',
                                                                                                                justifyContent: 'center',
                                                                                                                fontSize: '0.75rem',
                                                                                                                fontWeight: '700',
                                                                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                                                                                            }}
                                                                                                        >
                                                                                                            {initials}
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="fw-bold text-dark">
                                                                                                                {s.student_name}
                                                                                                            </div>
                                                                                                            {s.student_nee_name && (
                                                                                                                <div className="small text-muted mt-0.5">
                                                                                                                    <span className="badge bg-light text-secondary border px-1.5 py-0.5 font-normal">
                                                                                                                        <i className="fa fa-female me-1 text-muted"></i>
                                                                                                                        Nee: {s.student_nee_name}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td>
                                                                                                    <div className="d-inline-flex align-items-center gap-1.5">
                                                                                                        <span className="font-monospace fw-semibold text-indigo bg-indigo-50 px-2 py-1 rounded border border-indigo-100 small">
                                                                                                            {s.eligibility_case_no || '—'}
                                                                                                        </span>
                                                                                                        {s.eligibility_case_no && (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                className="btn btn-sm btn-link text-muted p-0 opacity-75 hover-opacity-100"
                                                                                                                onClick={() =>
                                                                                                                    copyToClipboard(
                                                                                                                        s.eligibility_case_no || '',
                                                                                                                        `case_${s.id || sIdx}`
                                                                                                                    )
                                                                                                                }
                                                                                                                title="Copy Case Number"
                                                                                                            >
                                                                                                                <i
                                                                                                                    className={`fa fa-${copiedKey === `case_${s.id || sIdx}` ? 'check text-emerald' : 'clone'} small`}
                                                                                                                ></i>
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td>
                                                                                                    <span className="badge-verification-remark">
                                                                                                        <i className="fa fa-check-circle me-1 text-emerald"></i>
                                                                                                        {remark}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td>
                                                                                                    {s.email ? (
                                                                                                        <a
                                                                                                            href={`mailto:${s.email}`}
                                                                                                            className="text-decoration-none text-dark small hover-indigo d-inline-flex align-items-center gap-1.5"
                                                                                                        >
                                                                                                            <i className="fa fa-envelope-o text-indigo opacity-75"></i>
                                                                                                            <span>{s.email}</span>
                                                                                                        </a>
                                                                                                    ) : (
                                                                                                        <span className="text-muted small">—</span>
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
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
                                    <div className="mt-1 d-flex align-items-center flex-wrap gap-2">
                                        {viewingBatch.university_name && (
                                            <span className="fw-semibold text-dark">
                                                {viewingBatch.university_name}
                                            </span>
                                        )}
                                        {viewingBatch.fees ? (
                                            <span className="badge badge-glass-indigo">
                                                <i className="fa fa-inr me-1"></i>Fees: ₹{viewingBatch.fees}
                                            </span>
                                        ) : (
                                            <span className="badge bg-light text-secondary border">Fees: —</span>
                                        )}
                                        {batchStudents.length > 0 && (
                                            <span className="badge badge-glass-emerald">
                                                {batchStudents.length} candidate{batchStudents.length === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted small mb-0 mt-1">
                                        <i className="fa fa-map-marker me-1 text-muted"></i>
                                        {flattenAddress(viewingBatch.clg_add)}
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
                                    <div className="table-responsive bg-white rounded-3 border shadow-xs">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead
                                                className="bg-light text-secondary small fw-bold text-uppercase"
                                                style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}
                                            >
                                                <tr>
                                                    <th style={{ width: '48px' }} className="text-center">#</th>
                                                    <th>Candidate Name</th>
                                                    <th>Eligibility Case No.</th>
                                                    <th>Verification Remark</th>
                                                    <th>Email ID</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {batchStudents.map((s, idx) => {
                                                    const initials = getInitials(s.student_name);
                                                    const remark =
                                                        s.verification_of_marksheet_done_by_you ||
                                                        s.verification_by_you ||
                                                        'Marksheet Verification';

                                                    return (
                                                        <tr key={s.id || idx}>
                                                            <td className="text-center text-muted fw-semibold small">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </td>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2.5">
                                                                    <div
                                                                        className="candidate-avatar flex-shrink-0"
                                                                        style={{
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            borderRadius: '50%',
                                                                            background: getAvatarGradient(idx),
                                                                            color: '#fff',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: '700',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                                                        }}
                                                                    >
                                                                        {initials}
                                                                    </div>
                                                                    <div>
                                                                        <div className="fw-bold text-dark">
                                                                            {s.student_name}
                                                                        </div>
                                                                        {s.student_nee_name && (
                                                                            <div className="small text-muted mt-0.5">
                                                                                <span className="badge bg-light text-secondary border px-1.5 py-0.5 font-normal">
                                                                                    <i className="fa fa-female me-1 text-muted"></i>
                                                                                    Nee: {s.student_nee_name}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="d-inline-flex align-items-center gap-1.5">
                                                                    <span className="font-monospace fw-semibold text-indigo bg-indigo-50 px-2 py-1 rounded border border-indigo-100 small">
                                                                        {s.eligibility_case_no || '—'}
                                                                    </span>
                                                                    {s.eligibility_case_no && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link text-muted p-0 opacity-75 hover-opacity-100"
                                                                            onClick={() =>
                                                                                copyToClipboard(
                                                                                    s.eligibility_case_no || '',
                                                                                    `modal_case_${s.id || idx}`
                                                                                )
                                                                            }
                                                                            title="Copy Case Number"
                                                                        >
                                                                            <i
                                                                                className={`fa fa-${copiedKey === `modal_case_${s.id || idx}` ? 'check text-emerald' : 'clone'} small`}
                                                                            ></i>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="badge-verification-remark">
                                                                    <i className="fa fa-check-circle me-1 text-emerald"></i>
                                                                    {remark}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {s.email ? (
                                                                    <a
                                                                        href={`mailto:${s.email}`}
                                                                        className="text-decoration-none text-dark small hover-indigo d-inline-flex align-items-center gap-1.5"
                                                                    >
                                                                        <i className="fa fa-envelope-o text-indigo opacity-75"></i>
                                                                        <span>{s.email}</span>
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-muted small">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
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
