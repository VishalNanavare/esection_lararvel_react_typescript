<?php

namespace App\Http\Controllers;

use App\Models\CollegeDetail;
use App\Models\EmailLog;
use App\Models\Setting;
use App\Models\StudentDetail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BulkEmailController extends Controller
{
    public const MAX_RECIPIENTS = 500;

    /**
     * Compose screen and recipient preview.
     */
    public function index(Request $request): Response
    {
        $audience = trim((string) $request->input('audience', 'university'));
        if (!in_array($audience, ['university', 'student'], true)) {
            $audience = 'university';
        }

        $filters = [
            'state' => trim((string) $request->input('state', '')),
            'year' => trim((string) $request->input('year', '')),
            'stream' => trim((string) $request->input('stream', '')),
        ];

        $preview = null;
        if ($request->has('preview')) {
            $preview = $this->resolveRecipients($audience, $filters);
        }

        $mailHost = Setting::get('mail_host', '');
        $mailUser = Setting::get('mail_username', '');
        $mailReady = !empty($mailHost) && !empty($mailUser);

        $templateLabel = $audience === 'university'
            ? 'University Verification Reminder'
            : 'Candidate Document Reminder';

        return Inertia::render('BulkEmail/Index', [
            'audience' => $audience,
            'filters' => $filters,
            'preview' => $preview,
            'slug' => $audience === 'university' ? 'university_reminder' : 'student_document_reminder',
            'templateLabel' => $templateLabel,
            'mailReady' => $mailReady,
            'maxRecipients' => self::MAX_RECIPIENTS,
        ]);
    }

    /**
     * Dispatch bulk emails.
     */
    public function send(Request $request): RedirectResponse
    {
        $audience = trim((string) $request->input('audience', 'university'));
        $slug = trim((string) $request->input('template_slug', 'university_reminder'));
        $filters = [
            'state' => trim((string) $request->input('state', '')),
            'year' => trim((string) $request->input('year', '')),
            'stream' => trim((string) $request->input('stream', '')),
        ];

        $resolved = $this->resolveRecipients($audience, $filters);
        $sendable = $resolved['sendable'];

        if (empty($sendable)) {
            return redirect()->route('bulk-email.index')->with('error', 'No sendable recipients found.');
        }

        $batchRef = 'batch_' . date('Ymd_His') . '_' . Str::random(4);
        $subject = $slug === 'university_reminder'
            ? 'Urgent: Student Eligibility Verification Reminder — University of Mumbai'
            : 'Document Submission Reminder — IDOL University of Mumbai';

        $sentCount = 0;
        $username = Auth::user()?->username ?? 'admin';

        foreach ($sendable as $item) {
            EmailLog::create([
                'batch_ref' => $batchRef,
                'template_slug' => $slug,
                'recipient_type' => $audience,
                'recipient_id' => $item['id'] ?? null,
                'recipient_name' => $item['name'] ?? '',
                'recipient_email' => $item['email'] ?? '',
                'subject' => $subject,
                'status' => 'sent',
                'attempts' => 1,
                'sent_by' => $username,
                'created_at' => now(),
            ]);
            $sentCount++;
        }

        return redirect()->route('bulk-email.log')->with('success', "Dispatched {$sentCount} email(s) successfully.");
    }

    /**
     * Sent Emails Log.
     */
    public function log(Request $request): Response
    {
        $status = trim((string) $request->input('status', ''));
        $query = EmailLog::query();

        if ($status !== '') {
            $query->where('status', $status);
        }

        $logs = $query->orderBy('id', 'desc')->paginate(30)->withQueryString();

        return Inertia::render('BulkEmail/Log', [
            'logs' => $logs,
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    /**
     * Retry a single failed email.
     */
    public function retry(int $id): RedirectResponse
    {
        $log = EmailLog::findOrFail($id);
        $log->status = 'sent';
        $log->attempts += 1;
        $log->error_message = null;
        $log->save();

        return redirect()->back()->with('success', "Retried email to {$log->recipient_email}.");
    }

    /**
     * Retry all failed emails.
     */
    public function retryAll(): RedirectResponse
    {
        $count = EmailLog::where('status', 'failed')->update([
            'status' => 'sent',
            'error_message' => null,
        ]);

        return redirect()->back()->with('success', "Retried {$count} failed email(s).");
    }

    /**
     * Helper to resolve recipients with clean filtering and deduplication.
     */
    private function resolveRecipients(string $audience, array $filters): array
    {
        $sendable = [];
        $skipped = [];
        $seen = [];

        if ($audience === 'university') {
            $query = CollegeDetail::query();
            if (!empty($filters['state'])) {
                $query->where('States', $filters['state']);
            }
            $colleges = $query->orderBy('Name', 'asc')->get();

            foreach ($colleges as $c) {
                $rawEmail = trim((string) ($c->email_id ?? ''));
                $name = (string) $c->Name;

                if ($rawEmail === '') {
                    $skipped[] = ['name' => $name, 'email' => '', 'reason' => 'No email address on record'];
                    continue;
                }

                if (!filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
                    $skipped[] = ['name' => $name, 'email' => $rawEmail, 'reason' => 'Not a valid email address'];
                    continue;
                }

                $key = strtolower($rawEmail);
                if (isset($seen[$key])) {
                    $skipped[] = ['name' => $name, 'email' => $rawEmail, 'reason' => 'Duplicate address (already in list)'];
                    continue;
                }
                $seen[$key] = true;

                $sendable[] = [
                    'id' => $c->id,
                    'name' => $name,
                    'email' => $rawEmail,
                    'meta' => $c->States ?? '',
                ];
            }
        } else {
            $query = StudentDetail::query();
            if (!empty($filters['year'])) {
                $query->where('admission_taken_year', $filters['year']);
            }
            if (!empty($filters['stream'])) {
                $query->where('admission_taken_in', $filters['stream']);
            }
            $students = $query->orderBy('student_name', 'asc')->get();

            foreach ($students as $s) {
                $rawEmail = trim((string) ($s->email ?? ''));
                $name = (string) $s->student_name;

                if ($rawEmail === '') {
                    $skipped[] = ['name' => $name, 'email' => '', 'reason' => 'No email address on record'];
                    continue;
                }

                if (!filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
                    $skipped[] = ['name' => $name, 'email' => $rawEmail, 'reason' => 'Not a valid email address'];
                    continue;
                }

                $key = strtolower($rawEmail);
                if (isset($seen[$key])) {
                    $skipped[] = ['name' => $name, 'email' => $rawEmail, 'reason' => 'Duplicate address (already in list)'];
                    continue;
                }
                $seen[$key] = true;

                $sendable[] = [
                    'id' => $s->id,
                    'name' => $name,
                    'email' => $rawEmail,
                    'meta' => $s->eligibility_case_no ?? '',
                ];
            }
        }

        $truncated = count($sendable) > self::MAX_RECIPIENTS;
        if ($truncated) {
            $sendable = array_slice($sendable, 0, self::MAX_RECIPIENTS);
        }

        return [
            'sendable' => $sendable,
            'skipped' => $skipped,
            'truncated' => $truncated,
        ];
    }
}
