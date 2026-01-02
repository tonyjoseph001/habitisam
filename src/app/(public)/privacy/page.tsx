import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 z-10">
                <Link href="/login" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold">Privacy Policy</h1>
            </div>

            <main className="max-w-2xl mx-auto p-6 prose prose-slate">
                <p className="text-slate-500 text-sm mb-8">
                    Last Updated: January 1, 2026
                </p>

                <h3>1. Information We Collect</h3>
                <p>
                    <strong>Account Information:</strong> When you sign up, we collect your email address and authentication data via Google Sign-In.
                </p>
                <p>
                    <strong>Family Data:</strong> We collect names and preferences for the parent and child profiles you create.
                    This data is used solely to customize the app experience.
                </p>
                <p>
                    <strong>Usage Data:</strong> We track completed tasks, stars earned, and app interactions to provide progress reports.
                </p>

                <h3>2. Children's Privacy</h3>
                <p>
                    Habitisam is designed for families. By creating a child profile, you, as the parent or legal guardian,
                    consent to the collection and use of the limited information provided for that profile (Name/Avatar/Age).
                    We do not collect personal contact information from children.
                </p>

                <h3>3. How We Use Your Information</h3>
                <ul>
                    <li>To provide and maintain the Service.</li>
                    <li>To notify you about changes to our Service.</li>
                    <li>To provide customer support.</li>
                    <li>To monitor the usage of the Service.</li>
                </ul>

                <h3>4. Data Storage</h3>
                <p>
                    Your data is stored securely using Google Firebase services. We do not sell your personal data to third parties.
                </p>

                <h3>5. Deletion of Data</h3>
                <p>
                    You may request deletion of your account and all associated data at any time via the Settings page in the App.
                </p>

                <h3>6. Contact Us</h3>
                <p>
                    If you have any questions about this Privacy Policy, please contact us via the Feedback feature in the App.
                </p>

                <div className="h-20"></div>
            </main>
        </div>
    );
}
