"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ChevronDown, ChevronUp, Rocket, Star, Lock, Home, Gift, CheckSquare, List, Play, Clock, Bell, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import ChildHeader from '@/components/child/ChildHeader';
import { differenceInMinutes, parse, format, isPast, isToday, addDays, isSameDay } from 'date-fns';
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

    const todayRoutines = React.useMemo(() => getRoutinesForDate(routines, today), [routines]);
    const tomorrowRoutines = React.useMemo(() => getRoutinesForDate(routines, tomorrow), [routines]);

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
        // We only show tomorrow if today has NO pending tasks (either all done or all past & done? User said 'if today all task are completed')
        // But what if I have an overdue task?
        // User said: "so overdue task i wanted to show in assigned task list" - implying Upcoming should SKIP overdue.
        // So if I have overdue tasks, but no FUTURE tasks today, I should show Tomorrow?
        // Yes, that seems to be the intent.

        if (tomorrowRoutines.length > 0) {
            return { routine: tomorrowRoutines[0], isTomorrow: true };
        }

        return null;
    }, [todayRoutines, tomorrowRoutines, processedTaskIds]);

    const upNextRoutine = upNextContext?.routine;
    const isTomorrow = upNextContext?.isTomorrow;

    // Assigned Tasks: All TODAY routines that are NOT the upcoming one (if upcoming is today)
    // If upcoming is Tomorrow, then Assigned Tasks should be ALL of Today's routines (Overdue/Completed/Past-Uncompleted).
    const assignedTasks = React.useMemo(() => {
        if (isTomorrow) return todayRoutines; // Show all today tasks in list
        return todayRoutines.filter(r => r.id !== upNextRoutine?.id);
    }, [todayRoutines, upNextRoutine, isTomorrow]);

    // Merge Tasks and Rewards for the list
    const combinedList = React.useMemo(() => {
        // Transform rewards to match a generic 'list item' shape or just handle them in the map
        const rewardItems = rewards.map(r => ({
            id: r.id,
            type: 'reward_log',
            title: (r.metadata as any)?.reason || 'Reward',
            stars: r.starsEarned || 0,
            date: r.date,
            icon: 'Star'
        }));

        // Combine
        return [...assignedTasks, ...rewardItems].sort((a, b) => {
            // Sort logic: active tasks first? or simple time?
            // Let's put Rewards at the top if they are new? Or just mix them?
            // Simple: Tasks first, then rewards? 
            // Better: 'Completed' things usually go to bottom.
            const isADone = 'type' in a && a.type === 'reward_log' ? true : completedTaskIds.has(a.id);
            const isBDone = 'type' in b && b.type === 'reward_log' ? true : completedTaskIds.has(b.id);

            if (isADone && !isBDone) return 1;
            if (!isADone && isBDone) return -1;
            return 0;
        });
    }, [assignedTasks, rewards, completedTaskIds]);

    // Time calculations
    const timeStatus = React.useMemo(() => {
        if (!upNextRoutine || !upNextRoutine.timeOfDay) return null;
        try {
            const now = new Date();
            // If tomorrow, we need to parse relative to tomorrow
            const baseDate = isTomorrow ? tomorrow : now;
            const taskTime = parse(upNextRoutine.timeOfDay, 'HH:mm', baseDate);

            // If tomorrow, diffMins will be large, so we might want to just show "Tomorrow" text
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

    // Helper to determine status for list items
    const getTaskStatus = (task: any) => {
        if (completedTaskIds.has(task.id)) return 'completed';

        try {
            const now = new Date();
            const t = parse(task.timeOfDay, 'HH:mm', now);
            if (differenceInMinutes(t, now) < 0) return 'overdue';
        } catch { }

        return 'pending';
    };

    if (!activeProfile) return null;

    // Use live data if available, otherwise fallback to session
    const displayProfile = liveProfile || activeProfile;

    // Avatar Logic
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayProfile.name}&clothing=graphicShirt`;

    // Stamp Logic
    const activeStampId = displayProfile.activeStamp || 'star';
    const stampAsset = STAMP_ASSETS[activeStampId] || STAMP_ASSETS['star'];

    // Helper for Icon Rendering using Lucide or fallback
    const RenderIcon = ({ name, className }: { name?: string; className?: string }) => {
        if (!name) return <Star className={className || "w-6 h-6"} />;
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className={className || "w-6 h-6"} />;
        return <span className={cn("leading-none flex items-center justify-center", className)} style={{ fontSize: className?.match(/text-(\d+xl|\[\d+px\])/) ? undefined : 'inherit' }}>{name}</span>;
    };

    return (
        <main className="w-full max-w-md mx-auto pb-4">

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



            {/* Welcome Section */}
            <div className="px-6 mb-6 flex items-center gap-4">

                {/* Stamp Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log("OPENING MODAL");
                        setIsStampModalOpen(true);
                    }}
                    className="w-24 h-24 flex-shrink-0 animate-bounce-slow relative z-30 flex items-center justify-center pointer-events-auto"
                >
                    <div className="text-[5rem] leading-none select-none drop-shadow-xl filter">
                        {stampAsset.emoji}
                    </div>
                </button>

                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Hello {activeProfile.name}!</h1>
                    <div className="flex items-center gap-1 mt-1 text-sm font-bold text-gray-500">
                        {/* Level Removed */}
                        <span>Let's have a great day!</span>
                    </div>
                </div>
            </div>

            {/* Upcoming Task */}
            <div className="px-6 mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-full text-blue-500">
                        <Bell className="w-4 h-4 fill-current" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Upcoming Task</h2>
                </div>

                {upNextRoutine ? (
                    <div className="bg-white rounded-[2rem] p-5 shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-blue-50 relative overflow-hidden group">

                        {/* Timer Badge (Absolute Left - Relative) */}
                        <div className="absolute top-4 left-4 z-10">
                            <div className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${timeStatus?.isLate ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-blue-500 border-blue-100'
                                }`}>
                                <Clock className="w-3 h-3" />
                                <span>{timeStatus?.text}</span>
                            </div>
                        </div>

                        {/* Timer Badge (Absolute Right - Actual Time) */}
                        <div className="absolute top-4 right-4 z-10">
                            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold border border-gray-200">
                                {timeStatus?.formatted}
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4 mt-8">
                            <div className="flex-shrink-0 flex items-center justify-center w-20 h-20">
                                <RenderIcon name={upNextRoutine.icon} className="w-20 h-20 text-7xl" />
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-lg leading-tight w-3/4">{upNextRoutine.title}</h3>

                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                        <span className="text-sm">⏱️</span>
                                        <span className="text-xs font-bold text-gray-600">
                                            {upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)}m
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
                                        <span className="text-sm">⭐</span>
                                        <span className="text-xs font-bold text-yellow-600">
                                            +{upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.stars || 0), 0)}
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
                                console.log("RENDERING PORTAL CONTENT");
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

                                            {/* Drag Handle */}
                                            <div className="w-full flex justify-center pt-3 pb-1">
                                                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                                            </div>

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
                                                            {/* Circle Background */}
                                                            <div className={`absolute inset-0 rounded-full opacity-20 ${isActive ? 'bg-indigo-500' : 'bg-gray-100'}`}></div>

                                                            {/* Asset */}
                                                            <div className="relative z-10 drop-shadow-sm">
                                                                {asset.emoji}
                                                            </div>

                                                            {/* Active Ring */}
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
                                                <button
                                                    onClick={() => setIsStampModalOpen(false)}
                                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-colors active:scale-95"
                                                >
                                                    Close
                                                </button>
                                            </div>

                                        </div>
                                    </div>,
                                    document.body
                                );
                            })()
                        )}

                        {upNextRoutine.type === 'one-time' ? (
                            <button
                                onClick={() => setConfirmTask(upNextRoutine)}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" strokeWidth={3} />
                                Mark Complete
                            </button>
                        ) : (
                            <Link href={`/child/routine?id=${upNextRoutine.id}`} className="block">
                                <button className="w-full bg-[#FF9F1C] hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Play className="w-5 h-5 fill-current" />
                                    START TASK
                                </button>
                            </Link>
                        )}

                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 bg-white rounded-[2rem] shadow-sm">
                        <p className="font-bold">✨ All caught up!</p>
                        <p className="text-xs mt-1">Great job!</p>
                    </div>
                )}
            </div>

            {/* Assigned Tasks */}
            <div className="px-6 mb-24">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-purple-100 rounded-full text-purple-500">
                        <Clock className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Assigned Tasks ({assignedTasks.length})</h2>
                </div>

                <div className="space-y-4">
                    {assignedTasks.length === 0 && <p className="text-slate-400 text-sm text-center">All caught up!</p>}

                    {assignedTasks.map((task, i) => {
                        const status = getTaskStatus(task);
                        const isExpanded = expandedTaskId === task.id;

                        return (
                            <div key={task.id} className="block relative group">
                                <div
                                    onClick={() => toggleExpand(task.id)}
                                    className={`relative z-10 bg-white rounded-3xl p-4 shadow-[0_10px_20px_rgba(0,0,0,0.05)] flex items-center gap-4 border transition-all cursor-pointer ${status === 'overdue' ? 'border-red-100 bg-red-50/10' :
                                        status === 'completed' ? 'border-green-100 opacity-60' :
                                            isExpanded ? 'border-blue-200 ring-4 ring-blue-50' :
                                                i % 2 === 0 ? 'border-blue-50' : 'border-red-50'
                                        }`}
                                >
                                    <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${status === 'completed'
                                        ? 'rounded-xl bg-green-100 text-green-500'
                                        : 'bg-gray-50 rounded-2xl'
                                        }`}>
                                        {status === 'completed'
                                            ? <Check className="w-6 h-6" />
                                            : <RenderIcon name={task.icon} className="w-12 h-12 text-4xl" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-lg truncate ${status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {status === 'overdue' && (
                                                <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">
                                                    Overdue
                                                </span>
                                            )}
                                            {status === 'completed' && (
                                                <span className="text-[10px] font-bold text-green-500 bg-green-100 px-2 py-0.5 rounded">
                                                    Completed
                                                </span>
                                            )}
                                            {!status && (
                                                <div className="flex items-center gap-1 text-gray-400 font-bold text-xs bg-gray-50 px-2 py-0.5 rounded-md">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{task.timeOfDay}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        {status !== 'completed' && (
                                            <div className="flex items-center gap-1 text-yellow-600 font-bold text-xs bg-yellow-50 px-2 py-1 rounded-md mb-1">
                                                <span>⭐ +{task.steps?.reduce((a: number, b: any) => a + (b.stars || 0), 0) || 0}</span>
                                            </div>
                                        )}

                                        {status !== 'completed' && (
                                            <div className="text-gray-300">
                                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && status !== 'completed' && (
                                    <div className="mx-4 bg-white/50 border-x border-b border-blue-100 rounded-b-3xl p-4 pt-6 -mt-4 animate-in slide-in-from-top-2 flex flex-col gap-4">
                                        {/* Steps Preview */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                            {task.steps?.map((step: any, i: number) => (
                                                <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-blue-50">
                                                    <span className="text-xl">{step.icon === '⚡' ? '⚡' : <RenderIcon name={step.icon} className="w-5 h-5" />}</span>
                                                    <span className="text-xs font-bold text-gray-600">{step.title}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {task.type === 'one-time' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuickComplete(task);
                                                    }}
                                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Check className="w-5 h-5" strokeWidth={3} />
                                                    Done
                                                </button>
                                            ) : (
                                                <Link href={`/child/routine?id=${task.id}`} className="flex-1 block">
                                                    <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                        <Play className="w-5 h-5 fill-current" />
                                                        Start Routine
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
