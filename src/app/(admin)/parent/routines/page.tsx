"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { Plus, Clock, Calendar, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RoutinesPage() {
    const router = useRouter();
    const { routines, deleteRoutine } = useRoutines();

    const handleOpenNew = () => {
        router.push('/parent/routines/new');
    };

    const handleOpenEdit = (routineId: string) => {
        router.push(`/parent/routines/edit?id=${routineId}`);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">Routines</h1>
                <Button size="sm" variant="cosmic" className="gap-2" onClick={handleOpenNew}>
                    <Plus className="w-4 h-4" />
                    New
                </Button>
            </header>

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {routines?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700">No Routines Yet</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            Create routines like "Morning Rush" or "Bedtime" to assign missions to your kids.
                        </p>
                    </div>
                )}

                {routines?.map((routine) => (
                    <div key={routine.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center text-2xl">
                                {/* Dynamic Icon based on title/type logic or stored icon */}
                                {routine.title.toLowerCase().includes('morning') ? '☀️' :
                                    routine.title.toLowerCase().includes('bed') ? '🌙' : '📝'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{routine.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {routine.timeOfDay}
                                    </span>
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                        {routine.steps.length} Steps
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleOpenEdit(routine.id)}
                                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => deleteRoutine(routine.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            <ParentNavBar />
        </div>
    );
}
