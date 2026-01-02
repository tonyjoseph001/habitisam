"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ArrowLeft, Check, Star, Users, HelpCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { toast } from 'sonner';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRewards } from '@/lib/hooks/useRewards';

import { Suspense } from 'react';

function AddRewardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/parent/rewards';
    const { activeProfile } = useSessionStore();

    const [title, setTitle] = useState('');
    const [cost, setCost] = useState<number | ''>(10);
    const [icon, setIcon] = useState('🎁');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [assignedIds, setAssignedIds] = useState<string[]>([]);

    const { profiles } = useProfiles();
    const { addReward } = useRewards();

    const children = profiles ? profiles.filter(p => p.type === 'child') : [];

    const toggleChild = (id: string) => {
        setAssignedIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

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

    const handleSave = async () => {
        if (!activeProfile?.accountId) {
            toast.error('Session error. Please refresh the page.');
            return;
        }
        if (!title.trim()) {
            toast.error('Please enter a reward name');
            return;
        }
        if (cost === '') {
            toast.error('Please enter a cost');
            return;
        }

        try {
            await addReward(
                title.trim(),
                Number(cost),
                icon,
                true, // requiresApproval
                assignedIds
            );
            toast.success("Reward created successfully!");
            router.push(returnUrl);
        } catch (error) {
            console.error("Failed to create reward", error);
            toast.error("Failed to create reward");
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-safe-bottom font-sans text-slate-800">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800">Add Reward</h1>
                </div>
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
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setShowEmojiPicker(false)}>
                            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                                <EmojiPicker
                                    theme={EmojiTheme.AUTO}
                                    onEmojiClick={(e) => {
                                        setIcon(e.emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                />
                            </div>
                        </div>
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
                                    <span className="text-lg leading-none">{getAvatarEmoji(child.avatarId)}</span> {child.name}
                                    {assignedIds.includes(child.id) && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Selected children will see this reward in their shop.</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200"
                >
                    Create Reward
                </Button>

            </main>

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

export default function AddRewardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AddRewardContent />
        </Suspense>
    );
}
