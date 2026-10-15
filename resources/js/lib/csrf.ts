/**
 * CSRF Protection Utility for E-Section Portal
 *
 * Provides multi-layer CSRF token resolution for fetch/AJAX requests:
 * 1. Checks <meta name="csrf-token"> for the active Laravel CSRF token.
 * 2. Reads the XSRF-TOKEN cookie (Laravel's encrypted cookie, sent as X-XSRF-TOKEN).
 * 3. Formats headers and provides user-friendly error messages on session timeout / 419.
 */

export function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const meta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    return meta || '';
}

export function getXsrfCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
    return match && match[2] ? decodeURIComponent(match[2]) : null;
}

export function getCsrfHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    const csrfToken = getCsrfToken();
    if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
    }

    const xsrfCookie = getXsrfCookie();
    if (xsrfCookie) {
        headers['X-XSRF-TOKEN'] = xsrfCookie;
    }

    return headers;
}

/**
 * Checks if an HTTP response or error is a CSRF token mismatch / session expiration.
 */
export function isCsrfMismatch(status: number, message?: string): boolean {
    if (status === 419) return true;
    if (typeof message === 'string' && /csrf\s*token\s*mismatch/i.test(message)) return true;
    return false;
}
