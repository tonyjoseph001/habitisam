"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Settings, Plus, Star, Zap, ChevronDown, Check, Clock, User as UserIcon, X, CheckCheck } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

import { ParentHeader } from '@/components/layout/ParentHeader';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { useGoals } from '@/lib/hooks/useGoals';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { LogService } from '@/lib/firestore/logs.service';
import { GoalService } from '@/lib/firestore/goals.service'; // Direct service for deletes/updates not exposed in hook yet (or just expose them)

export default function ParentDashboard() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const { user } = useAuth();

    // Hooks
    const { profiles } = useProfiles();
    const { routines: allRoutines } = useRoutines();
    const { goals: allGoals, updateGoal, deleteGoal } = useGoals();
    const { purchases: allPurchases } = usePurchases();

    // Derived State
    const childProfiles = useMemo(() => profiles.filter(p => p.type === 'child'), [profiles]);
    const pendingGoals = useMemo(() => allGoals.filter(g => g.status === 'pending_approval'), [allGoals]);
    const pendingPurchases = useMemo(() => allPurchases.filter(p => p.status === 'pending'), [allPurchases]); // Now using correct hook

    const totalAlerts = (pendingGoals.length || 0) + (pendingPurchases.length || 0);

    // Directive A: Local State
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
    const [weeklySuccessRate, setWeeklySuccessRate] = useState<number>(0);

    // Approval States
    const [approvingGoal, setApprovingGoal] = useState<any | null>(null);
    const [rejectingGoal, setRejectingGoal] = useState<any | null>(null);
    const [awardStars, setAwardStars] = useState<number>(0);
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');

    const getChild = (id: string) => childProfiles?.find(p => p.id === id);

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

    // Calculate weekly success rate
    useEffect(() => {
        async function fetchStats() {
            if (!user?.uid) return;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

            // Fetch all logs for account (simplification: fetching all then filtering date)
            // Optimization: Add date filter to query in future
            const allLogs = await LogService.getByAccountId(user.uid);
            const logs = allLogs.filter(log => log.date >= sevenDaysAgoStr);

            if (logs.length === 0) {
                setWeeklySuccessRate(0);
                return;
            }

            const completedLogs = logs.filter(log => log.status === 'completed');
            setWeeklySuccessRate(Math.round((completedLogs.length / logs.length) * 100));
        }
        fetchStats();
    }, [user?.uid]);


    // Check for forgot PIN flow
    useEffect(() => {
        const profileId = localStorage.getItem('resetPinForProfile');
        if (profileId && activeProfile?.id === profileId) {
            setShowSetPinModal(true);
        }
    }, [activeProfile]);

    const handleSetPin = async () => {
        if (!newPin.trim()) return alert('Please enter a PIN');
        if (newPin.length < 4) return alert('PIN must be at least 4 digits');

        const profileId = localStorage.getItem('resetPinForProfile');
        if (!profileId || !activeProfile?.id) {
            alert('Error: Profile not found.');
            return;
        }

        // Update the PIN
        await ProfileService.update(profileId, { pin: newPin });

        // Clear the stored profile ID
        localStorage.removeItem('resetPinForProfile');

        // Close modal
        setShowSetPinModal(false);
        setNewPin('');
    };


    // --- NEW STATS CARD ---
    // --- NEW STATS CARD ---
    const StatsCard = () => {
        // Find child with max stars for the "Milestone" placeholder
        const topChild = childProfiles?.reduce((prev, current) => (prev.stars || 0) > (current.stars || 0) ? current : prev, childProfiles[0]);

        if (totalAlerts === 0) {
            // "ALL CAUGHT UP" STATE
            return (
                <div className="mx-4 relative overflow-hidden rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200 group">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1] to-[#a855f7]"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-2xl"></div>

                    <div className="relative z-10 flex flex-col h-full">
                        {/* Top Section */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-indigo-100">
                                    <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-indigo-900">
                                        <Check className="w-3 h-3 stroke-[4]" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">All Caught Up</span>
                                </div>
                                <h2 className="text-3xl font-black leading-tight mb-2">
                                    You're doing <br />great!
                                </h2>
                                <p className="text-indigo-100 text-sm font-medium">
                                    No pending actions for today.
                                </p>
                            </div>

                            <div className="text-right">
                                <span className="text-4xl font-black tracking-tight">{weeklySuccessRate ?? 0}%</span>
                                <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider flex items-center justify-end gap-1">
                                    Weekly Success
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7 7m0 0l7-7m-7 7V3"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-white/20 mb-4"></div>

                        {/* Bottom Section: Milestone / Teaser */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm border border-white/20">
                                    🎁
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Next Milestone</p>
                                    <p className="text-sm font-bold text-white">
                                        {topChild ? `${topChild.name} has ${topChild.stars} stars!` : "Kids are earning stars!"}
                                    </p>
                                </div>
                            </div>
                            <Link href="/parent/rewards">
                                <button className="bg-white text-indigo-600 px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:scale-105 transition-transform">
                                    View
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        // "ACTION NEEDED" STATE (Existing)
        return (
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
    };

    // Lock State
    const [isLocked, setIsLocked] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    // Check Lock Status on Mount/Profile Change
    useEffect(() => {
        if (activeProfile?.type === 'parent') {
            const isVerified = sessionStorage.getItem('parentPinVerified_' + activeProfile.id);
            if (!isVerified) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        } else {
            setIsLocked(false);
        }
    }, [activeProfile]);

    const handleUnlock = () => {
        if (!activeProfile) return;
        if (activeProfile.pin === pin) {
            sessionStorage.setItem('parentPinVerified_' + activeProfile.id, 'true');
            setIsLocked(false);
            setPin("");
            setError("");
        } else {
            setError("Incorrect PIN");
            setPin("");
        }
    };

    const handlePinInput = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError("");
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className={className} />;
        return <span className={cn(className?.includes('w-6') ? 'text-2xl' : 'text-xl', "leading-none")}>{name}</span>;
    };

    // --- PIN LOCK OVERLAY ---
    if (isLocked && activeProfile?.type === 'parent') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-4xl mb-4 mx-auto shadow-inner">
                        👤
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Welcome Back!</h2>
                    <p className="text-slate-500 mb-6 font-medium">Enter PIN for {activeProfile.name}</p>

                    <div className="flex justify-center gap-3 mb-8">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={cn(
                                "w-4 h-4 rounded-full transition-all duration-300",
                                pin.length > i ? "bg-indigo-600 scale-110" : "bg-slate-200"
                            )} />
                        ))}
                    </div>

                    {error && <p className="text-red-500 text-sm font-bold mb-4 animate-pulse">{error}</p>}

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handlePinInput(num.toString())}
                                className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm text-xl font-bold text-slate-700 active:scale-95 transition-all hover:bg-white hover:border-indigo-100"
                            >
                                {num}
                            </button>
                        ))}
                        <div />
                        <button onClick={() => handlePinInput("0")} className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm text-xl font-bold text-slate-700 active:scale-95 transition-all hover:bg-white hover:border-indigo-100">0</button>
                        <button onClick={handleBackspace} className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Icons.Delete className="w-6 h-6" /></button>
                    </div>

                    <Button
                        onClick={handleUnlock}
                        disabled={pin.length < 4}
                        className="w-full h-14 text-lg font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                    >
                        Unlock Dashboard
                    </Button>

                    <button
                        onClick={() => router.push('/login')}
                        className="mt-6 text-xs text-slate-400 font-bold hover:text-slate-600"
                    >
                        Switch Account / Forgot PIN
                    </button>
                </div>
            </div>
        )
    }

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

    const handleApproveClick = (goal: any) => {
        setApprovingGoal(goal);
        setAwardStars(goal.stars || 0);
    };

    const handleConfirmApprove = async () => {
        if (!approvingGoal || !approvingGoal.profileId) return;
        await GoalService.update(approvingGoal.id, {
            status: 'completed',
            completedAt: new Date()
        });

        // Fetch fresh profile to get current stars
        // Note: In real app, consider a transaction/cloud function for safety
        const allProfiles = await ProfileService.getByAccountId(approvingGoal.accountId);
        const profile = allProfiles.find(p => p.id === approvingGoal.profileId);

        if (profile) {
            const newStars = (profile.stars || 0) + awardStars;
            await ProfileService.update(profile.id, { stars: newStars });
            await LogService.add({
                id: crypto.randomUUID(),
                accountId: approvingGoal.accountId,
                profileId: approvingGoal.profileId,
                activityId: approvingGoal.id,
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
        await GoalService.update(rejectingGoal.id, {
            status: 'active',
            current: rejectingGoal.type === 'binary' ? 0 : rejectingGoal.current,
            completedAt: undefined
        });
        setRejectingGoal(null);
    };

    const handleDeny = async (goalId: string) => {
        if (confirm("Reject this goal request?")) {
            await GoalService.delete(goalId);
        }
    };



    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* 1. Header Bar: Using Standard Component */}
            <ParentHeader title="Dashboard" />

            <main className="py-4 flex flex-col gap-6 max-w-screen-md mx-auto">
                {/* Loading State for Content Only */}
                {(!childProfiles || !allRoutines) ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-slate-400 text-sm font-medium">Loading dashboard...</p>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </main>

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

            {/* Set PIN Modal */}
            <Modal
                isOpen={showSetPinModal}
                onClose={() => { }}
                title="Set New PIN"
                className="max-w-sm"
            >
                <div className="p-4 pt-0">
                    <p className="text-slate-600 text-sm mb-4">
                        Create a new PIN to secure your parent account.
                    </p>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-600 mb-2">New PIN</label>
                        <Input
                            type="password"
                            value={newPin}
                            onChange={e => setNewPin(e.target.value)}
                            placeholder="Enter 4-digit PIN"
                            maxLength={6}
                            className="h-12 bg-white border-slate-200"
                            autoFocus
                        />
                        <p className="text-xs text-slate-500 mt-2">Minimum 4 digits</p>
                    </div>
                    <Button
                        className="w-full bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                        onClick={handleSetPin}
                    >
                        Set PIN & Continue
                    </Button>
                </div>
            </Modal>
        </div >
    );
}
