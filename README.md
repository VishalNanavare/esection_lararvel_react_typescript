# E-Section Portal — IDOL Eligibility & Verification System

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-v2.x-9553E9?style=for-the-badge&logo=inertia&logoColor=white)](https://inertiajs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://php.net)
[![Tests](https://img.shields.io/badge/Tests-84%20Passed-10B981?style=for-the-badge&logo=pest&logoColor=white)](https://pestphp.com)

A high-performance document verification, eligibility tracking, and academic administration web application, originally built for an institute's distance-learning eligibility office and generalized here as a public sample project.

This repository is a modern rewrite of a legacy CodeIgniter 4 portal into **Laravel 12 + Inertia.js v2 + React 19 + TypeScript**. It is an active, audited migration, not a finished 1:1 port — see the "Parity Status & Known Limitations" section further down before assuming any given screen matches the original exactly.

---

## 🌟 Key Highlights & Achievements

### 1. Modern Architecture & 100% Type Safety
- **Laravel 12 Backend**: Clean Model-View-Controller architecture with Eloquent ORM, granular middleware guards, form requests, and robust service layers.
- **Inertia.js v2 SPA**: Instant client-side page transitions without full page reloads, preserving server-driven routing and flash messages.
- **React 19 & TypeScript**: Strictly typed components, data contracts, and event handlers with 0 TypeScript compilation errors (`tsc --noEmit`).
- **Glassmorphism Theme**: Clean, responsive layout with custom CSS tokens, left sidebar navigation, top header breadcrumbs, and live clock.

### 2. Candidate Verification & Batch Entry (`/students/new`)
- **Dynamic University Search**: Live AJAX lookup for target universities with auto-population of Addressed Authority, In Favour Of payment titles, and verification fee amounts.
- **Interactive Candidate Grid**: Add candidates with real-time field validation, duplicate case number checks, and auto-generated case numbers (`IDOL/YYYY/XXXX`).
- **"Fill Candidates from Excel" 2-Step Modal**:
  - **Step 1 (Picker & Specification)**: 5-column layout guide (`Candidate name`, `Nee name`, `Eligibility case no.`, `Verification remarks`, `Email`) with example row preview and file chooser.
  - **Step 2 (Validation & Selection)**: Server-side row parsing with status badges (`X usable` in green, `Y with problems` in red), detailed error messages, bulk select/deselect, and batch insertion.

### 3. Verification Batch History & Inspection (`/students/history`)
- **Multi-Filter Panel**:
  - Admission Year dropdown (dynamically populated from recorded batches).
  - Target University searchable dropdown with address flattening.
  - Course / Stream dropdown.
  - Batch number and candidate name text search.
  - **Flatpickr Integration**: Dual date inputs (`Created From` & `Created To`) with cross-linked min/max range constraints.
- **Unix Timestamp Normalization**: Formats database timestamp storage into clean human-readable stamps (`14 Mar 2026, 13:24`) and sorts by newest batch first (`MAX(en_time) DESC`).
- **In-Page Candidate Inspection (`#batchViewModal`)**: Clicking **View** opens an in-place modal showing all candidates in that batch with their eligibility case numbers and remarks.
- **One-Click Excel Export**: Generates `.xlsx` reports matching the filtered batch dataset.
- **Direct PDF Generation**: Quick-action links for University Dispatch Letters and Accounts Copies (AC).

### 4. Demand Draft (DD) Confirmation & Accounting (`/confirmations`)
- Queue of candidates pending DD verification with selectable batch assignment.
- Capture DD Number, Bank Name, DD Amount, and DD Date.
- Detailed batch history and receipt tracking.

### 5. University Directory & Registry (`/universities`)
- Comprehensive directory of recognized universities and colleges across Indian states.
- Live search, state filtering, verification fee configuration, and addressed authority management.
- Add and edit modals with SweetAlert2 confirmation feedback.

### 6. Regularization & Reminders Engine
- **Regularization (`/regularization`)**: Track provisional admissions, generate regularization letters, and review historical logs.
- **University Reminders (`/reminders/university`)**: Generate batch reminder notices to universities with dispatch history and notes.
- **Student Reminders (`/reminders/student`)**: Automated reminder letters for individual candidates.

### 7. Official PDF Generation Engine (`Dompdf`)
- High-fidelity PDF rendering with IDOL institutional letterhead, reference headers, candidate rosters, fee tables, and signature blocks:
  - **Dispatch Letter (Original for Target University)**
  - **Accounts Copy (AC)**
  - **Eligibility Confirmation Letter**
  - **Regularization Notice**
  - **University Reminder Letter**
  - **Student Reminder Notice**

### 8. Enterprise Administration & System Settings (`/settings`)
Includes 11 dedicated management modules:
- **Institute Profile**: Configurable institutional title, address, phone numbers, signature lines, and **Letterhead Image Upload** with real-time dimension validation (1486×368 px) and live preview.
- **User Management**: Create, edit, activate/deactivate portal users with bcrypt hashing.
- **Granular Access Rights**: Matrix for assigning per-user page permissions (`students`, `confirmations`, `universities`, `regularization`, `reminders`, `email`, `settings`).
- **Academic Years**: Manage academic calendar labels and set active fiscal years.
- **Courses & Streams**: Manage academic degrees and programs.
- **Fee & Case Numbering**: Set starting case numbers and annual sequence resets.
- **Backup Management**: Screen and password/retention controls are in place; the actual backup-file generation (mysqldump/ZIP export) is not wired up yet — see Parity Status below.
- **Mail & SMTP Config**: Manage outgoing mail server credentials and send real test dispatches.
- **Feature Toggles**: Dynamic module kill-switches.
- **Activity Log**: Audit trail recording user logins and data modifications.
- **Letter Templates**: Customize template wording and clauses.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Laravel 12](https://laravel.com) (PHP 8.2+) |
| **Frontend Bridge** | [Inertia.js v2](https://inertiajs.com) |
| **UI Library** | [React 19](https://react.dev) |
| **Language** | [TypeScript 5.7+](https://www.typescriptlang.org) |
| **Styling** | Custom Glass Theme + Bootstrap 5 tokens + [Tailwind CSS v4](https://tailwindcss.com) |
| **Datepicker** | [Flatpickr](https://flatpickr.js.org) |
| **Alerts & Modals** | [SweetAlert2](https://sweetalert2.github.io) |
| **Icons** | Embedded SVG + FontAwesome (100% Offline) |
| **Excel Engine** | [PhpSpreadsheet](https://phpspreadsheet.readthedocs.io) |
| **PDF Engine** | [Barryvdh Laravel Dompdf](https://github.com/barryvdh/laravel-dompdf) |
| **Testing** | [Pest PHP](https://pestphp.com) & PHPUnit |

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
- **PHP** >= 8.2 with extensions: `pdo_mysql`, `mbstring`, `openssl`, `xml`, `gd`, `zip`
- **Composer** >= 2.x
- **Node.js** >= 18.x and **npm**
- **MySQL** >= 8.0 or MariaDB

### 2. Clone Repository
```bash
git clone https://github.com/VishalNanavare/esection_lararvel_react_typescript.git
cd esection_lararvel_react_typescript
```

### 3. Install Backend Dependencies
```bash
composer install
```

### 4. Install Frontend Dependencies
```bash
npm install
```

### 5. Configure Environment
```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` to configure your database connection:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=idol_e_section
DB_USERNAME=root
DB_PASSWORD=your_password
```

### 6. Run Database Migrations & Seeders
```bash
php artisan migrate --seed
```
*This runs all schema migrations and populates the database with ready-to-use dummy data: the permission catalog, three academic years, a handful of courses/streams, five sample universities, app settings (no SMTP credentials included — configure your own under Settings > Email), and a few demo student/confirmation/regularization/reminder records so every screen has something to show. No real institutional data ships with this repository.*

Default credentials:
- **Username**: `admin`
- **Password**: `qwerty@123` (or accounts `esection1` to `esection6` with passwords `esection1#123` ... `esection6#123`)

Sample Candidate Import Template:
- A ready-to-use candidate Excel sheet is provided at `database/data/sample_candidates_template.xlsx` (also accessible via `public/templates/sample_candidates_template.xlsx`) for testing the "Fill Candidates from Excel" modal.

### 7. Compile Frontend Assets
For local development:
```bash
npm run dev
```

For production build:
```bash
npm run build
```

### 8. Start the Local Server
```bash
php artisan serve
```

Access the application at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 🧪 Testing & Verification

Run the automated test suite covering authentication, permissions, candidate batch creation, Excel processing, PDF generation, and settings:

```bash
# Run backend test suite
php artisan test

# Run TypeScript typecheck
npm run types:check
```

**Test Status**: ✅ **84 tests passed (316 assertions)** with 0 failures.

---

## 📋 Parity Status & Known Limitations

This app is being migrated and audited against its original CodeIgniter 4 counterpart module by module. It is **not a finished 1:1 port** — treat any given screen as "probably matches" rather than "guaranteed matches" until it's been through this process.

**Fixed and verified so far:**
- Route-level permission enforcement (previously defined but never applied to any route)
- Admin-configurable letter templates now actually reach the 6 generated PDF letters
- Delete-button visibility consistent with server-side feature-toggle enforcement
- SMTP and backup passwords encrypted at rest (not plaintext/one-way-hashed)
- Bulk Email and the Settings "Test Mail" button send real email through configured SMTP

**Known gaps — real, unfixed:**
- **Backup Management** doesn't produce an actual database backup file yet (UI and password/retention settings work; the mysqldump/ZIP step is not implemented).
- **No forgot-password flow**, and login throttling is less thorough than the original.
- **Demand Draft Confirmations** still uses an older data model than the original's current eligibility-checklist design — a rebuild to match is planned but not done.
- Several export filters, activity-log entries, and minor UI/behavior differences from the original have not been reconciled.

If you're evaluating this project or building on it, read the code for the module you care about rather than assuming feature-parity claims elsewhere in this document are current.

---

## 📁 Project Structure

```
├── app/
│   ├── Http/
│   │   ├── Controllers/       # Student, Confirmation, University, Pdf, Settings controllers
│   │   └── Middleware/        # CheckPageAccess, HandleInertiaRequests, Authenticate
│   └── Models/                # StudentDetail, CollegeDetail, User, AcademicYear, etc.
├── database/
│   ├── migrations/            # Complete schema migrations for all modules
│   └── seeders/               # DatabaseSeeder and UserSeeder
├── public/
│   ├── assets/                # Offline vendor assets (fonts, SweetAlert2, CSS)
│   └── uploads/               # Upload directory for institute letterheads (.gitkeep preserved)
├── resources/
│   ├── css/                   # esection-theme.css, glassmorphism tokens, and Flatpickr styles
│   ├── js/
│   │   ├── components/        # AppLayout, Sidebar, Topbar, ResetPasswordModal
│   │   ├── pages/             # React Inertia views (Students, Universities, Settings, etc.)
│   │   └── types/             # TypeScript interfaces and global declarations
│   └── views/
│       ├── app.blade.php      # Inertia root HTML template
│       └── pdf/               # Blade templates for Dompdf letters and accounts copies
├── routes/
│   ├── web.php                # Web routes and internal API aliases
│   └── console.php            # Artisan console commands
└── tests/
    └── Feature/               # Pest/PHPUnit end-to-end integration tests
```

---

## 🔒 Security & Best Practices
- **Strict Input Validation**: Form requests and sanitization on all endpoints.
- **XSS & CSRF Protection**: Fully protected via Laravel's built-in CSRF tokens and Blade/React automatic HTML escaping.
- **Bcrypt Password Hashing**: Passwords stored securely with bcrypt rounds >= 12.
- **Sanitized Repository**: `.env` credentials, build output, temporary caches, and system files are excluded via comprehensive `.gitignore`. Real institutional data dumps that were briefly committed early in this project's history have been purged from git history entirely, and `database/sql/*.sql` is now gitignored to prevent recurrence — `DatabaseSeeder` ships only fictional demo data (see the Installation section).

---

## 📄 License
This project is proprietary software developed for the Institute of Distance and Open Learning (IDOL). All rights reserved.
