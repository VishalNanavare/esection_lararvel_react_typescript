export interface User {
    id: number;
    username: string;
    full_name: string;
    role: 'admin' | 'staff';
    email: string | null;
}

export interface Auth {
    user: User | null;
    permissions: string[];
}

export interface SharedProps {
    appName: string;
    auth: Auth;
    flash: {
        success?: string | null;
        error?: string | null;
        warning?: string | null;
        info?: string | null;
    };
    features: {
        export: boolean;
        import: boolean;
        delete: boolean;
        bulk_email: boolean;
    };
    [key: string]: unknown;
}

export interface College {
    id: number;
    Name: string;
    States: string | null;
    Address: string | null;
    email_id: string | null;
    mobile_no: string | null;
    fees: string | null;
    head_name: string | null;
    in_favour_of: string | null;
    sel_data: string;
    is_active: boolean;
}

export interface Student {
    id: number;
    array_space: string | null;
    to_name: string | null;
    clg_add: string | null;
    admission_taken_year: string | null;
    student_name: string;
    student_nee_name: string | null;
    email: string | null;
    eligibility_case_no: string | null;
    admission_taken_in: string | null;
    verification_of_marksheet_done_by_you: string | null;
    in_favour_of: string | null;
    en_time: string | null;
    confirmation?: Confirmation | null;
}

export interface Confirmation {
    id: number;
    array_space: string | null;
    name: string | null;
    stream: string | null;
    uni_add: string | null;
    case_no: string | null;
    en_time: string | null;
    acd_year: string | null;
    mig_TC: string;
    s_marks: string;
    p_degree: string;
    letter_no_date: string | null;
    remark: string | null;
    conf_from: string | null;
    conf_from_text: string | null;
    conf_from_select: string | null;
    etc_data: string | null;
    student_id: number;
    dd_no: string | null;
    bank_name: string | null;
    dd_date: string | null;
    dd_amount: string | null;
    en_by: string | null;
    student?: Student | null;
}

export interface AcademicYear {
    id: number;
    year_label: string;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
}

export interface Course {
    id: number;
    name: string;
    code: string | null;
    is_active: boolean;
}

export interface Stream {
    id: number;
    Name: string;
    Division: string;
}

export interface Regularization {
    id: number;
    gender: string | null;
    student_name: string;
    eligibility_case_no: string | null;
    admission_letter_for: string | null;
    admission_letter_date: string | null;
    admission_taken_year: string | null;
    admission_taken_in: string | null;
    university_name: string | null;
    passing_course: string | null;
    created_by: string | null;
    created_at: string;
}

export interface StudentReminder {
    id: number;
    student_name: string;
    eligibility_case_no: string | null;
    course_name: string | null;
    missing_doc: string | null;
    created_by: string | null;
    created_at: string;
}

export interface UniversityReminderNote {
    id: number;
    batch_id: number;
    student_id: number;
    note_text: string;
    note_date: string | null;
    created_by: string | null;
    created_at: string;
    student?: Student;
}

export interface UniversityReminderBatch {
    id: number;
    academic_year: string;
    university_name: string;
    admission_taken_in: string | null;
    head_name: string | null;
    created_by: string | null;
    created_at: string;
    notes?: UniversityReminderNote[];
}

export interface ActivityLogItem {
    id: number;
    user_id: number | null;
    username: string;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    description: string | null;
    created_at: string;
}
