<?php

namespace App\Http\Controllers;

use App\Mail\RawHtmlMail;
use App\Models\CollegeDetail;
use App\Models\EmailLog;
use App\Models\Setting;
use App\Models\StudentDetail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BulkEmailController extends Controller
{
    public const MAX_RECIPIENTS = 500;

    /**
     * Substitutes {token} placeholders for one recipient — the single
     * render point used by send() and retry(), so a retry with a corrected
     * template can never drift from what a fresh send would produce.
     * Mirrors esection_ci4's EmailTemplateService::render(): the subject
     * gets plain (unescaped) values, the body gets nl2br(escape()) applied
     * to the template text first, then escaped (not bolded) substitutions.
     */
    private function renderEmailTemplate(string $slug, array $tokenValues): array
    {
        $definitions = SettingsController::getEmailTemplateDefinitions();
        $def = $definitions[$slug] ?? ['default_subject' => '', 'default_body' => ''];

        $subject = Setting::get("email_{$slug}_subject", $def['default_subject']);
        $body = Setting::get("email_{$slug}_body", $def['default_body']);

        $subjectReplacements = [];
        $bodyReplacements = [];
        foreach ($tokenValues as $token => $value) {
            $subjectReplacements['{'.$token.'}'] = (string) $value;
            $bodyReplacements['{'.$token.'}'] = e((string) $value);
        }

        return [
            'subject' => strtr($subject, $subjectReplacements),
            'body' => strtr(nl2br(e($body)), $bodyReplacements),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function tokenValuesFor(string $audience, array $recipient): array
    {
        $meta = $recipient['meta'] ?? [];

        if ($audience === 'university') {
            return [
                'university_name' => $recipient['name'],
                'academic_year' => '',
                'course' => '',
                'pending_count' => '',
            ];
        }

        return [
            'student_name' => $recipient['name'],
            'case_no' => (string) ($meta['eligibility_case_no'] ?? ''),
            'course' => (string) ($meta['admission_taken_in'] ?? ''),
            'missing_document' => 'the pending document(s)',
        ];
    }

    /**
     * The one place a message actually leaves the system.
     *
     * @return array{ok: bool, error: string}
     */
    private function deliver(string $to, string $toName, string $subject, string $htmlBody): array
    {
        try {
            Mail::mailer(Setting::MAIL_MAILER_NAME)
                ->to($to, $toName ?: null)
                ->send(new RawHtmlMail($htmlBody, $subject));

            return ['ok' => true, 'error' => ''];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => mb_substr($e->getMessage(), 0, 1000)];
        }
    }

    /**
     * Compose screen and recipient preview.
     */
    public function index(Request $request): Response
    {
        $audience = trim((string) $request->input('audience', 'university'));
        if (! in_array($audience, ['university', 'student'], true)) {
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

        $mailReady = Setting::isMailConfigured();

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

        if (! Setting::enabled('feature_bulk_email_enabled')) {
            return redirect()->route('bulk-email.index')->with('error', 'Bulk email is currently disabled. Ask an administrator to enable it in Settings > Feature Toggles.');
        }
        if (! Setting::isMailConfigured()) {
            return redirect()->route('bulk-email.index')->with('error', 'Email is not configured yet. Set the SMTP server and "from" address in Settings > Email first.');
        }

        Setting::applyMailerConfig();

        $batchRef = 'batch_'.date('Ymd_His').'_'.Str::random(4);
        $username = Auth::user()?->username ?? 'admin';
        $batchSize = (int) Setting::get('mail_batch_size', '25');
        $pause = (int) Setting::get('mail_batch_pause', '5');

        $sentCount = 0;
        $failedCount = 0;
        $processed = 0;
        $total = count($sendable);

        foreach ($sendable as $item) {
            $rendered = $this->renderEmailTemplate($slug, $this->tokenValuesFor($audience, $item));
            $result = $this->deliver($item['email'], $item['name'] ?? '', $rendered['subject'], $rendered['body']);

            EmailLog::create([
                'batch_ref' => $batchRef,
                'template_slug' => $slug,
                'recipient_type' => $audience,
                'recipient_id' => $item['id'] ?? null,
                'recipient_name' => $item['name'] ?? '',
                'recipient_email' => $item['email'] ?? '',
                'subject' => mb_substr($rendered['subject'], 0, 255),
                'status' => $result['ok'] ? 'sent' : 'failed',
                'error_message' => $result['ok'] ? null : $result['error'],
                'attempts' => 1,
                'sent_by' => $username,
                'created_at' => now(),
            ]);

            $result['ok'] ? $sentCount++ : $failedCount++;
            $processed++;

            if ($pause > 0 && $batchSize > 0 && $processed % $batchSize === 0 && $processed < $total) {
                sleep($pause);
            }
        }

        $message = "Dispatched {$sentCount} email(s) successfully.";
        if ($failedCount > 0) {
            $message .= " {$failedCount} failed — check the log for details.";
        }

        return redirect()->route('bulk-email.log')->with($failedCount > 0 && $sentCount === 0 ? 'error' : 'success', $message);
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
     * Re-delivers one previously failed message and updates its log row in
     * place, re-rendering from whatever the template says right now — so
     * fixing the wording and retrying actually sends the corrected message.
     * Returns false (and leaves the row alone) if the toggle is off, mail
     * isn't configured, or the row is already marked sent.
     */
    private function performRetry(EmailLog $log): bool
    {
        if (! Setting::enabled('feature_bulk_email_enabled')) {
            return false;
        }
        if ($log->status === 'sent') {
            return false;
        }
        if (! Setting::isMailConfigured()) {
            return false;
        }

        $rendered = $this->renderEmailTemplate(
            (string) $log->template_slug,
            $this->tokenValuesFor((string) $log->recipient_type, [
                'name' => (string) $log->recipient_name,
                'meta' => [],
            ])
        );

        $result = $this->deliver((string) $log->recipient_email, (string) $log->recipient_name, $rendered['subject'], $rendered['body']);

        $log->status = $result['ok'] ? 'sent' : 'failed';
        $log->error_message = $result['ok'] ? null : $result['error'];
        $log->attempts += 1;
        $log->save();

        return $result['ok'];
    }

    /**
     * Retry a single failed email.
     */
    public function retry(int $id): RedirectResponse
    {
        $log = EmailLog::findOrFail($id);

        if ($log->status === 'sent') {
            return redirect()->back()->with('error', 'That email was already delivered successfully.');
        }
        if (! Setting::enabled('feature_bulk_email_enabled')) {
            return redirect()->back()->with('error', 'Bulk email is currently disabled. Ask an administrator to enable it in Settings > Feature Toggles.');
        }
        if (! Setting::isMailConfigured()) {
            return redirect()->back()->with('error', 'Email is not configured yet.');
        }

        Setting::applyMailerConfig();

        $ok = $this->performRetry($log);

        return redirect()->back()->with(
            $ok ? 'success' : 'error',
            $ok ? "Retried email to {$log->recipient_email} — delivered." : "Retry failed for {$log->recipient_email}: {$log->error_message}"
        );
    }

    /**
     * Retry all failed emails.
     */
    public function retryAll(): RedirectResponse
    {
        if (! Setting::enabled('feature_bulk_email_enabled')) {
            return redirect()->back()->with('error', 'Bulk email is currently disabled. Ask an administrator to enable it in Settings > Feature Toggles.');
        }
        if (! Setting::isMailConfigured()) {
            return redirect()->back()->with('error', 'Email is not configured yet.');
        }

        Setting::applyMailerConfig();

        $failed = EmailLog::where('status', 'failed')->orderBy('id')->take(self::MAX_RECIPIENTS)->get();

        $succeeded = 0;
        foreach ($failed as $log) {
            if ($this->performRetry($log)) {
                $succeeded++;
            }
        }

        return redirect()->back()->with('success', "Retried {$failed->count()} failed email(s), {$succeeded} succeeded.");
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
            if (! empty($filters['state'])) {
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

                if (! filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
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
                    'meta' => ['state' => $c->States ?? ''],
                ];
            }
        } else {
            $query = StudentDetail::query();
            if (! empty($filters['year'])) {
                $query->where('admission_taken_year', $filters['year']);
            }
            if (! empty($filters['stream'])) {
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

                if (! filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
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
                    'meta' => [
                        'eligibility_case_no' => $s->eligibility_case_no ?? '',
                        'admission_taken_in' => $s->admission_taken_in ?? '',
                    ],
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
