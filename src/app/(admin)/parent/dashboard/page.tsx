"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Settings, Plus, Star, Zap, ChevronDown, Check, Clock, User as UserIcon, X, CheckCheck } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ParentDashboard() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    // Directive A: Local State
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

    // Directive B: Real Data
    const childProfiles = useLiveQuery(
        () => db.profiles.where('type').equals('child').toArray()
    );

    const allRoutines = useLiveQuery(
        () => db.activities.toArray()
    );

    const pendingGoals = useLiveQuery(
        () => db.goals.where('status').equals('pending_approval').toArray()
    );

    const getChild = (id: string) => childProfiles?.find(p => p.id === id);

    // ... (rest of filtering logic remains the same)
    const filteredRoutines = allRoutines?.filter(routine => {
        if (selectedChildIds.length === 0) return true;
        return routine.profileIds.some(id => selectedChildIds.includes(id));
    });

    const toggleChildSelection = (id: string) => {
        if (selectedChildIds.includes(id)) {
            setSelectedChildIds(prev => prev.filter(cid => cid !== id));
        } else {
            setSelectedChildIds(prev => [...prev, id]);
        }
    };

    const totalStars = 150;
    const streak = 5;

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className={className} />;
        return <span className={cn(className?.includes('w-6') ? 'text-2xl' : 'text-xl', "leading-none")}>{name}</span>;
    };

    const getAvatarIcon = (avatarId?: string) => {
        switch (avatarId) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'rocket': return '🚀';
            default: return '👶';
        }
    };

    const handleApprove = async (goalId: string) => {
        await db.goals.update(goalId, { status: 'active' });
    };

    const handleDeny = async (goalId: string) => {
        if (confirm("Reject this goal request?")) {
            await db.goals.delete(goalId);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* 1. Header Bar: Compact */}
            <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm sticky top-0 z-30 border-b border-slate-200">
                <button
                    onClick={() => setIsSwitcherOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 border border-violet-200">
                        {activeProfile?.avatarId ? (
                            <span className="text-sm font-bold">{activeProfile.name[0]}</span>
                        ) : (
                            <UserIcon className="w-4 h-4" />
                        )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {pendingGoals && pendingGoals.length > 0 ? (
                    <Link href="/parent/routines" className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full animate-pulse">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold">{pendingGoals.length} Approval{pendingGoals.length > 1 ? 's' : ''}</span>
                    </Link>
                ) : (
                    <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
                )}

                <Link href="/parent/profiles" className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-full">
                    <Settings className="w-5 h-5" />
                </Link>
            </header>




            <ProfileSwitcherModal
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />

            <main className="py-4 flex flex-col gap-6 max-w-screen-md mx-auto">



                {/* 2. Quick Stats Card: Compact with margins */}
                <div className="mx-4 bg-gradient-to-r from-violet-600 to-teal-400 rounded-xl p-4 text-white shadow-sm relative overflow-hidden border border-white/10">
                    <div className="relative z-10 flex justify-between items-start text-center">
                        <div className="flex flex-col items-center flex-1">
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mb-0.5">TODAY</p>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-extrabold leading-none">2/3</span>
                                <span className="text-[9px] lowercase opacity-80 mt-0.5">routines done</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mb-0.5">STARS</p>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-extrabold leading-none">{totalStars}</span>
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mb-0.5">STREAK</p>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-extrabold leading-none">{streak}</span>
                                <span className="text-xl">🔥</span>
                            </div>
                            <span className="text-[9px] opacity-80 mt-0.5">days</span>
                        </div>
                    </div>
                </div>

                {/* 2. Approvals Section */}
                {pendingGoals && pendingGoals.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-5">
                            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                Approvals Needed
                            </h3>
                        </div>
                        <div className="flex flex-col gap-2 px-4">
                            {pendingGoals.map(goal => {
                                const child = getChild(goal.profileId);
                                return (
                                    <div key={goal.id} className="bg-white rounded-xl p-3 shadow-md border border-orange-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-2xl border-2 border-white shadow-sm">
                                                {getAvatarIcon(child?.avatarId)}
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="font-bold text-slate-800 text-sm">{goal.title}</h4>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <span className="font-bold text-violet-600">{child?.name}</span>
                                                    <span>•</span>
                                                    <span>Target: {goal.target} {goal.unit || 'units'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeny(goal.id)}
                                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(goal.id)}
                                                className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 hover:scale-110 flex items-center justify-center transition-all shadow-sm"
                                            >
                                                <CheckCheck className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 4. Quick Actions: Smaller */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5">Quick Actions</h3>
                    <div className="flex justify-between gap-3 px-4">
                        <button
                            onClick={() => router.push('/parent/routines/new')}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 hover:border-violet-200 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-1">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">New Routine</span>
                        </button>

                        <button className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 opacity-60 cursor-not-allowed">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">Add Stars</span>
                        </button>

                        <button className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 opacity-60 cursor-not-allowed">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-1">
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">Quick Task</span>
                        </button>
                    </div>
                </div>

                {/* 5. Today's Routines: Slim scale */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5">Today's Routines</h3>

                    <div className="flex flex-col gap-2 px-4">
                        {filteredRoutines?.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs bg-white rounded-xl border border-slate-100 shadow-sm border-dashed">
                                No routines for selected children.
                            </div>
                        )}

                        {filteredRoutines?.map(routine => {
                            return (
                                <div key={routine.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                                            <RenderIcon name={routine.icon || 'Star'} className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="font-bold text-slate-800 text-sm">{routine.title}</h4>

                                            {/* Child Icons */}
                                            <div className="flex items-center gap-1 mt-1">
                                                {routine.profileIds.map((pid: string) => {
                                                    const child = getChild(pid);
                                                    if (!child) return null;
                                                    const colorMap: Record<string, string> = {
                                                        cyan: 'bg-cyan-100 text-cyan-700',
                                                        purple: 'bg-violet-100 text-violet-700',
                                                        green: 'bg-emerald-100 text-emerald-700',
                                                        orange: 'bg-orange-100 text-orange-700'
                                                    };
                                                    const colorClass = colorMap[child.colorTheme || 'cyan'] || 'bg-slate-100';
                                                    return (
                                                        <div key={pid} className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded-full", colorClass)}>
                                                            <span className="text-xs leading-none">{getAvatarIcon(child.avatarId)}</span>
                                                            <span className="text-[10px] font-bold leading-none">{child.name}</span>
                                                        </div>
                                                    )
                                                })}
                                                <div className="w-px h-3 bg-slate-200 mx-1"></div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{routine.timeOfDay}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status: Compact */}
                                    <div className="flex items-center gap-1 text-slate-300">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>

            <ParentNavBar />
        </div >
    );
}
