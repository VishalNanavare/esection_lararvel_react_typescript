import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../components/AppLayout';

interface Props {
    settings?: Record<string, string>;
}

export default function Index({ settings }: Props) {
    const cards = [
        {
            icon: 'fa-university',
            title: 'Institute Details',
            desc: 'Name, address, contact details, logo, letterhead and signatory.',
            url: '/settings/institute',
        },
        {
            icon: 'fa-calendar',
            title: 'Academic Years',
            desc: 'Add academic years and mark the current one.',
            url: '/settings/academic-years',
        },
        {
            icon: 'fa-graduation-cap',
            title: 'Courses',
            desc: 'Manage the master list of courses.',
            url: '/settings/courses',
        },
        {
            icon: 'fa-toggle-on',
            title: 'Feature Toggles',
            desc: 'Turn export, bulk email and other features on or off.',
            url: '/settings/features',
        },
        {
            icon: 'fa-users',
            title: 'Users',
            desc: 'Create, edit and activate/deactivate staff accounts.',
            url: '/settings/users',
        },
        {
            icon: 'fa-lock',
            title: 'Access Rights',
            desc: 'Choose which pages each staff account can use.',
            url: '/settings/access-rights',
        },
        {
            icon: 'fa-hashtag',
            title: 'Document Numbering',
            desc: 'Configure the case number prefix used on new records.',
            url: '/settings/numbering',
        },
        {
            icon: 'fa-file-text-o',
            title: 'Letter Templates',
            desc: 'Edit the wording on every generated letter, with a live PDF preview.',
            url: '/settings/letter-templates',
        },
        {
            icon: 'fa-list-alt',
            title: 'Activity Log',
            desc: 'See who changed a setting, and when.',
            url: '/settings/activity-log',
        },
        {
            icon: 'fa-database',
            title: 'Backup',
            desc: 'Download a password-protected copy of the database, or an Excel data export.',
            url: '/settings/backup',
        },
        {
            icon: 'fa-envelope',
            title: 'Email',
            desc: 'Connect your mail account, and edit the wording of automated emails.',
            url: '/settings/mail',
        },
    ];

    return (
        <AppLayout>
            <Head title="Settings" />

            <div className="row">
                <div className="col-12">
                    <div className="glass-card p-4 mb-4">
                        <h3 className="fw-bold mb-1 text-dark">
                            <i className="fa fa-cog me-2 text-indigo"></i> Settings
                        </h3>
                        <p className="text-muted small mb-0">
                            Manage the parts of E-Section your own office should control directly, without a developer.
                        </p>
                    </div>
                </div>
            </div>

            <div className="row g-3">
                {cards.map((card, i) => (
                    <div key={i} className="col-md-6 col-lg-4">
                        <Link href={card.url} className="text-decoration-none">
                            <div className="glass-card p-4 h-100 transition-transform hover:-translate-y-1">
                                <div className="mb-2 text-indigo">
                                    <i className={`fa ${card.icon} fa-2x`}></i>
                                </div>
                                <h5 className="fw-bold text-dark mb-1">{card.title}</h5>
                                <p className="text-muted small mb-0">{card.desc}</p>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
