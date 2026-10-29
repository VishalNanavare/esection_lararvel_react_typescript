import Swal from 'sweetalert2';
import { router } from '@inertiajs/react';
import { getCsrfHeaders, isCsrfMismatch } from './csrf';

export interface LetterDetails {
    letter_no: string;
    letter_date: string;
    remarks: string;
}

export type LetterData = LetterDetails;

export function getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export interface PromptLetterModalOptions {
    title?: string;
    subtitle?: string;
    initialLetterNo?: string;
    defaultLetterNo?: string;
    initialLetterDate?: string;
    defaultLetterDate?: string;
    initialRemarks?: string;
    defaultRemarks?: string;
    onSave: (data: LetterDetails) => Promise<void> | void;
}

/**
 * Open a modal to enter or update Letter No., Letter Date, and Remarks.
 */
export async function promptLetterDetailsModal(options: PromptLetterModalOptions): Promise<boolean> {
    const defaultDate = options.defaultLetterDate || options.initialLetterDate || getTodayDateString();
    const defaultNo = options.defaultLetterNo || options.initialLetterNo || '';
    const defaultRmk = options.defaultRemarks || options.initialRemarks || '';

    const { value: formValues } = await Swal.fire({
        title: options.title || 'Add / Edit Letter Details',
        html: `
            <div class="text-start mb-2">
                ${options.subtitle ? `<p class="text-muted small mb-3">${options.subtitle}</p>` : ''}
                <div class="mb-3">
                    <label class="form-label small fw-semibold text-dark mb-1">
                        Letter No. / Outward Reference No.
                    </label>
                    <input id="swal_letter_no" type="text" class="form-control" 
                        placeholder="e.g. IDOL/2026/EL/1024 or Net Copy" value="${escapeHtml(defaultNo)}" />
                    <div class="form-text small">Enter official dispatch / outward registry number.</div>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-semibold text-dark mb-1">
                        Letter Date <span class="text-danger">*</span>
                    </label>
                    <input id="swal_letter_date" type="date" class="form-control" value="${escapeHtml(defaultDate)}" />
                    <div class="form-text small">Dispatch / outward date on the letter.</div>
                </div>
                <div class="mb-2">
                    <label class="form-label small fw-semibold text-dark mb-1">
                        Remarks / Dispatch Notes
                    </label>
                    <textarea id="swal_remarks" class="form-control" rows="2" 
                        placeholder="e.g. Dispatched via Speed Post #ED123456789IN / by hand">${escapeHtml(defaultRmk)}</textarea>
                    <div class="form-text small">Track delivery details, courier tracking, or internal notes.</div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-check me-1"></i> Save Letter Details',
        cancelButtonText: 'Cancel',
        focusConfirm: false,
        customClass: {
            confirmButton: 'btn btn-primary px-3 me-2',
            cancelButton: 'btn btn-light px-3',
            popup: 'rounded-3 shadow-lg border-0',
        },
        buttonsStyling: false,
        preConfirm: async () => {
            const letter_no = (document.getElementById('swal_letter_no') as HTMLInputElement)?.value.trim() || '';
            const letter_date = (document.getElementById('swal_letter_date') as HTMLInputElement)?.value || '';
            const remarks = (document.getElementById('swal_remarks') as HTMLTextAreaElement)?.value.trim() || '';

            if (!letter_no && !letter_date && !remarks) {
                Swal.showValidationMessage('Please provide at least a Letter Number, Date, or Remarks.');
                return false;
            }

            try {
                await options.onSave({ letter_no, letter_date, remarks });
                return { letter_no, letter_date, remarks };
            } catch (err: any) {
                Swal.showValidationMessage(err.message || 'Failed to save letter details');
                return false;
            }
        },
    });

    if (formValues) {
        Swal.fire({
            icon: 'success',
            title: 'Letter Details Saved',
            text: 'Letter No, Date, and Remarks have been recorded successfully.',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
        });
        return true;
    }

    return false;
}

export interface PostLetterOptions {
    title?: string;
    html?: string;
    letterType?: string;
    batchIdOrReference?: string | number;
    pdfUrl?: string;
    historyUrl?: string;
    viewHistoryUrl?: string;
    viewHistoryText?: string;
    defaultLetterNo?: string;
    initialLetterNo?: string;
    defaultLetterDate?: string;
    initialLetterDate?: string;
    defaultRemarks?: string;
    initialRemarks?: string;
    onSaveLetter?: (data: LetterDetails) => Promise<void>;
    onSaveLetterDetails?: (data: LetterDetails) => Promise<void>;
    onDone?: () => void;
    onComplete?: () => void;
}

/**
 * Show a post-creation prompt with options to:
 * 1. Add Letter No, Date & Remarks immediately
 * 2. View/Print PDF
 * 3. Return to list / view
 */
export async function showLetterPostCreatePrompt(options: PostLetterOptions): Promise<void> {
    const title = options.title || `${options.letterType || 'Letter'} Created Successfully`;
    const html = options.html || `Official <strong>${options.letterType || 'Letter'}</strong> recorded${options.batchIdOrReference ? ` (Reference: <strong>#${options.batchIdOrReference}</strong>)` : ''}.<br/><br/>Would you like to record its official Letter No., Date and Remarks now?`;
    const onSave = options.onSaveLetterDetails || options.onSaveLetter;
    const onFinished = options.onComplete || options.onDone;
    const historyUrl = options.historyUrl || options.viewHistoryUrl;

    const result = await Swal.fire({
        icon: 'success',
        title: title,
        html: html,
        showCancelButton: true,
        showDenyButton: !!options.pdfUrl,
        confirmButtonText: '<i class="fa fa-pencil me-1"></i> Add Letter No, Date & Remarks',
        denyButtonText: '<i class="fa fa-file-pdf-o me-1"></i> Open Letter PDF',
        cancelButtonText: options.viewHistoryText || 'View History',
        customClass: {
            confirmButton: 'btn btn-primary me-2 mb-1',
            denyButton: 'btn btn-outline-danger me-2 mb-1',
            cancelButton: 'btn btn-light mb-1',
            popup: 'rounded-3 shadow-lg border-0',
        },
        buttonsStyling: false,
    });

    if (result.isConfirmed) {
        // User clicked "Add Letter No, Date & Remarks"
        if (onSave) {
            await promptLetterDetailsModal({
                title: 'Record Letter No & Dispatch Date',
                subtitle: `Log when this ${options.letterType || 'letter'} was officially dispatched and assign its outward number.`,
                defaultLetterNo: options.defaultLetterNo || options.initialLetterNo,
                defaultLetterDate: options.defaultLetterDate || options.initialLetterDate,
                defaultRemarks: options.defaultRemarks || options.initialRemarks,
                onSave: onSave,
            });
        }

        if (options.pdfUrl) {
            const pdfRes = await Swal.fire({
                icon: 'success',
                title: 'Recorded Successfully!',
                text: 'Would you like to open the generated PDF letter now?',
                showCancelButton: true,
                confirmButtonText: '<i class="fa fa-file-pdf-o me-1"></i> View PDF',
                cancelButtonText: options.viewHistoryText || 'Done',
                customClass: {
                    confirmButton: 'btn btn-primary me-2',
                    cancelButton: 'btn btn-light',
                },
                buttonsStyling: false,
            });

            if (pdfRes.isConfirmed && options.pdfUrl) {
                window.open(options.pdfUrl, '_blank');
            }
        }

        if (onFinished) {
            onFinished();
        } else if (historyUrl) {
            router.visit(historyUrl);
        }
    } else if (result.isDenied) {
        // User clicked "Open Letter PDF"
        if (options.pdfUrl) {
            window.open(options.pdfUrl, '_blank');
        }
        if (onFinished) {
            onFinished();
        } else if (historyUrl) {
            router.visit(historyUrl);
        }
    } else {
        // User clicked "View History" / Cancel
        if (onFinished) {
            onFinished();
        } else if (historyUrl) {
            router.visit(historyUrl);
        }
    }
}

// Module-specific update API callers
export async function updateStudentBatchLetter(arraySpace: string, data: LetterDetails): Promise<void> {
    const res = await fetch(`/students/batches/${arraySpace}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getCsrfHeaders(),
        },
        body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') {
        if (isCsrfMismatch(res.status, json.message)) {
            throw new Error('Your session expired. Please refresh the page and try again.');
        }
        throw new Error(json.message || 'Failed to update student verification batch letter details.');
    }
}

export async function updateConfirmationBatchLetter(arraySpace: string, data: LetterDetails): Promise<void> {
    const res = await fetch(`/confirmations/batches/${arraySpace}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getCsrfHeaders(),
        },
        body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') {
        if (isCsrfMismatch(res.status, json.message)) {
            throw new Error('Your session expired. Please refresh the page and try again.');
        }
        throw new Error(json.message || 'Failed to update confirmation batch letter details.');
    }
}

export async function updateRegularizationLetter(id: number | string, data: LetterDetails): Promise<void> {
    const res = await fetch(`/regularization/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getCsrfHeaders(),
        },
        body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') {
        if (isCsrfMismatch(res.status, json.message)) {
            throw new Error('Your session expired. Please refresh the page and try again.');
        }
        throw new Error(json.message || 'Failed to update regularization letter details.');
    }
}

export async function updateUniversityReminderLetter(batchId: number | string, data: LetterDetails): Promise<void> {
    const res = await fetch(`/reminders/university/batches/${batchId}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getCsrfHeaders(),
        },
        body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') {
        if (isCsrfMismatch(res.status, json.message)) {
            throw new Error('Your session expired. Please refresh the page and try again.');
        }
        throw new Error(json.message || 'Failed to update university reminder batch letter details.');
    }
}

export async function updateStudentReminderLetter(id: number | string, data: LetterDetails): Promise<void> {
    const res = await fetch(`/reminders/student/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getCsrfHeaders(),
        },
        body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') {
        if (isCsrfMismatch(res.status, json.message)) {
            throw new Error('Your session expired. Please refresh the page and try again.');
        }
        throw new Error(json.message || 'Failed to update student reminder notice letter details.');
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
