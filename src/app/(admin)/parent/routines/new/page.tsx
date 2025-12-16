"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { db, Activity, Step } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save, Sparkles, Plus, Clock, Check, Trash2, GripVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { StepEditorModal } from '@/components/domain/routines/StepEditorModal';
import * as Icons from 'lucide-react';

// Day Selector Options
const DAYS = [
    { id: 0, label: 'S' },
    { id: 1, label: 'M' },
    { id: 2, label: 'T' },
    { id: 3, label: 'W' },
    { id: 4, label: 'T' },
    { id: 5, label: 'F' },
    { id: 6, label: 'S' },
];

export default function NewRoutinePage() {
    const router = useRouter();
    const { user } = useAuth();

    // Fetch children for assignment
    const childProfiles = useLiveQuery(
        () => db.profiles.where('type').equals('child').toArray()
    );

    // Form State
    const [routineType, setRoutineType] = useState<'recurring' | 'one-time'>('recurring');
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('07:30');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default today
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
    const [assignedChildIds, setAssignedChildIds] = useState<string[]>([]);
    const [steps, setSteps] = useState<Step[]>([
        { id: uuidv4(), title: 'Brush Teeth', duration: 2, icon: 'Smile', stars: 5, timerDuration: 120 }
    ]);

    // Modal State
    const [isStepModalOpen, setIsStepModalOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<Step | undefined>(undefined);

    // Helpers
    const toggleDay = (dayId: number) => {
        if (selectedDays.includes(dayId)) {
            setSelectedDays(prev => prev.filter(d => d !== dayId));
        } else {
            setSelectedDays(prev => [...prev, dayId]);
        }
    };

    const toggleChild = (childId: string) => {
        if (assignedChildIds.includes(childId)) {
            setAssignedChildIds(prev => prev.filter(id => id !== childId));
        } else {
            setAssignedChildIds(prev => [...prev, childId]);
        }
    };

    const handleSaveRoutine = async () => {
        if (!user) return;
        if (!title.trim()) return;

        const newRoutine: Activity = {
            id: uuidv4(),
            accountId: user.uid,
            profileIds: assignedChildIds,
            type: routineType,
            title: title.trim(),
            timeOfDay: time,
            days: routineType === 'recurring' ? (selectedDays as any) : undefined,
            date: routineType === 'one-time' ? date : undefined,
            steps: steps,
            isActive: true,
            createdAt: new Date()
        };

        await db.activities.add(newRoutine);
        router.push('/parent/routines');
    };

    // --- Step Logic ---

    const openAddStep = () => {
        setEditingStep(undefined);
        setIsStepModalOpen(true);
    };

    const openEditStep = (step: Step) => {
        setEditingStep(step);
        setIsStepModalOpen(true);
    };

    const handleSaveStep = (step: Step) => {
        if (editingStep) {
            // Update existing
            setSteps(prev => prev.map(s => s.id === step.id ? step : s));
        } else {
            // Add new
            setSteps(prev => [...prev, { ...step, id: uuidv4() }]);
        }
        setIsStepModalOpen(false);
    };

    const handleDeleteStep = (stepId: string) => {
        setSteps(prev => prev.filter(s => s.id !== stepId));
        setIsStepModalOpen(false); // Should already be closed by modal logic but safe to ensure
    };

    // Helper for Icon Rendering
    const RenderIcon = ({ name }: { name: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name as keyof typeof Icons] || Icons.HelpCircle;
        // @ts-ignore
        return <LucideIcon className="w-5 h-5" />;
    };

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* 1. Header */}
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 hover:bg-transparent text-slate-500">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-lg font-bold text-slate-900">New Routine</h1>
                </div>
                <Button variant="cosmic" size="sm" className="gap-2 px-4 h-9" onClick={handleSaveRoutine}>
                    <Save className="w-4 h-4" />
                    Save
                </Button>
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-screen-md mx-auto">

                {/* 2. Card 1: Frequency - Compact */}
                <div className="bg-white rounded-xl mx-4 p-2 shadow-sm border border-slate-200">
                    <div className="bg-slate-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => setRoutineType('recurring')}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all text-center",
                                routineType === 'recurring'
                                    ? "bg-white text-violet-600 shadow-sm border border-slate-200"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Recurring
                        </button>
                        <button
                            onClick={() => setRoutineType('one-time')}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all text-center",
                                routineType === 'one-time'
                                    ? "bg-white text-violet-600 shadow-sm border border-slate-200"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            One-Time
                        </button>
                    </div>
                </div>

                {/* 3. Card 2: Basic Info */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Routine Title</label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Morning Rush"
                            className="text-base font-medium h-10 border-slate-200"
                        />
                    </div>

                    <Button variant="outline" className="w-full h-9 bg-violet-50 border-violet-100 text-violet-600 gap-2 hover:bg-violet-100 text-xs font-bold">
                        <Sparkles className="w-3 h-3" />
                        Generate with AI
                    </Button>
                </div>

                {/* 4. Card 3: Schedule */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800">Schedule</h3>
                    </div>

                    {routineType === 'recurring' ? (
                        <>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="text-base h-10 border-slate-200"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Repeat On</label>
                                <div className="flex justify-between">
                                    {DAYS.map(day => {
                                        const isSelected = selectedDays.includes(day.id);
                                        return (
                                            <button
                                                key={day.id}
                                                onClick={() => toggleDay(day.id)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                                    isSelected
                                                        ? "bg-violet-600 text-white shadow-sm"
                                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                                )}
                                            >
                                                {day.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex gap-3">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="text-base h-10 border-slate-200"
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="text-base h-10 border-slate-200"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Card 4: Assign To */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-800">Assign To</h3>
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        {childProfiles?.map(child => {
                            const isSelected = assignedChildIds.includes(child.id!);

                            let AvatarIcon = '👶';
                            switch (child.avatarId) {
                                case 'boy': AvatarIcon = '🧑‍🚀'; break;
                                case 'girl': AvatarIcon = '👩‍🚀'; break;
                                case 'alien': AvatarIcon = '👽'; break;
                                case 'robot': AvatarIcon = '🤖'; break;
                                case 'rocket': AvatarIcon = '🚀'; break;
                                default: AvatarIcon = '👶';
                            }

                            const colorMap: Record<string, string> = {
                                cyan: 'bg-cyan-100 border-cyan-300',
                                purple: 'bg-violet-100 border-violet-300',
                                green: 'bg-emerald-100 border-emerald-300',
                                orange: 'bg-orange-100 border-orange-300'
                            };
                            const colorClass = colorMap[child.colorTheme || 'cyan'] || 'bg-slate-100 border-slate-200';

                            return (
                                <button
                                    key={child.id}
                                    onClick={() => toggleChild(child.id!)}
                                    className="flex flex-col items-center gap-1 group min-w-[56px]"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all border-2 shadow-sm relative",
                                        isSelected
                                            ? "border-violet-600 bg-violet-50 scale-105"
                                            : `group-hover:border-violet-200 ${colorClass}`
                                    )}>
                                        {AvatarIcon}
                                        {isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 border-2 border-white">
                                                <Check className="w-2 h-2" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-medium truncate w-full text-center",
                                        isSelected ? "text-violet-700 font-bold" : "text-slate-500"
                                    )}>
                                        {child.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 6. Card 5: Steps */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase px-5">Steps</h3>

                    <div className="flex flex-col gap-2 mx-4">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                                onClick={() => openEditStep(step)}
                            >
                                <div className="flex items-center gap-3">
                                    <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" onClick={e => e.stopPropagation()} />
                                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                        <RenderIcon name={step.icon} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 text-sm">
                                            {index + 1}. {step.title}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500">
                                                {step.duration} min
                                            </span>
                                            {step.timerDuration && (
                                                <div className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded-sm">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    <span>{Math.floor(step.timerDuration / 60)}:{(step.timerDuration % 60).toString().padStart(2, '0')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                        +{step.stars} ⭐
                                    </span>
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        <button className="p-1 text-slate-400 hover:text-violet-600 rounded-md" onClick={() => openEditStep(step)}>
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStep(step.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 rounded-md"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed border-2 border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 h-10"
                            onClick={openAddStep}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Step
                        </Button>
                    </div>
                </div>

                <div className="h-8"></div>

            </main>

            <ParentNavBar />

            <StepEditorModal
                isOpen={isStepModalOpen}
                initialData={editingStep}
                onClose={() => setIsStepModalOpen(false)}
                onSave={handleSaveStep}
                onDelete={editingStep ? () => handleDeleteStep(editingStep.id) : undefined}
            />
        </div>
    );
}
