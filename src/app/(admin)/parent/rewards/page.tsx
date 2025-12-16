"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useRewards } from '@/lib/hooks/useRewards';
import { Plus, Gift, Edit2, Trash2, ScrollText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RewardEditorModal } from '@/components/domain/rewards/RewardEditorModal';
import { Reward, db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSessionStore } from '@/lib/store/useSessionStore';

export default function RewardsPage() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();
    const accountId = user?.uid || activeProfile?.accountId;

    const { rewards, addReward, updateReward, deleteReward } = useRewards();

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | undefined>(undefined);

    // Fetch child profiles for balances
    const childProfiles = useLiveQuery(
        async () => {
            if (!accountId) return [];
            return await db.profiles
                .where('accountId')
                .equals(accountId)
                .and(p => p.type === 'child')
                .toArray();
        },
        [accountId]
    );

    const handleOpenNew = () => {
        setEditingReward(undefined);
        setIsEditorOpen(true);
    };

    const handleOpenEdit = (reward: Reward) => {
        setEditingReward(reward);
        setIsEditorOpen(true);
    };

    const handleSave = async (title: string, cost: number, icon: string) => {
        if (editingReward) {
            await updateReward(editingReward.id, { title, cost, icon });
        } else {
            await addReward(title, cost, icon);
        }
    };

    // Placeholder for future Pending Requests feature
    const pendingRequests: any[] = [];

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans">
            {/* Header */}
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Link href="/parent/dashboard">
                        <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent text-slate-500">
                            <span className="sr-only">Back</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900">Rewards</h1>
                </div>
            </header>

            <main className="p-4 flex flex-col gap-6 max-w-screen-md mx-auto">

                {/* 1. Child Balances */}
                <section className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {childProfiles?.map(child => {
                        let AvatarIcon = '👶';
                        switch (child.avatarId) {
                            case 'boy': AvatarIcon = '🧑‍🚀'; break;
                            case 'girl': AvatarIcon = '👩‍🚀'; break;
                            case 'alien': AvatarIcon = '👽'; break;
                            case 'robot': AvatarIcon = '🤖'; break;
                            case 'rocket': AvatarIcon = '🚀'; break;
                        }

                        // Theme colors for avatar bg
                        const colorMap: Record<string, string> = {
                            cyan: 'bg-cyan-100 border-cyan-200',
                            purple: 'bg-violet-100 border-violet-200',
                            green: 'bg-emerald-100 border-emerald-200',
                            orange: 'bg-orange-100 border-orange-200'
                        };
                        const colorClass = colorMap[child.colorTheme || 'cyan'] || 'bg-slate-100 border-slate-200';

                        return (
                            <div key={child.id} className="bg-white rounded-xl p-2 pl-2 pr-3 shadow-sm border border-slate-200 flex items-center gap-2 min-w-[140px]">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-lg border-2", colorClass)}>
                                    {AvatarIcon}
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">{child.name}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-base font-bold text-slate-900">{child.stars || 0}</span>
                                        <span className="text-amber-400 text-xs">⭐</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* 2. History Link */}
                <Link href="/parent/rewards/history">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors group cursor-pointer">
                        <ScrollText className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
                        <span className="font-medium text-sm text-slate-600 group-hover:text-violet-700">View Purchase History</span>
                    </div>
                </Link>

                {/* 3. Pending Requests (Hidden if empty) */}
                {pendingRequests.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase px-2">Pending Requests ({pendingRequests.length})</h3>
                        </div>
                        {/* Wrapper for pending items would go here */}
                    </section>
                )}

                {/* 4. Shop Inventory */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase px-1">Shop Inventory</h3>
                    </div>

                    {rewards?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center opacity-60 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <Gift className="w-6 h-6 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-700 text-sm">No Rewards Yet</h3>
                            <p className="text-xs text-slate-500 max-w-xs mt-1">
                                Add clear goals like "Screen Time" or "New Toy".
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {rewards?.map((reward) => (
                                <div key={reward.id} className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex items-center gap-3 group">

                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl border border-slate-100 flex-shrink-0">
                                        {reward.icon}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <h3 className="font-bold text-slate-900 leading-tight text-sm">{reward.title}</h3>
                                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                            {/* Description not in DB yet, using placeholder or omit */}
                                            Redeemable by anyone
                                        </p>
                                    </div>

                                    {/* Price & Actions */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                            <span className="font-bold text-amber-700 text-xs">{reward.cost}</span>
                                        </div>

                                        <div className="flex gap-1 pl-1 border-l border-slate-100">
                                            <button
                                                onClick={() => handleOpenEdit(reward)}
                                                className="p-1.5 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => deleteReward(reward.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Footer Action */}
                <div className="fixed bottom-20 left-0 right-0 px-4 max-w-screen-md mx-auto z-20 pointer-events-none">
                    <Button
                        variant="cosmic"
                        className="w-full h-12 text-base shadow-lg pointer-events-auto flex items-center justify-center gap-2 border-2 border-violet-400"
                        onClick={handleOpenNew}
                    >
                        <Plus className="w-5 h-5" />
                        Add New Reward
                    </Button>
                </div>

            </main>

            <ParentNavBar />

            <RewardEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSave}
                initialData={editingReward}
            />
        </div>
    );
}
