"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ArrowLeft, Check, Star, Users, Trash, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { IconSelector } from '@/components/domain/routines/IconSelector'; // Added
import { Modal } from '@/components/ui/modal';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRewards } from '@/lib/hooks/useRewards';
import { useAccount } from '@/lib/hooks/useAccount'; // Added
import { RewardService } from "@/lib/firestore/rewards.service";
import { Avatar } from '@/components/ui/Avatar'; // Added
import { toast } from 'sonner';

import { Suspense } from 'react';

function EditRewardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const { activeProfile } = useSessionStore();
    const { account } = useAccount(); // Added
    const isPremium = account?.licenseType === 'pro' || account?.licenseType === 'enterprise';

    const { profiles } = useProfiles();
    const { updateReward, deleteReward } = useRewards();

    const [title, setTitle] = useState('');
    const [cost, setCost] = useState<number | ''>(10);
    const [icon, setIcon] = useState('🎁');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [assignedIds, setAssignedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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

    // Fetch existing reward
    useEffect(() => {
        if (!id) return;

        async function loadReward() {
            try {
                const reward = await RewardService.get(id!);
                if (reward) {
                    setTitle(reward.title);
                    setCost(reward.cost);
                    setIcon(reward.icon);
                    setAssignedIds(reward.assignedProfileIds || []);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load reward");
            } finally {
                setLoading(false);
            }
        }
        loadReward();
    }, [id]);

    const children = profiles ? profiles.filter(p => p.type === 'child') : [];

    const toggleChild = (id: string) => {
        setAssignedIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    // Removed duplicated getAvatarEmoji

    const handleSave = async () => {
        if (!id) return;
        if (!title.trim()) {
            toast.error('Please enter a reward name');
            return;
        }
        if (cost === '') {
            toast.error('Please enter a cost');
            return;
        }

        try {
            await updateReward(id, {
                title: title.trim(),
                cost: Number(cost),
                icon,
                assignedProfileIds: assignedIds
            });
            toast.success("Reward updated");
            router.back();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update reward");
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!id) return;
        try {
            await deleteReward(id);
            toast.success("Reward deleted");
            router.back();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete reward");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-safe-bottom font-sans text-slate-800">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800">Edit Reward</h1>
                </div>
                <button
                    onClick={handleDeleteClick}
                    className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition"
                >
                    <Trash size={18} />
                </button>
            </header>

            <main className="max-w-md mx-auto p-6 space-y-8">

                {/* Icon Selection */}
                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-slate-200 flex items-center justify-center text-6xl shadow-sm hover:scale-105 transition active:scale-95"
                    >
                        {icon}
                    </button>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tap to change icon</p>

                    {showEmojiPicker && (
                        <>
                            <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setShowEmojiPicker(false)} />
                            <div className="absolute top-28 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 w-[340px] h-[300px] bg-white animate-in slide-in-from-top-2 fade-in-20">
                                <IconSelector value={icon} onChange={setIcon} onClose={() => setShowEmojiPicker(false)} mode="reward" isPremium={isPremium} />
                            </div>
                        </>
                    )}
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 flex items-center">
                            Reward Name
                            <HelpButton title="Reward Name" text="Give it a fun name! 'Ice Cream Trip' sounds better than just 'Ice Cream'." />
                        </label>
                        <Input
                            placeholder="1 Hour Screen Time"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="h-12 bg-white border-slate-200 font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 flex items-center">
                            Cost (Stars)
                            <HelpButton title="Cost" text="How many stars does this cost? Tip: Make big rewards expensive so they take a few days to earn!" />
                        </label>
                        <div className="h-12 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between px-3">
                            <div className="flex items-center gap-2 flex-1">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={cost}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setCost('');
                                        else if (/^\d+$/.test(val)) setCost(Number(val));
                                    }}
                                    className="h-8 bg-transparent border-none text-yellow-700 font-bold text-lg p-0 focus-visible:ring-0 w-full text-center shadow-none"
                                />
                            </div>
                            <div className="flex gap-1 ml-2">
                                <button onClick={() => setCost(s => Math.max(0, (Number(s) || 0) - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm border border-yellow-100 hover:bg-yellow-100 font-bold text-lg">-</button>
                                <button onClick={() => setCost(s => (Number(s) || 0) + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm border border-yellow-100 hover:bg-yellow-100 font-bold text-lg">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <Users size={16} />
                                Assign To
                            </div>
                            <HelpButton title="Assign To" text="Who can buy this? You can make rewards specific to one child or let everyone see them." />
                        </label>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            <button
                                onClick={() => setAssignedIds([])}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition whitespace-nowrap",
                                    assignedIds.length === 0
                                        ? "bg-primary text-white border-primary"
                                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {assignedIds.length === 0 && <Check size={14} />}
                                All Children
                            </button>
                            {children?.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => toggleChild(child.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition whitespace-nowrap",
                                        assignedIds.includes(child.id)
                                            ? "bg-primary text-white border-primary"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <Avatar avatarId={child.avatarId} size="sm" showBorder={false} /> <span className="pt-0.5">{child.name}</span>
                                    {assignedIds.includes(child.id) && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200"
                >
                    Save Changes
                </Button>

            </main>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
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
                            onClick={() => setShowDeleteModal(false)}
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
        </div>
    );
}

export default function EditRewardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditRewardContent />
        </Suspense>
    );
}
