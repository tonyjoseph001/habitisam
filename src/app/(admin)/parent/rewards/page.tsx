"use client";

import React, { useState } from 'react';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useRewards } from '@/lib/hooks/useRewards';
import { Plus, Gift, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RewardEditorModal } from '@/components/domain/rewards/RewardEditorModal';
import { Reward } from '@/lib/db';

export default function RewardsPage() {
    const { rewards, addReward, updateReward, deleteReward } = useRewards();

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | undefined>(undefined);

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

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">Rewards Shop</h1>
                <Button size="sm" variant="cosmic" className="gap-2" onClick={handleOpenNew}>
                    <Plus className="w-4 h-4" />
                    New
                </Button>
            </header>

            <RewardEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSave}
                initialData={editingReward}
            />

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {rewards?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Gift className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700">No Rewards Yet</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            Create fun rewards like "Screen Time" or "Toy" for your kids to buy with stars.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {rewards?.map((reward) => (
                        <div key={reward.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3 group relative">
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center text-3xl border border-pink-100">
                                    {reward.icon}
                                </div>
                                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                    <span className="font-bold text-amber-600">{reward.cost}</span>
                                    <span className="text-xs">⭐</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-900 leading-tight">{reward.title}</h3>
                            </div>

                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                    onClick={() => handleOpenEdit(reward)}
                                    className="p-1.5 bg-white shadow-md rounded-full text-slate-400 hover:text-violet-600"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => deleteReward(reward.id)}
                                    className="p-1.5 bg-white shadow-md rounded-full text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
