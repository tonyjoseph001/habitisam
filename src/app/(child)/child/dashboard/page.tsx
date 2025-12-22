"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ChevronDown, Rocket, Star, Lock, Home, Gift, CheckSquare, List, Play, Clock, Bell, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { differenceInMinutes, parse, format, isPast, isToday, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

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
    const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

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

        return { routines: myRoutines, logs: myLogs };
    }, [activeProfile?.id]);

    const routines = data?.routines || [];
    const logs = data?.logs || [];
    const completedTaskIds = new Set(logs.filter(l => l.status === 'completed').map(l => l.activityId));

    // Stamp Selection Handler
    const handleSelectStamp = async (stampId: string) => {
        if (!activeProfile) return;
        await db.profiles.update(activeProfile.id, { activeStamp: stampId });
        setIsStampModalOpen(false);
    };

    // Helper: Filter Routines for a specific date
    const getRoutinesForDate = (allRoutines: any[], date: Date) => {
        const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
        return allRoutines.filter(r => {
            if (r.type === 'recurring') return r.days?.includes(dayOfWeek);
            if (r.type === 'one-time' && r.date) return isSameDay(new Date(r.date), date);
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
            if (completedTaskIds.has(r.id)) return false;
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
    }, [todayRoutines, tomorrowRoutines, completedTaskIds]);

    const upNextRoutine = upNextContext?.routine;
    const isTomorrow = upNextContext?.isTomorrow;

    // Assigned Tasks: All TODAY routines that are NOT the upcoming one (if upcoming is today)
    // If upcoming is Tomorrow, then Assigned Tasks should be ALL of Today's routines (Overdue/Completed/Past-Uncompleted).
    const assignedTasks = React.useMemo(() => {
        if (isTomorrow) return todayRoutines; // Show all today tasks in list
        return todayRoutines.filter(r => r.id !== upNextRoutine?.id);
    }, [todayRoutines, upNextRoutine, isTomorrow]);

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
                if (hours > 0) {
                    text = `Starts in ${hours}h ${mins}m`;
                } else {
                    text = `Starts in ${diffMins}m`;
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

            {/* Header (HTML Match) */}
            <div className="px-6 pt-8 pb-4 flex justify-between items-center">
                {/* Profile Switcher Trigger */}
                <button
                    onClick={() => setIsProfileSwitcherOpen(true)}
                    className="flex items-center gap-3 bg-white pl-1 pr-4 py-1 rounded-full shadow-sm active:scale-95 transition-transform"
                >
                    <div className="w-10 h-10 rounded-full bg-yellow-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-inset ring-black/5">
                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-gray-400 leading-none">Playing as</div>
                        <div className="text-sm font-bold text-gray-800 leading-none">{displayProfile.name}</div>
                    </div>
                </button>

                <div className="flex items-center gap-3">
                    <button className="bg-white p-2.5 rounded-full shadow-sm text-gray-500 relative">
                        <Bell className="w-6 h-6" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
                    </button>
                    {/* Currency / Stats */}
                    <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                        <span className="text-sm font-bold text-gray-700 font-mono">1,250</span>
                    </div>
                </div>
            </div>

            {/* Profile Switcher Modal */}
            <ProfileSwitcherModal
                isOpen={isProfileSwitcherOpen}
                onClose={() => setIsProfileSwitcherOpen(false)}
            />

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
                        <span className="text-xl">🎖️</span>
                        <span>Level 2: {activeStampId.charAt(0).toUpperCase() + activeStampId.slice(1)}</span>
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

                        {/* Steps */}
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
                        <Link href={`/child/routine?id=${upNextRoutine.id}`} className="block">
                            <button className="w-full bg-[#FF9F1C] hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Play className="w-5 h-5 fill-current" />
                                START TASK
                            </button>
                        </Link>

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

                        return (
                            <Link href={`/child/routine?id=${task.id}`} key={task.id} className="block">
                                <div className={`bg-white rounded-3xl p-4 shadow-[0_10px_20px_rgba(0,0,0,0.05)] flex items-center gap-4 border ${status === 'overdue' ? 'border-red-100 bg-red-50/10' :
                                    status === 'completed' ? 'border-green-100 opacity-60' :
                                        i % 2 === 0 ? 'border-blue-50' : 'border-red-50'
                                    }`}>
                                    <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 ${status === 'completed'
                                        ? 'rounded-xl bg-green-100 text-green-500'
                                        : ''
                                        }`}>
                                        {status === 'completed'
                                            ? <Check className="w-6 h-6" />
                                            : <RenderIcon name={task.icon} className="w-12 h-12 text-4xl" />
                                        }
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-lg ${status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h4>
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
                                            <p className="text-xs font-bold text-gray-400">{task.steps.length} steps</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1 text-gray-500 font-bold text-xs bg-gray-50 px-2 py-1 rounded-md">
                                            <span>{task.timeOfDay}</span>
                                        </div>
                                        {status !== 'completed' && (
                                            <div className="flex items-center gap-1 text-yellow-600 font-bold text-xs bg-yellow-50 px-2 py-1 rounded-md">
                                                <span>⭐ +{task.steps?.reduce((a: number, b: any) => a + (b.stars || 0), 0) || 0}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
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
