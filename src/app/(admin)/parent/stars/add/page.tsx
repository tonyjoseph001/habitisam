"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArrowLeft, Check, Minus, Plus, Star, PenLine, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export default function GiveStarsPage() {
    const router = useRouter();
    const { width, height } = useWindowSize();

    // State
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [amount, setAmount] = useState(50);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [customReason, setCustomReason] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Data
    const children = useLiveQuery(
        () => db.profiles.where('type').equals('child').toArray()
    );

    const selectedChild = children?.find(c => c.id === selectedChildId);

    // Handlers
    const handleUpdateAmount = (val: number) => {
        setAmount(prev => Math.max(0, prev + val));
    };

    const handleSelectReason = (reason: string) => {
        if (selectedReason === reason) {
            setSelectedReason(null);
        } else {
            setSelectedReason(reason);
            setCustomReason(""); // Clear custom if picking preset
        }
    };

    const handleSend = async () => {
        if (!selectedChildId) {
            toast.error("Please select a child to reward!");
            return;
        }

        if (amount <= 0) {
            toast.error("Please add some stars!");
            return;
        }

        try {
            // Create Inbox Reward (Pending Claim)
            await db.inboxRewards.add({
                id: crypto.randomUUID(),
                accountId: selectedChild?.accountId || 'unknown',
                profileId: selectedChildId,
                amount: amount,
                message: customReason || selectedReason || "Great job!",
                senderName: "Parent",
                status: 'pending',
                createdAt: new Date()
            });

            // Log Activity (Optional but good for history)
            await db.activityLogs.add({
                id: crypto.randomUUID(),
                accountId: selectedChild?.accountId || 'unknown', // Critical for syncing
                profileId: selectedChildId,
                activityId: 'manual_reward', // Special ID
                date: new Date().toISOString(),
                status: 'completed',
                starsEarned: amount,
                metadata: {
                    reason: customReason || selectedReason || "Ad-hoc Reward",
                    type: "manual_award"
                }
            });

            // Show Success
            setIsSuccess(true);

            // Navigate back after delay
            setTimeout(() => {
                router.back();
            }, 2500);

        } catch (error) {
            console.error(error);
            toast.error("Failed to send reward.");
        }
    };

    // Helper to get avatar emoji
    const getAvatarEmoji = (id?: string) => {
        switch (id) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'rocket': return '🚀';
            default: return '👶';
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-24 font-sans">
            {isSuccess && <Confetti width={width} height={height} numberOfPieces={200} recycle={false} />}

            {/* Header */}
            <header className="bg-white sticky top-0 z-50 px-6 py-4 flex items-center gap-4 border-b border-slate-100">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-800">Give Stars</h1>
            </header>

            <main className="max-w-md mx-auto p-6 space-y-8">

                {/* Child Selector */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Who gets it?</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 scrollbar-hide">
                        {children?.map(child => {
                            const isSelected = selectedChildId === child.id;

                            return (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChildId(child.id)}
                                    className="group relative flex flex-col items-center gap-2 min-w-[70px]"
                                >
                                    <div className={cn(
                                        "relative w-16 h-16 rounded-full p-1 transition-all duration-300 transform",
                                        isSelected
                                            ? "bg-blue-500 shadow-lg shadow-blue-200 scale-105"
                                            : "bg-white border-2 border-slate-100 opacity-60 hover:opacity-100 hover:border-blue-200"
                                    )}>
                                        <div className={cn(
                                            "w-full h-full rounded-full flex items-center justify-center text-4xl transition-colors",
                                            isSelected ? "bg-white" : "bg-slate-50"
                                        )}>
                                            {getAvatarEmoji(child.avatarId)}
                                        </div>

                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute top-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-white"
                                            >
                                                <Check className="w-3 h-3" strokeWidth={4} />
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-sm font-bold transition-colors",
                                        isSelected ? "text-blue-600" : "text-slate-500"
                                    )}>{child.name}</span>
                                </button>
                            );
                        })}
                        {(!children || children.length === 0) && (
                            <p className="text-sm text-slate-400 italic">No children found.</p>
                        )}
                    </div>
                </section>

                {/* Amount Selector */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Amount</h2>

                    <div className="flex items-center justify-center gap-8 mb-8">
                        <button
                            onClick={() => handleUpdateAmount(-5)}
                            className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center transition active:scale-90"
                        >
                            <Minus className="w-5 h-5" strokeWidth={3} />
                        </button>

                        <div className="flex flex-col items-center w-24">
                            <motion.div
                                key={amount}
                                initial={{ scale: 1.5, color: '#F59E0B' }}
                                animate={{ scale: 1, color: '#EAB308' }}
                                className="text-6xl font-black text-yellow-500 flex items-center gap-2 drop-shadow-sm"
                            >
                                {amount}
                            </motion.div>
                            <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide mt-1">Stars</span>
                        </div>

                        <button
                            onClick={() => handleUpdateAmount(5)}
                            className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-800 hover:bg-slate-100 flex items-center justify-center transition active:scale-90"
                        >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        <button onClick={() => setAmount(5)} className="py-2 rounded-xl bg-yellow-50 text-yellow-700 font-bold text-sm border border-yellow-100 hover:bg-yellow-100 transition active:scale-95">+5</button>
                        <button onClick={() => setAmount(10)} className="py-2 rounded-xl bg-yellow-50 text-yellow-700 font-bold text-sm border border-yellow-100 hover:bg-yellow-100 transition active:scale-95">+10</button>
                        <button onClick={() => setAmount(20)} className="py-2 rounded-xl bg-yellow-50 text-yellow-700 font-bold text-sm border border-yellow-100 hover:bg-yellow-100 transition active:scale-95">+20</button>
                        <button onClick={() => setAmount(100)} className="py-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-sm border border-purple-100 hover:bg-purple-100 transition active:scale-95">Jackpot!</button>
                    </div>
                </section>

                {/* Reason Selector */}
                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Reason (Optional)</h2>

                    <div className="flex flex-wrap gap-3 mb-4">
                        {[
                            { id: 'chores', label: 'Chores', emoji: '🧹' },
                            { id: 'helping', label: 'Helping Out', emoji: '🤝' },
                            { id: 'homework', label: 'Homework', emoji: '📚' },
                            { id: 'attitude', label: 'Good Attitude', emoji: '😊' },
                        ].map(tag => {
                            const isActive = selectedReason === tag.label;
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => handleSelectReason(tag.label)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-bold shadow-sm border transition flex items-center gap-2 active:scale-95",
                                        isActive
                                            ? "bg-blue-50 border-blue-500 text-blue-600"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-500"
                                    )}
                                >
                                    <span>{tag.emoji}</span> {tag.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={customReason}
                            onChange={(e) => {
                                setCustomReason(e.target.value);
                                if (e.target.value) setSelectedReason(null);
                            }}
                            placeholder="Or type a custom reason..."
                            className="w-full bg-white p-4 pr-10 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 placeholder-slate-300 transition"
                        />
                        <PenLine className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                    </div>
                </section>

            </main>

            {/* Footer Action */}
            <div className="fixed bottom-6 left-0 w-full px-6 max-w-md mx-auto right-0">
                <button
                    onClick={handleSend}
                    disabled={isSuccess}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition disabled:opacity-80 disabled:cursor-not-allowed"
                >
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    {isSuccess ? 'Sent!' : 'Send Reward'}
                </button>
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {isSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <div className="text-8xl mb-4 animate-bounce">⭐</div>
                            <h2 className="text-4xl font-black text-white mb-2">Sent!</h2>
                            <p className="text-slate-300 font-bold text-xl">
                                {selectedChild?.name} has a gift waiting!
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
