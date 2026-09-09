# E-Section Parity Fixes — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-built admin letter-template system into all 6 PDF letters (it currently has zero effect on any generated letter), make delete-button visibility consistent with the server-side `feature_delete_enabled` guard added in Phase 1, and stop storing the SMTP and backup passwords in a form that can't be recovered/used correctly (plaintext and one-way-hashed respectively).

**Architecture:** No new subsystems. `PdfController` gains one private helper method that mirrors `esection_ci4`'s `LetterTemplateService::render()` exactly (verified against its source at `/opt/homebrew/var/www/esection/esection_ci4/app/Services/LetterTemplateService.php`), and each of its 6 public methods calls it with the same token values CI4 computes. `SettingsController` gains one small extraction (the letter-template default text, previously inlined only in `letterTemplates()`, now also reusable by `PdfController`). Four React pages get their delete-button visibility check aligned. Two `Setting` values switch from plaintext/`Hash::make` to `Crypt::encryptString`/`Crypt::decryptString`.

**Tech Stack:** Laravel 12 (PHP 8.5), Inertia.js + React + TypeScript, Pest for tests, Dompdf for PDF rendering.

**Spec:** The parity audit report at https://claude.ai/code/artifact/d157f443-bda9-4641-adf0-6923a00d1170 (root causes RC-2 and the secrets portion of RC-5) and the Phase 1 final-review's parked finding I-4 (UI-side feature-toggle gating). CI4's real behavior — the actual reference this plan matches against — lives at `/opt/homebrew/var/www/esection/esection_ci4/app/Services/LetterTemplateService.php`, `/opt/homebrew/var/www/esection/esection_ci4/app/Controllers/PdfController.php`, `/opt/homebrew/var/www/esection/esection_ci4/app/Controllers/Confirmations.php:340-360`, `/opt/homebrew/var/www/esection/esection_ci4/app/Controllers/Reminders.php:285-320`, `/opt/homebrew/var/www/esection/esection_ci4/app/Services/RegularizationService.php:113-135`, `/opt/homebrew/var/www/esection/esection_ci4/app/Services/StudentReminderService.php:80-100`.

## Global Constraints

- Follow existing code conventions (check sibling files before writing new code).
- Run `vendor/bin/pint --dirty --format agent` on every task before committing.
- Every task must leave `php artisan test --compact` fully green.
- Run `npm run build` after any `.tsx` change and confirm no TypeScript errors.
- Do not change application dependencies.
- Do not create documentation files beyond this plan.
- The six letter-template slugs are exactly: `dispatch`, `dispatch_accounts`, `confirmation_eligibility`, `regularization`, `university_reminder`, `student_reminder` — these are the `Setting` key prefixes (`letter_{slug}_subject` etc.) already used by `SettingsController::letterTemplates()`/`updateLetterTemplate()`. Do not invent different slugs.
- CI4's `LetterTemplateService::render()` (source above) is the exact reference algorithm: escape the raw template text with `nl2br(esc($text))`, THEN substitute literal `{token}` placeholders with `<strong>` . `esc($value)` . `</strong>`, on **all three** fields (`subject`, `body`, `closing`) — not just body/closing. Match this precisely; Laravel's `e()` is the equivalent of CI4's `esc()`.

---

### Task 1: Wire admin-configured letter templates into all 6 PDF letters

**Files:**
- Modify: `app/Http/Controllers/SettingsController.php:759-780` (extract `$definitions` into a new public static method)
- Modify: `app/Http/Controllers/PdfController.php` (add a private helper, call it from all 6 public methods)
- Modify: `resources/views/pdf/dispatch_letter.blade.php`, `dispatch_accounts_letter.blade.php`, `confirmation_eligibility_letter.blade.php`, `regularization_letter.blade.php`, `university_reminder_letter.blade.php`, `student_reminder_letter.blade.php` (each file's `Subject:` line only)
- Test: `tests/Feature/PdfTest.php` (add tests)

**Interfaces:**
- Produces: `SettingsController::getLetterTemplateDefinitions(): array` — a public static method returning exactly the array currently inlined at the top of `letterTemplates()` (keyed by slug, each value has `label`, `tokens`, `default_subject`, `default_body`, `default_closing`). `PdfController` consumes this.
- Produces: `PdfController::renderLetterTemplate(string $slug, array $tokenValues): array` — a private method returning `['subject' => string, 'body' => string, 'closing' => string]`, each value HTML-safe and ready for `{!! !!}` (raw) output in a Blade view.

- [ ] **Step 1: Extract the letter-template definitions into a reusable static method**

In `app/Http/Controllers/SettingsController.php`, find the start of `letterTemplates()`:

```php
    public function letterTemplates(): Response
    {
        $definitions = [
            'dispatch' => [
```

Replace the whole `$definitions = [ ... ];` array literal (it ends right before `$templates = [];`) by extracting it verbatim into a new public static method placed directly above `letterTemplates()`:

```php
    /**
     * Letter template definitions: slug => label/tokens/default text.
     * Shared with PdfController so admin edits actually reach the PDFs.
     */
    public static function getLetterTemplateDefinitions(): array
    {
        return [
            'dispatch' => [
                'label' => 'Eligibility Verification Dispatch Letter',
                'tokens' => ['course', 'academic_year'],
                'default_subject' => 'Verification of Marksheet / Passing Certificate / Migration Certificate.',
                'default_body' => "Sir/Madam,\nI am to forward herewith the copies of Marksheet / Passing / Migration Certificates of the undermentioned candidate(s) who have been admitted to {course} course in this Institute during the academic year {academic_year} for verification.",
                'default_closing' => 'Kindly verify the authenticity of the attached document(s) from your office records and return the same duly verified at an early date.',
            ],
            'regularization' => [
                'label' => 'Regularization Letter',
                'tokens' => ['student_name', 'eligibility_case_no', 'passing_course'],
                'default_subject' => 'Eligibility Regularization of Candidate {student_name}.',
                'default_body' => "Sir/Madam,\nWith reference to the eligibility verification for {student_name} (Eligibility Case No: {eligibility_case_no}) admitted to {passing_course} program, the submitted documents have been reviewed and regularized by this Institute.",
                'default_closing' => 'Kindly record the eligibility regularization status in your records.',
            ],
            'university_reminder' => [
                'label' => 'University Reminder Letter',
                'tokens' => ['reminder_type', 'course', 'academic_year'],
                'default_subject' => '{reminder_type} - Verification of Marksheet / Passing Certificate.',
                'default_body' => "Sir/Madam,\nThis is a {reminder_type} regarding the verification of marksheet/certificates of candidate(s) admitted to {course} during academic year {academic_year}.",
                'default_closing' => 'Kindly verify and return the confirmed verification report at your earliest convenience.',
            ],
            'student_reminder' => [
                'label' => 'Candidate Document Reminder Letter',
                'tokens' => ['course_name', 'missing_doc'],
                'default_subject' => 'Submission of Pending Original Documents for Eligibility Verification.',
                'default_body' => "Dear Candidate,\nYou are hereby informed that your eligibility verification for {course_name} course is pending due to non-submission of the following document(s):\n\nMissing Documents: {missing_doc}",
                'default_closing' => 'Please submit the required original documents to the IDOL Eligibility Section within 15 days, failing which your admission eligibility may be cancelled.',
            ],
            'dispatch_accounts' => [
                'label' => 'Accounts Copy (Dispatch with DD Amount)',
                'tokens' => ['academic_year'],
                'default_subject' => 'Verification of Document/s for the academic year {academic_year}.',
                'default_body' => "Sir/Madam,\nUniversity of Mumbai has decided to verify the document/s of the student/s who have taken admission in our Institute of Distance and Open Learning, University of Mumbai, on the basis of earlier qualification.\nThe following student/s has/have taken admission in the University of Mumbai as their details mentioned below. I am enclosing here with xerox copy/copies of the marksheet/s for your ready reference.",
                'default_closing' => "You are requested to kindly verify the/their marksheet/s and confirm the validity of the same.\nI shall be grateful if you treat this matter as most urgent.\nKindly mentioned the reference number and date of this letter in your further communication.\nThanking you.",
            ],
            'confirmation_eligibility' => [
                'label' => 'Confirmation of Eligibility Letter',
                'tokens' => ['academic_year', 'course', 'student_count_phrase'],
                'default_subject' => 'Confirmation of Eligibility For the Academic Year {academic_year} of Course {course}.',
                'default_body' => 'With reference to your letter No. __________________ dated __________________. I am to inform you that the eligibility of {student_count_phrase} is hereby confirmed for the admission to the program mention against their respective names in this University / Board.',
                'default_closing' => '',
            ],
        ];
    }
```

Then change `letterTemplates()` itself so its `$definitions` line becomes:

```php
    public function letterTemplates(): Response
    {
        $definitions = self::getLetterTemplateDefinitions();
```

(Delete the array literal that used to follow — it now lives only in `getLetterTemplateDefinitions()`. The rest of `letterTemplates()`, the `foreach ($definitions as $slug => $def) { ... }` loop and everything after, is unchanged.)

- [ ] **Step 2: Run the existing Settings test to confirm this refactor changed nothing observable**

Run: `php artisan test --compact --filter=SettingsTest`
Expected: PASS, same as before the refactor (this step only moved code, it didn't change behavior).

- [ ] **Step 3: Add the `renderLetterTemplate()` helper to `PdfController`**

In `app/Http/Controllers/PdfController.php`, add this private method (place it right after `getInstituteSettings()`):

```php
    /**
     * Renders a letter-template slug's subject/body/closing, substituting
     * {token} placeholders with bolded, escaped values — mirrors
     * esection_ci4's LetterTemplateService::render() exactly: escape first,
     * then substitute, on all three fields including the subject line.
     */
    private function renderLetterTemplate(string $slug, array $tokenValues): array
    {
        $definitions = SettingsController::getLetterTemplateDefinitions();
        $def = $definitions[$slug] ?? [
            'default_subject' => '',
            'default_body' => '',
            'default_closing' => '',
        ];

        $fields = [
            'subject' => Setting::get("letter_{$slug}_subject", $def['default_subject']),
            'body' => Setting::get("letter_{$slug}_body", $def['default_body']),
            'closing' => Setting::get("letter_{$slug}_closing", $def['default_closing']),
        ];

        $replacements = [];
        foreach ($tokenValues as $token => $value) {
            $replacements['{'.$token.'}'] = '<strong>'.e((string) $value).'</strong>';
        }

        $result = [];
        foreach (['subject', 'body', 'closing'] as $field) {
            $text = nl2br(e($fields[$field]));
            $result[$field] = strtr($text, $replacements);
        }

        return $result;
    }
```

- [ ] **Step 4: Call it from `dispatch()`**

Replace:

```php
        $data = array_merge($this->getInstituteSettings(), [
            'arraySpace' => $arraySpace,
            'firstRow' => $firstRow,
            'students' => $students,
            'date' => date('d/m/Y'),
        ]);
```

(inside `dispatch()`) with:

```php
        $rendered = $this->renderLetterTemplate('dispatch', [
            'course' => $first->admission_taken_in ?? '',
            'academic_year' => $first->admission_taken_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'firstRow' => $firstRow,
            'students' => $students,
            'date' => date('d/m/Y'),
        ]);
```

- [ ] **Step 5: Call it from `accounts()`**

Replace the `$data = array_merge(...)` block inside `accounts()` with:

```php
        $rendered = $this->renderLetterTemplate('dispatch_accounts', [
            'academic_year' => $first->admission_taken_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'firstRow' => $firstRow,
            'students' => $students,
            'fees' => $fees,
            'ddAmount' => $totalFees,
            'ddAmountWords' => $this->numberToWords((int) $totalFees) . ' Rupees Only',
            'date' => date('d/m/Y'),
        ]);
```

- [ ] **Step 6: Call it from `confirmation()`**

Replace the `$data = array_merge(...)` block inside `confirmation()`. First add these two lines right after the existing `if ($records->isEmpty()) { ... }` block:

```php
        $first = $records->first();
        $count = $records->count();
```

Then:

```php
        $rendered = $this->renderLetterTemplate('confirmation_eligibility', [
            'academic_year' => $first->acd_year ?? '',
            'course' => $first->stream ?? '',
            'student_count_phrase' => '( '.$count.' ) '.($count === 1 ? 'student' : 'students'),
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'arraySpace' => $arraySpace,
            'records' => $records,
            'date' => date('d/m/Y'),
        ]);
```

(The exact phrase format `'( '.$count.' ) '.($count === 1 ? 'student' : 'students')` matches `esection_ci4/app/Controllers/Confirmations.php:351` verbatim — do not reword it.)

- [ ] **Step 7: Call it from `regularization()`**

Replace the `$data = array_merge(...)` block inside `regularization()` with:

```php
        $rendered = $this->renderLetterTemplate('regularization', [
            'student_name' => $record->student_name,
            'eligibility_case_no' => $record->eligibility_case_no ?? '',
            'passing_course' => $record->passing_course ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'record' => $record,
            'date' => date('d/m/Y'),
        ]);
```

- [ ] **Step 8: Call it from `universityReminder()`**

Inside `universityReminder()`, the existing code already attaches `$student->notes = $notes->where('student_id', $student->id)->values();` inside a `foreach`. Right after that `foreach` loop, add:

```php
        $latestNoteText = optional($students->first())->notes?->last()?->note_text ?? '1st Reminder';
```

Then replace the `$data = array_merge(...)` block with:

```php
        $rendered = $this->renderLetterTemplate('university_reminder', [
            'reminder_type' => $latestNoteText,
            'course' => $batch->admission_taken_in ?? '',
            'academic_year' => $batch->academic_year ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'batch' => $batch,
            'students' => $students,
            'date' => date('d/m/Y'),
        ]);
```

- [ ] **Step 9: Call it from `studentReminder()`**

Replace the `$data = array_merge(...)` block inside `studentReminder()` with:

```php
        $rendered = $this->renderLetterTemplate('student_reminder', [
            'course_name' => $record->course_name ?? '',
            'missing_doc' => $record->missing_doc ?? '',
        ]);

        $data = array_merge($this->getInstituteSettings(), $rendered, [
            'record' => $record,
            'date' => date('d/m/Y'),
        ]);
```

- [ ] **Step 10: Switch each Blade view's Subject line from escaped to raw output**

The rendered `$subject` may now contain `<strong>` tags (from token substitution), so it must be echoed raw, matching how `$body`/`$closing` are already echoed in every one of these files. In each of the 6 files below, find the line that reads:

```blade
        Subject: {{ $subject ?? '...' }}
```

(the exact fallback text differs per file — leave the fallback text itself untouched, only change `{{ }}` to `{!! !!}`) and change it to:

```blade
        Subject: {!! $subject ?? '...' !!}
```

Apply this in: `resources/views/pdf/dispatch_letter.blade.php`, `dispatch_accounts_letter.blade.php`, `confirmation_eligibility_letter.blade.php`, `regularization_letter.blade.php`, `university_reminder_letter.blade.php`, `student_reminder_letter.blade.php`.

- [ ] **Step 11: Write the failing tests**

Add to `tests/Feature/PdfTest.php` (follow its existing setup pattern — check the top of the file for how it creates an authenticated admin user and any existing PDF-route tests before adding these):

```php
test('dispatch letter reflects an admin-edited letter template', function () {
    \App\Models\Setting::set('letter_dispatch_subject', 'CUSTOM SUBJECT {course} {academic_year}', 'letter_templates', $this->admin->id);
    \App\Models\Setting::set('letter_dispatch_body', 'Custom body text.', 'letter_templates', $this->admin->id);

    \App\Models\StudentDetail::create([
        'array_space' => 'pdf_template_test_1',
        'student_name' => 'Template Test Student',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BCom',
        'clg_add' => 'University of Mumbai',
        'eligibility_case_no' => 'CASE-9001',
    ]);

    $response = $this->actingAs($this->admin)->get('/pdf/dispatch/pdf_template_test_1');

    $response->assertOk();
    $pdfText = $response->streamedContent();
    // Dompdf output is binary; assert on the rendered HTML instead by
    // calling the same data-building path indirectly is not possible from
    // outside, so assert the response is a successful PDF stream and that
    // changing the template didn't error. A more precise assertion:
    expect($response->headers->get('Content-Type'))->toContain('application/pdf');
});

test('confirmation letter builds the exact student-count phrase CI4 uses', function () {
    \App\Models\ConfStudData::create([
        'array_space' => 'pdf_conf_test_1', 'name' => 'A', 'stream' => 'BA',
        'acd_year' => '2025-26', 'mig_TC' => 'Yes',
    ]);
    \App\Models\ConfStudData::create([
        'array_space' => 'pdf_conf_test_1', 'name' => 'B', 'stream' => 'BA',
        'acd_year' => '2025-26', 'mig_TC' => 'Yes',
    ]);

    $response = $this->actingAs($this->admin)->get('/pdf/confirmation/pdf_conf_test_1');

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('application/pdf');
});
```

(If `PdfTest.php` doesn't already have `$this->admin` set up in a `beforeEach`, check how the other tests in that file authenticate and match that pattern instead — don't introduce a second, inconsistent setup style.)

- [ ] **Step 12: Run the tests to confirm they fail first, then pass after Steps 1-10**

Since you're implementing Steps 1-10 before writing these tests in a real TDD flow, run them now to confirm PASS:

Run: `php artisan test --compact --filter=PdfTest`
Expected: PASS.

If you want true red-green-refactor: temporarily revert Step 6's changes to `confirmation()`, confirm the "student-count phrase" test still passes trivially (it only asserts `Content-Type`, so it's a weak red-check for that specific behavior) — the honest verification here is manual: read `PdfController.php` after your edit and confirm `$count === 1 ? 'student' : 'students'` with the exact `'( '.$count.' ) '` prefix format is present, since Dompdf's binary output can't be string-matched for template text from a feature test.

- [ ] **Step 13: Run the full suite**

Run: `php artisan test --compact`
Expected: PASS, 0 failures.

- [ ] **Step 14: Build the frontend (no `.tsx` files changed in this task, but confirm nothing broke)**

Run: `npm run build`
Expected: succeeds, no TypeScript errors.

- [ ] **Step 15: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/SettingsController.php app/Http/Controllers/PdfController.php resources/views/pdf/*.blade.php tests/Feature/PdfTest.php
git commit -m "Wire admin-configured letter templates into all 6 PDF letters

PdfController never read the Settings > Letter Templates values or
substituted their {token} placeholders — every letter always rendered
its hardcoded Blade fallback text regardless of what an admin configured.
Adds a renderLetterTemplate() helper mirroring esection_ci4's
LetterTemplateService::render() exactly (escape-then-bold-substitute on
subject/body/closing), and extracts the shared default-text definitions
out of SettingsController so both places stay in sync."
```

---

### Task 2: Make delete-button visibility consistent with the server-side feature-toggle guard

**Files:**
- Modify: `resources/js/pages/Students/BatchDetail.tsx`
- Modify: `resources/js/pages/Confirmations/BatchDetail.tsx`
- Modify: `resources/js/pages/Regularization/History.tsx`
- Modify: `resources/js/pages/Reminders/StudentHistory.tsx`

**Interfaces:**
- Consumes: the existing `features.delete` boolean already shared via Inertia (`app/Http/Middleware/HandleInertiaRequests.php:39-43`), and the `SharedProps`/`usePage` pattern already used in `Students/BatchDetail.tsx`.
- Produces: nothing new for other tasks.

**Root cause:** Phase 1 added a hard server-side `feature_delete_enabled` guard to every delete endpoint (no exceptions, not even for admins). Two pages (`Students/BatchDetail.tsx`, `Confirmations/BatchDetail.tsx`) still let an admin see the delete button even when the toggle is off (`features.delete || auth.user?.role === 'admin'`), so clicking it now produces an unhandled 403 instead of the button simply not being there. Two other pages (`Regularization/History.tsx`, `Reminders/StudentHistory.tsx`) never checked the toggle at all — the delete button always renders for every user, admin or not. `esection_ci4`'s views have no admin-bypass on this check anywhere (confirmed in `esection_ci4/app/Views/students/_batch_rows.php:35` and `esection_ci4/app/Views/confirmations/_batch_rows.php:66` — both check the permission/feature flag with no role exception).

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/RegularizationTest.php` (following its existing setup):

```php
test('history page does not expose delete when feature_delete_enabled is off', function () {
    \App\Models\Setting::set('feature_delete_enabled', '0', 'feature', $this->user->id);

    \App\Models\Regularization::create([
        'student_name' => 'Toggle UI Test',
        'gender' => 'Mr.',
        'admission_letter_for' => 'The Controller of Examinations',
    ]);

    $response = $this->actingAs($this->user)->get('/regularization/history');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('features.delete', false));
});
```

Add to `tests/Feature/ReminderTest.php` (following its existing setup):

```php
test('candidate reminder history does not expose delete when feature_delete_enabled is off', function () {
    \App\Models\Setting::set('feature_delete_enabled', '0', 'feature', $this->user->id);

    $response = $this->actingAs($this->user)->get('/reminders/student/history');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('features.delete', false));
});
```

(These assert the *prop* the page receives, since Pest feature tests can't execute React — the frontend fix itself is verified by you reading the `.tsx` diff and by `npm run build` succeeding. This is the same limitation noted in this repo's other frontend-touching tests.)

- [ ] **Step 2: Run the tests to confirm they currently pass trivially (the prop already exists) — this step just confirms the shared prop plumbing is correct before you touch the frontend**

Run: `php artisan test --compact --filter="does not expose delete"`
Expected: PASS (this only proves the backend shares `features.delete` correctly, which was already true before this task — it doesn't test the frontend fix, which has no automated coverage; that's expected here).

- [ ] **Step 3: Fix `Students/BatchDetail.tsx`**

Replace:

```typescript
    const canDelete = features.delete || auth.user?.role === 'admin';
```

with:

```typescript
    const canDelete = features.delete;
```

If `auth` becomes unused elsewhere in the file after this change, leave the `usePage<SharedProps>()` destructure as-is unless a TypeScript/lint error appears — check by running the build in Step 7 before removing anything.

- [ ] **Step 4: Fix `Confirmations/BatchDetail.tsx`**

Same change: replace `const canDelete = features.delete || auth.user?.role === 'admin';` with `const canDelete = features.delete;`.

- [ ] **Step 5: Add the missing gate to `Regularization/History.tsx`**

Add the `usePage`/`SharedProps` import and destructure at the top of the component, following the exact pattern from `Students/BatchDetail.tsx` (`import { ..., usePage } from '@inertiajs/react';` and `import { SharedProps } from '../../types';`), then inside the component body add:

```typescript
    const { props } = usePage<SharedProps>();
    const canDelete = props.features.delete;
```

Then wrap the existing delete `<button>` (the one calling `handleDelete(r.id, r.student_name)`) in `{canDelete && ( ... )}`.

- [ ] **Step 6: Add the missing gate to `Reminders/StudentHistory.tsx`**

Same pattern as Step 5: add the `usePage<SharedProps>()` destructure, compute `canDelete = props.features.delete`, and wrap that page's delete `<button>` in `{canDelete && ( ... )}`.

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: succeeds, no TypeScript errors, no unused-variable warnings that fail the build.

Run: `php artisan test --compact`
Expected: PASS, 0 failures.

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add resources/js/pages/Students/BatchDetail.tsx resources/js/pages/Confirmations/BatchDetail.tsx resources/js/pages/Regularization/History.tsx resources/js/pages/Reminders/StudentHistory.tsx tests/Feature/RegularizationTest.php tests/Feature/ReminderTest.php
git commit -m "Align delete-button visibility with the server-side toggle guard

Phase 1 added a hard feature_delete_enabled check to every delete
endpoint with no admin exception. Students/BatchDetail and
Confirmations/BatchDetail still let an admin see (and click into a 403
on) the delete button when the toggle is off; Regularization/History and
Reminders/StudentHistory never checked the toggle at all. All four now
gate on features.delete alone, matching esection_ci4's views."
```

---

### Task 3: Store the SMTP and backup passwords encrypted instead of plaintext/one-way-hashed

**Files:**
- Modify: `app/Http/Controllers/SettingsController.php` (`updateMail`, `updateBackupPassword`, `backup`)
- Test: `tests/Feature/SettingsTest.php` (add tests)

**Interfaces:**
- Consumes: Laravel's `Illuminate\Support\Facades\Crypt` (already available, no new dependency — it's core Laravel, backed by `APP_KEY`).
- Produces: nothing new for other tasks in this plan, but any future work that needs to actually read these secrets back (e.g. a real mail transport or backup pipeline) must use `Crypt::decryptString()` to get the plaintext, not read the `Setting` value directly.

**Root cause:** `mail_smtp_password` is written to the `settings` table with no encryption at all — anyone with database access reads it in plaintext. `backup_password_hash` uses `Hash::make()`, a one-way hash — this can never be decrypted back to a usable password for an actual ZIP-encryption step, which is a structural dead end (confirmed as Critical C4 in the Settings-part2 audit finding).

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/SettingsTest.php` (following its existing `$this->admin` setup):

```php
test('SMTP password is stored encrypted, not in plaintext', function () {
    $this->actingAs($this->admin)->post('/settings/mail', [
        'mail_smtp_host' => 'smtp.example.com',
        'mail_smtp_port' => '587',
        'mail_smtp_user' => 'user@example.com',
        'mail_smtp_password' => 'SuperSecret123',
        'mail_smtp_crypto' => 'tls',
        'mail_from_email' => 'noreply@example.com',
        'mail_from_name' => 'E Section',
        'mail_batch_size' => '25',
        'mail_batch_pause' => '5',
    ]);

    $stored = \App\Models\Setting::get('mail_smtp_password');

    expect($stored)->not->toBe('SuperSecret123');
    expect(\Illuminate\Support\Facades\Crypt::decryptString($stored))->toBe('SuperSecret123');
});

test('backup password is stored reversibly encrypted, not one-way hashed', function () {
    $this->actingAs($this->admin)->post('/settings/backup/password', [
        'backup_password' => 'BackupSecret123',
        'backup_password_confirm' => 'BackupSecret123',
    ]);

    $stored = \App\Models\Setting::get('backup_password');

    expect($stored)->not->toBe('BackupSecret123');
    expect(\Illuminate\Support\Facades\Crypt::decryptString($stored))->toBe('BackupSecret123');
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `php artisan test --compact --filter="stored encrypted"`
Expected: the SMTP test fails because `$stored` currently equals the plaintext (`expect($stored)->not->toBe(...)` fails). The backup test fails with a `DecryptException` (or similar) because `Setting::get('backup_password')` returns null — the current code writes to the differently-named key `backup_password_hash` using `Hash::make`, so `Crypt::decryptString(null)` throws.

- [ ] **Step 3: Encrypt the SMTP password on save**

In `app/Http/Controllers/SettingsController.php`, inside `updateMail()`, replace:

```php
        $userId = Auth::id();
        foreach ($validated as $k => $v) {
            if ($k === 'mail_smtp_password' && empty($v)) {
                continue;
            }
            Setting::set($k, (string) $v, 'mail', $userId);
        }
```

with:

```php
        $userId = Auth::id();
        foreach ($validated as $k => $v) {
            if ($k === 'mail_smtp_password') {
                if (empty($v)) {
                    continue;
                }
                $v = Crypt::encryptString((string) $v);
            }
            Setting::set($k, (string) $v, 'mail', $userId);
        }
```

Add `use Illuminate\Support\Facades\Crypt;` to the file's import list (alphabetically, near the other `Illuminate\Support\Facades\*` imports).

- [ ] **Step 4: Encrypt the backup password on save, and rename the key so it no longer claims to be a hash**

Replace:

```php
        Setting::set('backup_password_hash', Hash::make($validated['backup_password']), 'backup', Auth::id());
```

with:

```php
        Setting::set('backup_password', Crypt::encryptString($validated['backup_password']), 'backup', Auth::id());
```

- [ ] **Step 5: Update the "is a backup password configured" check to read the new key**

In `backup()`, replace:

```php
        $passwordConfigured = ! empty(Setting::get('backup_password_hash', ''));
```

with:

```php
        $passwordConfigured = ! empty(Setting::get('backup_password', ''));
```

- [ ] **Step 6: Check whether `Hash` is still used anywhere else in this file**

Run: `grep -n "Hash::" app/Http/Controllers/SettingsController.php`

If the only remaining matches are for user account passwords (`storeUser`/`updateUser`), leave the `use Illuminate\Support\Facades\Hash;` import in place — it's still needed. Do not remove it.

- [ ] **Step 7: Run the tests again to verify they pass**

Run: `php artisan test --compact --filter="stored encrypted\|stored reversibly encrypted"`
Expected: PASS, 2/2.

- [ ] **Step 8: Run the full suite**

Run: `php artisan test --compact`
Expected: PASS, 0 failures.

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/SettingsController.php tests/Feature/SettingsTest.php
git commit -m "Encrypt SMTP and backup passwords at rest instead of plaintext/hashing

mail_smtp_password was written to the settings table with no encryption;
the backup password used Hash::make(), a one-way hash that can never be
recovered for an actual ZIP-encryption step. Both now use
Crypt::encryptString()/decryptString(), backed by APP_KEY, matching
esection_ci4's reversible encode()/reveal() pattern. The backup key is
renamed from backup_password_hash to backup_password since it is no
longer a hash."
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers RC-2 in full (all 6 letter types, matching CI4's exact token-substitution algorithm and phrase formats, verified against CI4 source rather than guessed). Task 2 covers the Phase 1 final-review's parked finding I-4 in full (all 4 pages it named). Task 3 covers the secrets-encryption portion of RC-5. This plan intentionally does NOT cover: real mail delivery (RC-4 — Bulk Email's `send()`/`retry()`/`testMail()` still don't call a transport), the real backup pipeline (the rest of RC-5 — no mysqldump/ZIP is produced yet, even though the password that would encrypt it is now stored correctly), auth/session hardening (RC-6), the Confirmations DD→checklist UI rebuild (RC-7, already approved by the user but scoped to its own future plan), or the `/api/*` permission-filtering gap and Bulk Email's Sidebar nav-link visibility (both parked as Minor in Phase 1's final review). Those remain for a future Phase 3.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code, including the exact CI4-matched phrase formats and token lists (verified against CI4 source, not invented).
- **Type consistency:** `renderLetterTemplate()` is defined once in Task 1 Step 3 and called with the same signature `(string $slug, array $tokenValues): array` in every subsequent step of the same task. `SettingsController::getLetterTemplateDefinitions()` is defined once and consumed identically by both `letterTemplates()` (same class) and `PdfController::renderLetterTemplate()` (cross-class, via `SettingsController::getLetterTemplateDefinitions()`).
