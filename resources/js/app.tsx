import { createInertiaApp, router } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'IDOL E-Section';

// Keep CSRF meta tag in sync across Inertia client-side page navigations
router.on('navigate', (event) => {
    const token = (event.detail.page.props as any)?.csrf_token;
    if (token && typeof document !== 'undefined') {
        let meta = document.querySelector('meta[name="csrf-token"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'csrf-token');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', token);
    }
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    progress: {
        color: '#4f46e5',
    },
});
