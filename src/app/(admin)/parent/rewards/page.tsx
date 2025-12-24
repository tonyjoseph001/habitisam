"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Plus, History, Star, Gift, Trash, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ParentHeader } from '@/components/layout/ParentHeader';

export default function ParentRewardsPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null);

    // Fetch children profiles
    const children = useLiveQuery(async () => {
        if (!activeProfile?.accountId) return [];
        return await db.profiles
            .where('accountId').equals(activeProfile.accountId)
            .filter(p => p.type === 'child')
            .toArray();
    }, [activeProfile?.accountId]);

    // Fetch rewards
    const rewards = useLiveQuery(async () => {
        if (!activeProfile?.accountId) return [];
        return await db.rewards.where('accountId').equals(activeProfile.accountId).toArray();
    }, [activeProfile?.accountId]);

    // Handle Delete Request
    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteRewardId(id);
    };

    // Confirm Delete Action
    const confirmDelete = async () => {
        if (deleteRewardId) {
            await db.rewards.delete(deleteRewardId);
            setDeleteRewardId(null);
        }
    };

    // Helper to get emoji from avatarId
    const getAvatarEmoji = (avatarId?: string) => {
        switch (avatarId) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'rocket': return '🚀';
            default: return '🦁';
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-32">

            <ParentHeader title="Rewards Shop" />

            <main className="max-w-md mx-auto p-6 space-y-8">

                {/* Balances Section */}
                <section>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Balances</h2>
                        <button
                            onClick={() => router.push('/parent/purchases')}
                            className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 transition"
                        >
                            <History className="w-4 h-4" />
                            History
                        </button>
                    </div>

                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                        {children?.map((child, index) => (
                            <div
                                key={child.id}
                                className={cn(
                                    "min-w-[160px] p-5 rounded-3xl shadow-xl relative overflow-hidden group transition-transform hover:scale-[1.02]",
                                    index === 0
                                        ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-slate-200"
                                        : "bg-white border border-slate-100 text-slate-800 shadow-sm"
                                )}
                            >
                                {/* Decorative circle for the first card */}
                                {index === 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>}

                                <div className="flex items-center gap-3 mb-6">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-2xl border",
                                        index === 0 ? "bg-white/20 backdrop-blur-md border-white/10" : "bg-green-50 text-green-600 border-green-100"
                                    )}>
                                        {getAvatarEmoji(child.avatarId)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{child.name}</p>
                                        <p className={cn("text-xs font-medium", index === 0 ? "text-slate-300" : "text-slate-500")}>Level 1</p>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-3xl font-black tracking-tight">{child.stars || 0}</span>
                                    <div className={cn("flex items-center gap-1 text-xs font-bold mt-1", index === 0 ? "text-yellow-400" : "text-yellow-500")}>
                                        <Star className="w-3 h-3 fill-current" /> Available
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!children || children.length === 0) && (
                            <div className="text-sm text-slate-400 p-4">No child profiles found.</div>
                        )}
                    </div>
                </section>

                {/* Shop Inventory Section */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Shop Inventory</h2>

                    <div className="grid grid-cols-2 gap-4">
                        {rewards?.map((reward) => (
                            <div
                                key={reward.id}
                                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition cursor-pointer"
                                onClick={() => router.push(`/parent/rewards/edit?id=${reward.id}`)}
                            >
                                <button
                                    onClick={(e) => handleDeleteClick(e, reward.id)}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-transparent hover:bg-slate-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition z-10"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>

                                <div className="flex flex-col items-center text-center mt-2">
                                    <div className="text-5xl mb-3 drop-shadow-sm transform group-hover:scale-110 transition duration-300">
                                        {reward.icon || '🎁'}
                                    </div>
                                    <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 min-h-[2.5em]">{reward.title}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 mb-3">
                                        {reward.assignedProfileIds && reward.assignedProfileIds.length > 0 ? 'Assigned' : 'Any Child'}
                                    </p>

                                    <div className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1 border border-yellow-100">
                                        {reward.cost} <Star className="w-3 h-3 fill-current" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {(!rewards || rewards.length === 0) && (
                            <div className="col-span-2 py-10 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                                <Gift className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm font-bold opacity-50">No rewards yet</p>
                            </div>
                        )}
                    </div>
                </section>

            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 left-0 w-full px-6 flex justify-center z-40 pointer-events-none">
                <button
                    onClick={() => router.push('/parent/rewards/add?returnUrl=/parent/rewards')}
                    className="pointer-events-auto bg-primary text-white pl-5 pr-6 py-4 rounded-full font-bold text-sm shadow-xl shadow-slate-300 flex items-center gap-2 hover:scale-105 active:scale-95 transition"
                >
                    <Plus className="w-5 h-5" />
                    Add Reward
                </button>
            </div>

            <ParentNavBar />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteRewardId}
                onClose={() => setDeleteRewardId(null)}
                title="Delete Reward"
                className="max-w-xs"
            >
                <div className="p-4 pt-0">
                    <p className="text-slate-600 text-sm mb-6">
                        Are you sure you want to delete this reward? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
                            onClick={() => setDeleteRewardId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-red-500 text-white hover:bg-red-600"
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
