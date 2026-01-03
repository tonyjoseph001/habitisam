"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { ParentHeader } from '@/components/layout/ParentHeader';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Bell } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Hooks & Services
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useGoals } from '@/lib/hooks/useGoals';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { GoalService } from '@/lib/firestore/goals.service';
import { PurchaseService } from '@/lib/firestore/purchases.service';
import { LogService } from '@/lib/firestore/logs.service';
import { useMemo } from 'react';

// Helper to safely parse dates from Firestore/String/Number
const safeDate = (input: any): Date => {
    if (!input) return new Date();
    if (input instanceof Date && !isNaN(input.getTime())) return input;
    if (typeof input === 'string') {
        const d = new Date(input);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    if (typeof input === 'number') {
        const d = new Date(input);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    // Firestore Timestamp check
    if (input && typeof input.toDate === 'function') {
        try { return input.toDate(); } catch (e) { return new Date(); }
    }
    if (input && typeof input.seconds === 'number') {
        return new Date(input.seconds * 1000);
    }
    return new Date();
};

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

    const { profiles } = useProfiles();
    const { goals } = useGoals();
    const { purchases } = usePurchases();
    const { logs } = useActivityLogs();
    const { routines } = useRoutines();

    // Helper to get profile info
    const getProfile = (id: string) => profiles.find(p => p.id === id);

    // Pending Goal Approvals
    const pendingGoals = useMemo(() => {
        if (!goals) return [];
        return goals
            .filter(g => g.status === 'pending_approval')
            .map(goal => {
                const profile = getProfile(goal.profileId);
                return {
                    ...goal,
                    profileName: profile?.name,
                    profileAvatarId: profile?.avatarId,
                    // Try to find an icon if it exists metadata or routine
                    icon: (goal as any).icon || '🎯'
                };
            });
    }, [goals, profiles]);

    // Pending Purchase Requests
    const pendingPurchases = useMemo(() => {
        if (!purchases) return [];
        return purchases
            .filter(p => p.status === 'pending')
            .map(purchase => {
                const profile = getProfile(purchase.profileId);
                return {
                    ...purchase,
                    profileName: profile?.name,
                    profileAvatarId: profile?.avatarId
                };
            })
            .sort((a, b) => {
                const dateA = new Date(a.purchasedAt).getTime();
                const dateB = new Date(b.purchasedAt).getTime();
                return dateB - dateA;
            });
    }, [purchases, profiles]);

    // Recent Task Completions (unseen)
    const recentCompletions = useMemo(() => {
        if (!logs) return [];
        return logs
            .filter(log => log.status === 'completed' && !log.seenByParent)
            .sort((a, b) => {
                const dateA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
                const dateB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
                return dateB - dateA;
            })
            .slice(0, 10)
            .map(log => {
                const profile = getProfile(log.profileId);
                const routine = routines?.find(r => r.id === log.activityId);
                return {
                    ...log,
                    profileName: profile?.name,
                    activityTitle: routine?.title || log.metadata?.title || 'Task',
                    activityIcon: routine?.icon || '✅',
                };
            });
    }, [logs, profiles, routines]);

    // Mark completions as seen when user leaves the page
    useEffect(() => {
        return () => {
            if (recentCompletions && recentCompletions.length > 0) {
                recentCompletions.forEach(completion => {
                    LogService.update(completion.id, { seenByParent: true }).catch(console.error);
                });
            }
        };
    }, [recentCompletions]);

    const handleApproveGoal = async (goal: any) => {
        try {
            await GoalService.approve(goal, goal.stars);
        } catch (e) {
            console.error(e);
            alert('Failed to approve goal');
        }
    };

    const handleRejectGoal = async (goal: any) => {
        try {
            await GoalService.reject(goal);
        } catch (e) {
            console.error(e);
            alert('Failed to reject goal');
        }
    };

    const handleApprovePurchase = async (purchase: any) => {
        try {
            await PurchaseService.approve(purchase);
        } catch (e) {
            console.error(e);
            alert('Failed to approve purchase');
        }
    };

    const handleRejectPurchase = async (purchase: any) => {
        try {
            await PurchaseService.reject(purchase);
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
                                                        {completion.completedAt && formatDistanceToNow(safeDate(completion.completedAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                            {Number(completion.starsEarned) > 0 && (
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
                                                    {goal.stars > 0 && (
                                                        <div className="flex items-center justify-end gap-1 text-green-600 font-black text-lg">
                                                            +{goal.stars} ⭐
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {goal.completedAt && formatDistanceToNow(safeDate(goal.completedAt), { addSuffix: true })}
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
                                                        {formatDistanceToNow(safeDate(purchase.purchasedAt), { addSuffix: true })}
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
