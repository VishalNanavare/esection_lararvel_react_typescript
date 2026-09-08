<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EStudentData extends Model
{
    protected $table = 'e_student_data';

    protected $fillable = [
        'AdmissionYear',
        'ApplicationID',
        'FirstName',
        'MiddleName',
        'LastName',
        'NameOnMarkSheet',
        'Gender',
        'CorrespondenceAddress',
        'PermanentAddress',
        'PrimaryMobileNo',
        'AlternateMobileNo',
        'EmailID',
        'CourseName',
        'LastQual',
        'QualificationName',
        'CertifyingBodyType',
        'CertifyingBoardName',
        'CertifyingStateName',
        'AdmissionFeeAmount',
        'AdmissionFeeTransactionDateTime',
        'ApplicationStatus',
        'SCEligibilityStatus',
        'EligibilityCaseNo',
        'EligibilityApprovalDate',
        'import_ref',
        'imported_at',
        'imported_by',
        'dispatch_array_space',
    ];

    protected function casts(): array
    {
        return [
            'imported_at' => 'datetime',
        ];
    }
}
