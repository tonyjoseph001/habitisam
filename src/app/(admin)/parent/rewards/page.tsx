"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Plus, History, Star, Gift, Trash, Edit, MoreVertical, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ParentHeader } from '@/components/layout/ParentHeader';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRewards } from '@/lib/hooks/useRewards';
import { toast } from 'sonner';

export default function ParentRewardsPage() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null);

    // Help System
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpContent, setHelpContent] = useState({ title: '', text: '' });

    const openHelp = (title: string, text: string) => {
        setHelpContent({ title, text });
        setHelpModalOpen(true);
    };

    const HelpButton = ({ title, text }: { title: string, text: string }) => (
        <button
            onClick={(e) => { e.stopPropagation(); openHelp(title, text); }}
            className="text-slate-400 hover:text-primary transition-colors ml-1.5 align-middle"
        >
            <HelpCircle className="w-4 h-4" />
        </button>
    );

    const { profiles } = useProfiles();
    const { rewards, deleteReward } = useRewards();

    const children = profiles ? profiles.filter(p => p.type === 'child') : [];

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteRewardId(id);
    };

    const confirmDelete = async () => {
        if (deleteRewardId) {
            try {
                await deleteReward(deleteRewardId);
                toast.success("Reward deleted");
            } catch (error) {
                console.error("Failed to delete reward", error);
                toast.error("Failed to delete reward");
            }
            setDeleteRewardId(null);
        }
    };

    const getAvatarEmoji = (avatarId?: string) => {
        switch (avatarId) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'superhero': return '🦸';
            case 'superhero_girl': return '🦸‍♀️';
            case 'ninja': return '🥷';
            case 'wizard': return '🧙';
            case 'princess': return '👸';
            case 'pirate': return '🏴‍☠️';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'dinosaur': return '🦖';
            case 'unicorn': return '🦄';
            case 'dragon': return '🐉';
            case 'rocket': return '🚀';
            default: return '👶';
        }
    };

    const totalStars = children?.reduce((sum, child) => sum + (child.stars || 0), 0) || 0;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-32">

            <ParentHeader
                title="Rewards"
                rightAction={
                    <button
                        onClick={() => router.push('/parent/purchases')}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    >
                        <History className="w-3.5 h-3.5" />
                        History
                    </button>
                }
            />

            <main className="max-w-4xl mx-auto p-5 space-y-6">

                {/* Summary Stats Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center">
                                Total Stars Available
                                <HelpButton title="Total Stars" text="This shows the combined star balance of all your children. It's the total purchasing power of the household!" />
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-900">{totalStars}</span>
                                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Shop Items</p>
                            <span className="text-3xl font-bold text-slate-900">{rewards?.length || 0}</span>
                        </div>
                    </div>
                </div>


                {/* Children Balances */}
                <section>
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 px-1">Child Balances</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {children?.map((child) => (
                            <div
                                key={child.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl border border-slate-200">
                                            {getAvatarEmoji(child.avatarId)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{child.name}</p>
                                            <p className="text-xs text-slate-500">Child Profile</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1">
                                            <span className="text-2xl font-bold text-slate-900">{child.stars || 0}</span>
                                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!children || children.length === 0) && (
                            <div className="col-span-full text-sm text-slate-500 p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                                No child profiles found. Create a child profile to get started.
                            </div>
                        )}
                    </div>
                </section>

                {/* Rewards Inventory */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center">
                            Reward Catalog
                            <HelpButton title="Reward Catalog" text="These are the items your children can 'buy' with their stars. When they redeem one, you'll get a notification to approve it." />
                        </h2>
                        {rewards && rewards.length > 0 && (
                            <button
                                onClick={() => router.push('/parent/rewards/add?returnUrl=/parent/rewards')}
                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Reward
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {rewards?.map((reward) => (
                            <div
                                key={reward.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition cursor-pointer group relative"
                                onClick={() => router.push(`/parent/rewards/edit?id=${reward.id}`)}
                            >
                                {/* Action Menu */}
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/parent/rewards/edit?id=${reward.id}`);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-primary/10 text-slate-600 hover:text-primary flex items-center justify-center transition"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, reward.id)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 flex items-center justify-center transition"
                                    >
                                        <Trash className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="text-5xl mb-3 transform group-hover:scale-110 transition duration-200">
                                        {reward.icon || '🎁'}
                                    </div>
                                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 min-h-[2.5em] mb-2">
                                        {reward.title}
                                    </h3>

                                    {/* Assignment Badge */}
                                    <div className="mb-3">
                                        {reward.assignedProfileIds && reward.assignedProfileIds.length > 0 ? (
                                            <span className="text-[10px] font-semibold text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                                                Assigned to {reward.assignedProfileIds.length}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                                All Children
                                            </span>
                                        )}
                                    </div>

                                    {/* Cost */}
                                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">
                                        {reward.cost} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {(!rewards || rewards.length === 0) && (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                                <Gift className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-base font-semibold text-slate-600 mb-1">No rewards in catalog</p>
                                <p className="text-sm text-slate-500 mb-4">Create rewards for your children to redeem with their stars</p>
                                <button
                                    onClick={() => router.push('/parent/rewards/add?returnUrl=/parent/rewards')}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create First Reward
                                </button>
                            </div>
                        )}
                    </div>
                </section>

            </main>

            <ParentNavBar />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteRewardId}
                onClose={() => setDeleteRewardId(null)}
                title="Delete Reward"
                className="max-w-sm"
            >
                <div className="p-4 pt-0">
                    <p className="text-slate-600 text-sm mb-6">
                        Are you sure you want to permanently delete this reward? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            onClick={() => setDeleteRewardId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 text-white hover:bg-red-700 shadow-sm"
                            onClick={confirmDelete}
                        >
                            Delete Reward
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Help Modal */}
            <Modal
                isOpen={helpModalOpen}
                onClose={() => setHelpModalOpen(false)}
                title={helpContent.title}
                className="max-w-xs"
            >
                <div className="p-4 pt-0">
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">{helpContent.text}</p>
                    <Button onClick={() => setHelpModalOpen(false)} className="w-full bg-primary text-white">Got it</Button>
                </div>
            </Modal>
        </div >
    );
}
