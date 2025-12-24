"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Home, Gift, CheckSquare, List, AlertCircle, ArrowRight, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { createPortal } from 'react-dom';
import { type Reward } from '@/lib/db';
import ChildHeader from '@/components/child/ChildHeader';

const REWARD_COLORS = [
    'bg-orange-50',
    'bg-red-50',
    'bg-green-50',
    'bg-blue-50',
    'bg-purple-50',
    'bg-yellow-50',
];

export default function ChildShopPage() {
    const { activeProfile } = useSessionStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const liveProfile = useLiveQuery(
        () => db.profiles.get(activeProfile?.id || ''),
        [activeProfile?.id]
    );

    const rewards = useLiveQuery(async () => {
        if (!activeProfile) return [];
        const allRewards = await db.rewards.toArray();
        return allRewards.filter(r => {
            // Include if no assignment (all) OR assigned to this profile
            return !r.assignedProfileIds ||
                r.assignedProfileIds.length === 0 ||
                r.assignedProfileIds.includes(activeProfile.id);
        });
    }, [activeProfile?.id]);

    const pendingRequests = useLiveQuery(async () => {
        if (!activeProfile) return [];
        return await db.purchaseLogs
            .where({ profileId: activeProfile.id, status: 'pending' })
            .toArray();
    }, [activeProfile?.id]);

    const handleClaimClick = (reward: Reward) => {
        setSelectedReward(reward);
        setIsSuccess(false); // Reset success state
        setIsConfirmOpen(true);
    };

    const confirmClaim = async () => {
        if (!activeProfile || !selectedReward) return;

        const requiresApproval = selectedReward.requiresApproval !== false; // Default true

        if (requiresApproval) {
            // 1. Request Flow (Pending)
            await db.purchaseLogs.add({
                id: crypto.randomUUID(),
                accountId: activeProfile.accountId,
                profileId: activeProfile.id,
                rewardSnapshot: {
                    id: selectedReward.id,
                    title: selectedReward.title,
                    icon: selectedReward.icon,
                    cost: selectedReward.cost,
                },
                status: 'pending',
                purchasedAt: new Date(),
            });
        } else {
            // 2. Instant Buy Flow (Approved)
            await db.transaction('rw', db.profiles, db.purchaseLogs, async () => {
                // Deduct stars
                const newBalance = Math.max(0, (activeProfile.stars || 0) - selectedReward.cost);
                await db.profiles.update(activeProfile.id, { stars: newBalance });

                // Log purchase
                await db.purchaseLogs.add({
                    id: crypto.randomUUID(),
                    accountId: activeProfile.accountId,
                    profileId: activeProfile.id,
                    rewardSnapshot: {
                        id: selectedReward.id,
                        title: selectedReward.title,
                        icon: selectedReward.icon,
                        cost: selectedReward.cost,
                    },
                    status: 'approved',
                    purchasedAt: new Date(),
                });
            });
        }

        setIsSuccess(true);
    };

    const handleCloseModal = () => {
        setIsConfirmOpen(false);
        setTimeout(() => setIsSuccess(false), 300); // Reset after close animation
    };

    if (!activeProfile) return null;

    // Use live data if available
    const displayProfile = liveProfile || activeProfile;
    const balance = displayProfile.stars || 0;
    const items = rewards || [];
    const pendingIds = new Set(pendingRequests?.map(r => r.rewardSnapshot.id) || []);

    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayProfile.name || 'Adam'}&clothing=graphicShirt`;

    return (
        <div className="min-h-screen bg-[#EEF2FF] pb-32 select-none relative font-sans text-[#2B2D42]">
            {/* Inject custom animations */}
            <style jsx global>{`
                @keyframes shine {
                    0% { transform: translateX(-150%) skewX(-15deg); }
                    50%, 100% { transform: translateX(150%) skewX(-15deg); }
                }
                .animate-shine {
                    animation: shine 3s infinite;
                }
            `}</style>

            <div className="pt-2 pb-2">

                {/* Header */}
                <ChildHeader showBack={true} />

                {/* Hero Card */}
                <div className="relative w-full h-44 rounded-[2rem] overflow-hidden shadow-[0_15px_30px_-5px_rgba(255,159,28,0.4)] group transform transition-transform hover:scale-[1.02]">

                    {/* Backgrounds */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500"></div>
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white opacity-20 rounded-full blur-3xl mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-300 opacity-20 rounded-full blur-2xl mix-blend-overlay"></div>

                    {/* Shine Effect */}
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shine"></div>

                    <div className="relative z-10 p-6 h-full flex flex-col justify-between text-white">

                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-yellow-100 uppercase tracking-widest mb-1">Balance</p>
                                <div className="flex items-baseline gap-1">
                                    <h1 className="text-5xl font-black tracking-tighter drop-shadow-sm">{balance.toLocaleString()}</h1>
                                    <span className="text-xl font-bold text-yellow-200">⭐</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                                <img src="https://cdn-icons-png.flaticon.com/512/3112/3112946.png" className="w-8 h-8 object-contain drop-shadow-sm" alt="Trophy" />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-[10px] font-bold text-white/90 mb-2 px-1">
                                <span>Level 2 Champion</span>
                                <span>Next: Level 3</span>
                            </div>
                            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                                <div className="bg-white h-full w-[60%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Catalog */}
            <div className="px-5 mt-4">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                        <span className="text-lg">🎁</span> Catalog
                    </h2>
                    <button className="text-xs font-bold text-gray-400 hover:text-[#FF9F1C] transition-colors">Sort by Price</button>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-4">
                    {items.length === 0 ? (
                        <div className="col-span-2 text-center py-10 text-gray-400 text-sm">
                            No rewards available yet! Ask a parent to add some.
                        </div>
                    ) : (
                        items.map((item, index) => {
                            // Cycle through background colors
                            const bgColor = REWARD_COLORS[index % REWARD_COLORS.length];
                            const canAfford = balance >= item.cost;
                            const isPending = pendingIds.has(item.id);

                            return (
                                <div key={item.id} className="bg-white p-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center relative group">

                                    <div className={`h-20 w-full ${bgColor} rounded-xl mb-2 flex items-center justify-center p-2`}>
                                        <span className="text-4xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300">
                                            {item.icon}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-sm mb-1 text-center leading-tight">{item.title}</h3>
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-yellow-500 text-xs">⭐</span>
                                        <span className="font-extrabold text-gray-600 text-sm">{item.cost.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={() => handleClaimClick(item)}
                                        disabled={!canAfford || (isPending && (item.requiresApproval !== false))}
                                        className={`w-full font-bold py-1.5 rounded-lg text-xs transition-colors ${isPending && (item.requiresApproval !== false)
                                            ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed border border-yellow-200'
                                            : canAfford
                                                ? 'bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isPending && (item.requiresApproval !== false) ? 'Pending... 🕒' : (canAfford ? 'Claim' : 'Need more ⭐')}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>



            {/* Confirmation Modal */}
            {mounted && isConfirmOpen && selectedReward && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={handleCloseModal}
                    />

                    {/* Modal Content */}
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-400 hover:bg-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {!isSuccess ? (
                            // CONFIRMATION VIEW
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-6xl shadow-inner">
                                        {selectedReward.icon}
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 mb-1">{selectedReward.title}</h2>

                                    {selectedReward.requiresApproval !== false ? (
                                        <div className="inline-flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                                            <AlertCircle className="w-4 h-4 text-yellow-700" />
                                            <span className="text-xs font-bold text-yellow-800">Parent Approval Required</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                            <Gift className="w-4 h-4 text-green-600" />
                                            <span className="text-xs font-bold text-green-700">Instant Claim</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-gray-500">Current Balance</span>
                                        <span className="text-sm font-bold text-gray-800">{balance.toLocaleString()} ⭐</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2 text-red-500">
                                        <span className="text-sm font-bold">Cost</span>
                                        <span className="text-sm font-bold">-{selectedReward.cost.toLocaleString()} ⭐</span>
                                    </div>
                                    <div className="w-full h-px bg-gray-200 my-2"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-800">New Balance</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-black text-[#FF9F1C]">{Math.max(0, balance - selectedReward.cost).toLocaleString()} ⭐</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={confirmClaim}
                                    className="w-full bg-[#FF9F1C] hover:bg-orange-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_0_0_#e68a00] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>{selectedReward.requiresApproval !== false ? 'Send Request' : 'Claim Now'}</span>
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            // SUCCESS VIEW
                            <div className="flex flex-col items-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-500">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-black text-gray-800 mb-2">
                                    {selectedReward.requiresApproval !== false ? 'Request Sent!' : 'Reward Claimed!'}
                                </h2>
                                <p className="text-gray-500 text-center text-sm font-bold mb-6">
                                    {selectedReward.requiresApproval !== false
                                        ? 'Your parent will see your request on their dashboard.'
                                        : 'Enjoy your reward!'}
                                </p>
                                <button
                                    onClick={handleCloseModal}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-1 transition-all"
                                >
                                    OK
                                </button>
                            </div>
                        )}

                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
