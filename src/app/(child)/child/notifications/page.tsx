"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ArrowLeft, Bell, Gift, Star, Check } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useInbox } from '@/lib/hooks/useInbox';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { LogService } from '@/lib/firestore/logs.service';

export default function NotificationsPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [mounted, setMounted] = useState(false);

    const { inboxItems, claimInboxItem } = useInbox(activeProfile?.id);
    const { logs } = useActivityLogs(activeProfile?.id);

    useEffect(() => {
        setMounted(true);
    }, []);

    const today = new Date();

    const pending = inboxItems?.filter(item => item.status === 'pending') || [];

    const rewards = logs?.filter(l =>
        l.activityId === 'manual_reward' &&
        isSameDay(new Date(l.date), today) &&
        !(l.metadata as any)?.hidden
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

    // Track IDs to hide on exit
    const historyIdsRef = useRef<string[]>([]);

    useEffect(() => {
        // Update ref with current history IDs
        if (rewards.length > 0) {
            const ids = rewards.map(r => r.id);
            // Merge unique IDs
            historyIdsRef.current = Array.from(new Set([...historyIdsRef.current, ...ids]));
        }
    }, [rewards]);

    useEffect(() => {
        return () => {
            // Cleanup: Hide seen history items on unmount
            const idsToHide = historyIdsRef.current;
            if (idsToHide.length > 0) {
                // We perform individual updates as Firestore doesn't support bulk update easily without transaction or batched write
                // Batched write is better but service doesn't expose it. We'll loop parallel updates.
                idsToHide.forEach(id => {
                    LogService.update(id, { 'metadata.hidden': true } as any)
                        .catch(err => console.error("Auto-clear error", err));
                });
            }
        };
    }, []);

    const handleClaim = async (reward: any) => {
        if (!activeProfile) return;
        try {
            await claimInboxItem(reward);

            if (reward.amount > 0) {
                toast.success("Reward Claimed!", {
                    description: `You got ${reward.amount} Stars!`,
                    icon: '🎁'
                });
            } else {
                toast.success("Notification dismissed");
            }
        } catch (e) {
            console.error("Claim error", e);
            toast.error("Failed to claim.");
        }
    };

    if (!mounted || !activeProfile) return null;

    const hasContent = rewards.length > 0 || pending.length > 0;

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <div className="flex-none bg-white z-50">
                <header className="w-full px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex items-center gap-4 border-b border-slate-100 shadow-sm">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800">Notifications</h1>
                </header>
            </div>

            <div className="flex-1 overflow-y-auto w-full pb-32">
                <main className="max-w-md mx-auto p-6 space-y-8">

                    {!hasContent ? (
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
                        <>
                            {/* PENDING SECTION */}
                            <AnimatePresence>
                                {pending.length > 0 && (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                                            <h2 className="text-xs font-black text-pink-500 uppercase tracking-widest">Waiting for you!</h2>
                                        </div>
                                        <div className="grid gap-3">
                                            {pending.map(item => {
                                                const isMessage = Number(item.amount || 0) <= 0;
                                                return (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.9, opacity: 0, height: 0 }}
                                                        className={cn(
                                                            "rounded-2xl p-5 shadow-lg flex items-center gap-4 relative overflow-hidden text-white",
                                                            isMessage ? "bg-gradient-to-r from-slate-700 to-slate-600 shadow-slate-200" : "bg-gradient-to-r from-pink-500 to-rose-400 shadow-pink-200"
                                                        )}
                                                    >
                                                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm border border-white/10 shrink-0">
                                                            {isMessage ? <Bell className="w-6 h-6 text-white" /> : <Gift className="w-6 h-6 text-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0 z-10">
                                                            <h3 className="font-bold text-lg leading-tight">{isMessage ? "Update" : "Stars for you!"}</h3>
                                                            <p className={cn("text-sm font-medium truncate", isMessage ? "text-slate-200" : "text-pink-100")}>
                                                                {item.message || "Good job!"}
                                                            </p>
                                                        </div>
                                                        <div className="z-10">
                                                            <button
                                                                onClick={() => handleClaim(item)}
                                                                className={cn(
                                                                    "font-bold px-4 py-3 rounded-xl shadow-sm active:scale-95 transition-all text-sm flex items-center gap-1.5 bg-white",
                                                                    isMessage ? "text-slate-700 hover:bg-slate-50" : "text-pink-600 hover:bg-pink-50"
                                                                )}
                                                            >
                                                                {isMessage ? <Check className="w-4 h-4" /> : <Star className={cn("w-4 h-4", isMessage ? "fill-slate-600" : "fill-pink-600")} />}
                                                                {isMessage ? "Dismiss" : `Claim ${item.amount}`}
                                                            </button>
                                                        </div>
                                                        {/* Background Decor */}
                                                        <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}
                            </AnimatePresence>

                            {/* HISTORY SECTION */}
                            {rewards.length > 0 && (
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {rewards.map(reward => (
                                            <div key={reward.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-xl flex-shrink-0 shadow-sm border border-yellow-100">
                                                    ⭐
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h3 className="font-bold text-slate-700 text-sm">Stars Earned</h3>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                                            {format(new Date(reward.date), 'h:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed">
                                                        {(reward.metadata as any)?.reason || "Reward for completing tasks"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end self-center pl-2">
                                                    {Number(reward.starsEarned) > 0 && (
                                                        <span className="font-black text-lg text-yellow-500">+{reward.starsEarned}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                </main>
            </div>
        </div>
    );
}
