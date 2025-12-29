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
    const [confirmationType, setConfirmationType] = useState<'complete' | 'cancel'>('complete');
    const [checklistModalGoal, setChecklistModalGoal] = useState<Goal | null>(null); // For checklist modal

    // Real Data Query
    const goals = useLiveQuery(async () => {
        if (!activeProfile) return [];
        return await db.goals
            .where('profileId').equals(activeProfile.id)
            .toArray();
    }, [activeProfile?.id]);

    // Seed Default Data logic removed per user request
    /*
    useEffect(() => {
        // ... removed
    }, [activeProfile?.id]);
    */

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

    const handleComplete = (goal: Goal) => {
        setConfirmationType('complete');
        setConfirmationGoal(goal);
    };
    const handleCancel = (goal: Goal) => {
        setConfirmationType('cancel');
        setConfirmationGoal(goal);
    };

    const handleInputUpdate = (goal: Goal) => {
        if (goal.type === 'checklist') {
            setChecklistModalGoal(goal);
        } else {
            const promptMsg = goal.type === 'savings' ? "Enter amount saved ($):" :
                goal.type === 'timer' ? "Enter minutes done:" :
                    goal.type === 'slider' ? "Enter new percentage (0-100):" : "Enter value:";

            const res = window.prompt(promptMsg);
            if (res !== null) {
                const val = parseFloat(res);
                if (!isNaN(val)) {
                    if (goal.type === 'savings' || goal.type === 'timer') {
                        updateGoalProgress(goal, goal.current + val);
                    } else {
                        updateGoalProgress(goal, val);
                    }
                }
            }
        }
    };



    const handleChecklistToggle = async (goal: Goal, index: number) => {
        if (!goal.checklist) return;

        const newChecklist = [...goal.checklist];
        const item = newChecklist[index];

        // Fix: Handle legacy strings correctly to avoid corruption
        if (typeof item === 'string') {
            newChecklist[index] = { text: item, completed: true };
        } else {
            // It's already an object (or potentially the corrupted char-object, but we preserve it best we can)
            // If it's a "spread string" object, it will behave like an object.
            // We just toggle the completed status.
            // @ts-ignore - handling potential corrupted data shape gracefully
            newChecklist[index] = { ...item, completed: !item.completed };
        }

        const completedCount = newChecklist.filter(i => {
            if (typeof i === 'string') return false; // purely string implied incomplete in this legacy mix context? usually strings were just text.
            // actually, if it's a string, it's NOT completed (legacy data has no state).
            return i.completed;
        }).length;

        // Update both local modal state (so UI updates) AND db
        setChecklistModalGoal({ ...goal, checklist: newChecklist, current: completedCount });

        await db.goals.update(goal.id, {
            checklist: newChecklist as any, // casting for legacy mix
            current: completedCount
        });
    };



    const confirmCompletion = async () => {
        if (confirmationGoal) {
            if (confirmationType === 'cancel') {
                await db.goals.update(confirmationGoal.id, {
                    status: 'cancelled',
                    completedAt: new Date()
                });
            } else {
                // Complete
                await db.goals.update(confirmationGoal.id, {
                    status: 'pending_approval',
                    current: confirmationGoal.target,
                    completedAt: new Date()
                });
            }
            setConfirmationGoal(null);
        }
    };

    const displayGoals = goals || [];
    const activeGoals = displayGoals
        .filter(g => g.status === 'active' || !g.status) // Default to active
        .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Descending (Newest first)
        });

    const completedGoals = displayGoals
        .filter(g => g.status === 'completed' || g.status === 'pending_approval' || g.status === 'cancelled')
        .sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return dateB - dateA; // Descending (Most recently completed first)
        });

    // Render Helper
    const renderGoalCard = (goal: any, index: number) => {
        // Dashboard Palette Logic
        const TASK_PALETTE = ['#ff595e', '#7a6563', '#018e42', '#1982c4', '#6a4c93'];
        const paletteColor = TASK_PALETTE[index % TASK_PALETTE.length];

        // Unified Glass Theme
        const colors = {
            bg: 'bg-white/10 backdrop-blur-sm',
            border: 'border-white/10',
            text: 'text-white',
            badgeBs: 'bg-white/20 backdrop-blur-md border border-white/10 shadow-sm',
            accent: 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]',
            iconBg: 'bg-white/20 border border-white/10 backdrop-blur-sm shadow-sm',
            btn: 'bg-white/20 hover:bg-white/30 text-white border border-white/10 shadow-sm backdrop-blur-sm'
        };

        return (
            <div
                key={goal.id}
                className={`rounded-[2rem] p-5 shadow-lg relative group overflow-hidden transition-all`}
                style={{ background: paletteColor }}
            >
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

                {/* Status Badge & Days Remaining */}
                <div className="absolute top-0 right-0 z-20 flex flex-col items-end">
                    {(() => {
                        // Status Logic
                        let statusText = 'Active';
                        let statusColor = colors.badgeBs;

                        // Attempt to parse date
                        if (goal.dueDate && goal.status === 'active') {
                            const now = new Date();
                            const parsed = new Date(goal.dueDate);
                            const isValidDate = !isNaN(parsed.getTime());

                            if (isValidDate) {
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const due = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
                                const diffTime = due.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                if (diffDays < 0) {
                                    statusText = `Overdue (${Math.abs(diffDays)} Days)`;
                                    statusColor = 'bg-red-500 border-red-400 text-white shadow-red-200';
                                } else if (diffDays === 0) {
                                    statusText = 'Due Today';
                                    statusColor = 'bg-orange-500 border-orange-400 text-white shadow-orange-200';
                                } else {
                                    statusText = `Active (${diffDays} Days left)`;
                                    statusColor = 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-200';
                                }
                            } else {
                                statusText = goal.dueDate; // e.g. "Weekly"
                                statusColor = 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-200';
                            }
                        } else if (goal.status === 'completed' || goal.status === 'pending_approval') {
                            statusText = 'Completed';
                            statusColor = 'bg-blue-500 border-blue-400 text-white shadow-blue-200';
                        } else if (goal.status === 'cancelled') {
                            statusText = 'Cancelled';
                            statusColor = 'bg-gray-500 border-gray-400 text-white shadow-gray-200';
                        }

                        return (
                            <div className="flex flex-col items-end">
                                <div className={`text-[10px] font-black uppercase tracking-wider px-3 pr-6 py-1 rounded-bl-xl border-l border-b ${statusColor} shadow-md`}>
                                    {statusText}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="relative z-10">

                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`w-14 h-14 ${colors.iconBg} rounded-2xl flex items-center justify-center`}>
                            <RenderIcon name={goal.icon} />
                        </div>
                        <div className="pt-1 flex-1 min-w-0">
                            <h3 className="text-xl font-extrabold text-white leading-tight drop-shadow-md">{goal.title}</h3>
                            <p className="text-xs font-bold text-white/80 mt-1 truncate pr-16">{goal.description || 'Keep it up!'}</p>
                        </div>
                    </div>

                    {/* Completed/Cancelled Summary View */}
                    {(goal.status === 'completed' || goal.status === 'pending_approval' || goal.status === 'cancelled') ? (
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-3">
                                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                    {goal.status === 'cancelled' ? 'Cancelled On' : 'Completed On'}
                                </span>
                                <span className="text-white font-bold text-sm">
                                    {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'Today'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Status</span>
                                <span className="text-white font-black text-lg drop-shadow-sm">
                                    {goal.status === 'cancelled' ? 'Cancelled' :
                                        goal.type === 'binary' ? 'Mission Complete' :
                                            goal.type === 'savings' ? `$${goal.target}` :
                                                goal.type === 'checklist' ? '100%' :
                                                    `${goal.current} / ${goal.target} ${goal.unit || ''}`}
                                </span>
                            </div>
                            {goal.status !== 'cancelled' && (
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                                    <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Earned</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm">⭐</span>
                                        <span className="text-sm font-black text-white drop-shadow-sm">{goal.stars} Stars</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Active Goal Content */
                        <div className="mb-5">
                            {goal.type === 'checklist' && (
                                <GoalSlider
                                    goal={goal}
                                    colors={colors}
                                    onUpdate={(val) => handleSliderUpdate(goal, val)}
                                />
                            )}

                            {goal.type === 'slider' && (
                                <GoalSlider
                                    goal={goal}
                                    colors={colors}
                                    onUpdate={(val) => handleSliderUpdate(goal, val)}
                                />
                            )}

                            {goal.type === 'counter' && (
                                <GoalSlider
                                    goal={goal}
                                    colors={colors}
                                    onUpdate={(val) => handleSliderUpdate(goal, val)}
                                />
                            )}

                            {goal.type === 'savings' && (
                                <GoalSlider
                                    goal={goal}
                                    colors={colors}
                                    onUpdate={(val) => handleSliderUpdate(goal, val)}
                                />
                            )}

                            {goal.type === 'timer' && (
                                <GoalSlider
                                    goal={goal}
                                    colors={colors}
                                    onUpdate={(val) => handleSliderUpdate(goal, val)}
                                />
                            )}

                            {goal.type === 'binary' && (
                                <div className={`flex items-center justify-center py-4 ${colors.bg} rounded-2xl border-dashed ${goal.current >= 1 ? 'border-2 border-solid bg-white/20 border-white/40' : 'border-2 border-white/20'}`}>
                                    {goal.current >= 1 ? (
                                        <div className="flex items-center gap-2 animate-in zoom-in">
                                            <div className="bg-emerald-500 text-white rounded-full p-1 shadow-lg"><Check className="w-5 h-5" /></div>
                                            <span className={`text-lg font-black ${colors.text} drop-shadow-sm`}>Completed!</span>
                                        </div>
                                    ) : (
                                        <span className={`text-sm font-bold ${colors.text} opacity-80`}>Not Done Yet</span>
                                    )}
                                </div>
                            )}

                            {/* Meta Row: Stars & Due Date aligned in Dark Shade */}
                            <div className="flex justify-between items-center mt-4 bg-black/20 rounded-2xl p-3 backdrop-blur-md border border-white/5 shadow-inner">
                                {/* Stars */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">⭐</span>
                                    <span className="text-sm font-bold text-white shadow-black/10 drop-shadow-md">{goal.stars} Stars</span>
                                </div>

                                {/* Due Date */}
                                {goal.dueDate && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">📅</span>
                                        <span className="text-sm font-bold text-white shadow-black/10 drop-shadow-md">Due: {goal.dueDate}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer only for Active Goals (Action Buttons) OR if not completed summary view */}
                {goal.status === 'active' && (
                    <div className="flex items-center justify-between mt-auto relative z-10 pt-3">
                        {/* Cancel Button - Styled like Action Buttons */}
                        <button
                            onClick={() => handleCancel(goal)}
                            className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/5 font-bold py-3 px-5 rounded-2xl text-xs transition-colors backdrop-blur-sm shadow-sm"
                        >
                            Cancel
                        </button>

                        <div className="flex gap-2">

                            {/* Primary Action */}
                            {goal.type !== 'binary' && goal.type !== 'counter' && goal.type !== 'slider' && goal.type !== 'timer' && (
                                <button
                                    onClick={() => handleInputUpdate(goal)}
                                    className="bg-white/20 hover:bg-white/30 text-white border border-white/10 font-bold py-3 px-5 rounded-2xl text-xs transition-colors backdrop-blur-sm shadow-sm"
                                >
                                    {goal.type === 'checklist' ? 'View Steps' :
                                        goal.type === 'slider' ? 'Update' :
                                            goal.type === 'savings' ? 'Add $' :
                                                goal.type === 'timer' ? '+ Log' : 'Update'}
                                </button>
                            )}

                            {/* Done Button */}
                            <button
                                onClick={() => goal.type === 'binary' ? handleBinary(goal) : handleComplete(goal)}
                                className="flex items-center gap-2 bg-white text-[#7a6563] px-5 py-3 rounded-2xl text-xs font-bold shadow-lg hover:bg-gray-50 hover:scale-105 transition active:scale-95"
                                style={{ color: paletteColor }}
                            >
                                <Check className="w-4 h-4" strokeWidth={3} /> Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Pending Badge Logic for Footer (since we removed the block but pending still needs to show maybe?) 
                    Actually, Pending is considered 'completed' section now, so it uses the Summary View.
                    So we only need footer for 'active'.
                 */}
            </div>
        );
    };

    if (!activeProfile) return null;

    return (
        <main className="bg-[#EEF2FF] min-h-screen pb-32 select-none relative font-sans">

            {/* Header */}
            <ChildHeader />

            <div className="px-5 pt-2 pb-2 bg-[#EEF2FF] z-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-extrabold text-gray-800">My Goals</h1>
                </div>
            </div>

            <div className="px-5 pb-8 space-y-8">
                {/* Active Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4 ml-1">
                        <div className="p-1.5 bg-rose-100 rounded-full text-rose-500">
                            <Icons.Target className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Active Goals ({activeGoals.length})</h2>
                    </div>
                    <div className="space-y-5">
                        {activeGoals.length === 0 && <p className="text-gray-400 italic ml-1">No active goals.</p>}
                        {activeGoals.map((goal, index) => renderGoalCard(goal, index))}
                    </div>
                </div>

                {/* Completed Section (includes Pending) */}
                {(completedGoals.length > 0) && (
                    <div>
                        <div className="flex items-center gap-2 mb-4 ml-1 mt-8">
                            <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-500">
                                <Icons.Trophy className="w-4 h-4" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">Completed ({completedGoals.length})</h2>
                        </div>
                        <div className="space-y-5">
                            {completedGoals.map((goal, index) => renderGoalCard(goal, index + activeGoals.length))}
                        </div>
                    </div>
                )}
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
                                {confirmationType === 'complete' ? (
                                    <>
                                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500 shadow-sm border border-green-100">
                                            <Icons.Trophy className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">Quest Complete?</h3>
                                        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                                            Did you finish <span className="text-slate-800 bg-slate-100 px-1 rounded">"{confirmationGoal.title}"</span>? <br />
                                            Your parent will need to approve it.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-sm border border-red-100">
                                            <Icons.AlertTriangle className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">Cancel Goal?</h3>
                                        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                                            Are you sure you want to give up on <span className="text-slate-800 bg-slate-100 px-1 rounded">"{confirmationGoal.title}"</span>? <br />
                                            This action cannot be undone.
                                        </p>
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button
                                        onClick={() => setConfirmationGoal(null)}
                                        className="py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        No, Go Back
                                    </button>
                                    <button
                                        onClick={confirmCompletion}
                                        className={`py-3.5 rounded-2xl font-black text-white shadow-lg  hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 ${confirmationType === 'complete' ? 'bg-slate-900 shadow-slate-200' : 'bg-red-500 shadow-red-200'}`}
                                    >
                                        {confirmationType === 'complete' ? (
                                            <> <Check className="w-5 h-5" /> Yes, I Did It! </>
                                        ) : (
                                            <> <Icons.X className="w-5 h-5" /> Yes, Cancel It </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>



            {/* Checklist Modal */}
            <AnimatePresence>
                {checklistModalGoal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] px-4 pointer-events-none">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                            onClick={() => setChecklistModalGoal(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="bg-[#F8FAFC] w-full max-w-sm rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[80vh] pointer-events-auto"
                        >
                            {/* Dynamic Theme Colors */}
                            <div className="hidden">
                                { /* Tailwind Safelist Concept for dynamic logic */}
                            </div>

                            {/* PREMIUM HEADER - COMPACT */}
                            <div className={cn(
                                "relative px-6 pt-5 pb-5 bg-gradient-to-br flex flex-col items-center justify-center text-center overflow-hidden shrink-0",
                                checklistModalGoal.color === 'purple' ? "from-purple-500 to-indigo-600 shadow-purple-200" :
                                    checklistModalGoal.color === 'blue' ? "from-blue-500 to-cyan-500 shadow-blue-200" :
                                        checklistModalGoal.color === 'pink' ? "from-pink-500 to-rose-500 shadow-pink-200" :
                                            checklistModalGoal.color === 'yellow' ? "from-amber-400 to-orange-500 shadow-orange-200" :
                                                checklistModalGoal.color === 'green' ? "from-emerald-400 to-green-600 shadow-emerald-200" :
                                                    "from-slate-700 to-slate-900 shadow-slate-200"
                            )}>
                                {/* Background Patterns */}
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>

                                {/* Close Button - Smaller */}
                                <button
                                    onClick={() => setChecklistModalGoal(null)}
                                    className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-95"
                                >
                                    <Icons.X className="w-4 h-4" strokeWidth={3} />
                                </button>

                                {/* Icon Bubble - Smaller */}
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 shadow-lg ring-2 ring-white/10">
                                    <div className="scale-75 origin-center">
                                        <RenderIcon name={checklistModalGoal.icon} />
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-white tracking-tight drop-shadow-sm px-4 leading-tight mb-2 truncate max-w-full">
                                    {checklistModalGoal.title}
                                </h3>

                                {/* Progress Bar - Compacter */}
                                <div className="w-full max-w-[160px] h-2 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm mb-3 relative">
                                    <div
                                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500 ease-out"
                                        style={{ width: `${(checklistModalGoal.current / checklistModalGoal.target) * 100}%` }}
                                    ></div>
                                </div>

                                <div className="flex items-center gap-2 text-white/90 font-bold text-xs bg-black/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                                    <span>{checklistModalGoal.current} / {checklistModalGoal.target} Steps</span>
                                </div>
                            </div>

                            {/* SCROLLABLE CONTENT - COMPACT */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8FAFC]">
                                {checklistModalGoal.checklist?.map((item, idx) => {
                                    // RECOVERY logic
                                    let text = "Step " + (idx + 1);
                                    let isCompleted = false;

                                    if (typeof item === 'string') {
                                        text = item;
                                        isCompleted = false;
                                    } else if (item && typeof item === 'object') {
                                        isCompleted = !!item.completed;
                                        if (item.text) text = item.text;
                                        else {
                                            const keys = Object.keys(item).filter(k => !isNaN(Number(k))).sort((a, b) => Number(a) - Number(b));
                                            if (keys.length > 0) {
                                                // @ts-ignore
                                                text = keys.map(k => item[k]).join('');
                                            }
                                        }
                                    }

                                    // Theme Logic
                                    const themeColor = checklistModalGoal.color || 'gray';
                                    const activeBorder = {
                                        purple: "group-hover:border-purple-300",
                                        blue: "group-hover:border-blue-300",
                                        pink: "group-hover:border-pink-300",
                                        yellow: "group-hover:border-yellow-300",
                                        green: "group-hover:border-green-300",
                                        gray: "group-hover:border-gray-300"
                                    }[themeColor] || "group-hover:border-gray-300";

                                    const completedStyles = {
                                        purple: "bg-purple-50/80 border-purple-200 text-purple-900",
                                        blue: "bg-blue-50/80 border-blue-200 text-blue-900",
                                        pink: "bg-pink-50/80 border-pink-200 text-pink-900",
                                        yellow: "bg-yellow-50/80 border-yellow-200 text-yellow-900",
                                        green: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
                                        gray: "bg-gray-50/80 border-gray-200 text-gray-900"
                                    }[themeColor] || "bg-gray-50/80 border-gray-200 text-gray-900";

                                    const tickStyles = {
                                        purple: "bg-purple-500 border-purple-500 shadow-purple-300",
                                        blue: "bg-blue-500 border-blue-500 shadow-blue-300",
                                        pink: "bg-pink-500 border-pink-500 shadow-pink-300",
                                        yellow: "bg-orange-500 border-orange-500 shadow-orange-300",
                                        green: "bg-emerald-500 border-emerald-500 shadow-emerald-300",
                                        gray: "bg-slate-700 border-slate-700 shadow-slate-400"
                                    }[themeColor] || "bg-slate-700 border-slate-700";

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleChecklistToggle(checklistModalGoal, idx)}
                                            className={cn(
                                                "w-full p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all duration-200 active:scale-[0.98] text-left group relative overflow-hidden",
                                                isCompleted
                                                    ? completedStyles
                                                    : `bg-white border-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 ${activeBorder}`
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-[2px] flex items-center justify-center transition-all duration-300 shrink-0 z-10 shadow-sm",
                                                isCompleted
                                                    ? `${tickStyles} text-white scale-110 rotate-0`
                                                    : "bg-slate-50 border-slate-200 group-hover:border-slate-300 text-transparent scale-100 rotate-[-15deg]"
                                            )}>
                                                <Check className="w-3.5 h-3.5" strokeWidth={4} />
                                            </div>
                                            <span className={cn(
                                                "text-sm font-bold flex-1 leading-snug z-10 transition-all duration-300",
                                                isCompleted ? "opacity-50 line-through decoration-2 decoration-current/30" : "text-slate-700 group-hover:text-slate-900"
                                            )}>
                                                {text}
                                            </span>
                                        </button>
                                    );
                                }) || (
                                        <div className="text-center py-10 flex flex-col items-center gap-4 opacity-60">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl rotate-12">📝</div>
                                            <p className="text-slate-400 font-bold text-sm">No steps defined.</p>
                                        </div>
                                    )}

                                <div className="h-2"></div> {/* Bottom spacer */}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </main >
    );
}
