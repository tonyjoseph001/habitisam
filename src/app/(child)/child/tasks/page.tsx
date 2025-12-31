"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChildHeader from '@/components/child/ChildHeader';
import { ChevronLeft, Gift, CheckSquare, Clock, Home, Check, Play, Sun, Moon, BookOpen, Utensils, BedDouble, Brush, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isSameDay, parse, addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { cn } from '@/lib/utils';

// Simple Icon Mapper
const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
    if (!name) return <Sparkles className={className} />;

    const icons: Record<string, React.FC<any>> = {
        'Sun': Sun,
        'Moon': Moon,
        'Book': BookOpen,
        'BookOpen': BookOpen,
        'Utensils': Utensils,
        'Bed': BedDouble,
        'BedDouble': BedDouble,
        'Brush': Brush,
        'Clock': Clock,
        'Check': Check,
        'Play': Play,
    };

    const IconComponent = icons[name] || icons[Object.keys(icons).find(k => k.toLowerCase() === name.toLowerCase()) || ''] || Sparkles;

    if (/\p{Emoji}/u.test(name)) {
        return <span className={cn("text-2xl", className)}>{name}</span>;
    }

    return <IconComponent className={className} />;
};

const TIME_PALETTES = {
    morning: { bg: '#ff9f1c', light: '#fff4e6', dark: '#e68a00' },
    afternoon: { bg: '#1982c4', light: '#d6eaf8', dark: '#1668a0' },
    evening: { bg: '#6a4c93', light: '#e8dff5', dark: '#563d7c' },
    any_time: { bg: '#8ac926', light: '#e8f5d6', dark: '#7ab51d' }
};

export default function ChildTasksPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [mounted, setMounted] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const { routines: allRoutines } = useRoutines();
    const { logs: allLogs } = useActivityLogs(activeProfile?.id);

    useEffect(() => {
        setMounted(true);
    }, []);

    const calendarDays = useMemo(() => {
        const today = new Date();
        const start = addDays(today, -2);
        return Array.from({ length: 5 }, (_, i) => {
            const d = addDays(start, i);
            return {
                dayObj: d,
                dayLabel: format(d, 'EEE').toUpperCase(),
                dateLabel: format(d, 'd'),
                isToday: isSameDay(d, today),
                isSelected: isSameDay(d, selectedDate)
            };
        });
    }, [selectedDate]);

    const data = useMemo(() => {
        if (!activeProfile || !allRoutines || !allLogs) return { routines: [], logs: [], rewards: [] };

        const myRoutines = allRoutines.filter(r =>
            !r.profileIds ||
            r.profileIds.length === 0 ||
            r.profileIds.includes(activeProfile.id)
        );

        const dateLogs = allLogs.filter(log => {
            const logDate = log.date instanceof Date ? log.date : new Date(log.date);
            return isSameDay(logDate, selectedDate);
        });

        const rewards = dateLogs.filter(l => l.activityId === 'manual_reward');
        const taskLogs = dateLogs.filter(l => l.activityId !== 'manual_reward');

        return { routines: myRoutines, logs: taskLogs, rewards };
    }, [activeProfile, allRoutines, allLogs, selectedDate]);

    if (!mounted || !activeProfile || !data) return null;

    const { routines, logs, rewards } = data;

    const completedTaskIds = new Set(logs.filter(l => l.status === 'completed').map(l => l.activityId));
    const completedCount = completedTaskIds.size + (rewards?.length || 0);

    const getTimeCategory = (timeStr?: string) => {
        if (!timeStr) return 'any_time';
        if (['morning', 'afternoon', 'evening', 'any_time'].includes(timeStr)) return timeStr;

        const [hours] = timeStr.split(':').map(Number);
        if (isNaN(hours)) return 'any_time';

        if (hours >= 5 && hours < 12) return 'morning';
        if (hours >= 12 && hours < 17) return 'afternoon';
        if (hours >= 17 && hours < 22) return 'evening';
        return 'any_time';
    };

    const formatTimeById = (timeStr?: string) => {
        if (!timeStr || !timeStr.includes(':')) return '';
        try {
            const date = parse(timeStr, 'HH:mm', new Date());
            return format(date, 'h:mm a');
        } catch (e) {
            return timeStr;
        }
    };

    const currentDayOfWeek = selectedDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    const todaysRoutines = routines.filter(r => {
        if (r.type === 'recurring') {
            return r.days?.includes(currentDayOfWeek);
        }
        if (r.type === 'one-time' && r.date) {
            return isSameDay(new Date(r.date), selectedDate);
        }
        return true;
    });

    const morningTasks = todaysRoutines.filter(r => getTimeCategory(r.timeOfDay) === 'morning');
    const afternoonTasks = todaysRoutines.filter(r => getTimeCategory(r.timeOfDay) === 'afternoon');
    const eveningTasks = todaysRoutines.filter(r => getTimeCategory(r.timeOfDay) === 'evening');
    const anyTimeTasks = todaysRoutines.filter(r => getTimeCategory(r.timeOfDay) === 'any_time');

    const totalTasks = todaysRoutines.length;
    const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    const toggleExpand = (taskId: string) => {
        setExpandedTaskId(prev => prev === taskId ? null : taskId);
    };

    const renderTaskList = (tasks: typeof routines, sectionTitle: string, icon: string, timeKey: keyof typeof TIME_PALETTES) => {
        if (tasks.length === 0) return null;

        const palette = TIME_PALETTES[timeKey];

        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 ml-1">
                    <div className="p-1.5 rounded-full" style={{ backgroundColor: palette.light, color: palette.dark }}>
                        <span className="text-lg">{icon}</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">{sectionTitle} ({tasks.length})</h2>
                </div>
                <div className="space-y-4">
                    {tasks.map((task, index) => {
                        const isCompleted = completedTaskIds.has(task.id);
                        const totalStars = task.steps?.reduce((acc, step) => acc + (step.stars || 0), 0) || 0;
                        const formattedTime = formatTimeById(task.timeOfDay);
                        const isExpanded = expandedTaskId === task.id;

                        return (
                            <div
                                key={task.id}
                                className="rounded-[2rem] p-4 shadow-lg relative group overflow-hidden transition-all"
                                style={{ background: palette.bg }}
                            >
                                {/* Glossy Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                                {/* Completed Overlay */}
                                {isCompleted && (
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                                )}

                                <div className="relative z-10">
                                    <div
                                        onClick={() => !isCompleted && toggleExpand(task.id)}
                                        className={cn("flex items-center gap-3", !isCompleted && "cursor-pointer")}
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shrink-0 active:scale-95 transition-transform cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/child/routine/${task.id}`);
                                            }}
                                        >
                                            <DynamicIcon name={task.icon} className="w-8 h-8 text-white drop-shadow-md" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className={cn(
                                                "font-black text-white text-base leading-tight drop-shadow-md",
                                                isCompleted && "line-through opacity-70"
                                            )}>
                                                {task.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                {formattedTime && (
                                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/20 text-white backdrop-blur-sm border border-white/10">
                                                        🕐 {formattedTime}
                                                    </span>
                                                )}
                                                {totalStars > 0 && !isCompleted && (
                                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/30 text-white backdrop-blur-sm border border-white/10">
                                                        ⭐ +{totalStars}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        {isCompleted ? (
                                            <div className="bg-white/90 text-green-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                                <Check className="w-7 h-7" strokeWidth={3} />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 flex items-center justify-center text-white/60">
                                                {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Steps */}
                                    {!isCompleted && isExpanded && task.steps && task.steps.length > 0 && (
                                        <div className="mt-4 space-y-2 pt-4 border-t border-white/20">
                                            {task.steps.map((step, idx) => (
                                                <div key={idx} className="flex items-center gap-3 bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/10">
                                                    <div className="w-7 h-7 flex items-center justify-center bg-white/30 rounded-full text-xs font-black text-white">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="flex-1 text-sm font-bold text-white truncate">{step.title}</span>
                                                    {step.stars > 0 && (
                                                        <span className="text-xs font-bold text-white bg-white/20 px-2 py-1 rounded-lg">
                                                            ⭐ {step.stars}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#EEF2FF] select-none font-sans text-[#2B2D42]">

            <div className="flex-none bg-[#EEF2FF] z-50">
                <ChildHeader title="My Tasks" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
                {/* Premium Progress Card */}
                <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl mb-6">
                    {/* Dark Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-pink-700"></div>

                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-[shimmer_3s_infinite]"></div>

                    {/* Floating Decorations */}
                    <div className="absolute top-4 right-4 text-3xl animate-[float_3s_ease-in-out_infinite]">🎯</div>
                    <div className="absolute bottom-6 right-8 text-2xl animate-[float_3.5s_ease-in-out_infinite] opacity-70">✨</div>

                    <style jsx>{`
                        @keyframes shimmer {
                            0% { transform: translateX(-150%) skewX(-12deg); }
                            100% { transform: translateX(150%) skewX(-12deg); }
                        }
                        @keyframes float {
                            0%, 100% { transform: translateY(0px); }
                            50% { transform: translateY(-10px); }
                        }
                    `}</style>

                    <div className="relative z-10 p-6 text-white">
                        <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2">
                            {isSameDay(selectedDate, new Date()) ? 'Today\'s Progress' : `${format(selectedDate, 'MMM d')} Progress`}
                        </p>
                        <div className="flex items-baseline gap-2 mb-4">
                            <h1 className="text-5xl font-black tracking-tight drop-shadow-lg">{completedCount}</h1>
                            <span className="text-2xl font-bold text-white/80">/ {totalTasks}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-black/20 backdrop-blur-md rounded-full h-4 overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-300 to-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-1000"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>

                        {totalTasks > 0 && completedCount === totalTasks && (
                            <div className="mt-3 flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
                                <span className="text-lg">🎁</span>
                                <span className="text-sm font-bold">Bonus +50 Stars!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Selector */}
                <div className="flex justify-between items-center gap-2 mb-6">
                    {calendarDays.map((d, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(d.dayObj)}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center h-20 rounded-2xl transition-all font-bold shadow-md",
                                d.isSelected
                                    ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white scale-105 shadow-lg"
                                    : "bg-white text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <span className={cn("text-[10px] uppercase tracking-wider", d.isSelected ? "text-white/80" : "text-gray-400")}>
                                {d.isToday ? 'TODAY' : d.dayLabel}
                            </span>
                            <span className="text-2xl font-black mt-1">{d.dateLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Rewards Section */}
            {rewards && rewards.length > 0 && (
                <div className="px-5 mb-8">
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <div className="p-1.5 bg-yellow-100 rounded-full text-yellow-600">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Rewards & Achievements ({rewards.length})</h2>
                    </div>
                    <div className="space-y-3">
                        {rewards.map(reward => (
                            <div key={reward.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 shadow-md border border-yellow-100 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm">
                                    ⭐
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800">
                                        {(reward.metadata as any)?.reason || "Reward Received"}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {format(new Date(reward.date), 'h:mm a')}
                                    </p>
                                </div>
                                <div className="font-black text-2xl text-yellow-500">
                                    +{reward.starsEarned}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task Lists */}
            <div className="px-5">
                {totalTasks === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">📋</div>
                        <p className="font-bold text-gray-400">No tasks for {isSameDay(selectedDate, new Date()) ? 'today' : format(selectedDate, 'EEE, MMM d')}!</p>
                        <p className="text-sm text-gray-400 mt-2">Enjoy your free time! ✨</p>
                    </div>
                ) : (
                    <>
                        {renderTaskList(morningTasks, 'Morning', '🌅', 'morning')}
                        {renderTaskList(afternoonTasks, 'Afternoon', '☀️', 'afternoon')}
                        {renderTaskList(eveningTasks, 'Evening', '🌙', 'evening')}
                        {renderTaskList(anyTimeTasks, 'Any Time', '✨', 'any_time')}
                    </>
                )}
            </div>
        </div>
    );
}
