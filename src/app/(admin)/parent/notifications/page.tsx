"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { ParentHeader } from '@/components/layout/ParentHeader';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Bell } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Helper to render icon (emoji or Lucide component)
const RenderIcon = ({ name, className }: { name?: string; className?: string }) => {
    if (!name) return <span className="text-2xl">✅</span>;

    // Check if it's an emoji
    if (/\p{Emoji}/u.test(name)) {
        return <span className={cn("text-2xl", className)}>{name}</span>;
    }

    // Try to render as Lucide icon
    // @ts-ignore
    const LucideIcon = Icons[name];
    if (LucideIcon) {
        return <LucideIcon className={className || "w-6 h-6"} />;
    }

    // Fallback to text
    return <span className="text-2xl">✅</span>;
};

export default function ParentNotificationsPage() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();
    const accountId = user?.uid || activeProfile?.accountId;

    // Pending Goal Approvals
    const pendingGoals = useLiveQuery(async () => {
        if (!accountId) return [];

        const goals = await db.goals
            .where('status')
            .equals('pending_approval')
            .toArray();

        const enrichedGoals = await Promise.all(goals.map(async (goal) => {
            const profile = await db.profiles.get(goal.profileId);
            return {
                ...goal,
                profileName: profile?.name,
                profileAvatarId: profile?.avatarId,
            };
        }));

        return enrichedGoals;
    }, [accountId]);

    // Pending Purchase Requests
    const pendingPurchases = useLiveQuery(async () => {
        if (!accountId) return [];

        const purchases = await db.purchaseLogs
            .where({ accountId, status: 'pending' })
            .reverse()
            .sortBy('purchasedAt');

        const enrichedPurchases = await Promise.all(purchases.map(async (purchase) => {
            const profile = await db.profiles.get(purchase.profileId);
            return {
                ...purchase,
                profileName: profile?.name,
                profileAvatarId: profile?.avatarId,
            };
        }));

        return enrichedPurchases;
    }, [accountId]);

    // Recent Task Completions (unseen)
    const recentCompletions = useLiveQuery(async () => {
        if (!accountId) return [];

        const completions = await db.activityLogs
            .where('accountId')
            .equals(accountId)
            .filter(log => log.status === 'completed' && !log.seenByParent)
            .reverse()
            .limit(10)
            .toArray();

        const enrichedCompletions = await Promise.all(completions.map(async (log) => {
            const profile = await db.profiles.get(log.profileId);
            const activity = await db.activities.get(log.activityId);
            return {
                ...log,
                profileName: profile?.name,
                activityTitle: activity?.title || log.metadata?.title || 'Task',
                activityIcon: activity?.icon || '✅',
            };
        }));

        return enrichedCompletions;
    }, [accountId]);

    // Mark completions as seen when user leaves the page
    useEffect(() => {
        return () => {
            // Cleanup function runs when component unmounts (user leaves page)
            if (recentCompletions && recentCompletions.length > 0) {
                const markAsSeen = async () => {
                    await Promise.all(
                        recentCompletions.map(completion =>
                            db.activityLogs.update(completion.id, { seenByParent: true })
                        )
                    );
                };
                markAsSeen();
            }
        };
    }, [recentCompletions]);

    const handleApproveGoal = async (goal: any) => {
        try {
            const profile = await db.profiles.get(goal.profileId);
            if (!profile) return;

            // Award stars and mark as completed
            await db.transaction('rw', db.goals, db.profiles, db.activityLogs, async () => {
                await db.goals.update(goal.id, { status: 'completed' });
                await db.profiles.update(profile.id, {
                    stars: (profile.stars || 0) + goal.stars
                });

                // Log the reward
                await db.activityLogs.add({
                    id: crypto.randomUUID(),
                    accountId: profile.accountId,
                    profileId: profile.id,
                    activityId: goal.id,
                    status: 'completed',
                    date: new Date().toISOString(),
                    starsEarned: goal.stars,
                    metadata: { type: 'goal_completion', goalTitle: goal.title }
                });
            });
        } catch (e) {
            console.error(e);
            alert('Failed to approve goal');
        }
    };

    const handleRejectGoal = async (goal: any) => {
        try {
            await db.goals.update(goal.id, {
                status: 'active',
                current: 0,
                completedAt: undefined
            });
        } catch (e) {
            console.error(e);
            alert('Failed to reject goal');
        }
    };

    const handleApprovePurchase = async (purchase: any) => {
        try {
            const profile = await db.profiles.get(purchase.profileId);
            if (!profile) return;

            const cost = purchase.rewardSnapshot.cost;
            const newStars = Math.max(0, (profile.stars || 0) - cost);

            await db.transaction('rw', db.profiles, db.purchaseLogs, async () => {
                await db.profiles.update(profile.id, { stars: newStars });
                await db.purchaseLogs.update(purchase.id, {
                    status: 'approved',
                    processedAt: new Date()
                });
            });
        } catch (e) {
            console.error(e);
            alert('Failed to approve purchase');
        }
    };

    const handleRejectPurchase = async (purchase: any) => {
        try {
            await db.purchaseLogs.update(purchase.id, {
                status: 'rejected',
                processedAt: new Date()
            });
        } catch (e) {
            console.error(e);
            alert('Failed to reject purchase');
        }
    };

    const totalNotifications = (pendingGoals?.length || 0) + (pendingPurchases?.length || 0) + (recentCompletions?.length || 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            <ParentHeader title="Notifications" />

            <main className="p-4 flex flex-col gap-6 max-w-screen-md mx-auto">
                {totalNotifications === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bell className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-lg mb-2">All Caught Up!</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            No pending notifications right now.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Recent Task Completions */}
                        {recentCompletions && recentCompletions.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-lg">✅</span>
                                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Task Completions</h3>
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{recentCompletions.length}</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {recentCompletions.map((completion) => (
                                        <div key={completion.id} className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-400 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-100">
                                                    <RenderIcon name={completion.activityIcon} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {completion.profileName} completed
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 text-sm">{completion.activityTitle}</h3>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {completion.completedAt && formatDistanceToNow(completion.completedAt, { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                            {completion.starsEarned && completion.starsEarned > 0 && (
                                                <div className="flex items-center gap-1 text-blue-600 font-black text-lg">
                                                    +{completion.starsEarned} ⭐
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Goal Approvals */}
                        {pendingGoals && pendingGoals.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-lg">🏆</span>
                                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider">Goal Completions</h3>
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingGoals.length}</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {pendingGoals.map((goal) => (
                                        <div key={goal.id} className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-400 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl border-2 border-green-100">
                                                        {goal.icon || '🎯'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                            {goal.profileName} completed
                                                        </span>
                                                        <h3 className="font-bold text-slate-900 text-sm">{goal.title}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center justify-end gap-1 text-green-600 font-black text-lg">
                                                        +{goal.stars} ⭐
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {goal.completedAt && formatDistanceToNow(goal.completedAt, { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                                <Button
                                                    onClick={() => handleRejectGoal(goal)}
                                                    variant="outline"
                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
                                                >
                                                    ❌ Reject
                                                </Button>
                                                <Button
                                                    onClick={() => handleApproveGoal(goal)}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200"
                                                >
                                                    ✅ Approve
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Purchase Requests */}
                        {pendingPurchases && pendingPurchases.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-lg">🛍️</span>
                                    <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Purchase Requests</h3>
                                    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingPurchases.length}</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {pendingPurchases.map((purchase) => (
                                        <div key={purchase.id} className="bg-white rounded-xl p-4 shadow-md border-l-4 border-orange-400 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-2xl border-2 border-orange-100">
                                                        {purchase.rewardSnapshot.icon}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                            {purchase.profileName} wants
                                                        </span>
                                                        <h3 className="font-bold text-slate-900 text-sm">{purchase.rewardSnapshot.title}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center justify-end gap-1 text-orange-600 font-black text-lg">
                                                        {purchase.rewardSnapshot.cost} ⭐
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {formatDistanceToNow(purchase.purchasedAt, { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                                <Button
                                                    onClick={() => handleRejectPurchase(purchase)}
                                                    variant="outline"
                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
                                                >
                                                    ❌ Reject
                                                </Button>
                                                <Button
                                                    onClick={() => handleApprovePurchase(purchase)}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200"
                                                >
                                                    ✅ Approve
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <ParentNavBar />
        </div>
    );
}
