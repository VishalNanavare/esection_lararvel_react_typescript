<?php

use App\Mail\RawHtmlMail;
use App\Models\AcademicYear;
use App\Models\BackupHistory;
use App\Models\Course;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Process;

beforeEach(function () {
    $this->admin = User::create([
        'username' => 'admin_settings_user',
        'full_name' => 'System Administrator',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('guests are redirected from settings to login', function () {
    $this->get('/settings')->assertRedirect('/login');
    $this->get('/settings/institute')->assertRedirect('/login');
    $this->get('/settings/users')->assertRedirect('/login');
});

test('admin can view settings hub and institute details', function () {
    $this->actingAs($this->admin)->get('/settings')->assertOk();

    $res = $this->actingAs($this->admin)->get('/settings/institute');
    $res->assertOk();
    $res->assertInertia(fn ($page) => $page->component('Settings/Institute'));
});

test('admin can update institute details', function () {
    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai Test',
        'institute_university_title' => 'UNIVERSITY OF MUMBAI',
        'institute_address' => 'Vidyanagari, Santacruz East, Mumbai',
        'institute_contact' => 'test@idol.mu.ac.in',
        'institute_signatory_name' => 'Prof. S. Patil',
        'institute_signatory_designation' => 'Deputy Registrar',
        'institute_signature_space_lines' => 4,
    ]);

    $response->assertRedirect();
    expect(Setting::get('institute_name'))->toBe('IDOL University of Mumbai Test');
    expect(Setting::get('institute_signatory_designation'))->toBe('Deputy Registrar');
});

test('admin can upload valid letterhead and logo', function () {
    $letterhead = UploadedFile::fake()->image('header.png', 1486, 368);
    $logo = UploadedFile::fake()->image('seal.png', 300, 300);

    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai',
        'institute_signatory_designation' => 'Director',
        'letterhead' => $letterhead,
        'logo' => $logo,
    ]);

    $response->assertRedirect();
    $letterheadPath = Setting::get('institute_letterhead_path');
    $logoPath = Setting::get('institute_logo_path');

    expect($letterheadPath)->not->toBeNull();
    expect($logoPath)->not->toBeNull();
    expect(file_exists(public_path($letterheadPath)))->toBeTrue();
    expect(file_exists(public_path($logoPath)))->toBeTrue();

    // Clean up uploaded test files
    @unlink(public_path($letterheadPath));
    @unlink(public_path($logoPath));
});

test('a PNG polyglot with a trailing PHP payload is re-encoded and never stored with the payload intact', function () {
    // Regression test for the file-upload RCE: getimagesize() and the
    // mimes validation rule both only look at the image header, so a
    // "polyglot" file - a genuine PNG with an executable payload appended
    // after the image data - still passes as a legitimate 300x300 PNG.
    // The old code just move()'d the raw uploaded bytes as-is, so the
    // payload survived byte-for-byte inside a file placed in the public
    // web root. The fix decodes the upload into a GD image resource and
    // re-encodes it from scratch, which keeps only real pixel data and
    // discards anything appended after it.
    $image = imagecreatetruecolor(300, 300);
    ob_start();
    imagepng($image);
    $pngBytes = ob_get_clean();
    imagedestroy($image);

    $payloadMarker = '<?php echo "PWNED_'.uniqid().'"; ?>';
    $polyglotBytes = $pngBytes.$payloadMarker;

    $tmpPath = tempnam(sys_get_temp_dir(), 'polyglot');
    file_put_contents($tmpPath, $polyglotBytes);
    // A benign client filename: the point of this test is that the
    // payload is stripped from the file's CONTENT, not that the filename
    // itself is suspicious (Laravel's own mimes validation already blocks
    // a .php-named upload outright, regardless of this fix).
    $logo = new UploadedFile($tmpPath, 'logo.png', 'image/png', null, true);

    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai',
        'logo' => $logo,
    ]);
    @unlink($tmpPath);

    $response->assertRedirect();
    $response->assertSessionDoesntHaveErrors('logo');
    $logoPath = Setting::get('institute_logo_path');

    expect($logoPath)->not->toBeNull();
    expect($logoPath)->toEndWith('.png');

    $storedContents = file_get_contents(public_path($logoPath));
    expect($storedContents)->not->toContain('<?php');
    expect($storedContents)->not->toContain($payloadMarker);

    @unlink(public_path($logoPath));
});

test('letterhead with invalid dimensions is rejected', function () {
    $badLetterhead = UploadedFile::fake()->image('bad.png', 800, 600);

    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai',
        'letterhead' => $badLetterhead,
    ]);

    $response->assertSessionHasErrors('letterhead');
});

test('admin can update feature toggles', function () {
    $response = $this->actingAs($this->admin)->post('/settings/features', [
        'feature_export_enabled' => true,
        'feature_bulk_email_enabled' => false,
        'feature_delete_enabled' => true,
        'feature_import_enabled' => true,
    ]);

    $response->assertRedirect();
    expect(Setting::get('feature_export_enabled'))->toBe('1');
    expect(Setting::get('feature_bulk_email_enabled'))->toBe('0');
    expect(Setting::get('feature_import_enabled'))->toBe('1');
});

test('admin can create, activate and delete academic years', function () {
    $this->actingAs($this->admin)->post('/settings/academic-years', [
        'year_label' => '2029-2030',
    ])->assertRedirect();

    $year = AcademicYear::where('year_label', '2029-2030')->first();
    expect($year)->not->toBeNull();

    $this->actingAs($this->admin)->post("/settings/academic-years/{$year->id}/activate")->assertRedirect();
    $year->refresh();
    expect($year->is_current)->toBeTrue();

    $this->actingAs($this->admin)->delete("/settings/academic-years/{$year->id}")->assertRedirect();
    $this->assertDatabaseMissing('academic_years', ['id' => $year->id]);
});

test('academic years page shares features.delete for the delete-button gate', function () {
    Setting::set('feature_delete_enabled', '0', 'feature', $this->admin->id);

    $response = $this->actingAs($this->admin)->get('/settings/academic-years');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('features.delete', false));
});

test('admin can manage courses and stream divisions', function () {
    $this->actingAs($this->admin)->post('/settings/courses', [
        'name' => 'Master of Science (Data Science)',
    ])->assertRedirect();

    $course = Course::where('name', 'Master of Science (Data Science)')->first();
    expect($course)->not->toBeNull();

    $this->actingAs($this->admin)->post('/settings/streams', [
        'Division' => 'M.Sc. Data Science Part-I',
        'course_name' => $course->name,
    ])->assertRedirect();

    $stream = StreamDetail::where('Division', 'M.Sc. Data Science Part-I')->first();
    expect($stream)->not->toBeNull();

    $this->actingAs($this->admin)->delete("/settings/streams/{$stream->id}")->assertRedirect();
    $this->actingAs($this->admin)->delete("/settings/courses/{$course->id}")->assertRedirect();
});

test('admin can manage staff user accounts', function () {
    $this->actingAs($this->admin)->post('/settings/users', [
        'username' => 'operator_alpha',
        'full_name' => 'Alpha Operator',
        'role' => 'staff',
        'password' => 'secret123',
    ])->assertRedirect();

    $user = User::where('username', 'operator_alpha')->first();
    expect($user)->not->toBeNull();

    // Update
    $this->actingAs($this->admin)->put("/settings/users/{$user->id}", [
        'full_name' => 'Alpha Operator Updated',
        'role' => 'staff',
    ])->assertRedirect();

    $user->refresh();
    expect($user->full_name)->toBe('Alpha Operator Updated');

    // Toggle active status
    $this->actingAs($this->admin)->post("/settings/users/{$user->id}/toggle")->assertRedirect();
    $user->refresh();
    expect($user->is_active)->toBeFalse();
});

test('admin can update document numbering prefix', function () {
    $this->actingAs($this->admin)->post('/settings/numbering', [
        'case_no_prefix' => 'IDOL-ELIG',
    ])->assertRedirect();

    expect(Setting::get('case_no_prefix'))->toBe('IDOL-ELIG');
});

test('admin can manage access rights matrix', function () {
    $staff = User::create([
        'username' => 'staff_matrix_test',
        'full_name' => 'Matrix Test',
        'role' => 'staff',
        'password' => Hash::make('secret123'),
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)->post('/settings/access-rights', [
        'matrix' => [
            $staff->id => ['students.new'],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('user_page_access', [
        'user_id' => $staff->id,
        'page_key' => 'students.new',
    ]);
});

test('admin can view activity audit log', function () {
    $this->actingAs($this->admin)->get('/settings/activity-log')->assertOk();
});

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

    $stored = Setting::get('mail_smtp_password');

    expect($stored)->not->toBe('SuperSecret123');
    expect(Crypt::decryptString($stored))->toBe('SuperSecret123');
});

test('backup password is stored reversibly encrypted, not one-way hashed', function () {
    $this->actingAs($this->admin)->post('/settings/backup/password', [
        'backup_password' => 'BackupSecret123',
        'backup_password_confirm' => 'BackupSecret123',
    ]);

    $stored = Setting::get('backup_password');

    expect($stored)->not->toBe('BackupSecret123');
    expect(Crypt::decryptString($stored))->toBe('BackupSecret123');
});

test('SQL backup creates a real, password-protected archive that can be downloaded and deleted', function () {
    Process::fake([
        '*mysqldump*' => Process::result(output: "-- fake mysql dump\nCREATE TABLE demo (id INT);\n"),
    ]);

    $this->actingAs($this->admin)->post('/settings/backup/password', [
        'backup_password' => 'ZipSecret123',
        'backup_password_confirm' => 'ZipSecret123',
    ]);

    $response = $this->actingAs($this->admin)->post('/settings/backup/sql');
    $response->assertRedirect();
    $response->assertSessionHas('success');

    $backup = BackupHistory::where('type', 'sql')->latest('id')->first();
    expect($backup)->not->toBeNull();
    expect($backup->file_size)->toBeGreaterThan(0);
    expect(file_exists($backup->file_path))->toBeTrue();
    expect($backup->filename)->toEndWith('.zip');

    // Confirm it is genuinely encrypted: unreadable without the password, readable with it.
    $zip = new ZipArchive;
    expect($zip->open($backup->file_path))->toBeTrue();
    expect($zip->getFromIndex(0))->toBeFalse();
    $zip->setPassword('ZipSecret123');
    expect($zip->getFromIndex(0))->toContain('CREATE TABLE demo');
    $zip->close();

    // Download streams the real file.
    $downloadResponse = $this->actingAs($this->admin)->get("/settings/backup/{$backup->id}/download");
    $downloadResponse->assertOk();

    // Delete removes both the row and the file from disk.
    $filePath = $backup->file_path;
    $deleteResponse = $this->actingAs($this->admin)->delete("/settings/backup/{$backup->id}");
    $deleteResponse->assertRedirect();
    expect(BackupHistory::find($backup->id))->toBeNull();
    expect(file_exists($filePath))->toBeFalse();
});

test('SQL backup is not encrypted when no backup password has been configured', function () {
    Process::fake([
        '*mysqldump*' => Process::result(output: "-- fake mysql dump\nCREATE TABLE demo (id INT);\n"),
    ]);

    $this->actingAs($this->admin)->post('/settings/backup/sql');

    $backup = BackupHistory::where('type', 'sql')->latest('id')->first();
    $zip = new ZipArchive;
    $zip->open($backup->file_path);
    expect($zip->getFromIndex(0))->toContain('CREATE TABLE demo');
    $zip->close();
    unlink($backup->file_path);
});

test('SQL backup fails gracefully and flashes an error when mysqldump fails', function () {
    Process::fake([
        '*mysqldump*' => Process::result(output: '', errorOutput: 'mysqldump: command not found', exitCode: 127),
    ]);

    $response = $this->actingAs($this->admin)->post('/settings/backup/sql');

    $response->assertRedirect();
    $response->assertSessionHas('error');
    expect(BackupHistory::where('type', 'sql')->count())->toBe(0);
});

test('Excel reference backup creates a real archive excluding secret settings', function () {
    Setting::set('mail_smtp_password', Crypt::encryptString('should-not-appear'), 'mail', $this->admin->id);

    $response = $this->actingAs($this->admin)->post('/settings/backup/excel');
    $response->assertRedirect();
    $response->assertSessionHas('success');

    $backup = BackupHistory::where('type', 'excel')->latest('id')->first();
    expect($backup)->not->toBeNull();
    expect($backup->file_size)->toBeGreaterThan(0);
    expect(file_exists($backup->file_path))->toBeTrue();

    $zip = new ZipArchive;
    $zip->open($backup->file_path);
    $xlsxContent = $zip->getFromIndex(0);
    expect($xlsxContent)->not->toContain('should-not-appear');
    $zip->close();
    unlink($backup->file_path);
});

test('old backups beyond the retention count are deleted automatically', function () {
    Process::fake([
        '*mysqldump*' => Process::result(output: "-- fake dump\n"),
    ]);

    $this->actingAs($this->admin)->post('/settings/backup/retention', ['backup_retention_count' => 2]);

    $paths = [];
    foreach (range(1, 3) as $i) {
        $this->actingAs($this->admin)->post('/settings/backup/sql');
        usleep(1100000); // ensure distinct filenames/timestamps between runs
    }

    expect(BackupHistory::count())->toBe(2);
    BackupHistory::all()->each(fn (BackupHistory $b) => expect(file_exists($b->file_path))->toBeTrue());

    BackupHistory::all()->each(fn (BackupHistory $b) => unlink($b->file_path));
});

test('test mail button actually attempts delivery', function () {
    Mail::fake();
    Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

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
