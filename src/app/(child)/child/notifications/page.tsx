"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArrowLeft, Bell, Sparkles } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

export default function NotificationsPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const rewards = useLiveQuery(async () => {
        if (!activeProfile) return [];

        const today = new Date();
        const logs = await db.activityLogs
            .where('profileId')
            .equals(activeProfile.id)
            .toArray();

        // Filter for rewards today (or just all recent rewards?)
        // Let's show Today's rewards for now, maybe yesterday too?
        // User pattern suggests "notifications" usuallly implies recent. 
        // Let's show "Today" specifically based on previous context.
        return logs
            .filter(l =>
                l.activityId === 'manual_reward' &&
                isSameDay(new Date(l.date), today)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [activeProfile?.id]);

    if (!mounted || !activeProfile) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 px-6 py-4 flex items-center gap-4 border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-800">Notifications</h1>
            </header>

            <main className="max-w-md mx-auto p-6 space-y-6">

                {(!rewards || rewards.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-500">No notifications yet</h2>
                        <p className="text-sm text-slate-400 max-w-[200px]">
                            Check back later for updates and rewards!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Today</h2>
                        {rewards.map(reward => (
                            <div key={reward.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                                    ⭐
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 text-base">You earned stars!</h3>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                                            {format(new Date(reward.date), 'h:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                        {(reward.metadata as any)?.reason || "Great work!"}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center justify-center self-center pl-2 border-l border-slate-100">
                                    <span className="font-black text-xl text-yellow-500">+{reward.starsEarned}</span>
                                    <span className="text-[9px] font-bold text-yellow-600 uppercase">Stars</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
}
