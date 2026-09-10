import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { SharedProps } from '../../types';
import { AppLayout } from '../../components/AppLayout';
import Swal from 'sweetalert2';

interface Student {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    admission_taken_in: string;
    admission_taken_year: string;
    clg_add: string;
    to_name: string | null;
    reminder_note_count?: number;
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
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface Props {
    students: PaginatedData<Student>;
    filters: {
        acd_year: string;
        stream: string;
        clg_add: string;
    };
}

export default function University({ students, filters }: Props) {
    const { props } = usePage<SharedProps>();
    const canExport = props.features.export;
    const [year, setYear] = useState(filters.acd_year || '');
    const [stream, setStream] = useState(filters.stream || '');
    const [university, setUniversity] = useState(filters.clg_add || '');

    const [selectedIds, setSelectedIds] = useState<number[]>(students.data.map(s => s.id));
    const [reminderType, setReminderType] = useState('1st Reminder Notice');
    const [headName, setHeadName] = useState('');

    const [years, setYears] = useState<{ id: string; text: string }[]>([]);
    const [streams, setStreams] = useState<{ id: string; text: string }[]>([]);
    const [colleges, setColleges] = useState<{ id: string; text: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetch('/api/academic-years')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) =>
                    typeof item === 'string'
                        ? { id: item, text: item }
                        : { id: item.id || item.year_label, text: item.text || item.year_label || item.id }
                );
                setYears(list);
            })
            .catch(() => {});

        fetch('/api/streams')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) => ({
                    id: item.Division || item.id || item.text,
                    text: item.stream || item.Division || item.text || item.id,
                }));
                setStreams(list);
            })
            .catch(() => {});

        fetch('/api/colleges?active_only=1')
            .then(res => res.json())
            .then(data => {
                const list = (data.results || []).map((item: any) => ({
                    id: item.Name || item.text || item.id,
                    text: item.Name || item.text || item.id,
                }));
                setColleges(list);
            })
            .catch(() => {});
    }, []);

    // Update selectedIds when students change
    useEffect(() => {
        setSelectedIds(students.data.map(s => s.id));
    }, [students.data]);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/reminders/university',
            {
                acd_year: year,
                stream,
                clg_add: university,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(students.data.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleGenerateReminder = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedIds.length === 0) {
            Swal.fire('No Students Selected', 'Please check at least one student from the table.', 'warning');
            return;
        }

        setIsSubmitting(true);
        const academicYear = year || students.data[0]?.admission_taken_year || '2025-2026';
        const targetUniv = university || students.data[0]?.clg_add || 'Target Universities';

        router.post(
            '/reminders/university',
            {
                student_ids: selectedIds,
                note_text: reminderType,
                academic_year: academicYear,
                university_name: targetUniv,
                admission_taken_in: stream || null,
                head_name: headName || 'The Controller of Examinations',
            },
            {
                onSuccess: (page) => {
                    setIsSubmitting(false);
                    const flash = (page.props as any).flash;
                    const pdfUrl = flash?.pdf_url;

                    Swal.fire({
                        icon: 'success',
                        title: 'University Reminder Recorded!',
                        text: 'Reminder notes recorded and notice prepared.',
                        showCancelButton: !!pdfUrl,
                        confirmButtonText: pdfUrl ? '<i class="fa fa-print me-1"></i> Open PDF' : 'OK',
                        cancelButtonText: 'Stay Here',
                    }).then((result) => {
                        if (result.isConfirmed && pdfUrl) {
                            window.open(pdfUrl, '_blank');
                        }
                    });
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    Swal.fire('Error', Object.values(errs).flat().join('\n') || 'Failed to record reminders.', 'error');
                },
            }
        );
    };

    const isAllSelected = students.data.length > 0 && selectedIds.length === students.data.length;

    const exportUrl = `/reminders/university/export?acd_year=${encodeURIComponent(year)}&stream=${encodeURIComponent(stream)}&clg_add=${encodeURIComponent(university)}`;

    return (
        <AppLayout>
            <Head title="University Marksheet Reminder Portal" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                            <div>
                                <h3 className="fw-bold mb-1 text-dark">
                                    <i className="fa fa-clock-o me-2 text-indigo"></i> University Verification Reminder Portal
                                </h3>
                                <p className="text-muted small mb-0">
                                    Generate 1st and 2nd reminder notice PDF letters for pending eligibility verifications.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                {canExport && (
                                    <a href={exportUrl} className="btn btn-glass">
                                        <i className="fa fa-file-excel-o me-1"></i> Export to Excel
                                    </a>
                                )}
                                <Link href="/reminders/university/history" className="btn btn-glass">
                                    <i className="fa fa-history me-1"></i> Reminder History
                                </Link>
                                <Link href="/reminders/student" className="btn btn-glass">
                                    <i className="fa fa-user me-1"></i> Switch to Candidate Reminders
                                </Link>
                            </div>
                        </div>

                        {/* Search Filter Bar */}
                        <form onSubmit={handleFilter} className="row g-3 mb-4 filter-panel">
                            <div className="col-md-4">
                                <label className="form-label text-secondary small fw-semibold">
                                    Academic Year (AJAX, optional)
                                </label>
                                <select
                                    className="form-select"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                >
                                    <option value="">-- All Years --</option>
                                    {years.map((y) => (
                                        <option key={y.id} value={y.id}>
                                            {y.text}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label text-secondary small fw-semibold">
                                    Academic Program / Stream (AJAX, optional)
                                </label>
                                <select
                                    className="form-select"
                                    value={stream}
                                    onChange={(e) => setStream(e.target.value)}
                                >
                                    <option value="">-- All Streams --</option>
                                    {streams.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.text}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label text-secondary small fw-semibold">
                                    University Filter (AJAX Optional)
                                </label>
                                <select
                                    className="form-select"
                                    value={university}
                                    onChange={(e) => setUniversity(e.target.value)}
                                >
                                    <option value="">-- All Target Universities --</option>
                                    {colleges.map((c, idx) => (
                                        <option key={idx} value={c.id}>
                                            {c.text}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-12 text-end">
                                <button type="submit" className="btn btn-indigo px-4">
                                    <i className="fa fa-search me-1"></i> Filter Pending Cases
                                </button>
                            </div>
                        </form>

                        {/* Reminder Notice Form */}
                        {students.data.length > 0 ? (
                            <form onSubmit={handleGenerateReminder}>
                                <div className="row g-3 mb-4 entry-panel">
                                    <div className="col-md-6">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Reminder Notice Type
                                        </label>
                                        <select
                                            className="form-select"
                                            value={reminderType}
                                            onChange={(e) => setReminderType(e.target.value)}
                                            required
                                        >
                                            <option value="1st Reminder Notice">1st Reminder Notice</option>
                                            <option value="2nd Reminder Notice">2nd Reminder Notice</option>
                                            <option value="Final Urgent Reminder Notice">Final Urgent Reminder Notice</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-secondary small fw-semibold">
                                            Head Name (To)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="The Controller of Examinations"
                                            value={headName}
                                            onChange={(e) => setHeadName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Student Selection Table */}
                                <div className="table-responsive mb-4">
                                    <table className="table table-glass table-hover table-sticky-id">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }} className="col-sr">
                                                    <input
                                                        type="checkbox"
                                                        id="check_all"
                                                        checked={isAllSelected}
                                                        onChange={handleToggleSelectAll}
                                                    />
                                                </th>
                                                <th>CANDIDATE NAME</th>
                                                <th>ELIGIBILITY CASE NO.</th>
                                                <th>TARGET UNIVERSITY ADDRESS</th>
                                                <th>ACADEMIC YEAR</th>
                                                <th>REMINDER STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.data.map((stud) => (
                                                <tr key={stud.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(stud.id)}
                                                            onChange={() => handleToggleSelect(stud.id)}
                                                        />
                                                    </td>
                                                    <td className="fw-bold text-dark">{stud.student_name}</td>
                                                    <td>
                                                        <span className="badge badge-glass-indigo">
                                                            {stud.eligibility_case_no}
                                                        </span>
                                                    </td>
                                                    <td className="small text-muted">{stud.clg_add}</td>
                                                    <td className="fw-bold text-dark">{stud.admission_taken_year}</td>
                                                    <td>
                                                        {stud.reminder_note_count && stud.reminder_note_count > 0 ? (
                                                            <span className="badge badge-glass-amber">
                                                                {stud.reminder_note_count} prior notice(s)
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted small">None yet</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="text-end">
                                    <button
                                        type="submit"
                                        className="btn btn-emerald py-2 px-4"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="fa fa-spinner fa-spin me-1"></i> Generating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-file-pdf-o me-1"></i> Generate University Reminder PDF Notice
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center text-muted py-5">
                                <i className="fa fa-clock-o fs-1 mb-3 text-secondary"></i>
                                <p className="mb-0">No candidate records match the current filters.</p>
                            </div>
                        )}

                        {/* Pager */}
                        {students.links && students.links.length > 3 && (
                            <div className="d-flex justify-content-center mt-4">
                                <ul className="pagination pagination-sm">
                                    {students.links.map((link, idx) => (
                                        <li
                                            key={idx}
                                            className={`page-item ${link.active ? 'active' : ''} ${!link.url ? 'disabled' : ''}`}
                                        >
                                            {link.url ? (
                                                <Link
                                                    href={link.url}
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ) : (
                                                <span
                                                    className="page-link"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
