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
        <div className={cn(`min-h-screen relative flex flex-col ${bgClass} text-[#2B2D42] transition-colors duration-500 selection:bg-orange-100 pt-[env(safe-area-inset-top)]`, quicksand.className)}>
            {/* Dynamic Content */}
            <div className={cn("relative z-10 flex-1 flex flex-col", showNav && "pb-24")}>
                {children}
            </div>

            {/* Floating Bottom Navigation Bar (HTML Match) */}
            {showNav && (
                <div className="fixed bottom-6 w-full flex justify-center z-50 pointer-events-none">
                    <div className="bg-white rounded-3xl px-1 py-2 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.15)] border border-white flex justify-between items-center w-full max-w-sm pointer-events-auto">
                        <NavLink href="/child/dashboard" icon={<Home className="w-6 h-6" />} label="Home" isActive={pathname === '/child/dashboard'} />
                        <NavLink href="/child/tasks" icon={<ClipboardList className="w-6 h-6" />} label="Tasks" isActive={pathname === '/child/tasks'} />
                        <NavLink href="/child/goals" icon={<Target className="w-6 h-6" />} label="Goals" isActive={pathname === '/child/goals'} />
                        <NavLink href="/child/rewards" icon={<Gift className="w-6 h-6" />} label="Rewards" isActive={pathname === '/child/rewards'} />
                        <NavLink href="/child/activity" icon={<Clock className="w-6 h-6" />} label="Activity" isActive={pathname === '/child/activity'} />
                    </div>
                </div>
            )}
        </div>
    );
}

function NavLink({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
    return (
        <Link href={href} className={cn("flex flex-col items-center gap-1 p-2 flex-1 transition-colors group relative", isActive ? "text-[#4F46E5]" : "text-gray-400 hover:text-[#FF9F1C]", "select-none")}>
            {isActive && <div className="absolute -top-1 w-1 h-1 bg-[#4F46E5] rounded-full left-1/2 transform -translate-x-1/2"></div>}
            <div className={`transition-transform pb-0.5 ${isActive ? "" : "group-active:scale-95"}`}>
                {icon}
            </div>
            <span className="text-[9px] font-bold">{label}</span>
        </Link>
    );
}
