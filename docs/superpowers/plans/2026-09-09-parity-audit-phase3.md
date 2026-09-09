# E-Section Parity Fixes — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Bulk Email and the Settings "Test Mail" button actually send email through real SMTP settings stored (encrypted, since Phase 2) in the `settings` table, instead of faking success. Wire the already-built, currently-orphaned email-template editor into the send/retry path with the same `{token}` substitution `esection_ci4` uses.

**Architecture:** No new subsystems beyond one small Mailable class (`app/Mail/RawHtmlMail.php`, the standard Laravel location `php artisan make:mail` would create) and two static helpers added to the existing `Setting` model. `BulkEmailController` and `SettingsController` each get a small private `deliver()`-shaped method that builds a dynamic, DB-backed SMTP mailer at send time and sends through it — mirroring `esection_ci4/app/Services/BulkEmailService.php`'s `deliver()`/`mailer()` methods exactly, adapted to Laravel's `Mail` facade instead of CodeIgniter's `Email` class.

**Tech Stack:** Laravel 12 (PHP 8.5), Laravel's `Mail` facade (Symfony Mailer under the hood), Inertia.js + React, Pest (`Mail::fake()` for assertions — `MAIL_MAILER=array` in `phpunit.xml` already isolates tests from any real network call, and `Mail::fake()` intercepts every named mailer regardless of that default).

**Spec:** The parity audit report at https://claude.ai/code/artifact/d157f443-bda9-4641-adf0-6923a00d1170 (root cause RC-4). The real reference behavior is `esection_ci4/app/Services/BulkEmailService.php` (full file — resolveRecipients, send, retry, sendTest, mailer, deliver, tokenValuesFor) and `esection_ci4/app/Services/EmailTemplateService.php` (render, getFields) and `esection_ci4/app/Services/MailSettingsService.php` (isConfigured, buildEmailConfig, getAll — note `KEY_CRYPTO` value `'none'` maps to no encryption). Also `esection_ci4/app/Models/CollegeModel.php:249-260` and `StudentModel.php:512-525` (`getForBulkEmail()` — CI4 itself only ever populates `state` for university recipients and `eligibility_case_no`/`admission_taken_in` for student recipients; `academic_year`/`course`(university)/`pending_count`/`missing_document` are blank in CI4 too — match that, don't invent richer data CI4 doesn't have).

## Global Constraints

- Follow existing code conventions (check sibling files before writing new code); this app has no Services/ layer — fat controllers are the established pattern, so small private helper methods belong on the controllers that use them, not a new abstraction layer.
- Run `vendor/bin/pint --dirty --format agent` on every task before committing.
- Every task must leave `php artisan test --compact` fully green.
- Do not change application dependencies (Laravel's `Mail` facade and Symfony Mailer's SMTP transport are already present — no new package needed).
- Do not create documentation files beyond this plan.
- `Setting::enabled(string $key, bool $default = true): bool` already exists (added in Phase 1) — reuse it for `feature_bulk_email_enabled`, don't reinvent it.
- The two email-template slugs are exactly `university_reminder` and `student_document_reminder` (a third slug, `password_reset`, exists in `SettingsController::mail()`'s inline definitions but belongs to a future auth-hardening phase — do not touch it here).
- CI4's `EmailTemplateService::render()` (source above) substitutes the subject with plain, unescaped token values, and the body with `nl2br(esc($body))` then substitutes with **escaped-but-not-bolded** token values — this is deliberately different from the letter-template renderer added in Phase 2 (which bolds every substitution). Do not carry the `<strong>` wrapping over into email rendering.

---

### Task 1: Real mail delivery for Bulk Email

**Files:**
- Modify: `app/Models/Setting.php` (add `MAIL_MAILER_NAME` const, `isMailConfigured()`, `applyMailerConfig()`)
- Create: `app/Mail/RawHtmlMail.php`
- Modify: `app/Http/Controllers/SettingsController.php` (extract `getEmailTemplateDefinitions()`, mirroring the Phase 2 `getLetterTemplateDefinitions()` pattern)
- Modify: `app/Http/Controllers/BulkEmailController.php` (fix the `mailReady` key bug, richer recipient meta, real `send()`/`retry()`/`retryAll()`)
- Test: `tests/Feature/BulkEmailAndRemindersTest.php` (add tests)

**Interfaces:**
- Produces: `Setting::MAIL_MAILER_NAME` (string constant, value `'dynamic_smtp'`), `Setting::isMailConfigured(): bool`, `Setting::applyMailerConfig(): void` (writes a runtime `mail.mailers.dynamic_smtp` config array and `mail.from`, decrypting the stored password via `Crypt::decryptString()`). Task 2 (`SettingsController::testMail()`) consumes all three.
- Produces: `SettingsController::getEmailTemplateDefinitions(): array` (public static, same shape as the existing inline `$emailTemplatesDef` in `mail()` — keyed by slug, each with `label`/`tokens`/`default_subject`/`default_body`). `BulkEmailController` consumes this.
- Produces: `App\Mail\RawHtmlMail` — a `Mailable` taking an HTML body and subject, rendering the HTML as-is with no Blade view.

- [ ] **Step 1: Add the mailer-config helpers to `Setting`**

In `app/Models/Setting.php`, add `use Illuminate\Support\Facades\Crypt;` to the imports, and add these two methods plus the constant inside the class:

```php
    public const MAIL_MAILER_NAME = 'dynamic_smtp';

    public static function isMailConfigured(): bool
    {
        return self::get('mail_smtp_host', '') !== '' && self::get('mail_from_email', '') !== '';
    }

    /**
     * Builds a runtime SMTP mailer from the DB-stored settings and points
     * Laravel's mail.from at them. Call this once per request before the
     * first send, then use Mail::mailer(self::MAIL_MAILER_NAME).
     */
    public static function applyMailerConfig(): void
    {
        $crypto = self::get('mail_smtp_crypto', 'tls');
        $encryptedPassword = self::get('mail_smtp_password', '');
        $password = $encryptedPassword !== '' ? Crypt::decryptString($encryptedPassword) : '';

        config([
            'mail.mailers.'.self::MAIL_MAILER_NAME => [
                'transport' => 'smtp',
                'host' => self::get('mail_smtp_host', ''),
                'port' => (int) self::get('mail_smtp_port', '587'),
                'encryption' => $crypto === 'none' ? null : $crypto,
                'username' => self::get('mail_smtp_user', ''),
                'password' => $password,
                'timeout' => 20,
            ],
            'mail.from' => [
                'address' => self::get('mail_from_email', ''),
                'name' => self::get('mail_from_name', '') ?: 'E Section',
            ],
        ]);
    }
```

- [ ] **Step 2: Create the raw-HTML Mailable**

Create `app/Mail/RawHtmlMail.php`:

```php
<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;

class RawHtmlMail extends Mailable
{
    public function __construct(private readonly string $htmlBody, string $mailSubject)
    {
        $this->subject($mailSubject);
    }

    public function build(): self
    {
        return $this->html($this->htmlBody);
    }
}
```

- [ ] **Step 3: Extract the email-template definitions in `SettingsController`**

In `app/Http/Controllers/SettingsController.php`, find `mail()`'s inline `$emailTemplatesDef = [ ... ];` array (it has three slugs: `university_reminder`, `student_document_reminder`, `password_reset`). Add a new public static method directly above `mail()`, containing that array verbatim:

```php
    /**
     * Email template definitions: slug => label/tokens/default text.
     * Shared with BulkEmailController so admin edits actually reach sends.
     */
    public static function getEmailTemplateDefinitions(): array
    {
        return [
            'university_reminder' => [
                'label' => 'University Verification Reminder',
                'tokens' => ['university_name', 'academic_year', 'course', 'pending_count'],
                'default_subject' => 'Pending Eligibility Verification - {university_name} ({academic_year})',
                'default_body' => "Respected Sir/Madam,\n\nThis is a reminder regarding the eligibility verification of candidates admitted to {course} for the academic year {academic_year}.\n\nAs per our records, {pending_count} case(s) referred to {university_name} are still awaiting verification of the marksheets/certificates submitted by the candidates.\n\nYou are requested to verify the said documents and communicate the outcome to this office at the earliest, so that the admissions can be regularised.\n\nThank you for your co-operation.",
            ],
            'student_document_reminder' => [
                'label' => 'Candidate Document Reminder',
                'tokens' => ['student_name', 'case_no', 'course', 'missing_document'],
                'default_subject' => 'Documents Pending for Eligibility - Case {case_no}',
                'default_body' => "Dear {student_name},\n\nYour eligibility case ({case_no}) for admission to {course} cannot be processed further because the following document(s) are still awaited:\n\n{missing_document}\n\nYou are requested to submit the above document(s) to the IDOL Eligibility Section at the earliest. Admission remains provisional until the eligibility is confirmed.\n\nIf you have already submitted these documents, please ignore this message.",
            ],
            'password_reset' => [
                'label' => 'Password Reset',
                'tokens' => ['full_name', 'username', 'reset_link', 'valid_for'],
                'default_subject' => 'Reset your E-Section password',
                'default_body' => "Dear {full_name},\n\nA password reset was requested for your E-Section account ({username}).\n\nUse the link below to choose a new password. It is valid for {valid_for}.\n\n{reset_link}\n\nIf you did not request this, you can ignore this message -- your password will not change.",
            ],
        ];
    }
```

Then change `mail()`'s `$emailTemplatesDef = [ ... ];` line to `$emailTemplatesDef = self::getEmailTemplateDefinitions();` and delete the array literal that used to follow it. The rest of `mail()` is unchanged.

Run: `php artisan test --compact --filter=SettingsTest`
Expected: PASS (this is a pure extraction, same as the letter-template one in Phase 2).

- [ ] **Step 4: Fix the wrong-key `mailReady` check in `BulkEmailController::index()`**

Replace:

```php
        $mailHost = Setting::get('mail_host', '');
        $mailUser = Setting::get('mail_username', '');
        $mailReady = !empty($mailHost) && !empty($mailUser);
```

with:

```php
        $mailReady = Setting::isMailConfigured();
```

(The keys `mail_host`/`mail_username` are never written anywhere in this app — `SettingsController::updateMail()` writes `mail_smtp_host`/`mail_smtp_user`/`mail_from_email` — so this check was always false regardless of actual configuration. `Setting::isMailConfigured()` checks the real keys.)

- [ ] **Step 5: Capture the real recipient fields `resolveRecipients()` needs for token substitution**

In the university branch of `resolveRecipients()`, replace:

```php
                $sendable[] = [
                    'id' => $c->id,
                    'name' => $name,
                    'email' => $rawEmail,
                    'meta' => $c->States ?? '',
                ];
```

with:

```php
                $sendable[] = [
                    'id' => $c->id,
                    'name' => $name,
                    'email' => $rawEmail,
                    'meta' => ['state' => $c->States ?? ''],
                ];
```

In the student branch, replace:

```php
                $sendable[] = [
                    'id' => $s->id,
                    'name' => $name,
                    'email' => $rawEmail,
                    'meta' => $s->eligibility_case_no ?? '',
                ];
```

with:

```php
                $sendable[] = [
                    'id' => $s->id,
                    'name' => $name,
                    'email' => $rawEmail,
                    'meta' => [
                        'eligibility_case_no' => $s->eligibility_case_no ?? '',
                        'admission_taken_in' => $s->admission_taken_in ?? '',
                    ],
                ];
```

(`meta` changes shape from a bare string to a small array in both branches — check nothing else in this file or the `BulkEmail/Index.tsx` frontend reads `meta` as a string. If `Index.tsx` renders a preview column from `meta`, check it and adjust to read `meta.state`/`meta.eligibility_case_no` — read the file first before assuming either way.)

- [ ] **Step 6: Add `renderEmailTemplate()` to `BulkEmailController`**

Add this private method (place it near the top of the class, after the class constants):

```php
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
```

- [ ] **Step 7: Add `tokenValuesFor()` and `deliver()` to `BulkEmailController`**

Add these two private methods right after `renderEmailTemplate()`:

```php
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
            Setting::applyMailerConfig();

            Mail::mailer(Setting::MAIL_MAILER_NAME)
                ->to($to, $toName ?: null)
                ->send(new RawHtmlMail($htmlBody, $subject));

            return ['ok' => true, 'error' => ''];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => mb_substr($e->getMessage(), 0, 1000)];
        }
    }
```

Add `use App\Mail\RawHtmlMail;` and `use Illuminate\Support\Facades\Mail;` to the file's imports.

(Note: `academic_year`/`course`/`pending_count` are deliberately always blank for the university audience — this matches `esection_ci4`'s own `CollegeModel::getForBulkEmail()`, which never selects those fields either. This is not a gap to fix; it is faithfully reproducing a real limitation in the reference app.)

- [ ] **Step 8: Rewrite `send()` to actually deliver**

Replace the entire body of `send()` (from `$batchRef = ...` down to the final `return redirect()->route('bulk-email.log')->with(...)`) with:

```php
        if (! Setting::enabled('feature_bulk_email_enabled')) {
            return redirect()->route('bulk-email.index')->with('error', 'Bulk email is currently disabled. Ask an administrator to enable it in Settings > Feature Toggles.');
        }
        if (! Setting::isMailConfigured()) {
            return redirect()->route('bulk-email.index')->with('error', 'Email is not configured yet. Set the SMTP server and "from" address in Settings > Email first.');
        }

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
```

(Leave the method's first block — reading `$audience`/`$slug`/`$filters`/`$resolved`/`$sendable` and the `if (empty($sendable))` early return — exactly as it is; only the code after that early return changes.)

- [ ] **Step 9: Extract retry logic into a shared `performRetry()`, then rewrite `retry()` and `retryAll()`**

Add this private method:

```php
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
```

Replace `retry()` entirely with:

```php
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

        $ok = $this->performRetry($log);

        return redirect()->back()->with(
            $ok ? 'success' : 'error',
            $ok ? "Retried email to {$log->recipient_email} — delivered." : "Retry failed for {$log->recipient_email}: {$log->error_message}"
        );
    }
```

Replace `retryAll()` entirely with:

```php
    public function retryAll(): RedirectResponse
    {
        if (! Setting::enabled('feature_bulk_email_enabled')) {
            return redirect()->back()->with('error', 'Bulk email is currently disabled. Ask an administrator to enable it in Settings > Feature Toggles.');
        }
        if (! Setting::isMailConfigured()) {
            return redirect()->back()->with('error', 'Email is not configured yet.');
        }

        $failed = EmailLog::where('status', 'failed')->orderBy('id')->take(self::MAX_RECIPIENTS)->get();

        $succeeded = 0;
        foreach ($failed as $log) {
            if ($this->performRetry($log)) {
                $succeeded++;
            }
        }

        return redirect()->back()->with('success', "Retried {$failed->count()} failed email(s), {$succeeded} succeeded.");
    }
```

- [ ] **Step 10: Write the tests**

Add to `tests/Feature/BulkEmailAndRemindersTest.php` (it already has a `beforeEach` creating `$this->admin` — reuse it; add `use App\Mail\RawHtmlMail;` and `use Illuminate\Support\Facades\Mail;` at the top of the test file):

```php
test('bulk email send actually dispatches mail and logs sent status', function () {
    Mail::fake();

    \App\Models\Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    \App\Models\Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    \App\Models\StudentDetail::create([
        'array_space' => 'bulk_mail_test_1',
        'student_name' => 'Bulk Mail Student',
        'email' => 'student@example.com',
        'eligibility_case_no' => 'CASE-8001',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BCom',
        'clg_add' => 'University of Mumbai',
    ]);

    $response = $this->actingAs($this->admin)->post('/bulk-email/send', [
        'audience' => 'student',
        'template_slug' => 'student_document_reminder',
    ]);

    $response->assertRedirect(route('bulk-email.log'));
    Mail::assertSent(RawHtmlMail::class, function ($mail) {
        return $mail->hasTo('student@example.com');
    });

    $log = \App\Models\EmailLog::where('recipient_email', 'student@example.com')->first();
    expect($log)->not->toBeNull();
    expect($log->status)->toBe('sent');
    expect($log->subject)->toContain('CASE-8001');
});

test('bulk email send is blocked when the feature toggle is off', function () {
    Mail::fake();
    \App\Models\Setting::set('feature_bulk_email_enabled', '0', 'feature', $this->admin->id);
    \App\Models\Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    \App\Models\Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    \App\Models\StudentDetail::create([
        'array_space' => 'bulk_mail_test_2',
        'student_name' => 'Toggle Off Student',
        'email' => 'toggle@example.com',
        'eligibility_case_no' => 'CASE-8002',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BCom',
        'clg_add' => 'University of Mumbai',
    ]);

    $this->actingAs($this->admin)->post('/bulk-email/send', [
        'audience' => 'student',
        'template_slug' => 'student_document_reminder',
    ]);

    Mail::assertNothingSent();
});

test('retrying a failed email re-sends and flips status to sent', function () {
    Mail::fake();
    \App\Models\Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    \App\Models\Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    $log = \App\Models\EmailLog::create([
        'batch_ref' => 'test_batch',
        'template_slug' => 'student_document_reminder',
        'recipient_type' => 'student',
        'recipient_name' => 'Retry Student',
        'recipient_email' => 'retry@example.com',
        'subject' => 'Old subject',
        'status' => 'failed',
        'error_message' => 'Connection timed out',
        'attempts' => 1,
        'sent_by' => 'admin',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)->post("/bulk-email/retry/{$log->id}");

    $response->assertRedirect();
    Mail::assertSent(RawHtmlMail::class, fn ($mail) => $mail->hasTo('retry@example.com'));

    $log->refresh();
    expect($log->status)->toBe('sent');
    expect($log->error_message)->toBeNull();
    expect($log->attempts)->toBe(2);
});
```

- [ ] **Step 11: Run the tests to confirm they pass**

Run: `php artisan test --compact --filter=BulkEmailAndRemindersTest`
Expected: PASS.

- [ ] **Step 12: Run the full suite and build**

Run: `php artisan test --compact`
Expected: PASS, 0 failures.

Run: `npm run build`
Expected: succeeds, no TypeScript errors (this task may not touch any `.tsx` file, but confirm nothing broke — and if Step 5's `meta` shape change requires a frontend adjustment, that change is included in this build check).

- [ ] **Step 13: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Setting.php app/Mail/RawHtmlMail.php app/Http/Controllers/SettingsController.php app/Http/Controllers/BulkEmailController.php tests/Feature/BulkEmailAndRemindersTest.php
git commit -m "Send real email for Bulk Email instead of faking success

send()/retry()/retryAll() only ever wrote EmailLog rows hardcoded to
'sent' with no transport call. Adds Setting::applyMailerConfig() (a
runtime SMTP mailer built from the DB-stored, now-encrypted settings)
and a RawHtmlMail Mailable, wires the orphaned Settings > Email
template editor into the actual send via the same {token} substitution
esection_ci4's EmailTemplateService uses, and fixes a wrong-key bug that
made the compose screen's 'mail ready' check always false."
```

---

### Task 2: Make the Settings "Test Mail" button actually send

**Files:**
- Modify: `app/Http/Controllers/SettingsController.php` (`testMail()`)
- Test: `tests/Feature/SettingsTest.php`

**Interfaces:**
- Consumes: `Setting::MAIL_MAILER_NAME`, `Setting::isMailConfigured()`, `Setting::applyMailerConfig()` (all from Task 1), and `App\Mail\RawHtmlMail` (from Task 1).

**Root cause:** `testMail()` validates the address, writes an `ActivityLog` row, and redirects with a success message — there is no `Mail::` call anywhere in it, so there is currently no way to verify SMTP settings actually work before running a real bulk send.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/SettingsTest.php` (add `use App\Mail\RawHtmlMail;` and `use Illuminate\Support\Facades\Mail;` to its imports if not already present):

```php
test('test mail button actually attempts delivery', function () {
    Mail::fake();
    \App\Models\Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    \App\Models\Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    $response = $this->actingAs($this->admin)->post('/settings/mail/test', [
        'test_email' => 'operator@example.com',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');
    Mail::assertSent(RawHtmlMail::class, fn ($mail) => $mail->hasTo('operator@example.com'));
});

test('test mail button reports failure when SMTP is not configured', function () {
    $response = $this->actingAs($this->admin)->post('/settings/mail/test', [
        'test_email' => 'operator@example.com',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('error');
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `php artisan test --compact --filter="test mail button"`
Expected: both fail — the first because no `Mail::` call exists to intercept (`Mail::assertSent` finds nothing sent), the second because the current code always redirects with `success`, never `error`.

- [ ] **Step 3: Rewrite `testMail()`**

Replace the entire method body:

```php
    public function testMail(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'test_email' => 'required|email|max:255',
        ]);

        if (! Setting::isMailConfigured()) {
            return redirect()->back()->with('error', 'Set the SMTP server and "from" address first, then save, then send a test.');
        }

        try {
            Setting::applyMailerConfig();

            Mail::mailer(Setting::MAIL_MAILER_NAME)
                ->to($validated['test_email'])
                ->send(new RawHtmlMail(
                    '<p>This is a test message from E-Section.</p><p>If you are reading it, your SMTP settings are working.</p>',
                    'E-Section test email'
                ));
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'The test email could not be sent: '.mb_substr($e->getMessage(), 0, 500));
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'mail.test_send',
            'description' => 'Sent test email to '.$validated['test_email'],
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "Test email sent to {$validated['test_email']}. Check your inbox.");
    }
```

Add `use App\Mail\RawHtmlMail;` and `use Illuminate\Support\Facades\Mail;` to the file's imports if Task 1 didn't already add them here (Task 1 only touches `BulkEmailController` for those imports — check before adding, since both controllers need their own `use` statements).

- [ ] **Step 4: Run the tests again to verify they pass**

Run: `php artisan test --compact --filter="test mail button"`
Expected: PASS, 2/2.

- [ ] **Step 5: Run the full suite**

Run: `php artisan test --compact`
Expected: PASS, 0 failures.

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/SettingsController.php tests/Feature/SettingsTest.php
git commit -m "Make the Settings Test Mail button actually attempt delivery

testMail() previously logged an activity entry and redirected with
success regardless of whether SMTP was configured or reachable —
there was no way to verify settings before a real bulk send. Now
sends through the same dynamic mailer Task 1 built for Bulk Email,
and surfaces a real error if delivery fails."
```

---

## Self-Review Notes

- **Spec coverage:** covers RC-4 in full for Bulk Email's send/retry/retryAll and the Settings Test Mail button, including wiring the previously-orphaned email-template editor into actual delivery. Deliberately matches CI4's own gaps (blank `academic_year`/`course`/`pending_count` for university recipients) rather than inventing richer behavior CI4 doesn't have, per the "100% match" goal. Does NOT cover: the real backup file pipeline (mysqldump/ZIP), auth/session hardening (forgot-password, per-username throttling — note `password_reset` email template slug is left untouched for that future phase), or the Confirmations DD→checklist rebuild. Those remain for a future phase.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code, all matched against CI4 source rather than invented.
- **Type consistency:** `deliver()`, `renderEmailTemplate()`, `tokenValuesFor()`, and `performRetry()` are each defined once in Task 1 and called with the same signatures throughout the rest of that task. `Setting::applyMailerConfig()`/`isMailConfigured()`/`MAIL_MAILER_NAME` are defined once in Task 1 Step 1 and consumed identically by `BulkEmailController` (Task 1) and `SettingsController` (Task 2).
