<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CollegeDetail;
use App\Models\ConfStudData;
use App\Models\Regularization;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $totalStudents = StudentDetail::count();
        $totalConfirmed = ConfStudData::count();
        $totalColleges = CollegeDetail::count();
        $totalPending = max(0, $totalStudents - $totalConfirmed);
        $totalRegularizations = Regularization::count();

        // Stream breakdown metrics
        $streams = StreamDetail::whereNotNull('Division')->get();
        $totalCounts = StudentDetail::selectRaw('admission_taken_in, count(*) as count')
            ->groupBy('admission_taken_in')
            ->pluck('count', 'admission_taken_in')
            ->toArray();

        $confirmedCounts = ConfStudData::join('student_details', 'conf_stud_data.student_id', '=', 'student_details.id')
            ->selectRaw('student_details.admission_taken_in, count(*) as count')
            ->groupBy('student_details.admission_taken_in')
            ->pluck('count', 'student_details.admission_taken_in')
            ->toArray();

        $metrics = [];
        foreach ($streams as $s) {
            $streamName = $s->Division ?? $s->full_name ?? '';
            if (empty($streamName)) {
                continue;
            }

            $total = 0;
            $confirmed = 0;

            foreach ($totalCounts as $stName => $cnt) {
                if (stripos($stName, $streamName) !== false || stripos($streamName, $stName) !== false) {
                    $total += $cnt;
                }
            }

            foreach ($confirmedCounts as $stName => $cnt) {
                if (stripos($stName, $streamName) !== false || stripos($streamName, $stName) !== false) {
                    $confirmed += $cnt;
                }
            }

            $pending = max(0, $total - $confirmed);

            $metrics[] = [
                'stream' => $streamName,
                'total' => $total,
                'confirmed' => $confirmed,
                'pending' => $pending,
            ];
        }

        $recentActivity = ActivityLog::orderBy('created_at', 'desc')->take(6)->get();

        return Inertia::render('Dashboard/Index', [
            'title' => 'Dashboard - E-Section Portal',
            'stats' => [
                'total_students' => $totalStudents,
                'total_confirmed' => $totalConfirmed,
                'total_pending' => $totalPending,
                'total_colleges' => $totalColleges,
                'total_regularizations' => $totalRegularizations,
            ],
            'metrics' => $metrics,
            'recent_activity' => $recentActivity,
        ]);
    }
}
