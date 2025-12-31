"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Home, Gift, CheckSquare, List, AlertCircle, ArrowRight, X, Clock, ShoppingBag, Package } from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { type Reward } from '@/lib/db';
import ChildHeader from '@/components/child/ChildHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRewards } from '@/lib/hooks/useRewards';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { toast } from 'sonner';

const REWARD_PALETTE = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff9f1c'];

export default function ChildShopPage() {
    const { activeProfile } = useSessionStore();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');

    const { profiles } = useProfiles();
    const { rewards: allRewards } = useRewards();
    const { purchases: allPurchases, addPurchase, claimInstant } = usePurchases();

    useEffect(() => {
        setMounted(true);
    }, []);

    const liveProfile = profiles?.find(p => p.id === activeProfile?.id);

    // Filter rewards for this child
    const rewards = allRewards?.filter(r => {
        if (!activeProfile) return false;
        return !r.assignedProfileIds ||
            r.assignedProfileIds.length === 0 ||
            r.assignedProfileIds.includes(activeProfile.id);
    }) || [];

    // Filter history for this child
    const purchaseHistory = allPurchases?.filter(p =>
        p.profileId === activeProfile?.id
    ).sort((a, b) => {
        const dateA = new Date(a.purchasedAt).getTime();
        const dateB = new Date(b.purchasedAt).getTime();
        return dateB - dateA;
    }) || [];

    const pendingRequests = purchaseHistory.filter(p => p.status === 'pending');

    const handleClaimClick = (reward: Reward) => {
        setSelectedReward(reward);
        setIsSuccess(false);
        setIsConfirmOpen(true);
    };

    const confirmClaim = async () => {
        if (!activeProfile || !selectedReward) return;

        const requiresApproval = selectedReward.requiresApproval !== false;

        try {
            if (requiresApproval) {
                await addPurchase({
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
                // Instant claim
                await claimInstant({
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
            }

            setIsSuccess(true);
        } catch (error) {
            console.error("Claim failed", error);
            toast.error("Failed to claim reward");
        }
    };

    const handleCloseModal = () => {
        setIsConfirmOpen(false);
        setTimeout(() => setIsSuccess(false), 300);
    };

    if (!activeProfile) return null;

    const displayProfile = liveProfile || activeProfile;
    const balance = displayProfile.stars || 0;
    const items = rewards || [];
    const history = purchaseHistory || [];
    const pendingIds = new Set(pendingRequests?.map(r => r.rewardSnapshot.id) || []);

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#EEF2FF] select-none font-sans text-[#2B2D42]">

            <div className="flex-none bg-[#EEF2FF] z-50">
                <ChildHeader title="Rewards" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-32">
                {/* Premium Wallet Card */}
                <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl mb-6 group">
                    {/* Animated Gradient Background - Darker Colors */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBfiWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>

                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-[shimmer_3s_infinite]"></div>

                    {/* Floating Stars Decoration */}
                    <div className="absolute top-4 right-4 text-4xl animate-[float_3s_ease-in-out_infinite]">⭐</div>
                    <div className="absolute top-12 right-16 text-2xl animate-[float_4s_ease-in-out_infinite] opacity-60">✨</div>
                    <div className="absolute bottom-6 right-8 text-3xl animate-[float_3.5s_ease-in-out_infinite] opacity-80">💎</div>

                    <style jsx>{`
                        @keyframes shimmer {
                            0% { transform: translateX(-150%) skewX(-12deg); }
                            100% { transform: translateX(150%) skewX(-12deg); }
                        }
                        @keyframes float {
                            0%, 100% { transform: translateY(0px); }
                            50% { transform: translateY(-10px); }
                        }
                    `}</style>

                    <div className="relative z-10 p-8 text-white">
                        <div>
                            <p className="text-sm font-bold text-white/80 uppercase tracking-widest mb-3">Star Wallet</p>
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-5xl font-black tracking-tight drop-shadow-lg">{balance.toLocaleString()}</h1>
                                <span className="text-2xl">⭐</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab('shop')}
                        className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'shop'
                            ? 'bg-white text-purple-600 shadow-lg'
                            : 'bg-white/50 text-gray-600 hover:bg-white/80'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ShoppingBag className="w-4 h-4" />
                            <span>Shop ({items.length})</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'inventory'
                            ? 'bg-white text-purple-600 shadow-lg'
                            : 'bg-white/50 text-gray-600 hover:bg-white/80'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>My Stuff ({history.length})</span>
                        </div>
                    </button>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'shop' ? (
                        <motion.div
                            key="shop"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                                {items.length === 0 ? (
                                    <div className="col-span-2 text-center py-16 text-gray-400 text-sm">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-bold">No rewards available yet!</p>
                                        <p className="text-xs mt-1">Ask a parent to add some.</p>
                                    </div>
                                ) : (
                                    items.map((item, index) => {
                                        const paletteColor = REWARD_PALETTE[index % REWARD_PALETTE.length];
                                        const canAfford = balance >= item.cost;
                                        const isPending = pendingIds.has(item.id);

                                        return (
                                            <div
                                                key={item.id}
                                                className="rounded-[2rem] p-4 shadow-lg relative group overflow-hidden transition-all hover:scale-105"
                                                style={{ background: paletteColor }}
                                            >
                                                {/* Glossy Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                                                <div className="relative z-10">
                                                    {/* Icon */}
                                                    <div className="w-full aspect-square bg-white/20 backdrop-blur-sm rounded-2xl mb-3 flex items-center justify-center border border-white/10">
                                                        <span className="text-8xl drop-shadow-lg transform group-hover:scale-110 transition-transform">
                                                            {item.icon}
                                                        </span>
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="font-black text-white text-sm mb-2 text-center leading-tight drop-shadow-md">
                                                        {item.title}
                                                    </h3>

                                                    {/* Price Badge */}
                                                    <div className="bg-black/20 backdrop-blur-md rounded-xl px-3 py-2 mb-3 border border-white/10 flex items-center justify-center gap-1">
                                                        <span className="text-lg">⭐</span>
                                                        <span className="font-black text-white text-base">{item.cost.toLocaleString()}</span>
                                                    </div>

                                                    {/* Action Button */}
                                                    <button
                                                        onClick={() => handleClaimClick(item)}
                                                        disabled={!canAfford || (isPending && (item.requiresApproval !== false))}
                                                        className={`w-full font-bold py-3 rounded-xl text-xs transition-all shadow-lg ${isPending && (item.requiresApproval !== false)
                                                            ? 'bg-yellow-500 text-white cursor-not-allowed'
                                                            : canAfford
                                                                ? 'bg-white text-gray-800 hover:scale-105 active:scale-95'
                                                                : 'bg-white/30 text-white/50 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {isPending && (item.requiresApproval !== false) ? '⏳ Pending' : (canAfford ? '🎁 Claim' : '🔒 Locked')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="inventory"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="space-y-3 pb-4">
                                {history.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400 text-sm">
                                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-bold">No purchases yet!</p>
                                        <p className="text-xs mt-1">Start shopping to see your items here.</p>
                                    </div>
                                ) : (
                                    history.map((purchase) => (
                                        <div key={purchase.id} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl">
                                                    {purchase.rewardSnapshot.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{purchase.rewardSnapshot.title}</h4>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs font-bold text-gray-600">⭐ {purchase.rewardSnapshot.cost}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${purchase.status === 'approved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : purchase.status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {purchase.status === 'approved' ? '✓ Approved' :
                                                            purchase.status === 'pending' ? '⏳ Pending' : '✗ Denied'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Confirmation Modal */}
            {mounted && isConfirmOpen && selectedReward && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleCloseModal}
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 to-pink-500"></div>

                        {!isSuccess ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-6xl border border-purple-100 shadow-sm">
                                    {selectedReward.icon}
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">{selectedReward.title}</h3>

                                {selectedReward.requiresApproval !== false ? (
                                    <div className="inline-flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 mb-6">
                                        <AlertCircle className="w-4 h-4 text-yellow-700" />
                                        <span className="text-xs font-bold text-yellow-800">Parent Approval Required</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-200 mb-6">
                                        <Gift className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-bold text-green-700">Instant Claim</span>
                                    </div>
                                )}

                                <div className="bg-slate-50 rounded-2xl p-4 mb-6 w-full border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-500">Current Balance</span>
                                        <span className="text-sm font-bold text-slate-800">{balance.toLocaleString()} ⭐</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2 text-red-500">
                                        <span className="text-sm font-bold">Cost</span>
                                        <span className="text-sm font-bold">-{selectedReward.cost.toLocaleString()} ⭐</span>
                                    </div>
                                    <div className="w-full h-px bg-slate-200 my-2"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-800">New Balance</span>
                                        <span className="text-base font-black text-purple-600">{Math.max(0, balance - selectedReward.cost).toLocaleString()} ⭐</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button
                                        onClick={handleCloseModal}
                                        className="py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmClaim}
                                        className="py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                    >
                                        <Gift className="w-5 h-5" />
                                        {selectedReward.requiresApproval !== false ? 'Request' : 'Claim'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-6">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500 border border-green-100">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">
                                    {selectedReward.requiresApproval !== false ? 'Request Sent!' : 'Claimed!'}
                                </h2>
                                <p className="text-slate-500 text-center text-sm font-bold mb-6">
                                    {selectedReward.requiresApproval !== false
                                        ? 'Your parent will review your request.'
                                        : 'Enjoy your reward!'}
                                </p>
                                <button
                                    onClick={handleCloseModal}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    Awesome!
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}
