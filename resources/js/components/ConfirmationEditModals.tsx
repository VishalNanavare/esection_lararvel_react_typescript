import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export interface BatchEditData {
    array_space: string;
    uni_add?: string;
    stream?: string;
    acd_year?: string;
    dd_no?: string | null;
    bank_name?: string | null;
    dd_date?: string | null;
    dd_amount?: string | null;
    letter_no?: string | null;
    letter_date?: string | null;
    remarks?: string | null;
}

export interface CandidateEditData {
    id: number;
    name?: string;
    student_name?: string;
    case_no?: string | null;
    uni_add?: string | null;
    university_name?: string | null;
    stream?: string | null;
    acd_year?: string | null;
    mig_tc?: string | null;
    mig_TC?: string | null;
    mig?: string | null;
    tc?: string | null;
    p_degree?: string | null;
    s_marks?: string | null;
    letter_no_date?: string | null;
    remark?: string | null;
    conf_from?: string | null;
    conf_from_select?: string | null;
    conf_from_text?: string | null;
    etc_data?: string | null;
    dd_no?: string | null;
    bank_name?: string | null;
    dd_date?: string | null;
    dd_amount?: string | null;
    letter_no?: string | null;
    letter_date?: string | null;
    remarks?: string | null;
}

interface EditBatchModalProps {
    show?: boolean;
    batch: BatchEditData | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export const EditConfirmationBatchModal: React.FC<EditBatchModalProps> = ({
    show = true,
    batch,
    onClose,
    onSuccess,
}) => {
    const [uniAdd, setUniAdd] = useState('');
    const [stream, setStream] = useState('');
    const [acdYear, setAcdYear] = useState('');
    const [ddNo, setDdNo] = useState('');
    const [bankName, setBankName] = useState('');
    const [ddDate, setDdDate] = useState('');
    const [ddAmount, setDdAmount] = useState('');
    const [letterNo, setLetterNo] = useState('');
    const [letterDate, setLetterDate] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (batch) {
            setUniAdd(batch.uni_add || '');
            setStream(batch.stream || '');
            setAcdYear(batch.acd_year || '');
            setDdNo(batch.dd_no || '');
            setBankName(batch.bank_name || '');
            setDdDate(batch.dd_date ? batch.dd_date.substring(0, 10) : '');
            setDdAmount(batch.dd_amount ? String(batch.dd_amount) : '');
            setLetterNo(batch.letter_no || '');
            setLetterDate(batch.letter_date ? batch.letter_date.substring(0, 10) : '');
            setRemarks(batch.remarks || '');
        }
    }, [batch]);

    if (!show || !batch) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.put(
            `/confirmations/batches/${encodeURIComponent(batch.array_space)}`,
            {
                uni_add: uniAdd.trim(),
                stream: stream.trim(),
                acd_year: acdYear.trim(),
                dd_no: ddNo.trim(),
                bank_name: bankName.trim(),
                dd_date: ddDate || null,
                dd_amount: ddAmount ? parseFloat(ddAmount) : null,
                letter_no: letterNo.trim(),
                letter_date: letterDate || null,
                remarks: remarks.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    onClose();
                    Swal.fire({
                        icon: 'success',
                        title: 'Batch Updated',
                        text: `Confirmation Batch #${batch.array_space} has been updated.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    if (onSuccess) onSuccess();
                },
                onError: (err) => {
                    setIsSaving(false);
                    Swal.fire(
                        'Update Failed',
                        Object.values(err).flat().join('\n') || 'Could not update confirmation batch.',
                        'error'
                    );
                },
            }
        );
    };

    return (
        <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-3">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header bg-light border-bottom py-3 px-4">
                            <div className="d-flex align-items-center gap-2">
                                <span className="p-2 bg-warning-subtle text-warning rounded-2 d-inline-flex align-items-center justify-content-center">
                                    <i className="fa fa-pencil-square-o fs-5"></i>
                                </span>
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        Edit Confirmation Batch #{batch.array_space}
                                    </h5>
                                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: '10.5px' }}>
                                        <i className="fa fa-shield me-1"></i>Administrator Restricted
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                disabled={isSaving}
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body p-4">
                            <div className="row g-3">
                                {/* University Address */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold small text-secondary">
                                        University / Board Name & Address
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={uniAdd}
                                        onChange={(e) => setUniAdd(e.target.value)}
                                        placeholder="e.g. University of Mumbai, Fort Campus"
                                    />
                                </div>

                                {/* Stream & Academic Year */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Program / Stream
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={stream}
                                        onChange={(e) => setStream(e.target.value)}
                                        placeholder="e.g. FYBA, MCOM, MCA"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Academic Year
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={acdYear}
                                        onChange={(e) => setAcdYear(e.target.value)}
                                        placeholder="e.g. 2026-2027"
                                    />
                                </div>

                                {/* Demand Draft Information Header */}
                                <div className="col-12 pt-2">
                                    <h6 className="fw-bold text-dark border-bottom pb-1 mb-0" style={{ fontSize: '13px' }}>
                                        <i className="fa fa-credit-card text-success me-1.5"></i>Demand Draft (DD) Payment Information
                                    </h6>
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">DD Number</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={ddNo}
                                        onChange={(e) => setDdNo(e.target.value)}
                                        placeholder="e.g. 123456"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">Bank Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="e.g. SBI, Bank of Baroda"
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">DD Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={ddDate}
                                        onChange={(e) => setDdDate(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">DD Amount (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control"
                                        value={ddAmount}
                                        onChange={(e) => setDdAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Letter Tracking Header */}
                                <div className="col-12 pt-2">
                                    <h6 className="fw-bold text-dark border-bottom pb-1 mb-0" style={{ fontSize: '13px' }}>
                                        <i className="fa fa-envelope-o text-primary me-1.5"></i>Official Confirmation Letter Tracking
                                    </h6>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold small text-secondary">Outward / Letter No.</label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={letterNo}
                                        onChange={(e) => setLetterNo(e.target.value)}
                                        placeholder="e.g. OUT/IDOL/CONF/2026/042"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold small text-secondary">Letter Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={letterDate}
                                        onChange={(e) => setLetterDate(e.target.value)}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label fw-semibold small text-secondary">Remarks / Dispatch Notes</label>
                                    <textarea
                                        rows={2}
                                        className="form-control"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="e.g. Verified and dispatched via registered post..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer bg-light border-top py-2.5 px-4 d-flex justify-content-between">
                            <span className="small text-muted">
                                Updates will apply across all candidates in Batch #{batch.array_space}.
                            </span>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-3"
                                    onClick={onClose}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-warning text-dark px-4 fw-semibold"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-check me-1"></i> Save Batch Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface EditCandidateModalProps {
    show?: boolean;
    candidate: CandidateEditData | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export const EditConfirmationCandidateModal: React.FC<EditCandidateModalProps> = ({
    show = true,
    candidate,
    onClose,
    onSuccess,
}) => {
    const [name, setName] = useState('');
    const [caseNo, setCaseNo] = useState('');
    const [uniAdd, setUniAdd] = useState('');
    const [stream, setStream] = useState('');
    const [acdYear, setAcdYear] = useState('');
    const [mig, setMig] = useState<'sel' | 'Yes' | 'No'>('sel');
    const [tc, setTc] = useState<'sel' | 'Yes' | 'No'>('sel');
    const [pDegree, setPDegree] = useState<'sel' | 'Yes' | 'No'>('sel');
    const [sMarks, setSMarks] = useState<'sel' | 'Yes' | 'No'>('sel');
    const [letterNoDate, setLetterNoDate] = useState('');
    const [remark, setRemark] = useState('');
    const [confFrom, setConfFrom] = useState('sel');
    const [confFromSelect, setConfFromSelect] = useState('sel');
    const [confFromText, setConfFromText] = useState('');
    const [etcData, setEtcData] = useState('sel');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (candidate) {
            setName(candidate.student_name || candidate.name || '');
            setCaseNo(candidate.case_no || '');
            setUniAdd(candidate.university_name || candidate.uni_add || '');
            setStream(candidate.stream || '');
            setAcdYear(candidate.acd_year || '');

            const hasTcData = Boolean(
                candidate.conf_from || candidate.conf_from_text || candidate.conf_from_select || candidate.etc_data
            );
            const migTcRaw = candidate.mig_tc || candidate.mig_TC;

            if (candidate.tc === 'Yes' || hasTcData) {
                setTc('Yes');
                setMig('No');
            } else if (candidate.mig === 'Yes') {
                setMig('Yes');
                setTc('No');
            } else if (candidate.tc === 'No' && candidate.mig === 'No') {
                setTc('No');
                setMig('No');
            } else if (migTcRaw === 'Yes') {
                setMig('Yes');
                setTc('No');
            } else if (migTcRaw === 'No') {
                setMig('No');
                setTc('No');
            } else {
                setMig((candidate.mig === 'No' ? 'No' : 'sel') as any);
                setTc((candidate.tc === 'No' ? 'No' : 'sel') as any);
            }

            setPDegree((candidate.p_degree === 'Yes' ? 'Yes' : candidate.p_degree === 'No' ? 'No' : 'sel') as any);
            setSMarks((candidate.s_marks === 'Yes' ? 'Yes' : candidate.s_marks === 'No' ? 'No' : 'sel') as any);
            setLetterNoDate(candidate.letter_no_date || '');
            setRemark(candidate.remark || '');
            setConfFrom(candidate.conf_from || 'sel');
            setConfFromSelect(candidate.conf_from_select || 'sel');
            setConfFromText(candidate.conf_from_text || '');
            setEtcData(candidate.etc_data || 'sel');
        }
    }, [candidate]);

    const handleMigChange = (val: 'sel' | 'Yes' | 'No') => {
        setMig(val);
        if (val === 'Yes') {
            setTc('No');
            setConfFrom('sel');
            setConfFromText('');
            setConfFromSelect('sel');
            setEtcData('sel');
        }
    };

    const handleTcChange = (val: 'sel' | 'Yes' | 'No') => {
        setTc(val);
        if (val === 'Yes') {
            setMig('No');
        } else {
            setConfFrom('sel');
            setConfFromText('');
            setConfFromSelect('sel');
            setEtcData('sel');
        }
    };

    if (!show || !candidate) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            Swal.fire('Validation Error', 'Candidate Name cannot be empty.', 'warning');
            return;
        }

        setIsSaving(true);

        const isTcYes = tc === 'Yes';
        const isMigYes = mig === 'Yes';
        const migTcVal = isTcYes || isMigYes ? 'Yes' : mig === 'No' && tc === 'No' ? 'No' : (candidate.mig_tc || 'No');

        router.put(
            `/confirmations/${candidate.id}`,
            {
                name: name.trim(),
                case_no: caseNo.trim(),
                uni_add: uniAdd.trim(),
                stream: stream.trim(),
                acd_year: acdYear.trim(),
                mig: mig,
                tc: tc,
                mig_tc: migTcVal,
                p_degree: pDegree === 'sel' ? 'No' : pDegree,
                s_marks: sMarks === 'sel' ? 'No' : sMarks,
                letter_no_date: letterNoDate.trim(),
                remark: remark.trim(),
                conf_from: isTcYes && confFrom !== 'sel' ? confFrom : '',
                conf_from_select: isTcYes && confFromSelect !== 'sel' ? confFromSelect : '',
                conf_from_text: isTcYes && confFrom === 'other' ? confFromText.trim() : '',
                etc_data: isTcYes && etcData !== 'sel' ? etcData : '',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    onClose();
                    Swal.fire({
                        icon: 'success',
                        title: 'Candidate Updated',
                        text: `Confirmation details for ${name} have been updated.`,
                        timer: 2000,
                        showConfirmButton: false,
                    });
                    if (onSuccess) onSuccess();
                },
                onError: (err) => {
                    setIsSaving(false);
                    Swal.fire(
                        'Update Failed',
                        Object.values(err).flat().join('\n') || 'Could not update candidate confirmation.',
                        'error'
                    );
                },
            }
        );
    };

    return (
        <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-3">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header bg-light border-bottom py-3 px-4">
                            <div className="d-flex align-items-center gap-2">
                                <span className="p-2 bg-primary-subtle text-primary rounded-2 d-inline-flex align-items-center justify-content-center">
                                    <i className="fa fa-user fs-5"></i>
                                </span>
                                <div>
                                    <h5 className="modal-title fw-bold text-dark mb-0">
                                        Edit Candidate Confirmation: {name || 'Record'}
                                    </h5>
                                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: '10.5px' }}>
                                        <i className="fa fa-shield me-1"></i>Administrator Restricted
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                disabled={isSaving}
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body p-4">
                            <div className="row g-3">
                                {/* Student Name & Case No */}
                                <div className="col-md-8">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Candidate Full Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Full student name"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Eligibility Case No.
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace fw-bold text-indigo"
                                        value={caseNo}
                                        onChange={(e) => setCaseNo(e.target.value)}
                                        placeholder="e.g. 501/2026"
                                    />
                                </div>

                                {/* University & Course */}
                                <div className="col-md-8">
                                    <label className="form-label fw-semibold small text-secondary">
                                        University / Board
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={uniAdd}
                                        onChange={(e) => setUniAdd(e.target.value)}
                                        placeholder="e.g. Savitribai Phule Pune University"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Stream / Course
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={stream}
                                        onChange={(e) => setStream(e.target.value)}
                                        placeholder="e.g. F.Y.B.Com"
                                    />
                                </div>

                                {/* Document Verification Checklist matching create time exactly */}
                                <div className="col-12 pt-2">
                                    <div className="d-flex align-items-center justify-content-between border-bottom pb-1">
                                        <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '13px' }}>
                                            <i className="fa fa-check-circle-o text-success me-1.5"></i>Verification Checklist &amp; Certificates
                                        </h6>
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-outline-primary py-0.5 px-2"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => {
                                                setPDegree('Yes');
                                                setSMarks('Yes');
                                            }}
                                            title="Quick fill Pass and Marks to Yes"
                                        >
                                            <i className="fa fa-magic me-1"></i>Fill Pass &amp; Marks Yes
                                        </button>
                                    </div>
                                </div>

                                <div className="col-6 col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">Mig</label>
                                    <select
                                        className="form-select"
                                        value={mig}
                                        disabled={tc === 'Yes'}
                                        onChange={(e) => handleMigChange(e.target.value as any)}
                                    >
                                        <option value="sel">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                <div className="col-6 col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">TC</label>
                                    <select
                                        className="form-select"
                                        value={tc}
                                        disabled={mig === 'Yes'}
                                        onChange={(e) => handleTcChange(e.target.value as any)}
                                    >
                                        <option value="sel">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                <div className="col-6 col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">Pass/Dgr</label>
                                    <select
                                        className="form-select"
                                        value={pDegree}
                                        onChange={(e) => setPDegree(e.target.value as any)}
                                    >
                                        <option value="sel">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                <div className="col-6 col-md-3">
                                    <label className="form-label fw-semibold small text-secondary">Statement of Marks</label>
                                    <select
                                        className="form-select"
                                        value={sMarks}
                                        onChange={(e) => setSMarks(e.target.value as any)}
                                    >
                                        <option value="sel">Select</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                {/* Letter No Dated & Remark */}
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Letter No. Dated
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={letterNoDate}
                                        onChange={(e) => setLetterNoDate(e.target.value)}
                                        placeholder="Letter No. Dated"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold small text-secondary">
                                        Remark
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        placeholder="Remark"
                                    />
                                </div>

                                {/* Clarification Panel (appears ONLY when TC is Yes, matching create time) */}
                                {tc === 'Yes' && (
                                    <div className="col-12">
                                        <div className="card border bg-light p-3 shadow-xs rounded-3">
                                            <div className="row g-2">
                                                <div className="col-12 col-md-4">
                                                    <label className="form-label small fw-semibold text-secondary mb-1">
                                                        Confirmation From :
                                                    </label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={confFrom}
                                                        onChange={(e) => setConfFrom(e.target.value)}
                                                    >
                                                        <option value="sel">Select</option>
                                                        <option value="Ranade Bhavan">Ranade Bhavan</option>
                                                        <option value="Dr Babasaheb Ambedkar Bhavan">Dr Babasaheb Ambedkar Bhavan</option>
                                                        <option value="other">other</option>
                                                    </select>
                                                    {confFrom === 'other' && (
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm mt-1"
                                                            placeholder="confirmation from"
                                                            value={confFromText}
                                                            onChange={(e) => setConfFromText(e.target.value)}
                                                        />
                                                    )}
                                                </div>

                                                <div className="col-12 col-md-4">
                                                    <label className="form-label small fw-semibold text-secondary mb-1">
                                                        Student Clarification :
                                                    </label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={confFromSelect}
                                                        onChange={(e) => setConfFromSelect(e.target.value)}
                                                    >
                                                        <option value="sel">Select</option>
                                                        <option value="old">old</option>
                                                        <option value="TC">TC</option>
                                                    </select>
                                                </div>

                                                <div className="col-12 col-md-4">
                                                    <label className="form-label small fw-semibold text-secondary mb-1">
                                                        Name Change :
                                                    </label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={etcData}
                                                        onChange={(e) => setEtcData(e.target.value)}
                                                    >
                                                        <option value="sel">Select</option>
                                                        <option value="Gazette">Gazette</option>
                                                        <option value="Marriage Certificate">Marriage Certificate</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer bg-light border-top py-2.5 px-4 d-flex justify-content-between">
                            <span className="small text-muted">
                                Record ID #{candidate.id}
                            </span>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-3"
                                    onClick={onClose}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 fw-semibold"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-check me-1"></i> Save Candidate Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
