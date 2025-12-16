"use client";

import React from 'react';
import Link from 'next/link';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ShoppingBag, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function PurchaseHistoryPage() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();
    const accountId = user?.uid || activeProfile?.accountId;

    const purchases = useLiveQuery(async () => {
        if (!accountId) return [];

        const logs = await db.purchaseLogs
            .where('accountId')
            .equals(accountId)
            .reverse()
            .sortBy('purchasedAt');

        const enrichedLogs = await Promise.all(logs.map(async (log) => {
            const profile = await db.profiles.get(log.profileId);
            return {
                ...log,
                profileName: profile?.name,
                profileAvatarId: profile?.avatarId,
                profileColorTheme: profile?.colorTheme
            };
        }));

        return enrichedLogs;
    }, [accountId]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* Header */}
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Link href="/parent/rewards">
                        <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent text-slate-500">
                            <ArrowLeft className="w-6 h-6" />
                            <span className="sr-only">Back</span>
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900">Purchase History</h1>
                </div>
            </header>

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {purchases?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <ShoppingBag className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-sm">No Purchases Yet</h3>
                        <p className="text-xs text-slate-500 max-w-xs">
                            When kids buy rewards, they appear here.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {purchases?.map((log) => {
                        // Avatar Logic
                        let AvatarIcon = '👶';
                        switch (log.profileAvatarId) {
                            case 'boy': AvatarIcon = '🧑‍🚀'; break;
                            case 'girl': AvatarIcon = '👩‍🚀'; break;
                            case 'alien': AvatarIcon = '👽'; break;
                            case 'robot': AvatarIcon = '🤖'; break;
                            case 'rocket': AvatarIcon = '🚀'; break;
                        }
                        const colorMap: Record<string, string> = {
                            cyan: 'bg-cyan-100 border-cyan-200',
                            purple: 'bg-violet-100 border-violet-200',
                            green: 'bg-emerald-100 border-emerald-200',
                            orange: 'bg-orange-100 border-orange-200'
                        };
                        const colorClass = colorMap[log.profileColorTheme || 'cyan'] || 'bg-slate-100 border-slate-200';

                        return (
                            <div key={log.id} className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Child Avatar */}
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 flex-shrink-0", colorClass)}>
                                        {AvatarIcon}
                                    </div>

                                    {/* Reward Details */}
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">{log.rewardSnapshot.icon}</span>
                                            <h3 className="font-bold text-slate-900 text-sm leading-tight">{log.rewardSnapshot.title}</h3>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {formatDistanceToNow(log.purchasedAt, { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>

                                {/* Cost */}
                                <div className="flex items-center gap-1 pr-1">
                                    <span className="font-bold text-red-500 text-sm">-{log.rewardSnapshot.cost}</span>
                                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
