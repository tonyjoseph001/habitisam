"use client";

import React from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { motion } from 'framer-motion';
import { Play, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function MissionControlPage() {
    const { activeProfile } = useSessionStore();

    // Fetch assigned routines (missions) for today
    const assignedRoutines = useLiveQuery(async () => {
        if (!activeProfile) return [];

        // Get all activities assigned to this profile
        const activities = await db.activities
            .where('profileIds')
            .equals(activeProfile.id)
            .toArray();

        // In a real app, we'd filter for "Active today" logic
        // For now, show all assigned
        return activities;
    }, [activeProfile?.id]);

    if (!activeProfile) return null;

    return (
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
            {/* Greeting */}
            <div className="text-center space-y-1">
                <h1 className="font-fredoka text-3xl text-white drop-shadow-md">
                    Ready for Missions?
                </h1>
                <p className="text-white/80 text-sm">Complete tasks to earn stars!</p>
            </div>

            {/* Mission Cards */}
            <div className="flex flex-col gap-4">
                {assignedRoutines?.length === 0 && (
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white/60">
                        <p>No missions assigned yet.</p>
                        <p className="text-xs mt-2">Ask your parent to add some!</p>
                    </div>
                )}

                {assignedRoutines?.map((routine) => (
                    <motion.div
                        key={routine.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative overflow-hidden bg-white rounded-2xl p-4 shadow-xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center text-3xl">
                                    {/* Icon placeholder logic */}
                                    {routine.title.toLowerCase().includes('morning') ? '☀️' :
                                        routine.title.toLowerCase().includes('bed') ? '🌙' : '🚀'}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-800 text-lg">{routine.title}</h2>
                                    <p className="text-slate-500 text-sm font-medium">{routine.steps.length} Steps • {routine.timeOfDay}</p>
                                </div>
                            </div>

                            <Link href={`/child/routine?id=${routine.id}`} className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg hover:bg-violet-700 transition-colors">
                                <Play className="w-5 h-5 fill-current" />
                            </Link>
                        </div>

                        {/* Progress Bar Placeholder (if started) */}
                    </motion.div>
                ))}
            </div>

            {/* Rewards Shop Teaser */}
            <div className="mt-auto pt-6">
                <button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg border-b-4 border-rose-700 active:border-b-0 active:translate-y-1 transition-all">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🛍️</span>
                        <div className="text-left">
                            <h3 className="font-fredoka text-lg">Visit Shop</h3>
                            <p className="text-xs text-white/90">Spend your stars!</p>
                        </div>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                        {activeProfile.stars} ⭐
                    </div>
                </button>
            </div>
        </main>
    );
}
