"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { Plus, Edit2, Trash2, ChevronLeft, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';

export default function RoutinesPage() {
    const router = useRouter();
    const { routines, deleteRoutine } = useRoutines();
    const [activeTab, setActiveTab] = React.useState<'routines' | 'goals'>('routines');
    const [approvingGoal, setApprovingGoal] = React.useState<any | null>(null);
    const [rejectingGoal, setRejectingGoal] = React.useState<any | null>(null);
    const [awardStars, setAwardStars] = React.useState<number>(0);

    const goals = useLiveQuery(() => db.goals.toArray());
    const profiles = useLiveQuery(() => db.profiles.toArray());



    const handleOpenNew = () => {
        router.push('/parent/routines/new');
    };

    const handleOpenEdit = (id: string) => {
        router.push(`/parent/routines/edit?id=${id}`);
    };

    const handleDeleteGoal = async (id: string) => {
        if (confirm("Are you sure you want to delete this goal?")) {
            await db.goals.delete(id);
        }
    };

    // Open Modal
    const handleApproveClick = (goal: any) => {
        setApprovingGoal(goal);
        setAwardStars(goal.stars || 0);
    };

    // Confirm Approval
    const handleConfirmApprove = async () => {
        if (!approvingGoal || !approvingGoal.profileId) return;

        // 1. Mark goal completed
        await db.goals.update(approvingGoal.id, {
            status: 'completed',
            completedAt: new Date()
        });

        // 2. Add stars to profile (use awardStars state)
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

            toast.success(`Approved! Awarded ${awardStars} stars.`);
        } else {
            console.error("Profile not found for approval", approvingGoal.profileId);
            toast.error("Could not find child profile to award stars.");
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
            current: rejectingGoal.type === 'binary' ? 0 : rejectingGoal.current, // Reset binary? Or keep progress? Keeping for now but setting status active.
            completedAt: undefined // Clear completedAt if it was set
        });
        toast.info("Goal rejected and set back to active.");
        setRejectingGoal(null);
    };

    // --- Grouping Logic ---
    const pendingGoals = goals?.filter(g => g.status === 'pending_approval') || [];
    const activeGoals = goals?.filter(g => g.status === 'active') || [];

    const completedGoals = goals?.filter(g => g.status === 'completed').sort((a, b) => {
        // Sort by completion date desc
        return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
    }) || [];

    const groupedHistory = completedGoals.reduce((acc, goal) => {
        const date = goal.completedAt ? new Date(goal.completedAt) : new Date();
        const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!acc[key]) acc[key] = [];
        acc[key].push(goal);
        return acc;
    }, {} as Record<string, typeof completedGoals>);

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className={className} />;
        return <span className={className?.includes('text-2xl') ? 'text-2xl' : 'text-xl'}>{name}</span>;
    };

    const RenderGoalCard = ({ goal }: { goal: any }) => (
        <div key={goal.id} className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 group ${goal.status === 'pending_approval' ? 'border-orange-200 bg-orange-50/30' : ''}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${goal.status === 'completed' ? 'bg-green-100 grayscale' : 'bg-blue-50'}`}>
                        <RenderIcon name={goal.icon} className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold ${goal.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{goal.title}</h3>
                            {/* Status Badge */}
                            {goal.status === 'pending_approval' && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Waiting</span>}
                            {goal.status === 'active' && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Active</span>}
                            {goal.status === 'completed' && <span className="bg-green-100 text-green-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Completed</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold capitalize">{goal.type}</span>
                            <span className="text-slate-400">Target: {goal.target} {goal.unit}</span>
                        </div>
                    </div>
                </div>

                {/* Edit/Delete Actions (Only for Active) */}
                {goal.status === 'active' && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEdit(goal.id)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                )}
            </div>

            {/* Pending Actions Footer */}
            {goal.status === 'pending_approval' && (
                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-orange-200/50">
                    <Button size="sm" variant="ghost" onClick={() => handleRejectClick(goal)} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-4">Reject</Button>
                    <Button size="sm" onClick={() => handleApproveClick(goal)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 shadow-sm shadow-green-200">Approve</Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">Items</h1>
                <Button size="sm" variant="cosmic" className="gap-2" onClick={handleOpenNew}>
                    <Plus className="w-4 h-4" />
                    New
                </Button>
            </header>

            {/* Tabs */}
            <div className="px-4 mt-4">
                <div className="bg-slate-200 p-1 rounded-lg flex">
                    <button onClick={() => setActiveTab('routines')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'routines' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Routines</button>
                    <button onClick={() => setActiveTab('goals')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'goals' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Quests / Goals</button>
                </div>
            </div>

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">

                {/* ROUTINES LIST */}
                {activeTab === 'routines' && (
                    <>
                        {routines?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <CalendarIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700">No Routines Yet</h3>
                                <p className="text-sm text-slate-500 max-w-xs">Create routines like "Morning Rush" or "Bedtime".</p>
                            </div>
                        )}
                        {routines?.map((routine) => (
                            <div key={routine.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center text-2xl">
                                        <RenderIcon name={routine.icon || 'Star'} className="w-6 h-6 text-slate-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{routine.title}</h3>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {routine.timeOfDay}</span>
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{routine.steps.length} Steps</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenEdit(routine.id)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"><Edit2 className="w-5 h-5" /></button>
                                    <button onClick={() => deleteRoutine(routine.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* GOALS LIST */}
                {activeTab === 'goals' && (
                    <>
                        {/* PENDING APPROVALS SECTION */}
                        {pendingGoals.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-orange-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Waiting Approval
                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{pendingGoals.length}</span>
                                </h3>
                                <div className="space-y-3">
                                    {pendingGoals.map(goal => <RenderGoalCard key={goal.id} goal={goal} />)}
                                </div>
                            </div>
                        )}

                        {/* ACTIVE GOALS SECTION */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center justify-between">
                                Active Quests
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{activeGoals.length}</span>
                            </h3>
                            {activeGoals.length === 0 && (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">No active quests. Create one!</div>
                            )}
                            <div className="space-y-3">
                                {activeGoals.map(goal => <RenderGoalCard key={goal.id} goal={goal} />)}
                            </div>
                        </div>

                        {/* HISTORY SECTION (Grouped) */}
                        {Object.keys(groupedHistory).length > 0 && (
                            <div className="space-y-6">
                                {Object.entries(groupedHistory).map(([dateLabel, monthGoals]) => (
                                    <div key={dateLabel}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dateLabel}</span>
                                            <div className="h-px bg-slate-200 flex-1"></div>
                                        </div>
                                        <div className="space-y-3 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                            {monthGoals.map(goal => <RenderGoalCard key={goal.id} goal={goal} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {goals?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <Edit2 className="w-10 h-10 text-blue-300" />
                                </div>
                                <h3 className="font-bold text-slate-700">No Goals Yet</h3>
                                <p className="text-sm text-slate-500 max-w-xs">Create long term quests like "Read 10 Books".</p>
                            </div>
                        )}
                    </>
                )}


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
        </div>
    );
}
