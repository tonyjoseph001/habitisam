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
import { Button } from '@/components/ui/button';

export default function ParentDashboard() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    // Directive A: Local State
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

    // Approval States
    const [approvingGoal, setApprovingGoal] = useState<any | null>(null);
    const [rejectingGoal, setRejectingGoal] = useState<any | null>(null);
    const [awardStars, setAwardStars] = useState<number>(0);

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

    const pendingPurchases = useLiveQuery(
        () => db.purchaseLogs.filter(p => p.status === 'pending').toArray()
    );

    const totalAlerts = (pendingGoals?.length || 0) + (pendingPurchases?.length || 0);

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

    // --- NEW STATS CARD ---
    const StatsCard = () => (
        <div className="mx-4 relative overflow-hidden bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-30"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-30"></div>

            <div className="relative z-10 grid grid-cols-2 gap-6">

                <div className="flex flex-col gap-1 border-r border-white/10">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Needed</span>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white">{totalAlerts}</span>
                        {totalAlerts > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Alerts</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1 pl-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Success</span>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-green-400">85%</span>
                        <div className="w-5 h-5 text-green-400 fill-current">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16H224A8,8,0,0,1,232,208ZM165.66,82.34a8,8,0,0,0-11.32,0L102.63,134.06,69.66,101.09a8,8,0,0,0-11.32,11.32l38.63,38.62a8,8,0,0,0,11.32,0l57.37-57.37,42.34,42.34a8,8,0,0,0,11.31-11.31Z"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Rewards</span>
                        <span className="text-xl font-bold text-white">{(pendingPurchases?.length || 0)} Reward{(pendingPurchases?.length !== 1) ? 's' : ''} Due</span>
                    </div>
                    <Link href="/parent/purchases">
                        <button className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition">
                            View Details
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );

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

    // --- Approval Logic ---
    const handleApproveClick = (goal: any) => {
        setApprovingGoal(goal);
        setAwardStars(goal.stars || 0);
    };

    const handleConfirmApprove = async () => {
        if (!approvingGoal || !approvingGoal.profileId) return;

        // 1. Mark goal completed
        await db.goals.update(approvingGoal.id, {
            status: 'completed',
            completedAt: new Date()
        });

        // 2. Add stars to profile (use awardStars state)
        // Fetch fresh profile to ensure we update correct balance
        const profile = await db.profiles.get(approvingGoal.profileId);

        if (profile) {
            const newStars = (profile.stars || 0) + awardStars;
            await db.profiles.update(profile.id, { stars: newStars });

            // 3. Log Activity for Child Feed
            await db.activityLogs.add({
                id: crypto.randomUUID(),
                accountId: approvingGoal.accountId,
                profileId: approvingGoal.profileId,
                activityId: approvingGoal.id, // Link to Goal ID
                date: new Date().toISOString().split('T')[0],
                status: 'completed',
                completedAt: new Date(),
                starsEarned: awardStars,
                metadata: {
                    type: 'goal',
                    title: approvingGoal.title,
                    goalType: approvingGoal.type
                }
            });
        }

        setApprovingGoal(null);
    };

    const handleRejectClick = (goal: any) => {
        setRejectingGoal(goal);
    };

    const handleConfirmReject = async () => {
        if (!rejectingGoal) return;

        await db.goals.update(rejectingGoal.id, {
            status: 'active',
            current: rejectingGoal.type === 'binary' ? 0 : rejectingGoal.current,
            completedAt: undefined
        });
        setRejectingGoal(null);
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
                <StatsCard />

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
                                                onClick={() => handleRejectClick(goal)}
                                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleApproveClick(goal)}
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

                        <button
                            onClick={() => router.push('/parent/stars/add')}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 hover:border-blue-200 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">Add Stars</span>
                        </button>

                        <button
                            onClick={() => router.push('/parent/tasks/quick')}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 hover:border-teal-200 transition-colors"
                        >
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
                                <div
                                    key={routine.id}
                                    onClick={() => {
                                        if (routine.type === 'one-time') {
                                            router.push(`/parent/tasks/edit?id=${routine.id}`);
                                        } else {
                                            // Assuming existing editor supports ID param or path
                                            // Based on routes, it seems to be /parent/routines/edit
                                            router.push(`/parent/routines/edit?id=${routine.id}`);
                                        }
                                    }}
                                    className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between border border-slate-200 cursor-pointer hover:border-slate-300 transition active:scale-[0.99]"
                                >
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

            {/* APPROVAL MODAL */}
            {approvingGoal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center">
                    <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom fade-in duration-300">
                        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Approve Completion</h3>
                        <p className="text-sm text-slate-500 mb-6">Review and award stars for <span className="font-bold text-slate-700">{approvingGoal.title}</span>.</p>
                        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{approvingGoal.type} Goal</span>
                                <span className="text-xs font-bold text-slate-600">{approvingGoal.current} / {approvingGoal.target} {approvingGoal.unit}</span>
                            </div>
                            {approvingGoal.type !== 'binary' && (
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((approvingGoal.current / approvingGoal.target) * 100))}%` }}></div>
                                </div>
                            )}
                        </div>

                        <div className="bg-yellow-50 rounded-xl p-4 mb-6 border border-yellow-100">
                            <label className="block text-xs font-bold text-yellow-700 uppercase tracking-wider mb-2">Stars to Award</label>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⭐</span>
                                <input
                                    type="number"
                                    value={awardStars}
                                    onChange={(e) => setAwardStars(Number(e.target.value))}
                                    className="flex-1 min-w-0 w-full bg-white border border-yellow-300 rounded-lg px-3 py-2 text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setApprovingGoal(null)}>Cancel</Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirmApprove}>Confirm</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* REJECT MODAL */}
            {rejectingGoal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center">
                    <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom fade-in duration-300">
                        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
                        <h3 className="text-lg font-bold text-red-600 mb-1">Reject Completion?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Are you sure you want to reject <span className="font-bold text-slate-700">{rejectingGoal.title}</span>?
                            <br />It will be sent back to the child's active list.
                        </p>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setRejectingGoal(null)}>Cancel</Button>
                            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmReject}>Reject</Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
