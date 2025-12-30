"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { Home, Gift, ClipboardList, Sun, Clock, Target } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Quicksand } from 'next/font/google';
import { ChildNavBar } from '@/components/layout/ChildNavBar';
import { NotificationScheduler } from '@/components/providers/NotificationScheduler';

// Font setup (if Next.js 13+ optimizations allow, otherwise fallback to sans)
const quicksand = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'] });

export default function ChildLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const { activeProfile, hasHydrated } = useSessionStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Only redirect if we are sure we are done loading AND rehydrating
        // if (!loading && hasHydrated) {
        //     if (!user) {
        //         router.push('/login');
        //     }
        //     // Removed auto-redirect for !activeProfile to prevent race conditions.
        //     // We handle this with a UI fallback below.
        // }
    }, [user, loading, hasHydrated, router]);

    // Wait for BOTH auth loading AND Zustand hydration to complete
    if (loading || !hasHydrated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#EEF2FF] pt-[env(safe-area-inset-top)]">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#EEF2FF] pt-[env(safe-area-inset-top)]">
                <p className="text-gray-500 font-bold">You need to log in.</p>
                <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Go to Login</button>
            </div>
        );
    }

    // Handled logged in but no child profile selected
    // Note: activeProfile check is guarded by !user logic above implied for type safety if needed, 
    // but explicit check is good.
    if (!activeProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#EEF2FF] p-6 text-center pt-[env(safe-area-inset-top)]">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full font-sans">
                    <div className="text-4xl mb-4">👻</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">No Profile Found</h2>
                    <p className="text-gray-500 mb-6">We couldn't find your child profile. Please go back and select one.</p>
                    <button
                        onClick={() => router.push('/parent/dashboard')}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                    >
                        Go to Parent Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Theme: Match HTML snippet bg
    const bgClass = "bg-[#EEF2FF]";

    // Hide Bottom Nav on Routine Player
    const showNav = !pathname.includes('/child/routine');

    return (
        <div className={cn(`h-screen overflow-hidden relative flex flex-col ${bgClass} text-[#2B2D42] transition-colors duration-500 selection:bg-orange-100 pb-[env(safe-area-inset-bottom)]`, quicksand.className)}>
            <NotificationScheduler />

            {/* Dynamic Content */}
            <div className={cn("relative z-10 flex-1 flex flex-col overflow-hidden", showNav && "")}>
                {children}
            </div>

            {/* Fixed Bottom Navigation Bar */}
            {showNav && <ChildNavBar />}
        </div>
    );
}
