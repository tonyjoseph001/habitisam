"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChildLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (!loading && user && !activeProfile) {
            router.push('/parent/dashboard'); // Need a profile to be here
        } else if (!loading && activeProfile?.type === 'parent') {
            // Parent shouldn't be in child layout generally unless testing, 
            // but strict redirect logic:
            // router.push('/parent/dashboard'); 
        }
    }, [user, loading, activeProfile, router]);

    const handleExit = () => {
        // "Logout" of child profile -> Go back to profile selection/dashboard
        setActiveProfile(null);
        router.push('/parent/dashboard');
    };

    if (loading || !activeProfile) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading Mission Control...</div>;

    // Theme Logic (Dynamic Backgrounds)
    const isCosmic = activeProfile.theme === 'cosmic';
    const bgClass = isCosmic
        ? "bg-slate-900" // Placeholder for Cosmic Gradient/Image
        : "bg-green-900"; // Placeholder for Enchanted Realm

    return (
        <div className={`min-h-screen relative flex flex-col ${bgClass} text-white transition-colors duration-500`}>
            {/* Immersive Background Layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* We can add SVG stars/clouds here later */}
                {isCosmic && <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black opacity-80"></div>}
            </div>

            {/* Child Top Bar */}
            <header className="relative z-10 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center text-2xl shadow-lg backdrop-blur-sm">
                        {/* Avatar */}
                        {activeProfile.avatarId === 'child-1' ? '🧑‍🚀' : '🧚‍♀️'}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-fredoka text-lg leading-tight text-white drop-shadow-md">{activeProfile.name}</span>
                        <span className="text-xs text-white/70 font-medium">Lvl 1 Explorer</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Currency/Stats Pills */}
                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                        <span className="text-xl">⭐</span>
                        <span className="font-bold font-fredoka text-amber-400 text-lg">{activeProfile.stars || 0}</span>
                    </div>

                    <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={handleExit}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Dynamic Content */}
            <div className="relative z-10 flex-1 flex flex-col">
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
        </div>
    );
}
