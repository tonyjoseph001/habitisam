"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { db, Activity, Step, Goal, GoalType } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save, Sparkles, Plus, Clock, Check, Trash2, GripVertical, Pencil, Award, Calendar as CalendarIcon, Hash, ListChecks, SlidersHorizontal, LayoutGrid, Calendar, CheckCircle2 } from 'lucide-react';
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

const TRACKING_TYPES = [
    { id: 'counter', label: 'Counter', desc: '1, 2, 3...', icon: Hash },
    { id: 'checklist', label: 'Checklist', desc: 'Steps', icon: ListChecks },
    { id: 'slider', label: 'Slider', desc: '%', icon: SlidersHorizontal },
    { id: 'binary', label: 'Done?', desc: 'Yes / No', icon: CheckCircle2 },
];

const ICONS_LIST = ['Sun', 'Moon', 'Book', 'Utensils', 'Briefcase', 'ShowerHead', 'Gamepad2', 'BedDouble', 'Trophy', 'Target', 'PiggyBank', 'Bike', 'Music', 'Star', 'Heart', 'Zap', 'Smile', 'Camera', 'Palette', 'Rocket'];

interface RoutineEditorProps {
    initialRoutineId?: string;
}

export function RoutineEditor({ initialRoutineId }: RoutineEditorProps) {
    const router = useRouter();
    const { user } = useAuth();
    const isEditMode = !!initialRoutineId;

    const childProfiles = useLiveQuery(() => db.profiles.where('type').equals('child').toArray());

    // --- State ---
    // Top Toggle state: 'recurring' | 'one-time' | 'goal'
    const [editorType, setEditorType] = useState<'recurring' | 'one-time' | 'goal'>('recurring');

    // Shared
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState('Sun');
    const [assignedChildIds, setAssignedChildIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(isEditMode);

    // Activity Defaults
    const [time, setTime] = useState('07:30');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [steps, setSteps] = useState<Step[]>([]);

    // Goal Defaults
    const [goalType, setGoalType] = useState<GoalType>('counter');
    const [target, setTarget] = useState<number>(10);
    const [unit, setUnit] = useState<string>('Books');
    const [dueDate, setDueDate] = useState<string>('');
    const [goalRewardStars, setGoalRewardStars] = useState<number>(500);
    const [goalChecklistItems, setGoalChecklistItems] = useState<string[]>([]); // New state for checklist items

    // Modal
    const [isStepModalOpen, setIsStepModalOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<Step | undefined>(undefined);

    useEffect(() => {
        if (initialRoutineId) {
            const loadData = async () => {
                try {
                    // Try Activity
                    const activity = await db.activities.get(initialRoutineId);
                    if (activity) {
                        setEditorType(activity.type); // 'recurring' or 'one-time'
                        setTitle(activity.title);
                        if (activity.icon) setIcon(activity.icon);
                        setTime(activity.timeOfDay);
                        if (activity.date) setDate(activity.date);
                        if (activity.days) setSelectedDays(activity.days);
                        if (activity.profileIds) setAssignedChildIds(activity.profileIds);
                        if (activity.steps) setSteps(activity.steps);
                        setIsLoading(false);
                        return;
                    }
                    // Try Goal
                    const goal = await db.goals.get(initialRoutineId);
                    if (goal) {
                        setEditorType('goal');
                        setTitle(goal.title);
                        if (goal.icon) setIcon(goal.icon);
                        setGoalType(goal.type);
                        setTarget(goal.target);
                        if (goal.unit) setUnit(goal.unit);
                        if (goal.checklist) setGoalChecklistItems(goal.checklist);
                        if (goal.dueDate) setDueDate(goal.dueDate);
                        setGoalRewardStars(goal.stars);
                        setAssignedChildIds([goal.profileId]);
                        setIsLoading(false);
                        return;
                    }
                    setIsLoading(false);
                } catch (err) { console.error(err); setIsLoading(false); }
            };
            loadData();
        }
    }, [initialRoutineId]);

    // --- Actions ---
    const toggleDay = (dayId: number) => {
        if (selectedDays.includes(dayId)) setSelectedDays(prev => prev.filter(d => d !== dayId));
        else setSelectedDays(prev => [...prev, dayId]);
    };

    const toggleChild = (childId: string) => {
        if (assignedChildIds.includes(childId)) setAssignedChildIds(prev => prev.filter(id => id !== childId));
        else setAssignedChildIds(prev => [...prev, childId]);
    };

    // Goal Checklist Actions
    const addChecklistItem = () => {
        setGoalChecklistItems(prev => [...prev, '']);
    };
    const updateChecklistItem = (index: number, val: string) => {
        const newItems = [...goalChecklistItems];
        newItems[index] = val;
        setGoalChecklistItems(newItems);
    };
    const removeChecklistItem = (index: number) => {
        setGoalChecklistItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!user) return alert("Please log in.");
        if (!title.trim()) return alert("Please enter a title.");
        if (assignedChildIds.length === 0) return alert("Please assign to at least one child.");

        try {
            if (editorType === 'goal') {
                for (const pid of assignedChildIds) {
                    // Logic check for target
                    let finalTarget = target;
                    if (goalType === 'checklist') {
                        finalTarget = goalChecklistItems.length; // Target is number of items
                    } else if (goalType === 'binary') {
                        finalTarget = 1; // Binary is always 1
                    }

                    const goalData: Goal = {
                        id: isEditMode ? initialRoutineId! : uuidv4(),
                        accountId: user.uid,
                        profileId: pid,
                        title: title.trim(),
                        type: goalType,
                        target: finalTarget,
                        current: 0,
                        unit: unit,
                        stars: goalRewardStars,
                        icon: icon,
                        dueDate: dueDate || undefined,
                        checklist: goalType === 'checklist' ? goalChecklistItems : undefined,
                        status: 'active',
                        createdAt: new Date()
                    };
                    if (isEditMode) {
                        await db.goals.put(goalData);
                        break;
                    } else {
                        await db.goals.add(goalData);
                    }
                }
            } else {
                // Save Activity
                if (steps.length === 0) return alert("Please add at least one step.");
                const activityData: Activity = {
                    id: initialRoutineId || uuidv4(),
                    accountId: user.uid,
                    profileIds: assignedChildIds,
                    type: editorType as 'recurring' | 'one-time', // Safe cast
                    title: title.trim(),
                    icon: icon,
                    timeOfDay: time,
                    days: editorType === 'recurring' ? (selectedDays as any) : undefined,
                    date: editorType === 'one-time' ? date : undefined,
                    steps: steps,
                    isActive: true,
                    createdAt: new Date()
                };
                if (isEditMode) await db.activities.put(activityData);
                else await db.activities.add(activityData);
            }
            router.push('/parent/routines');
        } catch (e) { console.error(e); alert("Failed to save."); }
    };

    // Use previous step logic
    const openAddStep = () => { setEditingStep(undefined); setIsStepModalOpen(true); };
    const openEditStep = (step: Step) => { setEditingStep(step); setIsStepModalOpen(true); };
    const handleSaveStep = (step: Step) => {
        if (editingStep) setSteps(steps.map(s => s.id === step.id ? step : s));
        else setSteps([...steps, { ...step, id: uuidv4() }]);
        setIsStepModalOpen(false);
    };
    const handleDeleteStep = (stepId: string) => {
        setSteps(steps.filter(s => s.id !== stepId));
        setIsStepModalOpen(false);
    };

    const RenderIcon = ({ name, size = "w-5 h-5" }: { name: string, size?: string }) => {
        // @ts-ignore
        const Icon = Icons[name] || Icons.HelpCircle;
        // @ts-ignore
        return <Icon className={size} />;
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Item...</div>;

    const isGoal = editorType === 'goal';

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 text-slate-500"><ChevronLeft className="w-6 h-6" /></Button>
                <h1 className="text-lg font-bold text-slate-900">{isEditMode ? 'Edit Item' : 'New Item'}</h1>
                <Button variant="cosmic" size="sm" onClick={handleSave} className="gap-2 px-4 h-9"><Save className="w-4 h-4" /> Save</Button>
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {/* 1. TOP TOGGLE (Unified) */}
                <div className="bg-white rounded-xl mx-4 p-2 shadow-sm border border-slate-200">
                    <div className="bg-slate-100 p-1 rounded-lg flex relative">
                        {/* Animated Tab Background could go here but standard buttons for now */}
                        <button onClick={() => setEditorType('recurring')} className={cn("flex-1 py-2 rounded-md text-xs font-bold transition-all", editorType === 'recurring' ? "bg-white text-violet-600 shadow-sm" : "text-slate-500")}>Recurring</button>
                        <button onClick={() => setEditorType('one-time')} className={cn("flex-1 py-2 rounded-md text-xs font-bold transition-all", editorType === 'one-time' ? "bg-white text-violet-600 shadow-sm" : "text-slate-500")}>One-Time</button>
                        <button onClick={() => setEditorType('goal')} className={cn("flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1", editorType === 'goal' ? "bg-blue-100/50 text-blue-600 shadow-sm border border-blue-200" : "text-slate-500")}>Goal 🏆</button>
                    </div>
                </div>

                {/* 2. TITLE & ICON (Shared) */}
                <div className="bg-white rounded-xl mx-4 p-5 shadow-sm border border-slate-200 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isGoal ? 'Goal Title' : 'Routine Title'}</label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={isGoal ? "e.g. Science Project" : "e.g. Morning Rush"} className="text-xl font-bold h-12 border-0 border-b-2 border-slate-100 rounded-none px-0 focus-visible:ring-0 focus-visible:border-violet-500 placeholder:text-slate-300 text-slate-900" />
                    </div>

                    {/* Improved Icon Picker Grid */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Icon</label>
                        <div className="grid grid-cols-6 gap-3">
                            {ICONS_LIST.map(name => (
                                <button key={name} onClick={() => setIcon(name)} className={cn("aspect-square rounded-xl flex items-center justify-center transition-all border-2", icon === name ? "border-violet-600 bg-violet-50 text-violet-600" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300")}>
                                    <RenderIcon name={name} size="w-6 h-6" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. CONFIGURATION (Based on Type) */}
                {isGoal ? (
                    <div className="bg-white rounded-xl mx-4 p-5 shadow-sm border-l-4 border-blue-500 flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">How to track progress?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {TRACKING_TYPES.map(t => {
                                    const isSelected = goalType === t.id;
                                    const Icon = t.icon;
                                    return (
                                        <button key={t.id} onClick={() => setGoalType(t.id as GoalType)} className={cn("relative p-4 rounded-xl border-2 flex flex-col items-start gap-3 transition-all text-left h-28", isSelected ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-300")}>
                                            {isSelected && <div className="absolute top-3 right-3 text-blue-500"><Check className="w-5 h-5" /></div>}
                                            <div className={cn("p-2 rounded-lg", isSelected ? "bg-white text-blue-600" : "bg-slate-100 text-slate-400")}><Icon className="w-6 h-6" /></div>
                                            <div><div className={cn("text-sm font-bold", isSelected ? "text-blue-900" : "text-slate-600")}>{t.label}</div><div className="text-[10px] text-slate-400">{t.desc}</div></div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* CHECKLIST SPECIFIC SECTION */}
                        {goalType === 'checklist' && (
                            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestones / Steps</label>
                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{goalChecklistItems.length} Steps Added</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {goalChecklistItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400">{idx + 1}</div>
                                            <Input value={item} onChange={e => updateChecklistItem(idx, e.target.value)} placeholder={`Step ${idx + 1}`} className="h-10 border-slate-200 text-slate-900" />
                                            <button onClick={() => removeChecklistItem(idx)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                    <Button onClick={addChecklistItem} variant="outline" className="h-12 border-dashed border-2 border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 bg-blue-50/50"><Plus className="w-5 h-5 mr-2" /> Add Step</Button>
                                </div>
                            </div>
                        )}

                        {/* OTHER TYPES Target */}
                        {goalType !== 'checklist' && goalType !== 'binary' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Number</label>
                                    <Input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="h-12 text-lg font-bold border-slate-200 text-slate-900" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit</label>
                                    <Input value={unit} onChange={e => setUnit(e.target.value)} className="h-12 font-medium border-slate-200 text-slate-900" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="pl-10 h-12 border-slate-200 font-medium text-slate-900" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reward</label>
                                <div className="h-12 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between px-3">
                                    <Award className="w-6 h-6 text-yellow-500" />
                                    <span className="font-bold text-yellow-700">{goalRewardStars}</span>
                                    <div className="flex flex-col">
                                        <button onClick={() => setGoalRewardStars(s => s + 50)} className="text-yellow-600 hover:text-yellow-800 text-[10px]">▲</button>
                                        <button onClick={() => setGoalRewardStars(s => Math.max(0, s - 50))} className="text-yellow-600 hover:text-yellow-800 text-[10px]">▼</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    // ROUTINE SCHEDULE (Recurring / One-Time)
                    <div className="bg-white rounded-xl mx-4 p-5 shadow-sm border border-slate-200 flex flex-col gap-6">
                        <div className="flex items-center gap-2 mb-1"><Clock className="w-5 h-5 text-violet-500" /><h3 className="font-bold text-slate-800">Schedule</h3></div>

                        {editorType === 'recurring' ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-12 text-lg border-slate-200 text-slate-900" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Repeat On</label>
                                    <div className="flex justify-between">
                                        {DAYS.map(day => (
                                            <button key={day.id} onClick={() => toggleDay(day.id)} className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all", selectedDays.includes(day.id) ? "bg-violet-600 text-white shadow-md scale-110" : "bg-slate-100 text-slate-400")}>{day.label}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // One-Time
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 border-slate-200 text-slate-900" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-12 border-slate-200 text-slate-900" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. ASSIGN TO */}
                <div className="bg-white rounded-xl mx-4 p-5 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <h3 className="font-bold text-slate-800">Assign To</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {childProfiles?.map(child => {
                            const isSelected = assignedChildIds.includes(child.id!);
                            let AvatarIcon = '👶';
                            switch (child.avatarId) { case 'boy': AvatarIcon = '🧑‍🚀'; break; case 'girl': AvatarIcon = '👩‍🚀'; break; case 'alien': AvatarIcon = '👽'; break; case 'robot': AvatarIcon = '🤖'; break; }
                            return (
                                <button key={child.id} onClick={() => toggleChild(child.id!)} className="flex flex-col items-center gap-2 group min-w-[64px]">
                                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all border-2 shadow-sm relative", isSelected ? "border-violet-600 bg-violet-50 scale-105" : "bg-slate-50 border-slate-100")}>
                                        {AvatarIcon}
                                        {isSelected && <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 border-2 border-white"><Check className="w-3 h-3" /></div>}
                                    </div>
                                    <span className={cn("text-xs font-medium truncate w-full text-center", isSelected ? "text-violet-700 font-bold" : "text-slate-500")}>{child.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 5. STEPS (For Routine Only) */}
                {!isGoal && (
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase px-6">Steps</h3>
                        <div className="flex flex-col gap-3 mx-4">
                            {steps.map((step, idx) => (
                                <div key={step.id} onClick={() => openEditStep(step)} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="w-4 h-4 text-slate-300" />
                                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><RenderIcon name={step.icon} size="w-5 h-5" /></div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-sm">{idx + 1}. {step.title}</span>
                                            <span className="text-[10px] text-slate-500">{step.duration} min</span>
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); handleDeleteStep(step.id); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <Button variant="outline" onClick={openAddStep} className="h-12 border-dashed border-2 border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50"><Plus className="w-5 h-5 mr-2" /> Add Step</Button>
                        </div>
                    </div>
                )}

                <div className="h-12"></div>
            </main>

            <StepEditorModal isOpen={isStepModalOpen} initialData={editingStep} onClose={() => setIsStepModalOpen(false)} onSave={handleSaveStep} onDelete={editingStep ? () => handleDeleteStep(editingStep.id) : undefined} />
        </div>
    );
}

