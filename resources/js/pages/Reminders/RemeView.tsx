import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';
import { Select2, Select2Option } from '../../components/Select2';
import Swal from 'sweetalert2';
import { showLetterPostCreatePrompt, updateUniversityReminderLetter } from '../../lib/letterPrompt';

interface ExistingNote {
    id: number;
    slot: number;
    batch_id: number;
    note_text: string;
    note_date: string | null;
}

interface RemeStudent {
    id: number;
    student_name: string;
    student_nee_name: string | null;
    eligibility_case_no: string;
    admission_taken_in: string;
    admission_taken_year: string;
    is_verified?: boolean;
    is_excluded?: boolean;
    existing_notes: ExistingNote[];
    next_slot: number;
    default_next_note?: string;
}

interface Props {
    isUpdate: boolean;
    batchId?: number | null;
    legacyArraySpace?: number | null;
    universityName: string;
    academicYear: string;
    courseName: string;
    headName: string;
    defaultDate: string;
    fees?: string;
    students: RemeStudent[];
    backUrl: string;
    allColleges?: string[];
    allYears?: string[];
    allCourses?: string[];
}

export default function RemeView({
    isUpdate,
    batchId,
    legacyArraySpace,
    universityName,
    academicYear,
    courseName,
    headName: initialHeadName,
    defaultDate,
    fees,
    students,
    backUrl,
    allColleges = [],
    allYears = [],
    allCourses = [],
}: Props) {
    const [headName, setHeadName] = useState(initialHeadName || '');
    const [dated, setDated] = useState(defaultDate || new Date().toISOString().split('T')[0]);
    const [university, setUniversity] = useState(universityName || '');
    const [year, setYear] = useState(academicYear || '');
    const [course, setCourse] = useState(courseName || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const universityOptions = useMemo<Select2Option[]>(() => {
        const set = new Set<string>();
        if (university) set.add(university);
        allColleges.forEach((c) => {
            if (c) set.add(c);
        });
        return Array.from(set).map((item) => ({ value: item, label: item }));
    }, [allColleges, university]);

    const yearOptions = useMemo<Select2Option[]>(() => {
        const set = new Set<string>();
        if (year) set.add(year);
        allYears.forEach((y) => {
            if (y) set.add(y);
        });
        return Array.from(set).map((item) => ({ value: item, label: item }));
    }, [allYears, year]);

    const courseOptions = useMemo<Select2Option[]>(() => {
        const set = new Set<string>();
        if (course) set.add(course);
        allCourses.forEach((co) => {
            if (co) set.add(co);
        });
        return Array.from(set).map((item) => ({ value: item, label: item }));
    }, [allCourses, course]);

    // Map student_id => next reminder note text
    const [nextNotes, setNextNotes] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        students.forEach((s) => {
            initial[s.id] = '';
        });
        return initial;
    });

    // Map note_id => { text, date, isModified } for editing typos in previous notes
    const [editedNotes, setEditedNotes] = useState<Record<number, { text: string; date: string; isModified: boolean }>>(() => {
        const map: Record<number, { text: string; date: string; isModified: boolean }> = {};
        students.forEach((s) => {
            s.existing_notes.forEach((n) => {
                map[n.id] = {
                    text: n.note_text,
                    date: n.note_date || defaultDate,
                    isModified: false,
                };
            });
        });
        return map;
    });

    const handleExistingNoteTextChange = (noteId: number, originalText: string, newText: string) => {
        setEditedNotes((prev) => ({
            ...prev,
            [noteId]: {
                ...prev[noteId],
                text: newText,
                isModified: newText.trim() !== originalText.trim(),
            },
        }));
    };

    const handleNextNoteChange = (studentId: number, text: string) => {
        setNextNotes((prev) => ({
            ...prev,
            [studentId]: text,
        }));
    };

    const handleDeleteNote = (noteId: number, slot: number) => {
        Swal.fire({
            title: `Delete Reminder Note ${slot}?`,
            text: 'Are you sure you want to delete this reminder note? This will remove this note and revert candidate to the previous reminder state.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete note',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(`/reminders/university/notes/${noteId}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire('Deleted!', `Reminder Note ${slot} has been deleted.`, 'success');
                    },
                    onError: () => {
                        Swal.fire('Error', 'Failed to delete reminder note.', 'error');
                    },
                });
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare student payloads
        const studentPayloads = students.map((s) => {
            let nextNote = (nextNotes[s.id] || '').trim();
            // Default note text ONLY if creating a brand new batch (!isUpdate) and left blank.
            // When updating (isUpdate), leaving next reminder blank means NO new reminder is created.
            if (!isUpdate && nextNote === '') {
                nextNote = s.next_slot === 1
                    ? '1st Reminder Notice'
                    : (s.next_slot === 2 ? '2nd Reminder Notice' : `${s.next_slot}th Reminder Notice`);
            }

            const studentEditedNotes = s.existing_notes
                .filter((n) => n.id > 0 && editedNotes[n.id]?.isModified)
                .map((n) => ({
                    id: n.id,
                    slot: n.slot,
                    note_text: editedNotes[n.id].text.trim(),
                    note_date: editedNotes[n.id].date,
                }));

            return {
                student_id: s.id,
                next_reminder_note: nextNote !== '' ? nextNote : null,
                edited_notes: studentEditedNotes,
            };
        });

        setIsSubmitting(true);
        router.post(
            '/reminders/university/process/save',
            {
                batch_id: batchId || null,
                academic_year: year.trim(),
                university_name: university.trim(),
                admission_taken_in: course.trim(),
                head_name: headName.trim(),
                dated: dated,
                students: studentPayloads,
            },
            {
                onSuccess: async (page) => {
                    setIsSubmitting(false);
                    const flash = (page.props as any).flash;
                    const pdfUrl = flash?.pdf_url;
                    const savedBatchId = flash?.batch_id || batchId;

                    await showLetterPostCreatePrompt({
                        letterType: 'University Reminder Letter',
                        batchIdOrReference: savedBatchId ? `#${savedBatchId}` : (university || universityName),
                        pdfUrl: pdfUrl,
                        historyUrl: '/reminders/university/history',
                        onSaveLetterDetails: async (letterData) => {
                            if (savedBatchId) {
                                await updateUniversityReminderLetter(savedBatchId, letterData);
                            }
                        },
                    });
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    Swal.fire(
                        'Error',
                        Object.values(errs).flat().join('\n') || 'Failed to save reminder letter.',
                        'error'
                    );
                },
            }
        );
    };

    return (
        <AppLayout>
            <Head title={isUpdate ? 'Update Reminder - ' + (university || universityName) : 'Create Reminder Letter'} />

            <div className="container-fluid py-3">
                <form onSubmit={handleSubmit}>
                    {/* Top Card: Head Name, Date & Editable University/Year/Course */}
                    <div className="card shadow-sm border mb-3">
                        <div className="card-body">
                            <div className="row g-3 mb-2">
                                <div className="col-lg-6 col-md-6">
                                    <label htmlFor="head_name" className="form-label fw-bold mb-1">
                                        Head Name :
                                    </label>
                                    <input
                                        type="text"
                                        name="head_name"
                                        id="head_name"
                                        className="form-control"
                                        placeholder="To , Head Name"
                                        value={headName}
                                        onChange={(e) => setHeadName(e.target.value)}
                                    />
                                </div>
                                <div className="col-lg-6 col-md-6">
                                    <label htmlFor="dated" className="form-label fw-bold mb-1">
                                        Date :
                                    </label>
                                    <input
                                        type="date"
                                        name="dated"
                                        id="dated"
                                        className="form-control"
                                        value={dated}
                                        onChange={(e) => setDated(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-lg-5 col-md-5">
                                    <label htmlFor="target_university" className="form-label fw-bold mb-1">
                                        University :
                                    </label>
                                    <Select2
                                        id="target_university"
                                        name="university"
                                        value={university}
                                        onChange={(val) => setUniversity(val)}
                                        options={universityOptions}
                                        placeholder="-- Select University --"
                                        allowClear={false}
                                        allowCustom={true}
                                    />
                                </div>
                                <div className="col-lg-3 col-md-3">
                                    <label htmlFor="target_year" className="form-label fw-bold mb-1">
                                        Year :
                                    </label>
                                    <Select2
                                        id="target_year"
                                        name="academic_year"
                                        value={year}
                                        onChange={(val) => setYear(val)}
                                        options={yearOptions}
                                        placeholder="-- Select Year --"
                                        allowClear={false}
                                        allowCustom={true}
                                    />
                                </div>
                                <div className="col-lg-4 col-md-4">
                                    <label htmlFor="target_course" className="form-label fw-bold mb-1">
                                        Course :
                                    </label>
                                    <Select2
                                        id="target_course"
                                        name="course"
                                        value={course}
                                        onChange={(val) => setCourse(val)}
                                        options={courseOptions}
                                        placeholder="-- Select Course --"
                                        allowClear={false}
                                        allowCustom={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Students Table */}
                    <div className="table-responsive mb-3">
                        <table className="table table-striped table-bordered align-middle" style={{ fontSize: '14px' }}>
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '22%' }}>Name</th>
                                    <th style={{ width: '15%' }}>Case No.</th>
                                    <th style={{ width: '15%' }}>Admission Taken Year</th>
                                    <th style={{ width: '15%' }}>Admission Taken In</th>
                                    <th style={{ width: '33%' }}>Reminder Massage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((stud) => (
                                    <tr key={stud.id}>
                                        <td className="fw-semibold text-dark">
                                            {stud.student_name}
                                            {stud.student_nee_name && stud.student_nee_name !== '-' && (
                                                <div className="small text-muted">(Nee: {stud.student_nee_name})</div>
                                            )}
                                        </td>
                                        <td>{stud.eligibility_case_no || '—'}</td>
                                        <td>{stud.admission_taken_year || year}</td>
                                        <td>{stud.admission_taken_in || course}</td>
                                        <td>
                                            {/* Previous Reminder Notes (if any) with option to edit typo directly or delete note */}
                                            {stud.existing_notes && stud.existing_notes.length > 0 && (
                                                <div className="mb-2">
                                                    {stud.existing_notes.map((note) => {
                                                        const editState = editedNotes[note.id];
                                                        return (
                                                            <div key={note.id} className="mb-2 p-2 border rounded bg-light bg-opacity-50">
                                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                                    <label className="fw-semibold small mb-0 text-dark">
                                                                        Reminder Note {note.slot} :
                                                                    </label>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="badge bg-danger text-white py-1 px-2" style={{ fontSize: '11px' }}>
                                                                            This Reminder Dated : {note.note_date || '—'}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline-danger btn-sm py-0 px-2"
                                                                            style={{ fontSize: '11px' }}
                                                                            onClick={() => handleDeleteNote(note.id, note.slot)}
                                                                            title="Delete this reminder note if added by mistake"
                                                                        >
                                                                            <i className="fa fa-trash me-1"></i> Delete Note
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    className={`form-control form-control-sm ${editState?.isModified ? 'border-warning bg-warning bg-opacity-10' : ''}`}
                                                                    value={editState?.text ?? note.note_text}
                                                                    onChange={(e) => handleExistingNoteTextChange(note.id, note.note_text, e.target.value)}
                                                                    placeholder="Edit reminder note if written incorrectly..."
                                                                    title="You can edit this note directly if something was written wrong"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Next Reminder Note Input (Only filled if staff actually want to record the next reminder) */}
                                            <div>
                                                <label htmlFor={`reminder_${stud.id}`} className="fw-semibold small mb-1 text-dark d-block">
                                                    Reminder Note {stud.next_slot} :
                                                    {isUpdate && (
                                                        <span className="text-muted fw-normal ms-1 small">
                                                            (Leave empty if not issuing Note {stud.next_slot})
                                                        </span>
                                                    )}
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id={`reminder_${stud.id}`}
                                                    placeholder={isUpdate ? `Leave empty to keep Note ${stud.existing_notes.length} only, or enter text to issue Note ${stud.next_slot}...` : "e.g. 1st Reminder Notice"}
                                                    value={nextNotes[stud.id] ?? ''}
                                                    onChange={(e) => handleNextNoteChange(stud.id, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <hr />

                    {/* Bottom Submission Action */}
                    <div className="d-flex justify-content-between align-items-center">
                        <Link href={backUrl} className="btn btn-secondary">
                            <i className="fa fa-arrow-left me-1"></i> Back
                        </Link>
                        <button
                            type="submit"
                            className="btn btn-primary px-4 py-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa fa-spinner fa-spin me-1"></i> Saving...
                                </>
                            ) : (
                                isUpdate ? 'Update Reminder Letter' : 'Create Reminder Letter'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
