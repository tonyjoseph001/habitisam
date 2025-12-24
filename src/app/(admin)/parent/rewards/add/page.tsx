"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ArrowLeft, Check, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';

export default function AddRewardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/parent/rewards';
    const { activeProfile } = useSessionStore();

    const [title, setTitle] = useState('');
    const [cost, setCost] = useState(10);
    const [icon, setIcon] = useState('🎁');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [assignedIds, setAssignedIds] = useState<string[]>([]);

    const children = useLiveQuery(async () => {
        if (!activeProfile?.accountId) return [];
        return await db.profiles
            .where('accountId').equals(activeProfile.accountId)
            .filter(p => p.type === 'child')
            .toArray();
    }, [activeProfile?.accountId]);

    const toggleChild = (id: string) => {
        setAssignedIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!activeProfile?.accountId) return;
        if (!title.trim()) return alert('Please enter a reward name');

        await db.rewards.add({
            isActive: true, // Required by Reward interface (was boolean in interface definition?) - actually interface says `isActive: boolean`
            title: title.trim(),
            cost: Number(cost),
            icon,
            accountId: activeProfile.accountId,
            assignedProfileIds: assignedIds,
            requiresApproval: true, // Default
            createdAt: new Date()
        });

        router.push(returnUrl);
    };

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
                        <label className="text-sm font-bold text-slate-600">Reward Name</label>
                        <Input
                            placeholder="e.g. 1 Hour Screen Time"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="h-12 bg-white border-slate-200 font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600">Cost (Stars)</label>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                                <Star className="fill-current w-6 h-6" />
                            </div>
                            <Input
                                type="number"
                                value={cost}
                                onChange={e => setCost(Number(e.target.value))}
                                className="h-12 bg-white border-slate-200 font-bold text-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Users size={16} />
                            Assign To
                        </label>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            <button
                                onClick={() => setAssignedIds([])}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition whitespace-nowrap",
                                    assignedIds.length === 0
                                        ? "bg-slate-800 text-white border-slate-800"
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
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {child.avatarId || '🦁'} {child.name}
                                    {assignedIds.includes(child.id) && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Selected children will see this reward in their shop.</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200"
                >
                    Create Reward
                </Button>

            </main>
        </div>
    );
}
