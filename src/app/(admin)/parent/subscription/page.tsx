"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Check, X, Star, Crown, ShieldCheck } from 'lucide-react';
import { TIER_LIMITS } from '@/config/tiers';
import { useSessionStore } from '@/lib/store/useSessionStore';
// Assuming session store or similar holds valid 'isPaid' or licenseType info. 
// For now, we default to showing the upgrade view.

export default function SubscriptionPage() {
    const router = useRouter();

    // In a real app, you'd fetch this from your auth/user store
    const currentTier = 'free'; // Mocked for now

    const features = [
        {
            label: "Children Profiles",
            free: `${TIER_LIMITS.free.maxChildren} Max`,
            pro: `${TIER_LIMITS.pro.maxChildren} Max`,
            icon: "👶"
        },
        {
            label: "Daily Routines",
            free: `${TIER_LIMITS.free.maxRoutinesPerChild} / Child`,
            pro: "Unlimited*",
            icon: "📅"
        },
        {
            label: "Habits",
            free: `${TIER_LIMITS.free.maxHabits} / Child`,
            pro: "Unlimited*",
            icon: "✨"
        },
        {
            label: "Premium Avatars",
            free: false,
            pro: true,
            icon: "👾"
        },
        {
            label: "Color Themes",
            free: false,
            pro: true,
            icon: "🎨"
        },
        {
            label: "Weekly Analytics",
            free: false,
            pro: true,
            icon: "📊"
        },
        {
            label: "Ad-Free Experience",
            free: false,
            pro: true,
            icon: "🚫"
        },
        {
            label: "Multi-Parent Management",
            free: false,
            pro: true,
            icon: "👥"
        }
    ];

    const handleUpgrade = () => {
        // Placeholder for Payment Logic
        alert("Payment integration coming soon!");
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-slate-900 text-white pb-12 pt-8 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600 rounded-full mix-blend-screen blur-3xl opacity-20 -mr-16 -mt-16 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 rounded-full mix-blend-screen blur-3xl opacity-10 -ml-10 -mb-10"></div>

                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-amber-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-900/50">
                        <Crown className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">Unlock Pro</h1>
                    <p className="text-slate-300 font-medium text-sm max-w-xs mx-auto">
                        Give your family the ultimate habit-building toolkit.
                    </p>
                </div>
            </div>

            <main className="px-4 -mt-8 relative z-20 max-w-md mx-auto">
                {/* Pricing Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 mb-6">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Monthly</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-800">$2.99</span>
                                <span className="text-slate-500 font-medium">/mo</span>
                            </div>
                        </div>
                        <div className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">
                            Cancel Anytime
                        </div>
                    </div>

                    <Button
                        onClick={handleUpgrade}
                        className="w-full h-14 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-violet-200 active:scale-95 transition-all mb-4"
                    >
                        Start Free Trial
                    </Button>
                    <p className="text-center text-xs text-slate-400">7 days free, then $2.99/mo</p>
                </div>

                {/* Comparison Table */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100">
                    <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                        <div className="text-left pl-2">Feature</div>
                        <div>Free</div>
                        <div className="text-violet-600">Pro</div>
                    </div>

                    {features.map((feat, i) => (
                        <div key={i} className="grid grid-cols-3 p-4 border-b border-slate-50 last:border-none items-center text-sm">
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                                <span className="text-base">{feat.icon}</span>
                                <span className="leading-tight">{feat.label}</span>
                            </div>

                            {/* Free Column */}
                            <div className="text-center text-slate-500 font-medium">
                                {feat.free === true ? (
                                    <Check className="w-5 h-5 mx-auto text-green-500" />
                                ) : feat.free === false ? (
                                    <X className="w-4 h-4 mx-auto text-slate-300" />
                                ) : (
                                    <span>{feat.free}</span>
                                )}
                            </div>

                            {/* Pro Column */}
                            <div className="text-center font-bold text-violet-700 bg-violet-50/50 py-1 rounded-lg">
                                {feat.pro === true ? (
                                    <Check className="w-5 h-5 mx-auto text-violet-600" />
                                ) : (
                                    <span>{feat.pro}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-8 pb-4">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                        <ShieldCheck className="w-4 h-4" />
                        Safe & Secure
                    </div>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                        Payment processed securely by App Store. Manage subscription in phone settings.
                    </p>
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
