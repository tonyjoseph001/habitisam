"use client";

import React from 'react';
import Link from 'next/link';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import React from 'react';
import Link from 'next/link';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ShoppingBag, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { toast } from 'sonner';
import { PurchaseLog } from '@/lib/db';

export default function PurchaseHistoryPage() {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();
    const accountId = user?.uid || activeProfile?.accountId;

    const { profiles } = useProfiles();
    const { purchases: rawPurchases, approvePurchase, rejectPurchase } = usePurchases();

    // Enrich logs with profile data
    const purchases = rawPurchases.map(log => {
        const profile = profiles?.find(p => p.id === log.profileId);
        return {
            ...log,
            profileName: profile?.name,
            profileAvatarId: profile?.avatarId,
            profileColorTheme: profile?.colorTheme
        };
    }).sort((a, b) => {
        // Sort by purchasedAt descending
        // purchasedAt can be Timestamp or Date depending on source/converter? 
        // Converters usually return JS Date for Timestamps.
        const dateA = a.purchasedAt instanceof Date ? a.purchasedAt : new Date(a.purchasedAt);
        const dateB = b.purchasedAt instanceof Date ? b.purchasedAt : new Date(b.purchasedAt);
        return dateB.getTime() - dateA.getTime();
    });

    const pendingPurchases = purchases?.filter(p => p.status === 'pending') || [];
    const historyPurchases = purchases?.filter(p => p.status !== 'pending') || [];

    const getAvatarIcon = (avatarId?: string) => {
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

    const getProfileColor = (theme?: string) => {
        const colorMap: Record<string, string> = {
            cyan: 'bg-cyan-100 border-cyan-200',
            purple: 'bg-violet-100 border-violet-200',
            green: 'bg-emerald-100 border-emerald-200',
            orange: 'bg-orange-100 border-orange-200'
        };
        return colorMap[theme || 'cyan'] || 'bg-slate-100 border-slate-200';
    };

    const handleApprove = async (log: any) => {
        try {
            // Need to cast log back to PurchaseLog or ensure type compatibility
            await approvePurchase(log as PurchaseLog);
            toast.success("Request approved");
        } catch (e) {
            console.error(e);
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (log: any) => {
        try {
            await rejectPurchase(log as PurchaseLog);
            toast.success("Request rejected");
        } catch (e) {
            console.error(e);
            toast.error("Failed to reject");
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* Header */}
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Link href="/parent/rewards">
                        <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent text-slate-500">
                            <ArrowLeft className="w-6 h-6" />
                            <span className="sr-only">Back</span>
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900">Purchase History</h1>
                </div>
            </header>

            <main className="p-4 flex flex-col gap-6 max-w-screen-md mx-auto">
                {/* 1. PENDING REQUESTS SECTION */}
                {pendingPurchases?.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-1">
                            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Pending Requests</h3>
                            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingPurchases.length}</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {pendingPurchases.map((log) => {
                                const AvatarIcon = getAvatarIcon(log.profileAvatarId);
                                const colorClass = getProfileColor(log.profileColorTheme);
                                const isOrphaned = !log.profileName;

                                return (
                                    <div key={log.id} className={cn("bg-white rounded-xl p-4 shadow-md border-l-4 flex flex-col gap-3 animate-in slide-in-from-left-2", isOrphaned ? "border-slate-400 opacity-75" : "border-orange-400")}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 flex-shrink-0", colorClass)}>
                                                    {AvatarIcon}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {isOrphaned ? "Deleted Profile" : `${log.profileName} wants`}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xl">{log.rewardSnapshot.icon}</span>
                                                        <h3 className="font-bold text-slate-900 text-sm">{log.rewardSnapshot.title}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-1 text-orange-600 font-black text-lg">
                                                    {log.rewardSnapshot.cost} <Star className="w-4 h-4 fill-current" />
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {formatDistanceToNow(log.purchasedAt, { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                            <Button
                                                onClick={() => handleReject(log)}
                                                variant="outline"
                                                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
                                            >
                                                {isOrphaned ? "Delete Record" : "Reject"}
                                            </Button>
                                            <Button
                                                onClick={() => handleApprove(log)}
                                                className={cn("w-full shadow-sm shadow-green-200", isOrphaned ? "bg-slate-300 text-white cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white")}
                                                disabled={isOrphaned} // Actually handleApprove handles it, but disabled is better UI
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}


                {/* 2. HISTORY SECTION */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">History</h3>

                    {historyPurchases?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <ShoppingBag className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-700 text-sm">No History Yet</h3>
                            <p className="text-xs text-slate-500 max-w-xs">
                                Past purchases and decisions will appear here.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {historyPurchases?.map((log) => {
                            const AvatarIcon = getAvatarIcon(log.profileAvatarId);
                            const colorClass = getProfileColor(log.profileColorTheme);
                            const isRejected = log.status === 'rejected';

                            return (
                                <div key={log.id} className={cn("bg-white rounded-xl p-3 shadow-sm border flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity", isRejected ? "border-slate-100 bg-slate-50/50" : "border-slate-200")}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 flex-shrink-0 grayscale opacity-70", colorClass)}>
                                            {AvatarIcon}
                                        </div>

                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-base grayscale">{log.rewardSnapshot.icon}</span>
                                                <h3 className={cn("font-bold text-sm leading-tight", isRejected ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900")}>
                                                    {log.rewardSnapshot.title}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium h-4">
                                                <span>{log.profileName}</span>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(log.purchasedAt, { addSuffix: true })}</span>
                                                {isRejected && <span className="text-red-400 font-bold bg-red-50 px-1 rounded">Rejected</span>}
                                                {log.status === 'approved' && <span className="text-green-600 font-bold bg-green-50 px-1 rounded">Approved</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 pr-1">
                                        <span className={cn("font-bold text-sm", isRejected ? "text-slate-400 line-through" : "text-red-500")}>
                                            -{log.rewardSnapshot.cost}
                                        </span>
                                        <Star className={cn("w-3 h-3 fill-current", isRejected ? "text-slate-300" : "text-red-500")} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
