"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import ChildHeader from '@/components/child/ChildHeader';
import { ChevronLeft, Gift, CheckSquare, Clock, Home, Check, Play, Sun, Moon, BookOpen, Utensils, BedDouble, Brush, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isSameDay, parse, addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

// Simple Icon Mapper
const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
    // Default fallback
    if (!name) return <Sparkles className={className} />;

    // Check if it's one of our known icons
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

    // If name is an emoji (simple length check or regex), render text
    if (/\p{Emoji}/u.test(name)) {
        return <span className={cn("text-2xl", className)}>{name}</span>;
    }

    return <IconComponent className={className} />;
};

export default function ChildTasksPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [mounted, setMounted] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate calendar days centered around TODAY
    const calendarDays = useMemo(() => {
        const today = new Date();
        const start = addDays(today, -2); // Start 2 days ago
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

    const data = useLiveQuery(async () => {
        if (!activeProfile) return { routines: [], logs: [] };

        const allRoutines = await db.activities.toArray();
        const myRoutines = allRoutines.filter(r =>
            !r.profileIds ||
            r.profileIds.length === 0 ||
            r.profileIds.includes(activeProfile.id)
        );

        const allLogs = await db.activityLogs
            .where('profileId').equals(activeProfile.id)
            .toArray();

        // Filter logs for the SELECTED date
        const dateLogs = allLogs.filter(log => isSameDay(new Date(log.date), selectedDate));

        // Separate rewards from task logs for cleaner counting
        const rewards = dateLogs.filter(l => l.activityId === 'manual_reward');
        const taskLogs = dateLogs.filter(l => l.activityId !== 'manual_reward');

        return { routines: myRoutines, logs: taskLogs, rewards };
    }, [activeProfile?.id, selectedDate]);

    if (!mounted || !activeProfile || !data) return null;

    const { routines, logs, rewards } = data;

    const completedTaskIds = new Set(logs.filter(l => l.status === 'completed').map(l => l.activityId));
    // Count real tasks + rewards as 'completed' items? Or just keep tasks.
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

    // Filter routines for the SELECTED date
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

    const renderTaskList = (tasks: typeof routines, sectionTitle: string, icon: string) => {
        if (tasks.length === 0) return null;

        return (
            <div>
                <h3 className="text-sm font-extrabold text-gray-400 flex items-center gap-2 mb-3">
                    <span className="text-lg">{icon}</span> {sectionTitle}
                </h3>
                <div className="space-y-3">
                    {tasks.map(task => {
                        const isCompleted = completedTaskIds.has(task.id);
                        const totalStars = task.steps?.reduce((acc, step) => acc + (step.stars || 0), 0) || 0;
                        const formattedTime = formatTimeById(task.timeOfDay);
                        const isExpanded = expandedTaskId === task.id;

                        return (
                            <div
                                key={task.id}
                                className={cn(
                                    "bg-white rounded-3xl shadow-soft border-2 transition-all overflow-hidden relative",
                                    isCompleted
                                        ? "border-gray-100 opacity-60 grayscale-[0.3]"
                                        : sectionTitle === 'Morning' ? "border-green-100 hover:border-green-200"
                                            : sectionTitle === 'Afternoon' ? "border-blue-100 hover:border-blue-200"
                                                : "border-purple-100 hover:border-purple-200",
                                    isExpanded
                                        ? sectionTitle === 'Morning' ? "ring-2 ring-green-100 ring-offset-2"
                                            : sectionTitle === 'Afternoon' ? "ring-2 ring-blue-100 ring-offset-2"
                                                : "ring-2 ring-purple-100 ring-offset-2"
                                        : ""
                                )}
                            >
                                {/* Main Task Card Header */}
                                <div
                                    onClick={() => !isCompleted && toggleExpand(task.id)}
                                    className={cn(
                                        "p-3 flex items-center gap-3 cursor-pointer",
                                        isCompleted && "cursor-default"
                                    )}
                                >
                                    {/* Color Stripe based on Category/Time */}
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1.5",
                                        sectionTitle === 'Morning' ? "bg-green-400" :
                                            sectionTitle === 'Afternoon' ? "bg-blue-400" :
                                                "bg-purple-400"
                                    )}></div>

                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl pl-1 shrink-0 active:scale-95 transition-transform cursor-pointer",
                                        sectionTitle === 'Morning' ? "bg-green-50 text-green-500" :
                                            sectionTitle === 'Afternoon' ? "bg-blue-50 text-blue-500" :
                                                "bg-purple-50 text-purple-500"
                                    )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/child/routine/${task.id}`);
                                        }}
                                    >
                                        <DynamicIcon name={task.icon} className="w-8 h-8" />
                                    </div>

                                    <div className="flex-1 pl-1 min-w-0">
                                        <h4 className={cn(
                                            "font-bold text-gray-800 truncate",
                                            isCompleted && "line-through decoration-2 decoration-green-500"
                                        )}>
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500"
                                            )}>
                                                {formattedTime || sectionTitle}
                                            </span>
                                            {totalStars > 0 && !isCompleted && (
                                                <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                    ⭐ +{totalStars}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Icon - Replaces Play Button */}
                                    {isCompleted ? (
                                        <div className="bg-green-100 text-green-600 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-green-200">
                                            <Check className="w-6 h-6" strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 flex items-center justify-center text-gray-300">
                                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Content (Steps) */}
                                {!isCompleted && isExpanded && (
                                    <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                                        {task.steps?.length > 0 ? (
                                            <div className="space-y-2 mt-2">
                                                {task.steps.map((step, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 text-sm">
                                                        <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-[10px] font-bold text-gray-500">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="flex-1 text-gray-700 font-medium truncate">{step.title}</span>
                                                        {step.stars > 0 && (
                                                            <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                                                                ⭐ {step.stars}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic text-center py-2">No specific steps defined.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#EEF2FF] text-[#2B2D42] pb-32 select-none relative font-sans">

            <ChildHeader />

            <div className="px-5 pt-2 pb-2 bg-white rounded-b-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] sticky top-0 z-20">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-extrabold text-gray-800">My Tasks</h1>
                </div>

                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 mb-2">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-xs font-bold text-orange-400 uppercase tracking-wide">
                                {isSameDay(selectedDate, new Date()) ? 'Daily Goal' : `Goal for ${format(selectedDate, 'MMM d')}`}
                            </p>
                            <h2 className="text-lg font-extrabold text-gray-800">{completedCount} of {totalTasks} Completed</h2>
                        </div>
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-100">
                            <span className="text-sm">🎁</span>
                            <span className="text-xs font-bold text-gray-500">Bonus +50</span>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-[0_0_15px_rgba(255,159,28,0.3)] transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
                    {calendarDays.map((d, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(d.dayObj)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[50px] h-16 rounded-2xl transition-all cursor-pointer",
                                d.isSelected
                                    ? "bg-[#FF9F1C] text-white shadow-lg transform scale-105"
                                    : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <span className={cn("text-[10px] font-bold", d.isSelected ? "opacity-80" : "text-gray-400")}>
                                {d.isToday ? 'TODAY' : d.dayLabel}
                            </span>
                            <span className="text-lg font-bold">{d.dateLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Rewards Section */}
            {rewards && rewards.length > 0 && (
                <div className="px-5 mt-6 mb-8">
                    <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Rewards & Achievements
                    </h3>
                    <div className="space-y-3">
                        {rewards.map(reward => (
                            <div key={reward.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 shadow-sm border border-yellow-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">
                                    ⭐
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800">
                                            {(reward.metadata as any)?.reason || "Reward Received"}
                                        </h4>
                                        <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full">
                                            {format(new Date(reward.date), 'h:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Great job!
                                    </p>
                                </div>
                                <div className="font-black text-xl text-yellow-500">
                                    +{reward.starsEarned}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="px-5 space-y-8 pb-24">
                {morningTasks.length === 0 && afternoonTasks.length === 0 && eveningTasks.length === 0 && anyTimeTasks.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <p className="font-bold text-gray-400">No tasks assigned for {isSameDay(selectedDate, new Date()) ? 'today' : format(selectedDate, 'EEE, MMM d')}!</p>
                    </div>
                )}

                {renderTaskList(morningTasks, 'Morning', '🌅')}
                {renderTaskList(afternoonTasks, 'Afternoon', '☀️')}
                {renderTaskList(eveningTasks, 'Evening', '🌙')}
                {renderTaskList(anyTimeTasks, 'Any Time', '✨')}
            </div>

            <style jsx global>{`
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-none {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
