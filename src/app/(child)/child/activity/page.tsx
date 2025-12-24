"use client";

import React, { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import ChildHeader from '@/components/child/ChildHeader';

type ActivityItem = {
    id: string;
    type: 'earned' | 'spent';
    title: string;
    stars: number;
    date: Date;
    icon?: string;
};

export default function ChildActivityPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [mounted, setMounted] = useState(false);
    const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');

    useEffect(() => {
        setMounted(true);
    }, []);

    const activities = useLiveQuery(async () => {
        if (!activeProfile) return [];

        const logs = await db.activityLogs
            .where('profileId').equals(activeProfile.id)
            .toArray();

        const purchases = await db.purchaseLogs
            .where('profileId').equals(activeProfile.id)
            .toArray();

        // Transform Activities (Earned)
        const activityIds = logs.map(l => l.activityId);
        const relatedActivities = await db.activities.where('id').anyOf(activityIds).toArray();
        const activityMap = new Map(relatedActivities.map(a => [a.id, a]));

        const earnedItems: ActivityItem[] = [];
        for (const log of logs) {
            if (log.status === 'completed') {
                // SPECIAL CASE: Manual Reward
                if (log.activityId === 'manual_reward') {
                    earnedItems.push({
                        id: log.id,
                        type: 'earned',
                        title: (log.metadata as any)?.reason || 'Reward Received',
                        stars: log.starsEarned || 0,
                        date: new Date(log.date),
                        icon: '⭐'
                    });
                    continue;
                }

                const act = activityMap.get(log.activityId);
                let starsEarned = log.starsEarned || 0; // Use stored value if available

                // Fallback to calculating from steps if not stored (old logs)
                if (starsEarned === 0 && act && act.steps) {
                    starsEarned = act.steps.reduce((acc, step) => acc + (step.stars || 0), 0);
                }

                // Check for metadata title (e.g. for Goals)
                const metaTitle = (log.metadata as any)?.title;
                const metaType = (log.metadata as any)?.type;

                earnedItems.push({
                    id: log.id,
                    type: 'earned',
                    title: act?.title || metaTitle || 'Unknown Activity',
                    stars: starsEarned,
                    date: log.completedAt || new Date(log.date),
                    icon: act?.icon ? undefined : (metaType === 'goal' ? '🏆' : '✅') // Use specific icon for goals if available
                });
            }
        }

        // Transform Purchases (Spent)
        const spentItems: ActivityItem[] = purchases.map(p => ({
            id: p.id,
            type: 'spent',
            title: p.rewardSnapshot.title,
            stars: p.rewardSnapshot.cost,
            date: p.purchasedAt,
            icon: p.rewardSnapshot.icon
        }));

        // Merge and Sort
        return [...earnedItems, ...spentItems].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [activeProfile?.id]);

    if (!mounted || !activeProfile) return null;

    // Filter Logic
    const filteredActivities = activities?.filter(item => {
        if (filter === 'all') return true;
        return item.type === filter;
    }) || [];

    // Date Grouping
    const groupedActivities: Record<string, ActivityItem[]> = {};
    filteredActivities.forEach(item => {
        let key = format(item.date, 'MMMM d, yyyy');
        if (isToday(item.date)) key = 'Today';
        if (isYesterday(item.date)) key = 'Yesterday';

        if (!groupedActivities[key]) groupedActivities[key] = [];
        groupedActivities[key].push(item);
    });

    const groupKeys = Object.keys(groupedActivities);

    return (
        <div className="min-h-screen bg-[#EEF2FF] text-[#2B2D42] pb-32 select-none relative font-sans">

            {/* Header & Filters */}
            <ChildHeader />

            <div className="px-5 pt-2 pb-2 sticky top-0 bg-[#EEF2FF] z-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-extrabold text-gray-800">My Activity</h1>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-bold shadow-md whitespace-nowrap transition-all",
                            filter === 'all' ? "bg-gray-800 text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        All Activity
                    </button>
                    <button
                        onClick={() => setFilter('earned')}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                            filter === 'earned' ? "bg-white border-green-200 text-green-600 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        🏆 Earned
                    </button>
                    <button
                        onClick={() => setFilter('spent')}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                            filter === 'spent' ? "bg-white border-red-200 text-red-500 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        🛍️ Spent
                    </button>
                </div>
            </div>

            {/* Activity List */}
            <div className="px-5 mt-2 space-y-6">

                {groupKeys.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <p className="text-sm font-bold">No activity yet!</p>
                    </div>
                )}

                {groupKeys.map(dateGroup => (
                    <div key={dateGroup}>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">{dateGroup}</h3>
                        <div className="space-y-3">
                            {groupedActivities[dateGroup].map((item, index) => {
                                const isEarned = item.type === 'earned';
                                return (
                                    <div
                                        key={item.id}
                                        className="bg-white p-4 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500 fill-mode-forwards"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border",
                                                isEarned ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                                            )}>
                                                {item.icon || (isEarned ? '✅' : '🛍️')}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm truncate max-w-[150px] sm:max-w-xs">{item.title}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                    {format(item.date, 'h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-base font-black",
                                                isEarned ? "text-green-500" : "text-red-500"
                                            )}>
                                                {isEarned ? '+' : ''}{isEarned ? item.stars : `-${item.stars}`}
                                            </span>
                                            <div className="text-[9px] font-bold text-gray-300">Stars</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
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
