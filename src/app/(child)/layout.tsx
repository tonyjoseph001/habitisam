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
    const { activeProfile } = useSessionStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (!loading && user && !activeProfile) {
            router.push('/parent/dashboard');
        }
    }, [user, loading, activeProfile, router]);

    if (loading || !activeProfile) return <div className="min-h-screen flex items-center justify-center bg-[#EEF2FF] text-slate-400">Loading...</div>;

    // Theme: Match HTML snippet bg
    const bgClass = "bg-[#EEF2FF]";

    // Hide Bottom Nav on Routine Player
    const showNav = !pathname.includes('/child/routine');

    return (
        <div className={cn(`min-h-screen relative flex flex-col ${bgClass} text-[#2B2D42] transition-colors duration-500 selection:bg-orange-100`, quicksand.className)}>
            {/* Dynamic Content */}
            <div className={cn("relative z-10 flex-1 flex flex-col", showNav && "pb-24")}>
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 flex flex-col"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
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
