"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ChevronDown, ChevronUp, Rocket, Star, Lock, Home, Gift, CheckSquare, List, Play, Clock, Bell, Check, Flame, Sun, Sunset, Moon, Timer } from 'lucide-react';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import ChildHeader from '@/components/child/ChildHeader';
import { differenceInMinutes, parse, format, isPast, isToday, addDays, isSameDay, addMinutes, endOfDay, startOfDay, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

// Visual Mapping for Stamps (Duplicate for now, ideally shared)
const STAMP_ASSETS: Record<string, { emoji: string, color: string }> = {
    'star': { emoji: '⭐', color: 'bg-yellow-100 text-yellow-500 border-yellow-200' },
    'rocket': { emoji: '🚀', color: 'bg-blue-100 text-blue-500 border-blue-200' },
    'planet': { emoji: '🪐', color: 'bg-purple-100 text-purple-500 border-purple-200' },
    'bear': { emoji: '🐻', color: 'bg-amber-100 text-amber-600 border-amber-200' },
    'robot': { emoji: '🤖', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'unicorn': { emoji: '🦄', color: 'bg-pink-100 text-pink-500 border-pink-200' },
    'dino': { emoji: '🦖', color: 'bg-green-100 text-green-600 border-green-200' },
    'crown': { emoji: '👑', color: 'bg-orange-100 text-orange-500 border-orange-200' },
};

export default function MissionControlPage() {
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter();

    const [isStampModalOpen, setIsStampModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [confirmTask, setConfirmTask] = useState<any | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const liveProfile = useLiveQuery(
        () => db.profiles.get(activeProfile?.id || ''),
        [activeProfile?.id]
    );

    const data = useLiveQuery(async () => {
        if (!activeProfile) return { routines: [], logs: [] };
        const myRoutines = await db.activities
            .where('profileIds')
            .equals(activeProfile.id)
            .toArray();

        const today = new Date();
        const myLogs = await db.activityLogs
            .where('profileId')
            .equals(activeProfile.id)
            .filter(l => {
                const logDate = new Date(l.date);
                return logDate.getDate() === today.getDate() &&
                    logDate.getMonth() === today.getMonth() &&
                    logDate.getFullYear() === today.getFullYear();
            })
            .toArray();

        // Check for manual rewards (ad-hoc stars) today
        const rewards = await db.activityLogs
            .where('profileId')
            .equals(activeProfile.id)
            .filter(l => {
                const logDate = new Date(l.date);
                return l.activityId === 'manual_reward' &&
                    logDate.getDate() === today.getDate() &&
                    logDate.getMonth() === today.getMonth() &&
                    logDate.getFullYear() === today.getFullYear();
            })
            .toArray();

        return { routines: myRoutines, logs: myLogs, rewards };
    }, [activeProfile?.id]);

    const routines = data?.routines || [];
    const logs = data?.logs || [];
    const rewards = data?.rewards || [];
    const completedTaskIds = new Set(logs.filter(l => l.status === 'completed').map(l => l.activityId));
    const completedLogMap = new Map(logs.filter(l => l.status === 'completed').map(l => [l.activityId, l]));

    // Notification Effect
    useEffect(() => {
        if (rewards.length > 0) {
            // Check if we just got a new one (simple check: if latest reward is very recent)
            const latest = rewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const diff = new Date().getTime() - new Date(latest.date).getTime();

            // If reward is within last 5 seconds (roughly), show toast
            if (diff < 5000) {
                toast.success(`You got ${latest.starsEarned} Stars!`, {
                    description: (latest.metadata as any)?.reason || "Great job!",
                    icon: "⭐",
                    duration: 5000
                });
            }
        }
    }, [rewards.length]);

    // Data for processed tasks (completed OR missed)
    const processedTaskIds = new Set(logs.filter(l => l.status === 'completed' || l.status === 'missed').map(l => l.activityId));

    // --- SCHEDULING HELPERS ---
    const getFlexWindowMinutes = (windowString?: string): number => {
        if (!windowString) return 15; // Default 15 min
        if (windowString.includes('Anytime')) return 1440; // All day
        if (windowString.includes('15 min')) return 15;
        if (windowString.includes('30 min')) return 30;
        if (windowString.includes('1 Hour')) return 60;
        if (windowString.includes('3 Hour')) return 180;
        return 15;
    };

    const getExpirationMinutes = (expireString?: string): number | null => {
        if (!expireString || expireString === 'End of Day' || expireString === 'Never') return null;
        if (expireString.includes('1 Hour')) return 60;
        if (expireString.includes('2 Hours')) return 120;
        return null;
    };

    // Helper to determine status for list items
    const getTaskStatus = (task: any): 'completed' | 'locked' | 'active' | 'expired' | 'overdue' => {
        if (completedTaskIds.has(task.id)) return 'completed';

        try {
            const now = new Date();
            const taskTime = parse(task.timeOfDay, 'HH:mm', now);
            const flexMinutes = getFlexWindowMinutes(task.flexWindow);
            const expireMinutes = getExpirationMinutes(task.expires);

            // 1. Check Lock (Too Early)
            // Start Time - Flex Window
            const unlockTime = addMinutes(taskTime, -flexMinutes);
            // If "Anytime Today", unlockTime is basically start of day, so it's technically always unlocked if today
            // But let's respect the specific logic:
            if (isBefore(now, unlockTime)) return 'locked';

            // 2. Check Expiration (Too Late)
            if (task.expires === 'End of Day') {
                if (isAfter(now, endOfDay(taskTime))) return 'expired';
            } else if (expireMinutes !== null) {
                const expirationTime = addMinutes(taskTime, expireMinutes);
                if (isAfter(now, expirationTime)) return 'expired';
            }

            // 3. Check Overdue (Standard logic, maybe redundant if expires is handled, but good for UI text)
            // If we are past the start time but not expired yet
            if (differenceInMinutes(taskTime, now) < 0) return 'overdue'; // It's active but late

        } catch (e) { }

        return 'active';
    };

    // Expose all routines so "Missed/Expired" tasks can be shown
    const visibleRoutines = routines;

    // Expiration Check Effect
    useEffect(() => {
        if (!routines.length) return;

        const checkExpiration = async () => {
            if (!activeProfile) return;
            const now = new Date();
            const todayStr = format(now, 'yyyy-MM-dd');

            for (const r of routines) {
                // Only for one-time tasks assigned for today
                if (r.type === 'one-time' && r.date === todayStr && !processedTaskIds.has(r.id)) {
                    if (r.timeOfDay) {
                        try {
                            const dueTime = parse(r.timeOfDay, 'HH:mm', now);
                            // If passed by more than 1 minute (buffer), mark as missed
                            if (differenceInMinutes(now, dueTime) > 1) {
                                console.log('Marking task as missed:', r.title);
                                await db.activityLogs.add({
                                    id: crypto.randomUUID(),
                                    accountId: activeProfile.accountId,
                                    activityId: r.id,
                                    profileId: activeProfile?.id || '',
                                    date: now.toISOString(),
                                    status: 'missed',
                                    stepsCompleted: 0
                                });
                                toast.error(`Time's up for "${r.title}"!`, { icon: '⏰' });
                            }
                        } catch (e) {
                            console.error("Date parse error", e);
                        }
                    }
                }
            }
        };

        // Check every minute
        const interval = setInterval(checkExpiration, 60000);
        checkExpiration(); // Initial check

        return () => clearInterval(interval);
    }, [routines, processedTaskIds, activeProfile?.id]);

    // Quick Complete Handler
    const handleQuickComplete = async (task: any) => {
        if (!activeProfile) return;

        try {
            const points = task.steps?.reduce((acc: number, s: any) => acc + (s.stars || 0), 0) || 0;

            // 1. Add Log
            await db.activityLogs.add({
                id: crypto.randomUUID(),
                accountId: activeProfile.accountId,
                activityId: task.id,
                profileId: activeProfile.id,
                date: new Date().toISOString(),
                status: 'completed',
                starsEarned: points,
                stepsCompleted: task.steps?.length || 1
            });

            // 2. Add Stars
            await db.profiles.update(activeProfile.id, {
                stars: (activeProfile.stars || 0) + points
            });

            // 3. Feedback
            toast.success("Task Complete!", {
                description: `You earned ${points} stars!`,
                icon: '🌟'
            });

            // Close expand if open
            setExpandedTaskId(null);

        } catch (error) {
            console.error(error);
            toast.error("Failed to complete task");
        }
    };

    // Stamp Selection Handler
    const handleSelectStamp = async (stampId: string) => {
        if (!activeProfile) return;
        await db.profiles.update(activeProfile.id, { activeStamp: stampId });
        setIsStampModalOpen(false);
    };

    const toggleExpand = (id: string) => {
        setExpandedTaskId(prev => prev === id ? null : id);
    };

    // Helper: Filter Routines for a specific date
    const getRoutinesForDate = (allRoutines: any[], date: Date) => {
        const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        const dateStr = format(date, 'yyyy-MM-dd');

        return allRoutines.filter(r => {
            if (r.type === 'recurring') return r.days?.includes(dayOfWeek);
            if (r.type === 'one-time' && r.date) return r.date === dateStr;
            return true; // Default fallback
        }).sort((a, b) => {
            if (!a.timeOfDay || !b.timeOfDay) return 0;
            return a.timeOfDay.localeCompare(b.timeOfDay);
        });
    };

    const today = new Date();
    const tomorrow = addDays(today, 1);

    const todayRoutines = React.useMemo(() => getRoutinesForDate(visibleRoutines, today), [visibleRoutines]);
    const tomorrowRoutines = React.useMemo(() => getRoutinesForDate(visibleRoutines, tomorrow), [visibleRoutines]);

    // "Upcoming Task" logic:
    // 1. Check Today: First uncompleted future task.
    // 2. If None Today: Check Tomorrow: First task (regardless of time, since it's tomorrow).
    const upNextContext = React.useMemo(() => {
        const now = new Date();

        // 1. Try Today
        const todayNext = todayRoutines.find(r => {
            if (processedTaskIds.has(r.id)) return false;
            if (!r.timeOfDay) return false;
            try {
                const t = parse(r.timeOfDay, 'HH:mm', now);
                return differenceInMinutes(t, now) > 0;
            } catch { return false; }
        });

        if (todayNext) return { routine: todayNext, isTomorrow: false };

        // 2. Try Tomorrow (First routine of the day)
        if (tomorrowRoutines.length > 0) {
            return { routine: tomorrowRoutines[0], isTomorrow: true };
        }

        return null;
    }, [todayRoutines, tomorrowRoutines, processedTaskIds]);

    const upNextRoutine = upNextContext?.routine;
    const isTomorrow = upNextContext?.isTomorrow;

    // Assigned Tasks: All TODAY routines that are NOT the upcoming one
    const assignedTasks = React.useMemo(() => {
        if (isTomorrow) return todayRoutines; // Show all today tasks in list
        return todayRoutines.filter(r => r.id !== upNextRoutine?.id);
    }, [todayRoutines, upNextRoutine, isTomorrow]);

    // Grouping Logic for Assigned Tasks
    const groupedAssignedTasks = React.useMemo(() => {
        const groups = {
            Morning: [] as any[],
            Afternoon: [] as any[],
            Evening: [] as any[]
        };

        // Preserve global index for coloring
        const tasksWithIndex = assignedTasks.map((t, i) => ({ ...t, _globalIndex: i }));

        tasksWithIndex.forEach(task => {
            const hour = parseInt(task.timeOfDay?.split(':')[0] || '0');
            if (hour < 12) groups.Morning.push(task);
            else if (hour < 17) groups.Afternoon.push(task);
            else groups.Evening.push(task);
        });

        return groups;
    }, [assignedTasks]);

    // Palette Definition
    const TASK_PALETTE = [
        '#7bdff2', // Frosted Blue
        '#b2f7ef', // Icy Aqua
        '#eff7f6', // Mint Cream
        '#f7d6e0', // Petal Frost
        '#f2b5d4', // Blush Pop
        '#79addc', // Cool Horizon
        '#ffc09f', // Peach Glow
        '#ffee93', // Light Gold
        '#fcf5c7', // Lemon Chiffon
        '#adf7b6'  // Celadon
    ];

    // Time calculations
    const timeStatus = React.useMemo(() => {
        if (!upNextRoutine || !upNextRoutine.timeOfDay) return null;
        try {
            const now = new Date();
            const baseDate = isTomorrow ? tomorrow : now;
            const taskTime = parse(upNextRoutine.timeOfDay, 'HH:mm', baseDate);
            const diffMins = differenceInMinutes(taskTime, now);

            if (isTomorrow) {
                return {
                    formatted: format(taskTime, 'h:mm a'),
                    diffMins,
                    isLate: false,
                    text: 'Tomorrow'
                };
            }

            let text = '';
            if (diffMins < 0) {
                text = 'Overdue';
            } else if (diffMins === 0) {
                text = 'Starts Now';
            } else {
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                const label = upNextRoutine.type === 'one-time' ? 'Ends in' : 'Starts in';
                if (hours > 0) {
                    text = `${label} ${hours}h ${mins}m`;
                } else {
                    text = `${label} ${diffMins}m`;
                }
            }

            return {
                formatted: format(taskTime, 'h:mm a'),
                diffMins,
                isLate: diffMins < 0,
                text
            };
        } catch (e) {
            return { formatted: upNextRoutine.timeOfDay, diffMins: 0, isLate: false, text: 'Today' };
        }
    }, [upNextRoutine, isTomorrow]);

    if (!activeProfile) return null;
    const displayProfile = liveProfile || activeProfile;
    const activeStampId = displayProfile.activeStamp || 'star';
    const stampAsset = STAMP_ASSETS[activeStampId] || STAMP_ASSETS['star'];

    const RenderIcon = ({ name, className }: { name?: string; className?: string }) => {
        if (!name) return <Star className={className || "w-6 h-6"} />;
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className={className || "w-6 h-6"} />;
        return <span className={cn("leading-none flex items-center justify-center", className)} style={{ fontSize: className?.match(/text-(\d+xl|\[\d+px\])/) ? undefined : 'inherit' }}>{name}</span>;
    };

    return (
        <main className="w-full max-w-5xl mx-auto pb-6">

            {/* Reusable Header */}
            <ChildHeader />

            {/* Task Confirmation Modal */}
            <AnimatePresence>
                {confirmTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setConfirmTask(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-sm rounded-[2rem] p-6 text-center relative z-10 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                <Check className="w-8 h-8" strokeWidth={4} />
                            </div>
                            <h3 className="text-xl font-black text-gray-800 mb-2">Did you finish it?</h3>
                            <p className="text-gray-500 font-medium mb-6">
                                You are about to complete <br />
                                <span className="text-blue-500 font-bold">"{confirmTask.title}"</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmTask(null)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleQuickComplete(confirmTask);
                                        setConfirmTask(null);
                                    }}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200 transition"
                                >
                                    Yes, I did!
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* NEW STATS SECTION (Colorful) */}
            <div className="px-6 mb-8 space-y-6">
                {/* 1. Today's Mission Card */}
                <div className="bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#2DD4BF] rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
                    <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-purple-500/30 rounded-full blur-xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-bold text-indigo-100 uppercase tracking-widest">Today's Mission</h2>
                            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold border border-white/20 backdrop-blur-md">
                                {todayRoutines.filter(r => processedTaskIds.has(r.id)).length}/{todayRoutines.length} Done
                            </div>
                        </div>

                        <div className="flex items-end gap-3 mb-4">
                            <span className="text-6xl font-black tracking-tight leading-none drop-shadow-sm">
                                {Math.max(0, todayRoutines.length - todayRoutines.filter(r => processedTaskIds.has(r.id)).length)}
                            </span>
                            <span className="text-lg font-bold text-indigo-100 mb-1">Tasks Left</span>
                        </div>

                        <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out text-right pr-2"
                                style={{ width: `${todayRoutines.length > 0 ? (todayRoutines.filter(r => processedTaskIds.has(r.id)).length / todayRoutines.length) * 100 : 0}%` }}
                            >
                            </div>
                        </div>


                    </div>
                </div>

                {/* 2. Grid for Streak & Stars */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Streak Card */}
                    <div className="bg-[#FF8B3D] rounded-[2rem] p-4 text-white shadow-lg shadow-orange-200 relative overflow-hidden group hover:scale-[1.02] transition flex flex-col items-center text-center justify-center min-h-[140px]">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/20 rounded-full blur-md"></div>

                        <Flame className="w-12 h-12 mb-2 text-orange-50 fill-orange-50 drop-shadow-sm" />
                        <span className="text-4xl font-black tracking-tight">5</span>
                        <span className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mt-1">Days</span>
                    </div>

                    {/* Stars Card */}
                    <div className="bg-[#FACC15] rounded-[2rem] p-4 text-yellow-900 shadow-lg shadow-yellow-200 relative overflow-hidden group hover:scale-[1.02] transition flex flex-col items-center text-center justify-center min-h-[140px]">
                        <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/30 rounded-full blur-md"></div>

                        <Star className="w-12 h-12 mb-2 text-yellow-50 fill-yellow-50 drop-shadow-sm" />
                        <span className="text-3xl font-black tracking-tight">{displayProfile.stars?.toLocaleString() || 0}</span>
                        <span className="text-[10px] font-bold text-yellow-800/60 uppercase tracking-widest mt-1">Stars</span>
                    </div>
                </div>
            </div>

            {/* Responsive Grid layout for Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 pb-24">

                {/* LEFT COLUMN: UPCOMING TASK */}
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-100 rounded-full text-blue-500">
                            <Bell className="w-4 h-4 fill-current" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Upcoming Task</h2>
                    </div>

                    {upNextRoutine ? (
                        <div className="bg-[#FFF8E7] rounded-[2rem] p-5 border-2 border-[#FFE4BC] shadow-sm relative overflow-hidden group">

                            {/* Timer Badge (Absolute Left - Relative) */}
                            <div className="absolute top-4 left-4 z-10">
                                <div className="bg-white text-orange-500 px-3 py-1 rounded-lg text-xs font-bold shadow-sm border border-orange-100 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{timeStatus?.text}</span>
                                </div>
                            </div>

                            {/* Timer Badge (Absolute Right - Actual Time) */}
                            <div className="absolute top-4 right-4 z-10">
                                <div className="font-bold text-orange-300 text-xs">
                                    {timeStatus?.formatted}
                                </div>
                            </div>

                            <div className="flex gap-4 mb-4 mt-8">
                                <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-transparent text-orange-500">
                                    <RenderIcon name={upNextRoutine.icon} className="w-16 h-16 text-6xl" />
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-black text-slate-800 text-lg leading-tight w-3/4">{upNextRoutine.title}</h3>

                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg text-slate-400 border border-slate-100/50">
                                            <span className="text-xs font-bold">
                                                {upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)}m
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg border border-yellow-200">
                                            <span className="text-xs font-bold text-yellow-600">
                                                +{upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.stars || 0), 0)} Stars
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Steps - Only for Routine */}
                            {upNextRoutine.type !== 'one-time' && (
                                <div className="mb-5">
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl overflow-x-auto scrollbar-hide">
                                        {upNextRoutine.steps.slice(0, 3).map((step: any, i: number) => (
                                            <React.Fragment key={step.id || i}>
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm flex-shrink-0">
                                                    <RenderIcon name={step.icon} className="w-4 h-4" />
                                                </div>
                                                {i < Math.min(upNextRoutine.steps.length, 3) - 1 && (
                                                    <div className="text-gray-300 text-[10px]">➜</div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                        {upNextRoutine.steps.length > 3 && (
                                            <div className="ml-auto text-xs font-bold text-gray-400 pl-2">+{upNextRoutine.steps.length - 3}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* INLINED PORTAL MODAL */}
                            {mounted && isStampModalOpen && (
                                (() => {
                                    return createPortal(
                                        <div
                                            className="fixed inset-0 flex items-end justify-center sm:items-center pointer-events-none"
                                            style={{ zIndex: 999999 }}
                                        >
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-300 backdrop-blur-[2px]"
                                                onClick={() => setIsStampModalOpen(false)}
                                            />

                                            {/* Bottom Sheet Drawer */}
                                            <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom duration-300">
                                                {/* Header */}
                                                <div className="px-8 pt-4 pb-2 flex items-center justify-between">
                                                    <h2 className="text-xl font-extrabold text-[#1F2937]">Select Buddy</h2>
                                                    <Link href="/child/rewards" className="text-xs font-bold text-gray-400 hover:text-indigo-500 transition-colors">
                                                        Get more in Rewards
                                                    </Link>
                                                </div>

                                                {/* Stamp Grid */}
                                                <div className="p-8 grid grid-cols-3 gap-6 overflow-y-auto max-h-[50vh]">
                                                    {(displayProfile.unlockedStamps?.length ? displayProfile.unlockedStamps : ['star', 'rocket', 'planet', 'bear', 'robot', 'dino']).map((stampId) => {
                                                        const asset = STAMP_ASSETS[stampId] || STAMP_ASSETS['star'];
                                                        const isActive = displayProfile.activeStamp === stampId;

                                                        return (
                                                            <button
                                                                key={stampId}
                                                                onClick={() => handleSelectStamp(stampId)}
                                                                className={`relative aspect-square rounded-full flex items-center justify-center text-4xl transition-all ${isActive ? 'scale-110' : 'hover:scale-105 active:scale-95'}`}
                                                            >
                                                                <div className={`absolute inset-0 rounded-full opacity-20 ${isActive ? 'bg-indigo-500' : 'bg-gray-100'}`}></div>
                                                                <div className="relative z-10 drop-shadow-sm">{asset.emoji}</div>
                                                                {isActive && (
                                                                    <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500">
                                                                        <div className="absolute top-0 right-0 bg-indigo-500 text-white rounded-full p-1 shadow-sm transform translate-x-1/4 -translate-y-1/4">
                                                                            <Check className="w-2.5 h-2.5" strokeWidth={4} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Footer Button */}
                                                <div className="p-6 pt-2 pb-8">
                                                    <button onClick={() => setIsStampModalOpen(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-colors active:scale-95">Close</button>
                                                </div>
                                            </div>
                                        </div>,
                                        document.body
                                    );
                                })()
                            )}

                            {(() => {
                                const status = getTaskStatus(upNextRoutine);
                                if (status === 'locked') {
                                    return (
                                        <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-3.5 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2">
                                            <Lock className="w-5 h-5" />
                                            Locked until {format(addMinutes(parse(upNextRoutine.timeOfDay, 'HH:mm', new Date()), -getFlexWindowMinutes(upNextRoutine.flexWindow)), 'h:mm a')}
                                        </button>
                                    );
                                }
                                if (upNextRoutine.type === 'one-time') {
                                    return (
                                        <button onClick={() => setConfirmTask(upNextRoutine)} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <Check className="w-5 h-5" strokeWidth={3} />
                                            Mark Complete
                                        </button>
                                    );
                                }
                                return (
                                    <Link href={`/child/routine?id=${upNextRoutine.id}`} className="block">
                                        <button className="w-full bg-[#FF9F1C] hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <Play className="w-5 h-5 fill-current" />
                                            START TASK
                                        </button>
                                    </Link>
                                );
                            })()}

                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 bg-white rounded-[2rem] shadow-sm">
                            <p className="font-bold">✨ All caught up!</p>
                            <p className="text-xs mt-1">Great job!</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: ASSIGNED TASKS */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-purple-100 rounded-full text-purple-500">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Assigned Tasks ({assignedTasks.length})</h2>
                    </div>

                    <div className="space-y-6">
                        {assignedTasks.length === 0 && <p className="text-slate-400 text-sm text-center">All caught up!</p>}

                        {/* RENDER GROUPS (Morning, Afternoon, Evening) */}
                        {[
                            { id: 'Morning', label: 'Morning', icon: Sun, color: 'text-orange-400', tasks: groupedAssignedTasks.Morning },
                            { id: 'Afternoon', label: 'Afternoon', icon: Sunset, color: 'text-blue-400', tasks: groupedAssignedTasks.Afternoon },
                            { id: 'Evening', label: 'Evening', icon: Moon, color: 'text-indigo-400', tasks: groupedAssignedTasks.Evening },
                        ].map(group => {
                            if (group.tasks.length === 0) return null;

                            return (
                                <div key={group.id} className="space-y-3">
                                    <h3 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${group.color} px-2`}>
                                        <group.icon className="w-4 h-4" />
                                        {group.label}
                                    </h3>

                                    <div className="space-y-3">
                                        {group.tasks.map((task: any) => {
                                            const i = task._globalIndex; // Use global index for palette consistency
                                            const status = getTaskStatus(task);
                                            const isExpanded = expandedTaskId === task.id;

                                            const getTheme = () => {
                                                if (status === 'completed') return { hexBg: '#bbf7d0', hexBorder: '#4ade80', shadow: 'shadow-green-200', opacity: 'opacity-90 grayscale-[0.3]' }; // Green-200

                                                // Cycle through palette based on GLOBAL index
                                                const color = TASK_PALETTE[i % TASK_PALETTE.length];
                                                return { hexBg: color, hexBorder: color, shadow: 'shadow-sm', opacity: '' };
                                            };
                                            const theme = getTheme();
                                            const totalDuration = task.steps?.reduce((acc: number, step: any) => acc + (step.duration || 0), 0) || 0;

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`block relative group rounded-3xl border-2 border-black/5 transition-all overflow-hidden shadow-sm ${theme.opacity}`}
                                                    style={{ backgroundColor: theme.hexBg }}
                                                >
                                                    {/* Status Badge */}
                                                    {status === 'active' && <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">ACTIVE</div>}
                                                    {status === 'overdue' && <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">OVERDUE</div>}
                                                    {status === 'locked' && <div className="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">LOCKED</div>}
                                                    {status === 'expired' && <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">MISSED</div>}
                                                    {status === 'completed' && <div className="absolute top-0 right-0 bg-green-100 text-green-600 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">COMPLETED</div>}
                                                    <div
                                                        onClick={() => toggleExpand(task.id)}
                                                        className="relative z-10 p-4 flex items-center gap-4 cursor-pointer"
                                                    >
                                                        <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 rounded-2xl ${status === 'completed'
                                                            ? 'bg-transparent text-green-500'
                                                            : 'bg-transparent text-orange-500'
                                                            }`}>
                                                            {status === 'completed'
                                                                ? <Check className="w-8 h-8" strokeWidth={3} />
                                                                : <RenderIcon name={task.icon} className="w-8 h-8" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className={`font-bold text-lg truncate ${status === 'completed' ? 'text-green-800 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {status === 'completed' ? (
                                                                    <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-lg">
                                                                        <Check className="w-3 h-3" />
                                                                        <span>Done {(() => {
                                                                            const log = completedLogMap.get(task.id);
                                                                            return log ? format(new Date(log.date), 'h:mm a') : 'today';
                                                                        })()}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg">
                                                                            <Clock className="w-3 h-3" />
                                                                            <span>{format(parse(task.timeOfDay, 'HH:mm', new Date()), 'h:mm a')}</span>
                                                                        </div>
                                                                        {totalDuration > 0 && (
                                                                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg">
                                                                                <Timer className="w-3 h-3" />
                                                                                <span>{totalDuration}m</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-1.5 text-yellow-600 font-bold text-xs bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                                                            <span>⭐ +{task.steps?.reduce((a: number, b: any) => a + (b.stars || 0), 0) || 0}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">


                                                            {status !== 'completed' && (
                                                                <div className="text-gray-300">
                                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isExpanded && status !== 'completed' && (
                                                        <div className={`px-4 pb-4 pt-2 animate-in slide-in-from-top-1 flex flex-col gap-4`}>
                                                            {/* Steps Preview */}
                                                            <div className="space-y-2">
                                                                {task.steps?.map((step: any, n: number) => (
                                                                    <div key={n} className={`flex items-center gap-3 bg-white p-2 rounded-xl text-sm shadow-sm`}>
                                                                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold text-gray-500 flex-shrink-0`} style={{ backgroundColor: theme.hexBg }}>
                                                                            {n + 1}
                                                                        </div>
                                                                        <span className="flex-1 text-slate-700 font-medium truncate">{step.title}</span>
                                                                        {step.stars > 0 && (
                                                                            <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                                                                ⭐ {step.stars}
                                                                            </span>
                                                                        )}
                                                                        {step.duration > 0 && (
                                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                                                                <Timer className="w-3 h-3" /> {step.duration}m
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex gap-2">
                                                                {status === 'locked' ? (
                                                                    <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                                                                        <Lock className="w-4 h-4" />
                                                                        Locked until {format(addMinutes(parse(task.timeOfDay, 'HH:mm', new Date()), -getFlexWindowMinutes(task.flexWindow)), 'h:mm a')}
                                                                    </button>
                                                                ) : task.type === 'one-time' ? (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleQuickComplete(task);
                                                                        }}
                                                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                        Complete
                                                                    </button>
                                                                ) : (
                                                                    <Link href={`/child/routine?id=${task.id}`} className="flex-1 block">
                                                                        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                                                            <Play className="w-4 h-4 fill-current" />
                                                                            Start
                                                                        </button>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
            `}</style>
        </main >
    );
}
