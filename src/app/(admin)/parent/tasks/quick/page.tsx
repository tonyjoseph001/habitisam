"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArrowLeft, Check, Minus, Plus, Star, Mic, Trash2, Shirt, Utensils, Brush } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { addMinutes, format } from 'date-fns';

export default function QuickTaskPage() {
    const router = useRouter();

    // State
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [taskName, setTaskName] = useState("");
    const [deadline, setDeadline] = useState<'30min' | '1hour' | 'today' | null>(null);
    const [reward, setReward] = useState(20);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successProfileName, setSuccessProfileName] = useState<string | null>(null);

    // Data
    const children = useLiveQuery(
        () => db.profiles.where('type').equals('child').toArray()
    );

    const selectedChild = children?.find(c => c.id === selectedChildId);

    // Presets
    const presets = [
        { label: 'Clean Room', icon: '🧹', reward: 50 },
        { label: 'Dishes', icon: '🍽️', reward: 20 },
        { label: 'Trash', icon: '🗑️', reward: 15 },
        { label: 'Laundry', icon: '👕', reward: 30 },
    ];

    // Handlers
    const handlePresetClick = (preset: typeof presets[0]) => {
        setTaskName(preset.label); // Or includes logic? User req: "Clean Room..."
        setReward(preset.reward);
    };

    const handleAssign = async () => {
        if (!selectedChildId) {
            toast.error("Who needs to do this task?");
            return;
        }
        if (!taskName.trim()) {
            toast.error("What is the task?");
            return;
        }
        if (!deadline) {
            toast.error("When is it due?");
            return;
        }

        setIsSubmitting(true);

        try {
            const now = new Date();
            let dueTimeStr = "23:59"; // Default 'today'

            if (deadline === '30min') {
                dueTimeStr = format(addMinutes(now, 30), 'HH:mm');
            } else if (deadline === '1hour') {
                dueTimeStr = format(addMinutes(now, 60), 'HH:mm');
            }

            // Create Activity
            await db.activities.add({
                id: crypto.randomUUID(),
                accountId: selectedChild?.accountId || 'unknown',
                profileIds: [selectedChildId],
                type: 'one-time',
                title: taskName,
                icon: '⚡', // Quick Task Icon
                date: format(now, 'yyyy-MM-dd'),
                timeOfDay: dueTimeStr,
                isActive: true,
                createdAt: now,
                steps: [
                    {
                        id: crypto.randomUUID(),
                        title: taskName,
                        duration: deadline === '30min' ? 30 : deadline === '1hour' ? 60 : 15,
                        icon: '⚡',
                        stars: reward,
                    }
                ]
            });

            // Success State
            setSuccessProfileName(selectedChild?.name || 'Child');

            setTimeout(() => {
                const referrer = document.referrer;
                if (referrer && referrer.includes('/dashboard')) {
                    router.back();
                } else {
                    router.push('/parent/dashboard');
                }
            }, 1500);

        } catch (error) {
            console.error(error);
            toast.error("Failed to assign task");
            setIsSubmitting(false);
        }
    };

    // Helper to get avatar emoji
    const getAvatarEmoji = (id?: string) => {
        switch (id) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'rocket': return '🚀';
            default: return '👶';
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-32 font-sans">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center gap-4 border-b border-slate-100">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-800">Quick Task</h1>
            </header>

            <main className="max-w-md mx-auto p-6 space-y-8">

                {/* Child Selector */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Assign To</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 scrollbar-none">
                        {children?.map(child => {
                            const isSelected = selectedChildId === child.id;
                            return (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChildId(child.id)}
                                    className="group relative flex flex-col items-center gap-2 min-w-[80px]"
                                >
                                    <div className={cn(
                                        "relative w-16 h-16 rounded-full p-1 transition-all duration-300 transform",
                                        isSelected
                                            ? "bg-primary shadow-lg shadow-primary/30 scale-105"
                                            : "bg-white border-2 border-slate-100 opacity-60 hover:opacity-100 hover:border-primary/50"
                                    )}>
                                        <div className={cn(
                                            "w-full h-full rounded-full flex items-center justify-center text-3xl transition-colors",
                                            isSelected ? "bg-white" : "bg-slate-50"
                                        )}>
                                            {getAvatarEmoji(child.avatarId)}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-0 right-0 w-5 h-5 bg-primary border-2 border-white rounded-full flex items-center justify-center text-primary-foreground">
                                                <Check className="w-2.5 h-2.5" strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-bold transition-colors",
                                        isSelected ? "text-primary" : "text-slate-500"
                                    )}>{child.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Task Input */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">What needs doing?</h2>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            placeholder="e.g. Put away toys..."
                            className="w-full bg-white p-4 pr-12 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary font-bold text-lg text-slate-700 placeholder-slate-300 transition shadow-sm"
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary">
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {presets.map(preset => {
                            const isSelected = taskName === preset.label; // Simple equality for now
                            return (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-bold border transition flex items-center gap-2",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary"
                                    )}
                                >
                                    <span>{preset.icon}</span> {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Deadline */}
                <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Deadline</h2>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">Required</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setDeadline('30min')}
                            className={cn(
                                "py-3 rounded-xl font-bold text-sm transition active:scale-95",
                                deadline === '30min'
                                    ? "bg-slate-900 text-white shadow-md transform scale-105"
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent border-dashed border-slate-300"
                            )}
                        >
                            30 min
                        </button>
                        <button
                            onClick={() => setDeadline('1hour')}
                            className={cn(
                                "py-3 rounded-xl font-bold text-sm transition active:scale-95",
                                deadline === '1hour'
                                    ? "bg-slate-900 text-white shadow-md transform scale-105"
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent border-dashed border-slate-300"
                            )}
                        >
                            1 Hour
                        </button>
                        <button
                            onClick={() => setDeadline('today')}
                            className={cn(
                                "py-3 rounded-xl font-bold text-sm transition active:scale-95",
                                deadline === 'today'
                                    ? "bg-slate-900 text-white shadow-md transform scale-105"
                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent border-dashed border-slate-300"
                            )}
                        >
                            Today
                        </button>
                    </div>
                </section>

                {/* Reward Value */}
                <section className="flex items-center justify-between bg-yellow-50 rounded-3xl p-5 border border-yellow-100">
                    <div>
                        <h2 className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Reward Value</h2>
                        <p className="text-[10px] font-bold text-yellow-600/70">Auto-suggested</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white rounded-xl p-2 shadow-sm">
                        <button
                            onClick={() => setReward(Math.max(0, reward - 5))}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg transition"
                        >
                            -
                        </button>
                        <motion.span
                            key={reward}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="font-black text-xl text-slate-800 min-w-[30px] text-center"
                        >
                            {reward}
                        </motion.span>
                        <button
                            onClick={() => setReward(reward + 5)}
                            className="w-8 h-8 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-white flex items-center justify-center font-bold text-lg transition"
                        >
                            +
                        </button>
                    </div>
                </section>

            </main>

            {/* Footer Action */}
            <div className="fixed bottom-24 left-0 w-full px-6 max-w-md mx-auto right-0 z-[60]">
                <button
                    onClick={handleAssign}
                    disabled={isSubmitting || !!successProfileName}
                    className={cn(
                        "w-full py-4 rounded-full font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all transform",
                        successProfileName
                            ? "bg-green-500 shadow-green-200 text-white"
                            : "bg-primary text-primary-foreground shadow-slate-300 hover:scale-[1.02] active:scale-95"
                    )}
                >
                    {successProfileName ? (
                        <>
                            <Check className="w-6 h-6" />
                            Sent to {successProfileName}!
                        </>
                    ) : (
                        <>
                            {isSubmitting ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                    <Star className="w-6 h-6 fill-current text-white/50" />
                                </motion.div>
                            ) : (
                                <Check className="w-6 h-6" /> // Using Check implies 'Done/Submit'
                            )}
                            {isSubmitting ? 'Sending...' : 'Assign Task'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
