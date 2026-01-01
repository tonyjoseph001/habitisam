"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Trash2, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addMinutes, format } from 'date-fns';
import { Suspense } from 'react';

// Firestore
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { ActivityService } from '@/lib/firestore/activities.service';

function EditTaskContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams?.get('id');

    // Data
    const { profiles } = useProfiles();
    const children = profiles.filter(p => p.type === 'child');

    const { routines } = useRoutines();
    const activity = routines?.find(r => r.id === taskId);

    // State
    const [taskName, setTaskName] = useState("");
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [reward, setReward] = useState(0);
    const [deadline, setDeadline] = useState<'30min' | '1hour' | 'today' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize State from Activity
    useEffect(() => {
        if (activity) {
            setTaskName(activity.title);
            if (activity.profileIds?.length > 0) {
                setSelectedChildId(activity.profileIds[0]);
            }
            if (activity.steps?.length > 0) {
                setReward(activity.steps[0].stars || 0);
            }
            // Infer deadline (approximate)
            if (activity.timeOfDay) {
                if (activity.timeOfDay === '23:59') setDeadline('today');
                // Could act smarter logic here but 'today' fallback is fine for MVP
            }
        }
    }, [activity]);

    if (!activity) return <div className="p-8 text-center text-slate-400">Loading task...</div>;

    // Handlers
    const handleSave = async () => {
        if (!selectedChildId || !taskName.trim()) {
            toast.error("Please fill in required fields");
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date();
            let dueTimeStr = activity.timeOfDay; // Keep existing if not changed

            if (deadline === '30min') {
                dueTimeStr = format(addMinutes(now, 30), 'HH:mm');
            } else if (deadline === '1hour') {
                dueTimeStr = format(addMinutes(now, 60), 'HH:mm');
            } else if (deadline === 'today') {
                dueTimeStr = '23:59';
            }

            // Update Activity
            if (!taskId) return;

            await ActivityService.update(taskId, {
                title: taskName,
                profileIds: [selectedChildId],
                timeOfDay: dueTimeStr,
                steps: activity.steps?.map((s: any) => ({ ...s, stars: reward })) || []
            });

            toast.success("Task updated!");
            setTimeout(() => router.back(), 800);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update task");
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!taskId) return;
        if (confirm("Are you sure you want to delete this task?")) {
            setIsDeleting(true);
            try {
                await ActivityService.delete(taskId);
                toast.success("Task deleted");
                router.back();
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete task");
                setIsDeleting(false);
            }
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

    // Presets (Mirrored from Quick Task)
    const presets = [
        { label: 'Clean Room', icon: '🧹', reward: 50 },
        { label: 'Dishes', icon: '🍽️', reward: 20 },
        { label: 'Trash', icon: '🗑️', reward: 15 },
        { label: 'Laundry', icon: '👕', reward: 30 },
    ];

    const handlePresetClick = (preset: typeof presets[0]) => {
        setTaskName(preset.label);
        setReward(preset.reward);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-32 font-sans">
            <header className="bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800">Edit Task</h1>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition active:scale-95"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </header>

            <main className="max-w-md mx-auto p-6 space-y-8">
                {/* ... Child Selector (unchanged) ... */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Assigned To</h2>
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
                                            ? "bg-blue-500 shadow-lg shadow-blue-200 scale-105"
                                            : "bg-white border-2 border-slate-100 opacity-60 hover:opacity-100 hover:border-blue-200"
                                    )}>
                                        <div className={cn(
                                            "w-full h-full rounded-full flex items-center justify-center text-3xl transition-colors",
                                            isSelected ? "bg-white" : "bg-slate-50"
                                        )}>
                                            {getAvatarEmoji(child.avatarId)}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-0 right-0 w-5 h-5 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-white">
                                                <Check className="w-2.5 h-2.5" strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-bold transition-colors",
                                        isSelected ? "text-blue-600" : "text-slate-500"
                                    )}>{child.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Task Details</h2>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            className="w-full bg-white p-4 pr-12 rounded-2xl border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-slate-800 transition shadow-sm"
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500">
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {presets.map(preset => {
                            const isSelected = taskName === preset.label;
                            return (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-bold border transition flex items-center gap-2",
                                        isSelected
                                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-500"
                                    )}
                                >
                                    <span>{preset.icon}</span> {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Deadline</h2>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-mono">
                            {activity.timeOfDay ? (
                                (() => {
                                    const [h, m] = activity.timeOfDay.split(':');
                                    const d = new Date();
                                    d.setHours(parseInt(h), parseInt(m));
                                    return format(d, 'h:mm a');
                                })()
                            ) : 'Set Time'}
                        </span>
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
                                deadline === 'today' || activity.timeOfDay === '23:59'
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
                        <h2 className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Reward</h2>
                        <p className="text-[10px] font-bold text-yellow-600/70">Tap to adjust</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white rounded-xl p-2 shadow-sm">
                        <button
                            onClick={() => setReward(Math.max(0, reward - 5))}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg transition"
                        >
                            -
                        </button>
                        <span className="font-black text-xl text-slate-800 min-w-[30px] text-center">
                            {reward}
                        </span>
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
            <div className="fixed bottom-6 left-0 w-full px-6 max-w-md mx-auto right-0">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-300 flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition disabled:opacity-70"
                >
                    {isSaving ? (
                        <>Saving...</>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div >
    );
}

export default function EditTaskPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditTaskContent />
        </Suspense>
    );
}
