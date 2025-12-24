"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { db, Goal } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';

import * as Icons from 'lucide-react';

import { cn } from '@/lib/utils';
import ChildHeader from '@/components/child/ChildHeader';
import { GoalSlider } from '@/components/child/GoalSlider';

export default function ChildGoalsPage() {
    const RenderIcon = ({ name }: { name: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className="w-8 h-8 text-white" />;
        return <span className="text-3xl leading-none">{name}</span>;
    };
    const { activeProfile } = useSessionStore();
    const [mockGoals, setMockGoals] = useState<Goal[]>([]);
    const [confirmationGoal, setConfirmationGoal] = useState<Goal | null>(null);

    // Real Data Query
    const goals = useLiveQuery(async () => {
        if (!activeProfile) return [];
        return await db.goals
            .where('profileId').equals(activeProfile.id)
            .toArray();
    }, [activeProfile?.id]);

    // Seed Default Data if Empty
    useEffect(() => {
        const seedData = async () => {
            if (!activeProfile) return;
            // Check if profile has ANY goals
            const count = await db.goals.where('profileId').equals(activeProfile.id).count();
            if (count === 0) {
                const defaultGoals: Goal[] = [
                    { id: crypto.randomUUID(), title: 'Science Project', description: 'Multi-step task', type: 'checklist', current: 25, target: 100, stars: 500, icon: '🌋', dueDate: 'Nov 15', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'purple' },
                    { id: crypto.randomUUID(), title: 'Piano Practice', description: "Master 'Fur Elise'", type: 'slider', current: 50, target: 100, stars: 300, icon: '🎹', dueDate: 'Dec 01', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'blue' },
                    { id: crypto.randomUUID(), title: 'Read 10 Books', description: 'Summer Reading', type: 'counter', current: 3, target: 10, stars: 1000, icon: '📚', dueDate: 'Aug 20', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'green' },
                    { id: crypto.randomUUID(), title: 'Lego Castle', description: 'Creative Build', type: 'checklist', current: 0, target: 1, stars: 250, icon: '🏰', dueDate: 'This Weekend', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'pink' },
                    { id: crypto.randomUUID(), title: 'Math Time', description: 'Goal: 60 Mins', type: 'timer', current: 20, target: 60, stars: 100, icon: '⏱️', dueDate: 'Weekly', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'indigo' },
                    { id: crypto.randomUUID(), title: 'Save for Bike', description: 'Goal: $50.00', type: 'savings', current: 15, target: 50, stars: 500, icon: '🐷', dueDate: 'Ongoing', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'yellow' },
                    { id: crypto.randomUUID(), title: 'Clean Garage', description: 'One-time Big Job', type: 'binary', current: 0, target: 1, stars: 800, icon: '🧹', dueDate: 'Sunday', status: 'active', accountId: activeProfile.accountId, profileId: activeProfile.id, color: 'orange' },
                ];
                await db.goals.bulkAdd(defaultGoals);
            }
        };
        seedData();
    }, [activeProfile?.id]);

    // Format Helpers
    const getStatusColor = (goal: Goal) => {
        // Mapping based on mock design colors
        // We can randomize or use specific logic based on type
        switch (goal.type) {
            case 'checklist': return 'purple';
            case 'slider': return 'blue';
            case 'counter': return 'green';
            case 'binary': return 'orange';
            case 'savings': return 'yellow';
            case 'timer': return 'indigo';
            default: return 'pink';
        }
    };

    const getTwColors = (color: string) => {
        switch (color) {
            case 'purple': return { bg: 'bg-purple-50', border: 'border-purple-50', text: 'text-purple-600', badgeBs: 'bg-purple-100', accent: 'bg-purple-500', iconBg: 'bg-purple-50', btn: 'bg-purple-100 text-purple-700 hover:bg-purple-200' };
            case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-50', text: 'text-blue-600', badgeBs: 'bg-blue-100', accent: 'bg-blue-500', iconBg: 'bg-blue-50', btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200' };
            case 'green': return { bg: 'bg-green-50', border: 'border-green-50', text: 'text-green-600', badgeBs: 'bg-green-100', accent: 'bg-green-500', iconBg: 'bg-green-50', btn: 'bg-green-500 text-white hover:bg-green-600 shadow-sm' };
            case 'yellow': return { bg: 'bg-yellow-50', border: 'border-yellow-50', text: 'text-yellow-700', badgeBs: 'bg-yellow-100', accent: 'bg-yellow-600', iconBg: 'bg-yellow-50', btn: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' };
            case 'orange': return { bg: 'bg-orange-50', border: 'border-orange-50', text: 'text-orange-600', badgeBs: 'bg-orange-100', accent: 'bg-orange-500', iconBg: 'bg-orange-50', btn: 'bg-gray-900 text-white shadow-lg active:scale-95' };
            case 'indigo': return { bg: 'bg-indigo-50', border: 'border-indigo-50', text: 'text-indigo-600', badgeBs: 'bg-indigo-100', accent: 'bg-indigo-500', iconBg: 'bg-indigo-50', btn: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' };
            default: return { bg: 'bg-pink-50', border: 'border-pink-50', text: 'text-pink-600', badgeBs: 'bg-pink-100', accent: 'bg-pink-500', iconBg: 'bg-pink-50', btn: 'bg-pink-100 text-pink-700 hover:bg-pink-200' };
        }
    };

    // --- Actions ---
    const updateGoalProgress = async (goal: Goal, newCurrent: number) => {
        try {
            // Clamp current between 0 and target (unless overachievement allowed? let's clamp for now)
            // Actually for savings/counter allows going over target usually.
            // For binary, max is 1.
            let val = newCurrent;
            if (val < 0) val = 0;
            if (goal.type === 'binary' && val > 1) val = 1;

            // Limit to target (except maybe savings? let's clamp ALL for now to prevent confusion)
            if (val > goal.target) val = goal.target;

            // Check completion
            let newStatus = goal.status;
            if (val >= goal.target && goal.status === 'active') {
                // If goal met, mark pending approval or completed?
            }

            await db.goals.update(goal.id, { current: val });
        } catch (err) { console.error("Failed to update goal", err); }
    };

    const handleCounter = async (goal: any, increment: number) => {
        if (goal.status !== 'active') return;
        const newCurrent = Math.max(0, Math.min(goal.target, goal.current + increment));
        await db.goals.update(goal.id, { current: newCurrent });
    };

    const handleSliderUpdate = async (goal: any, value: number) => {
        if (goal.status !== 'active') return;
        await db.goals.update(goal.id, { current: value });
    };

    const handleBinary = (goal: Goal) => {
        setConfirmationGoal(goal);
    };

    const handleInputUpdate = (goal: Goal) => {
        const promptMsg = goal.type === 'savings' ? "Enter amount saved ($):" :
            goal.type === 'timer' ? "Enter minutes done:" :
                goal.type === 'slider' ? "Enter new percentage (0-100):" : "Enter value:";

        const res = window.prompt(promptMsg);
        if (res !== null) {
            const val = parseFloat(res);
            if (!isNaN(val)) {
                if (goal.type === 'savings' || goal.type === 'timer') {
                    // Add to existing
                    updateGoalProgress(goal, goal.current + val);
                } else {
                    // Set absolute (slider)
                    updateGoalProgress(goal, val);
                }
            }
        }
    };

    const handleComplete = (goal: Goal) => {
        setConfirmationGoal(goal);
    };

    const confirmCompletion = async () => {
        if (confirmationGoal) {
            await db.goals.update(confirmationGoal.id, { status: 'pending_approval', current: confirmationGoal.target });
            setConfirmationGoal(null);
        }
    };

    // Fallback? No, we rely on seeded data.
    const displayGoals = goals || [];

    if (!activeProfile) return null;

    return (
        <main className="bg-[#EEF2FF] min-h-screen pb-32 select-none relative font-sans">

            {/* Header */}
            <ChildHeader />

            <div className="px-5 pt-2 pb-2 sticky top-0 bg-[#EEF2FF] z-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-extrabold text-gray-800">My Quests</h1>
                </div>
            </div>

            {/* List */}
            <div className="px-5 space-y-5">

                {displayGoals.map((goal: any) => {
                    const colors = getTwColors(goal.color || getStatusColor(goal));

                    return (
                        <div key={goal.id} className={`bg-white rounded-3xl p-5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] border-2 ${colors.border} relative group`}>

                            {/* Date Badge */}
                            {goal.dueDate && (
                                <div className={`absolute top-0 right-0 ${colors.badgeBs} ${colors.text} text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl`}>
                                    📅 Due: {goal.dueDate}
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-start gap-4 mb-3">
                                <div className={`w-14 h-14 ${colors.iconBg} rounded-2xl flex items-center justify-center`}>
                                    <RenderIcon name={goal.icon} />
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-lg font-extrabold text-gray-800 leading-tight">{goal.title}</h3>
                                    <p className="text-xs font-bold text-gray-400 mt-1">{goal.description || 'Keep it up!'}</p>
                                </div>
                            </div>

                            {/* Dynamic Content based on Type */}
                            <div className="mb-4">
                                {goal.type === 'checklist' && (
                                    <>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-xs font-bold text-gray-400">Progress</span>
                                            <span className={`text-xs font-bold ${colors.text}`}>{goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${colors.accent} rounded-full`} style={{ width: `${goal.target > 0 ? (goal.current / goal.target) * 100 : 0}%` }}></div>
                                        </div>
                                    </>
                                )}

                                {goal.type === 'slider' && (
                                    <GoalSlider
                                        goal={goal}
                                        colors={colors}
                                        onUpdate={(val) => handleSliderUpdate(goal, val)}
                                    />
                                )}

                                {goal.type === 'counter' && (
                                    <div className={`flex items-center justify-between ${colors.bg} rounded-xl p-2 mb-2`}>
                                        <button onClick={() => handleCounter(goal, -1)} disabled={goal.status !== 'active'} className={`w-8 h-8 bg-white rounded-lg shadow-sm ${colors.text} font-bold hover:scale-95 transition disabled:opacity-50`}>-</button>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-xl font-black ${colors.text}`}>{goal.current} <span className="text-xs text-gray-400 font-bold">/ {goal.target} {goal.unit}</span></span>
                                            {goal.status === 'pending_approval' && <span className="text-[10px] text-orange-500 font-bold">Waiting Approval</span>}
                                        </div>
                                        <button onClick={() => handleCounter(goal, 1)} disabled={goal.status !== 'active'} className={`w-8 h-8 ${colors.accent} rounded-lg shadow-sm text-white font-bold hover:opacity-90 active:scale-95 transition disabled:opacity-50`}>+</button>
                                    </div>
                                )}

                                {goal.type === 'savings' && (
                                    <div className={`${colors.bg} rounded-xl p-2 flex justify-between items-center mb-2 border ${colors.border}`}>
                                        <span className="text-xs font-bold text-gray-500 ml-2">Saved:</span>
                                        <span className={`text-xl font-black ${colors.text} mr-2`}>${goal.current.toFixed(2)}</span>
                                    </div>
                                )}

                                {goal.type === 'timer' && (
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full w-[33%] ${colors.accent} rounded-full`}></div>
                                        </div>
                                        <span className={`text-xs font-bold ${colors.text}`}>{goal.current}m / {goal.target}m</span>
                                    </div>
                                )}

                                {goal.type === 'binary' && (
                                    <div className={`flex items-center justify-center py-4 ${colors.bg} rounded-xl border-dashed ${goal.current >= 1 ? 'border-2 border-solid bg-opacity-20 ' + colors.border.replace('border-', 'bg-') : 'border-2 ' + colors.border}`}>
                                        {goal.current >= 1 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="bg-green-500 text-white rounded-full p-1"><Check className="w-5 h-5" /></div>
                                                <span className={`text-lg font-black ${colors.text}`}>Completed!</span>
                                            </div>
                                        ) : (
                                            <span className={`text-sm font-bold ${colors.text}`}>Not Done Yet</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer / Actions */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                    <span className="text-sm">⭐</span>
                                    <span className="text-xs font-black text-yellow-600">{goal.stars} Stars</span>
                                </div>

                                {goal.status === 'pending_approval' ? (
                                    <div className="bg-orange-100 text-orange-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 animate-pulse">
                                        <Icons.Clock className="w-4 h-4" /> Waiting
                                    </div>
                                ) : goal.status === 'completed' ? (
                                    <div className="bg-green-100 text-green-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2">
                                        <Check className="w-4 h-4" /> Done!
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {/* Primary Action (Update/Log) - Hide for Binary/Counter/Slider if standard input is enough */}
                                        {goal.type !== 'binary' && goal.type !== 'counter' && goal.type !== 'slider' && (
                                            <button
                                                onClick={() => handleInputUpdate(goal)}
                                                className={`${colors.btn} font-bold py-2 px-4 rounded-xl text-xs transition-colors`}
                                            >
                                                {goal.type === 'checklist' ? 'View Steps' :
                                                    goal.type === 'slider' ? 'Update' :
                                                        goal.type === 'savings' ? 'Add $' :
                                                            goal.type === 'timer' ? '+ Log' : 'Update'}
                                            </button>
                                        )}

                                        {/* Styled Done Button */}
                                        <button
                                            onClick={() => goal.type === 'binary' ? handleBinary(goal) : handleComplete(goal)}
                                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-slate-200 hover:bg-black hover:scale-105 transition active:scale-95"
                                        >
                                            <Check className="w-4 h-4 text-white" /> Done
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>
                    );
                })}



            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmationGoal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setConfirmationGoal(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 shadow-2xl max-w-sm mx-auto overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500 shadow-sm border border-green-100">
                                    <Icons.Trophy className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">Quest Complete?</h3>
                                <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                                    Did you finish <span className="text-slate-800 bg-slate-100 px-1 rounded">"{confirmationGoal.title}"</span>? <br />
                                    Your parent will need to approve it.
                                </p>

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button
                                        onClick={() => setConfirmationGoal(null)}
                                        className="py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        Not Yet
                                    </button>
                                    <button
                                        onClick={confirmCompletion}
                                        className="py-3.5 rounded-2xl font-black text-white bg-slate-900 shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" /> Yes, I Did It!
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
