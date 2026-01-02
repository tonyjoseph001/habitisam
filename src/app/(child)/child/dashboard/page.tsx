"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
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

import { useRoutines } from '@/lib/hooks/useRoutines';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { useInbox } from '@/lib/hooks/useInbox';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { LogService } from '@/lib/firestore/logs.service';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { InboxService } from '@/lib/firestore/inbox.service';
import { ActivityLog } from '@/lib/db';

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
    const [processingRewards, setProcessingRewards] = useState<Set<string>>(new Set());
    const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

    // Streak State
    const [streakLogs, setStreakLogs] = useState<ActivityLog[]>([]);

    // Firestore Hooks
    // Firestore Hooks
    const { routines: fetchedRoutines } = useRoutines();

    // Fix: Filter routines to only show those assigned to the current child
    const routines = useMemo(() => {
        if (!fetchedRoutines || !activeProfile?.id) return [];
        return fetchedRoutines.filter(r => r.profileIds?.includes(activeProfile.id));
    }, [fetchedRoutines, activeProfile?.id]);

    // Fix: Pass string date YYYY-MM-DD (Local Time)
    const { logs } = useActivityLogs(activeProfile?.id, format(new Date(), 'yyyy-MM-dd'));

    // Fix: Destructure correct property and Filter
    const { inboxItems } = useInbox(activeProfile?.id);
    const inboxRewards = useMemo(() => inboxItems.filter((i: any) => !i.status || i.status === 'pending'), [inboxItems]);

    // Derived Rewards from logs (Manual Rewards)
    const rewards = useMemo(() => {
        return logs.filter(l => l.activityId === 'manual_reward');
    }, [logs]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch Full History for Streak Calculation
    useEffect(() => {
        async function fetchHistory() {
            if (activeProfile?.id) {
                // Optimization: In real app, calculate streak on backend or store in profile
                // For now, fetch all logs for profile to calculate accurately
                const allLogs = await LogService.getByProfileId(activeProfile.id);
                setStreakLogs(allLogs.filter(l => l.status === 'completed'));
            }
        }
        fetchHistory();
    }, [activeProfile?.id]);

    // Calulate Streak
    const currentStreak = React.useMemo(() => {
        if (!streakLogs.length) return 0;

        const uniqueDates = Array.from(new Set(streakLogs.map(l => format(new Date(l.date), 'yyyy-MM-dd')))).sort();
        if (uniqueDates.length === 0) return 0;

        const todayStr = format(new Date(), 'yyyy-MM-dd');

        let streak = 0;
        let checkDate = new Date();
        let checkStr = format(checkDate, 'yyyy-MM-dd');

        const dateSet = new Set(uniqueDates);

        // If today is not done, check if yesterday was done to keep streak alive
        if (!dateSet.has(todayStr)) {
            checkDate = addDays(checkDate, -1);
            checkStr = format(checkDate, 'yyyy-MM-dd');
            if (!dateSet.has(checkStr)) return 0;
        }

        while (dateSet.has(checkStr)) {
            streak++;
            checkDate = addDays(checkDate, -1);
            checkStr = format(checkDate, 'yyyy-MM-dd');
        }

        return streak;
    }, [streakLogs]);

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

    // Data for processed tasks (completed OR missed OR processing)
    const processedTaskIds = useMemo(() => {
        const ids = new Set(logs.filter(l => l.status === 'completed' || l.status === 'missed').map(l => l.activityId));
        processingTasks.forEach(id => ids.add(id));
        return ids;
    }, [logs, processingTasks]);

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
    const getTaskStatus = (task: any): 'completed' | 'locked' | 'active' | 'expired' | 'overdue' | 'missed' => {
        if (processingTasks.has(task.id)) return 'completed'; // FIX: Optimistic UI (Hide button immediately)
        if (completedTaskIds.has(task.id)) return 'completed';
        if (processedTaskIds.has(task.id)) return 'missed';

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
            // FIX: One-time tasks (Quick Tasks) are "Due By", so they should be unlocked immediately
            if (task.type !== 'one-time' && task.type !== 'quick-task' && isBefore(now, unlockTime)) return 'locked';

            // 2. Check Expiration (Too Late)
            if (task.expires === 'End of Day') {
                if (isAfter(now, endOfDay(taskTime))) return 'expired';
            } else if (expireMinutes !== null) {
                const expirationTime = addMinutes(taskTime, expireMinutes);
                if (isAfter(now, expirationTime)) return 'expired';
            } else if (task.type === 'one-time' || task.type === 'quick-task') {
                // For one-time tasks without explicit expires, the timeOfDay IS the expiry
                if (isAfter(now, taskTime)) return 'expired';
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
                // Only for one-time tasks assigned for today (Quick Tasks)
                if ((r.type === 'one-time' || r.type === 'quick-task') && r.date === todayStr && !processedTaskIds.has(r.id)) {
                    if (r.timeOfDay) {
                        try {
                            const dueTime = parse(r.timeOfDay, 'HH:mm', now);
                            // If passed by more than 0 minute (immediate expiry), mark as missed
                            if (isAfter(now, dueTime)) {
                                console.log('Marking task as missed:', r.title);
                                await LogService.add({
                                    id: `${r.id}_${activeProfile.id}_${todayStr}`, // Deterministic ID for recovery
                                    accountId: activeProfile.accountId,
                                    activityId: r.id,
                                    profileId: activeProfile.id,
                                    date: todayStr, // Local YYYY-MM-DD
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
        console.log("Quick Complete Triggered:", { taskId: task.id, title: task.title });
        if (!activeProfile || processingTasks.has(task.id)) {
            console.log("Blocked: No Profile or Already Processing", { activeProfile, processing: processingTasks.has(task.id) });
            return;
        }

        setProcessingTasks(prev => new Set(prev).add(task.id));

        try {
            const points = task.steps?.reduce((acc: number, s: any) => acc + (s.stars || 0), 0) || 0;
            const dateStr = format(new Date(), 'yyyy-MM-dd'); // Local Time
            const logId = `${task.id}_${activeProfile.id}_${dateStr}`;

            console.log("Generating Log:", { logId, dateStr, accountId: activeProfile.accountId });

            // 1. Add Log with Deterministic ID for Idempotency
            await LogService.add({
                id: logId, // Unique per task-user-day
                accountId: activeProfile.accountId,
                activityId: task.id,
                profileId: activeProfile.id,
                date: dateStr, // FIX: Use YYYY-MM-DD to match query
                completedAt: new Date(), // Store precise time here
                status: 'completed',
                starsEarned: points,
                stepsCompleted: task.steps?.length || 1
            });

            // 2. Add Stars
            await ProfileService.update(activeProfile.id, {
                stars: (activeProfile.stars || 0) + points
            });

            // 3. Feedback
            toast.success("Task Complete!", {
                description: `You earned ${points} stars!`,
                icon: '🌟'
            });

            // Close expand if open
            setExpandedTaskId(null);

            // Note: We leave it in processingTasks so it stays hidden/optimistic until real log arrives

        } catch (error) {
            console.error(error);
            toast.error("Failed to complete task");
            setProcessingTasks(prev => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
        }
    };

    // Stamp Selection Handler
    const handleSelectStamp = async (stampId: string) => {
        if (!activeProfile) return;
        await ProfileService.update(activeProfile.id, { activeStamp: stampId });
        setIsStampModalOpen(false);
    };

    // Claim Reward Handler
    const handleClaimReward = async (reward: any) => {
        if (!activeProfile || processingRewards.has(reward.id)) return;

        setProcessingRewards(prev => new Set(prev).add(reward.id));

        try {
            // 1. Mark as Claimed
            await InboxService.update(reward.id, {
                status: 'claimed',
                claimedAt: new Date()
            });

            // 2. Add Stars
            await ProfileService.update(activeProfile.id, {
                stars: (activeProfile.stars || 0) + reward.amount
            });

            // 3. Log Activity
            await LogService.add({
                // CRITICAL: Use Reward ID as Log ID to prevent duplicates (Idempotency)
                id: reward.id,
                accountId: activeProfile.accountId,
                profileId: activeProfile.id,
                activityId: 'manual_reward',
                date: new Date().toISOString(),
                status: 'completed',
                starsEarned: reward.amount,
                metadata: {
                    reason: reward.message || "Reward Claimed",
                    type: "manual_award"
                }
            });

            // 3. Animation/Toast
            toast.success("Reward Claimed!", {
                description: `You got ${reward.amount} Stars!`,
                icon: '🎁',
                duration: 4000
            });
            // Don't remove from processing immediately, let it disappear from the list naturally via filter
        } catch (e) {
            console.error("Claim error", e);
            setProcessingRewards(prev => {
                const next = new Set(prev);
                next.delete(reward.id);
                return next;
            });
        }
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
            if ((r.type === 'one-time' || r.type === 'quick-task') && r.date) return r.date === dateStr;
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

        return null;
    }, [todayRoutines, processedTaskIds]);

    const upNextRoutine = upNextContext?.routine;
    const isTomorrow = upNextContext?.isTomorrow;

    // Assigned Tasks: All TODAY routines that are NOT the upcoming one
    const assignedTasks = React.useMemo(() => {
        // Assign global index to ALL today's routines first for consistent coloring
        const allWithIndex = todayRoutines.map((t, i) => ({ ...t, _globalIndex: i }));

        if (isTomorrow) return allWithIndex; // Show all today tasks in list
        return allWithIndex.filter(r => r.id !== upNextRoutine?.id);
    }, [todayRoutines, upNextRoutine, isTomorrow]);

    // Grouping Logic for Assigned Tasks
    const groupedAssignedTasks = React.useMemo(() => {
        const groups = {
            Morning: [] as any[],
            Afternoon: [] as any[],
            Evening: [] as any[]
        };

        assignedTasks.forEach(task => {
            const hour = parseInt(task.timeOfDay?.split(':')[0] || '0');
            if (hour < 12) groups.Morning.push(task);
            else if (hour < 17) groups.Afternoon.push(task);
            else groups.Evening.push(task);
        });

        return groups;
    }, [assignedTasks]);

    // Palette Definition
    const TASK_PALETTE = [
        '#ff595e', // Vibrant Coral
        '#7a6563', // Warm Taupe
        '#018e42', // Emerald Green
        '#1982c4', // Steel Blue
        '#6a4c93', // Dusty Grape
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
                const label = (upNextRoutine.type === 'one-time' || upNextRoutine.type === 'quick-task') ? 'Ends in' : 'Starts in';
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

    // Sync activeProfile with latest data
    const { profiles } = useProfiles();
    const displayProfile = useMemo(() => profiles.find(p => p.id === activeProfile?.id) || activeProfile, [profiles, activeProfile]);

    if (!displayProfile) return null;
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
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#EEF2FF]">
            <div className="flex-none z-50 bg-[#EEF2FF]">
                <div className="w-full max-w-5xl mx-auto">
                    <ChildHeader />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto w-full pt-4">
                <main className="w-full max-w-5xl mx-auto pb-32">

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

                    {/* NEW STATS SECTION - Custom Design */}
                    {/* NEW STATS SECTION - Custom Design */}
                    <div className="px-6 mb-8 w-full">
                        <div
                            className="w-full rounded-[28px] p-6 text-white relative overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.25)] flex flex-col gap-6"
                            style={{
                                backgroundImage: 'url("/assets/card-bg.png")',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                minHeight: '220px'
                            }}
                        >
                            {/* Top Row: Title & Count */}
                            <div>
                                <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide opacity-95">
                                    <span>🚀</span> <span>TODAY'S MISSION</span>
                                </div>
                                <div className="mt-3">
                                    {Math.max(0, todayRoutines.length - todayRoutines.filter(r => processedTaskIds.has(r.id)).length) === 0 ? (
                                        <span className="text-4xl font-extrabold">All Done!</span>
                                    ) : (
                                        <div className="flex flex-row items-baseline gap-2">
                                            <span className="text-6xl font-extrabold leading-none tracking-tight">
                                                {Math.max(0, todayRoutines.length - todayRoutines.filter(r => processedTaskIds.has(r.id)).length)}
                                            </span>
                                            <span className="text-xl font-bold opacity-90">Tasks Left</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Middle Section: Progress Bar */}
                            <div className="w-full">
                                <div className="flex justify-between text-xs font-semibold opacity-90 mb-2">
                                    <span>DAILY PROGRESS</span>
                                    <span>{Math.round((todayRoutines.length > 0 ? (todayRoutines.filter(r => processedTaskIds.has(r.id)).length / todayRoutines.length) * 100 : 0))}%</span>
                                </div>
                                <div className="h-3 rounded-full bg-black/25 overflow-hidden backdrop-blur-sm">
                                    <div
                                        className="h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.4)] transition-all duration-1000 ease-out"
                                        style={{ width: `${todayRoutines.length > 0 ? (todayRoutines.filter(r => processedTaskIds.has(r.id)).length / todayRoutines.length) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Bottom Row: Stats (Below Progress Bar) */}
                            <div className="flex gap-3">
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[15px] font-bold bg-white/20 backdrop-blur-md border border-white/10 shadow-sm flex-1 justify-center">
                                    <span className="drop-shadow-sm">⭐</span> <span>{displayProfile.stars?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[15px] font-bold bg-white/20 backdrop-blur-md border border-white/10 shadow-sm flex-1 justify-center">
                                    <span className="drop-shadow-sm">🔥</span> <span>{currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Responsive Grid layout for Main Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 pb-24">

                        {/* LEFT COLUMN: UPCOMING TASK */}
                        <div className="flex flex-col h-full">
                            {/* PENDING REWARDS STACK (New - Compact) */}
                            {inboxRewards.length > 0 && (
                                <div className="mb-6 relative w-full h-auto min-h-[100px]">
                                    <AnimatePresence>
                                        {inboxRewards.map((reward: any, index: number) => {
                                            // Show max 3 cards visually
                                            if (index > 2) return null;

                                            return (
                                                <motion.div
                                                    key={reward.id}
                                                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                                    animate={{
                                                        scale: 1 - (index * 0.03),
                                                        y: index * 4, // Tighter stack
                                                        zIndex: 30 - index,
                                                        opacity: 1
                                                    }}
                                                    exit={{ scale: 1.1, opacity: 0, x: 100 }}
                                                    className="absolute inset-x-0 bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-4 shadow-lg shadow-pink-200 text-white flex items-center gap-4 border border-white/20"
                                                    style={{ top: 0 }}
                                                >
                                                    {/* Icon */}
                                                    <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm border border-white/10 shrink-0">
                                                        <Gift className="w-6 h-6 text-white" />
                                                    </div>

                                                    {/* Text */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-lg leading-tight">
                                                            {reward.senderName ? `Gift from ${reward.senderName}!` : "Gift!"}
                                                        </h3>
                                                        <p className="text-pink-100 text-xs font-medium truncate">
                                                            {reward.message || "Good job!"}
                                                        </p>
                                                    </div>

                                                    {/* Action */}
                                                    <button
                                                        onClick={() => handleClaimReward(reward)}
                                                        disabled={processingRewards.has(reward.id)}
                                                        className={`bg-white text-pink-600 font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-pink-50 active:scale-95 transition-all text-sm shrink-0 flex items-center gap-1 ${processingRewards.has(reward.id) ? 'opacity-50 cursor-wait' : ''}`}
                                                    >
                                                        {processingRewards.has(reward.id) ? (
                                                            <Icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (reward.amount > 0 ? (
                                                            <Star className="w-3.5 h-3.5 fill-pink-600" />
                                                        ) : (
                                                            <Icons.Check className="w-3.5 h-3.5" />
                                                        ))}
                                                        <span>{processingRewards.has(reward.id) ? 'Claiming...' : (reward.amount > 0 ? `Claim ${reward.amount}` : "Got it!")}</span>
                                                    </button>

                                                    {/* Stack Indicator */}
                                                    {inboxRewards.length > 1 && index === 0 && (
                                                        <div className="absolute -top-2 -right-2 bg-rose-600 text-white border-2 border-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
                                                            +{inboxRewards.length - 1}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}




                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-blue-100 rounded-full text-blue-500">
                                    <Bell className="w-4 h-4 fill-current" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800">Upcoming Task</h2>
                            </div>

                            {upNextRoutine ? (() => {
                                const idx = todayRoutines.findIndex(r => r.id === upNextRoutine.id);
                                const i = idx !== -1 ? idx : 0;
                                const paletteColor = TASK_PALETTE[i % TASK_PALETTE.length];

                                return (
                                    <div
                                        className="rounded-[2rem] p-4 shadow-lg shadow-indigo-200/50 relative overflow-hidden group text-white transition-all"
                                        style={{ background: paletteColor }}
                                    >
                                        {/* Glossy Overlay matches list cards */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                                        {/* Timer Badge (Absolute Left - Relative) */}
                                        <div className="absolute top-3 left-3 z-10">
                                            <div className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold border border-white/20 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{timeStatus?.text}</span>
                                            </div>
                                        </div>

                                        {/* Timer Badge (Absolute Right - Actual Time) */}
                                        <div className="absolute top-3 right-3 z-10">
                                            <div className="font-bold text-orange-300 text-xs">
                                                {timeStatus?.formatted}
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mb-3 mt-10">
                                            <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/10 text-white shadow-sm">
                                                <RenderIcon name={upNextRoutine.icon} className="w-7 h-7 text-white" />
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="font-black text-white text-lg leading-tight w-3/4">{upNextRoutine.title}</h3>

                                                <div className="flex items-center gap-3 mt-2 text-indigo-100 font-bold text-xs uppercase tracking-wide">
                                                    <div className="flex items-center gap-1">
                                                        <Timer className="w-3 h-3" />
                                                        <span>{upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)}m</span>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>

                                        {/* Steps - Only for Routine */}
                                        {upNextRoutine.type !== 'one-time' && upNextRoutine.type !== 'quick-task' && (
                                            <div className="mb-5">
                                                <div className="flex items-center gap-2 bg-black/10 p-2 rounded-xl overflow-x-auto scrollbar-hide backdrop-blur-[2px]">
                                                    {upNextRoutine.steps.slice(0, 3).map((step: any, i: number) => (
                                                        <React.Fragment key={step.id || i}>
                                                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white border border-white/10 shadow-sm flex-shrink-0">
                                                                <RenderIcon name={step.icon} className="w-4 h-4" />
                                                            </div>
                                                            {i < Math.min(upNextRoutine.steps.length, 3) - 1 && (
                                                                <div className="text-indigo-200/50 text-[10px]">➜</div>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                    {upNextRoutine.steps.length > 3 && (
                                                        <div className="ml-auto text-xs font-bold text-indigo-200 pl-2">+{upNextRoutine.steps.length - 3}</div>
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
                                                    <button disabled className="w-full bg-black/20 text-white/50 font-bold py-3 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur-sm border border-white/5">
                                                        <Lock className="w-5 h-5" />
                                                        Locked until {format(addMinutes(parse(upNextRoutine.timeOfDay, 'HH:mm', new Date()), -getFlexWindowMinutes(upNextRoutine.flexWindow)), 'h:mm a')}
                                                    </button>
                                                );
                                            }
                                            if (upNextRoutine.type === 'one-time' || upNextRoutine.type === 'quick-task') {
                                                return (
                                                    <button onClick={() => setConfirmTask(upNextRoutine)} className="w-full bg-white text-green-600 font-bold py-3 rounded-2xl shadow-lg shadow-green-900/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                        <Check className="w-5 h-5" strokeWidth={3} />
                                                        Mark Complete
                                                    </button>
                                                );
                                            }
                                            return (
                                                <Link href={`/child/routine?id=${upNextRoutine.id}`} className="block">
                                                    <button className="w-full bg-white text-indigo-600 font-extrabold py-3 rounded-2xl shadow-lg shadow-indigo-900/10 hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                        <Play className="w-5 h-5 fill-current" />
                                                        Start
                                                    </button>
                                                </Link>
                                            );
                                        })()}

                                    </div>
                                );
                            })() : (
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
                                <h2 className="text-lg font-bold text-gray-800">Today's Tasks ({assignedTasks.length})</h2>
                            </div>

                            <div className="space-y-6">
                                {assignedTasks.length === 0 && <p className="text-slate-400 text-sm text-center">All caught up!</p>}

                                {/* RENDER GROUPS (Morning, Afternoon, Evening) */}
                                {[
                                    { id: 'Morning', label: 'Morning', icon: Sun, color: 'text-orange-500', gradient: 'bg-gradient-to-r from-orange-400 to-rose-400', tasks: groupedAssignedTasks.Morning },
                                    { id: 'Afternoon', label: 'Afternoon', icon: Sunset, color: 'text-blue-500', gradient: 'bg-gradient-to-r from-cyan-400 to-blue-500', tasks: groupedAssignedTasks.Afternoon },
                                    { id: 'Evening', label: 'Evening', icon: Moon, color: 'text-indigo-500', gradient: 'bg-gradient-to-r from-indigo-500 to-violet-500', tasks: groupedAssignedTasks.Evening },
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
                                                    const i = task._globalIndex;
                                                    const status = getTaskStatus(task);
                                                    const isExpanded = expandedTaskId === task.id;

                                                    // Restore User Palette Logic
                                                    const isCompleted = status === 'completed';
                                                    const isMissed = status === 'missed';
                                                    const paletteColor = TASK_PALETTE[i % TASK_PALETTE.length];

                                                    // Dynamic Styles based on status
                                                    const cardStyle = (isCompleted || isMissed)
                                                        ? { background: '#f1f5f9' } // slate-100 for completed/missed
                                                        : { background: paletteColor };

                                                    const totalDuration = task.steps?.reduce((acc: number, step: any) => acc + (step.duration || 0), 0) || 0;

                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className={`block relative group rounded-3xl shadow-sm transition-all overflow-hidden ${(isCompleted || isMissed) ? 'opacity-70 grayscale-[0.8]' : ''}`}
                                                            style={cardStyle}
                                                        >
                                                            {/* Glossy Overlay (Gradient) to give it the "Style" without changing color code */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                                                            {/* Status Badge */}
                                                            {status === 'active' && <div className="absolute top-0 right-0 bg-white/20 backdrop-blur-md text-white border-l border-b border-white/10 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20 shadow-sm drop-shadow-sm">ACTIVE</div>}
                                                            {status === 'overdue' && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20 shadow-sm">OVERDUE</div>}
                                                            {status === 'locked' && <div className="absolute top-0 right-0 bg-black/20 text-white/60 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">LOCKED</div>}
                                                            {(status === 'expired' || status === 'missed') && <div className="absolute top-0 right-0 bg-red-500/80 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">MISSED</div>}
                                                            {status === 'completed' && <div className="absolute top-0 right-0 bg-emerald-600/10 text-emerald-700 text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl z-20">COMPLETED</div>}

                                                            <div
                                                                onClick={() => toggleExpand(task.id)}
                                                                className="relative z-10 p-4 flex items-center gap-4 cursor-pointer"
                                                            >
                                                                {/* Icon - Darkened Glass for contrast on light BG */}
                                                                <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 rounded-2xl backdrop-blur-sm shadow-sm ${isCompleted ? 'bg-emerald-600/20 border border-emerald-600/10' : 'bg-white/20 border border-white/10'}`}>
                                                                    {status === 'completed'
                                                                        ? <Check className="w-6 h-6 text-emerald-700" strokeWidth={4} />
                                                                        : <RenderIcon name={task.icon} className="w-6 h-6 text-white drop-shadow-md" />
                                                                    }
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className={`font-bold text-base leading-tight line-clamp-2 drop-shadow-md ${isCompleted ? 'text-emerald-900 line-through decoration-emerald-900/40' : 'text-white'}`}>{task.title}</h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        {isCompleted ? (
                                                                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs bg-emerald-600/10 px-2 py-1 rounded-lg">
                                                                                <Check className="w-3 h-3" />
                                                                                <span>Done {(() => {
                                                                                    const log = completedLogMap.get(task.id);
                                                                                    return log ? format(new Date(log.date), 'h:mm a') : 'today';
                                                                                })()}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex items-center gap-1.5 text-white/90 font-bold text-xs bg-white/20 px-2 py-1 rounded-lg border border-white/10 shadow-sm">
                                                                                    <Clock className="w-3 h-3 drop-shadow-sm" />
                                                                                    <span className="drop-shadow-sm">{format(parse(task.timeOfDay, 'HH:mm', new Date()), 'h:mm a')}</span>
                                                                                </div>
                                                                                {totalDuration > 0 && (
                                                                                    <div className="flex items-center gap-1.5 text-white/90 font-bold text-xs bg-white/20 px-2 py-1 rounded-lg border border-white/10 shadow-sm">
                                                                                        <Timer className="w-3 h-3 drop-shadow-sm" />
                                                                                        <span className="drop-shadow-sm">{totalDuration}m</span>
                                                                                    </div>
                                                                                )}

                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Expand Chevron */}
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {status !== 'completed' && (
                                                                        <div className="text-white/70 drop-shadow-md">
                                                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Expanded Content */}
                                                            {isExpanded && status !== 'completed' && (
                                                                <div className={`px-4 pb-4 pt-2 animate-in slide-in-from-top-1 flex flex-col gap-4 relative z-10`}>
                                                                    {/* Description */}
                                                                    {task.description && (
                                                                        <div className="bg-white/10 border border-white/5 p-3 rounded-xl backdrop-blur-sm">
                                                                            <p className="text-white/90 text-sm font-medium leading-relaxed">
                                                                                {task.description}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Steps Preview */}
                                                                    <div className="space-y-2">
                                                                        {task.steps?.map((step: any, n: number) => (
                                                                            <div key={n} className={`flex items-center gap-3 bg-white/10 border border-white/5 p-2 rounded-xl text-sm shadow-sm backdrop-blur-[2px]`}>
                                                                                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold text-white bg-white/20 flex-shrink-0`}>
                                                                                    {n + 1}
                                                                                </div>
                                                                                <span className="flex-1 text-white font-medium truncate">{step.title}</span>

                                                                                {step.duration > 0 && (
                                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-white/80 bg-white/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                                                                        <Timer className="w-3 h-3" /> {step.duration}m
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex gap-2">
                                                                        {status === 'locked' ? (
                                                                            <button disabled className="w-full bg-black/20 text-white/50 font-bold py-3 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 backdrop-blur-sm border border-white/5">
                                                                                <Lock className="w-4 h-4" />
                                                                                Locked until {format(addMinutes(parse(task.timeOfDay, 'HH:mm', new Date()), -getFlexWindowMinutes(task.flexWindow)), 'h:mm a')}
                                                                            </button>
                                                                        ) : (task.type === 'one-time' || task.type === 'quick-task') ? (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleQuickComplete(task);
                                                                                }}
                                                                                className="flex-1 bg-white text-green-600 font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                                Complete
                                                                            </button>
                                                                        ) : (
                                                                            <Link href={`/child/routine?id=${task.id}`} className="flex-1 block">
                                                                                <button className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
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
            </div>
        </div>
    );
}
