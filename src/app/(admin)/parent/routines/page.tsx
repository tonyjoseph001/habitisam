"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { Plus, Clock, Calendar, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';

export default function RoutinesPage() {
    const router = useRouter();
    const { routines, deleteRoutine } = useRoutines();
    const [activeTab, setActiveTab] = React.useState<'routines' | 'goals'>('routines');
    const [approvingGoal, setApprovingGoal] = React.useState<any | null>(null);
    const [awardStars, setAwardStars] = React.useState<number>(0);

    const goals = useLiveQuery(() => db.goals.toArray());
    const profiles = useLiveQuery(() => db.profiles.toArray());

    const pendingGoals = goals?.filter(g => g.status === 'pending_approval') || [];

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
        await db.goals.update(approvingGoal.id, { status: 'completed' });

        // 2. Add stars to profile (use awardStars state)
        const profile = profiles?.find(p => p.id === approvingGoal.profileId);
        if (profile) {
            await db.profiles.update(profile.id, { stars: (profile.stars || 0) + awardStars });
            toast.success(`Approved! Awarded ${awardStars} stars.`);
        }

        setApprovingGoal(null);
    };

    const handleRejectGoal = async (goal: any) => {
        if (confirm("Reject this completion request? Status will be set back to active.")) {
            await db.goals.update(goal.id, { status: 'active' }); // Send back to active
            toast.info("Goal rejected and set back to active.");
        }
    };

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
                                    <Calendar className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700">No Routines Yet</h3>
                                <p className="text-sm text-slate-500 max-w-xs">Create routines like "Morning Rush" or "Bedtime".</p>
                            </div>
                        )}
                        {routines?.map((routine) => (
                            <div key={routine.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center text-2xl">
                                        {/* Dynamic Icon based on title/type logic or stored icon - reusing primitive logic or use actual icon if available */}
                                        {/* Note: In previous steps we added 'icon' to activity, so we should use it if present */}
                                        {/* @ts-ignore */}
                                        {routine.icon === 'Sun' ? '☀️' : routine.icon === 'Moon' ? '🌙' : '📝'}
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
                        {/* PENDING APPROVALS */}
                        {pendingGoals.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Waiting for Approval ({pendingGoals.length})</h3>
                                <div className="space-y-3">
                                    {pendingGoals.map(goal => (
                                        <div key={goal.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{goal.title}</h4>
                                                    <p className="text-xs text-slate-500">Claiming {goal.stars} Stars</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleRejectGoal(goal)} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100">
                                                    Reject
                                                </Button>
                                                <Button size="sm" onClick={() => handleApproveClick(goal)} className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2">
                                                    Approve <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                        {goals?.map((goal) => (
                            <div key={goal.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-2xl">
                                        {/* Simple mapping for now, assuming emoji or icon name */}
                                        {goal.icon === 'Target' ? '🎯' : goal.icon === 'Book' ? '📚' : '🏆'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{goal.title}</h3>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold capitalize">{goal.type}</span>
                                            <span className="text-slate-400">Target: {goal.target} {goal.unit}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenEdit(goal.id)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"><Edit2 className="w-5 h-5" /></button>
                                    <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
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
        </div>
    );
}
