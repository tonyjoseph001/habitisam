"use client";

import React from 'react';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ShoppingBag, Calendar, CheckCircle } from 'lucide-react';

export default function PurchaseHistoryPage() {
    const { activeProfile } = useSessionStore();

    const purchases = useLiveQuery(async () => {
        if (!activeProfile?.accountId) return [];

        const logs = await db.purchaseLogs
            .where('accountId')
            .equals(activeProfile.accountId)
            .reverse()
            .sortBy('purchasedAt');

        const enrichedLogs = await Promise.all(logs.map(async (log) => {
            const profile = await db.profiles.get(log.profileId);
            return { ...log, profileName: profile?.name };
        }));

        return enrichedLogs;
    }, [activeProfile?.accountId]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">Purchase History</h1>
            </header>

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {purchases?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <ShoppingBag className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700">No Purchases Yet</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            When kids buy rewards from the shop, they will show up here.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {purchases?.map((log) => (
                        <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center text-2xl border border-pink-100">
                                    {log.rewardSnapshot.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{log.rewardSnapshot.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                            {log.profileName}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {log.purchasedAt.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    <span className="font-bold text-amber-600 text-xs">-{log.rewardSnapshot.cost}</span>
                                    <span className="text-[10px]">⭐</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                    {log.purchasedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
