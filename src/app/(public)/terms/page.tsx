import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 z-10">
                <Link href="/login" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold">Terms of Service</h1>
            </div>

            <main className="max-w-2xl mx-auto p-6 prose prose-slate">
                <p className="text-slate-500 text-sm mb-8">
                    Last Updated: January 1, 2026
                </p>

                <h3>1. Acceptance of Terms</h3>
                <p>
                    By accessing and using Habitisam ("the App"), you agree to be bound by these Terms of Service.
                    If you do not agree to these terms, please do not use the App.
                </p>

                <h3>2. Description of Service</h3>
                <p>
                    Habitisam provides a gamified routine and chore tracking platform for families.
                    We function as a tool to help manage household tasks and are not a substitute for professional parenting or medical advice.
                </p>

                <h3>3. User Accounts</h3>
                <p>
                    You are responsible for maintaining the confidentiality of your account credentials (including PINs)
                    and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                </p>

                <h3>4. Data & Privacy</h3>
                <p>
                    Your use of the App is also governed by our <Link href="/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
                    We store data such as routines, completion logs, and profile info to provide the service.
                </p>

                <h3>5. Pricing & Modifications</h3>
                <p>
                    <strong>Habitisam is currently provided as a free service.</strong> However, we reserve the right to introduce
                    premium features, subscriptions, or advertisements in the future. We will provide notice of any pricing changes,
                    and continued use of the paid features will constitute acceptance of the new fees.
                </p>
                <p>
                    We reserve the right to modify or discontinue, temporarily or permanently, the Service (or any part thereof)
                    with or without notice.
                </p>

                <h3>6. App Store Terms</h3>
                <p>
                    If you downloaded this App from the Apple App Store or Google Play Store, you acknowledge that this agreement
                    is between you and Habitisam only, and not with Apple or Google.
                </p>

                <h3>7. Contact</h3>
                <p>
                    For questions about these terms, please contact us via the Support section in the App.
                </p>

                <div className="h-20"></div>
            </main>
        </div>
    );
}
