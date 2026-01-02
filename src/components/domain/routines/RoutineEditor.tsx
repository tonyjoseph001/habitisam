"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { Activity, Step, Goal, GoalType, ActivityType } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save, Sparkles, Plus, Clock, Check, Trash2, GripVertical, Pencil, Award, Calendar as CalendarIcon, Hash, ListChecks, SlidersHorizontal, LayoutGrid, Calendar, CheckCircle2, Bell, XCircle, Star, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepEditorModal } from '@/components/domain/routines/StepEditorModal';
import { AudioRecorder } from '@/components/ui/AudioRecorder';
import { Modal } from '@/components/ui/modal';
import * as Icons from 'lucide-react';


import { toast } from 'sonner';
import { ActivityService } from '@/lib/firestore/activities.service';
import { GoalService } from '@/lib/firestore/goals.service';
import { LogService } from '@/lib/firestore/logs.service';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRoutines } from '@/lib/hooks/useRoutines'; // Added
import { getLimits } from '@/config/tiers'; // Added
import { db } from '@/lib/db'; // Added
import { useAccount } from '@/lib/hooks/useAccount'; // Added useAccount
import { QuickAddChildModal } from '@/components/domain/profiles/QuickAddChildModal';
import { IconSelector } from '@/components/domain/routines/IconSelector';

// ... (DAYS, TRACKING_TYPES constants)

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
    { id: 'binary', label: 'Done?', desc: 'Yes / No', icon: CheckCircle2 },
];

interface RoutineEditorProps {
    initialRoutineId?: string;
}

export function RoutineEditor({ initialRoutineId }: RoutineEditorProps) {
    const router = useRouter();
    const { user } = useAuth();
    const isEditMode = !!initialRoutineId;

    const { profiles } = useProfiles();
    const { routines } = useRoutines(); // Added to fetch all routines for counting
    const childProfiles = profiles ? profiles.filter(p => p.type === 'child') : [];

    // --- State ---
    // Top Toggle state: 'recurring' | 'one-time' | 'goal'
    const [editorType, setEditorType] = useState<ActivityType | 'goal'>('recurring');
    const [showIconModal, setShowIconModal] = useState(false);
    const [showQuickAddProfile, setShowQuickAddProfile] = useState(false);

    // Shared
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const { account } = useAccount(); // Added
    const isPremium = account?.licenseType === 'pro' || account?.licenseType === 'enterprise';

    const [icon, setIcon] = useState('Sun');
    const [assignedChildIds, setAssignedChildIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(isEditMode);

    // Activity Defaults
    const [time, setTime] = useState('07:30');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    // Advanced Scheduling
    const [remindMe, setRemindMe] = useState('No reminder');
    const [flexWindow, setFlexWindow] = useState('15 min before');
    const [expires, setExpires] = useState('End of Day');
    const [steps, setSteps] = useState<Step[]>([]);

    // Goal Defaults
    const [goalType, setGoalType] = useState<GoalType>('counter');
    const [target, setTarget] = useState<number>(10);
    const [unit, setUnit] = useState<string>('Books');
    const [dueDate, setDueDate] = useState<string>('');
    const [goalRewardStars, setGoalRewardStars] = useState<number | ''>(500);
    const [goalChecklistItems, setGoalChecklistItems] = useState<string[]>([]);

    // Modal
    const [isStepModalOpen, setIsStepModalOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<Step | undefined>(undefined);
    const [errorModalOpen, setErrorModalOpen] = useState(false);

    const [errorMessage, setErrorMessage] = useState('');

    // Tutorial / Help Modal
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpContent, setHelpContent] = useState({ title: '', text: '' });

    const openHelp = (title: string, text: string) => {
        setHelpContent({ title, text });
        setHelpModalOpen(true);
    };

    const HelpButton = ({ title, text }: { title: string, text: string }) => (
        <button
            onClick={(e) => { e.stopPropagation(); openHelp(title, text); }}
            className="text-slate-400 hover:text-primary transition-colors ml-1.5 align-middle"
        >
            <HelpCircle className="w-4 h-4" />
        </button>
    );

    useEffect(() => {
        if (initialRoutineId) {
            const loadData = async () => {
                try {
                    // Try Activity
                    const activity = await ActivityService.get(initialRoutineId);
                    if (activity) {
                        setEditorType(activity.type);
                        setTitle(activity.title);
                        if (activity.description) setDescription(activity.description);
                        if (activity.audioUrl) setAudioUrl(activity.audioUrl);
                        if (activity.icon) setIcon(activity.icon);
                        setTime(activity.timeOfDay);
                        if (activity.date) setDate(activity.date);
                        if (activity.days) setSelectedDays(activity.days);
                        if (activity.profileIds) setAssignedChildIds(activity.profileIds);
                        if (activity.steps) setSteps(activity.steps);
                        // Advanced
                        if (activity.remindMe) setRemindMe(activity.remindMe);
                        if (activity.flexWindow) setFlexWindow(activity.flexWindow);
                        if (activity.expires) setExpires(activity.expires);
                        setIsLoading(false);
                        return;
                    }
                    // Try Goal
                    const goal = await GoalService.get(initialRoutineId);
                    if (goal) {
                        setEditorType('goal');
                        setTitle(goal.title);
                        if (goal.description) setDescription(goal.description);
                        if (goal.audioUrl) setAudioUrl(goal.audioUrl);
                        if (goal.icon) setIcon(goal.icon);
                        setGoalType(goal.type);
                        setTarget(goal.target);
                        if (goal.unit) setUnit(goal.unit);
                        if (goal.checklist) setGoalChecklistItems(goal.checklist.map(item => typeof item === 'string' ? item : item.text));
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

    // --- Actions --- (Toggle/Modal logic remains same)
    const toggleDay = (dayId: number) => {
        if (selectedDays.includes(dayId)) setSelectedDays(prev => prev.filter(d => d !== dayId));
        else setSelectedDays(prev => [...prev, dayId]);
    };

    const toggleChild = (childId: string) => {
        if (assignedChildIds.includes(childId)) setAssignedChildIds(prev => prev.filter(id => id !== childId));
        else setAssignedChildIds(prev => [...prev, childId]);
    };

    const addChecklistItem = () => setGoalChecklistItems(prev => [...prev, '']);
    const updateChecklistItem = (index: number, val: string) => {
        const newItems = [...goalChecklistItems];
        newItems[index] = val;
        setGoalChecklistItems(newItems);
    };
    const removeChecklistItem = (index: number) => setGoalChecklistItems(prev => prev.filter((_, i) => i !== index));

    const showError = (msg: string) => { setErrorMessage(msg); setErrorModalOpen(true); };

    const handleSave = async () => {
        if (!user) return showError("Please log in.");
        if (!title.trim()) return showError("Please enter a title.");
        if (assignedChildIds.length === 0) return showError("Please assign to at least one child.");

        // --- LIMIT CHECK ---
        if (!isEditMode && editorType !== 'goal') {
            try {
                const account = await db.accounts.get(user.uid);
                const license = account?.licenseType || 'free';
                const limits = getLimits(license);

                if (limits.maxRoutinesPerChild < 50) {
                    for (const childId of assignedChildIds) {
                        const existingCount = routines.filter(r =>
                            r.profileIds?.includes(childId)
                        ).length;

                        if (existingCount >= limits.maxRoutinesPerChild) {
                            const childName = profiles?.find(p => p.id === childId)?.name || 'Child';
                            toast.error(`Limit reached for ${childName}. Free plan allows ${limits.maxRoutinesPerChild} routines.`);
                            setTimeout(() => router.push('/parent/subscription'), 1500);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Limit check failed", err);
            }
        }
        // -------------------

        try {
            if (editorType === 'goal') {
                for (const pid of assignedChildIds) {
                    let finalTarget = target;
                    if (goalType === 'checklist') finalTarget = goalChecklistItems.length;
                    else if (goalType === 'binary') finalTarget = 1;

                    const goalData: Goal = {
                        id: isEditMode ? initialRoutineId! : uuidv4(),
                        accountId: user.uid,
                        profileId: pid,
                        title: title.trim(),
                        description: description.trim(),
                        audioUrl: audioUrl,
                        type: goalType,
                        target: finalTarget,
                        current: 0,
                        unit: unit,
                        stars: Number(goalRewardStars) || 0,
                        icon: icon,
                        dueDate: dueDate || undefined,
                        checklist: goalType === 'checklist' ? goalChecklistItems.map(text => ({ text, completed: false })) : undefined,
                        status: 'active',
                        createdAt: new Date()
                    };
                    if (isEditMode) {
                        await GoalService.update(goalData.id, goalData);
                    } else {
                        await GoalService.add(goalData);
                    }
                }
                toast.success(isEditMode ? "Goal updated!" : "Goal created!");
            } else {
                if (steps.length === 0) return alert("Please add at least one step.");

                const activityData: Activity = {
                    id: initialRoutineId || uuidv4(),
                    accountId: user.uid,
                    profileIds: assignedChildIds,
                    type: editorType as ActivityType,
                    title: title.trim(),
                    description: description.trim(),
                    audioUrl: audioUrl,
                    icon: icon,
                    timeOfDay: time,
                    days: editorType === 'recurring' ? (selectedDays as any) : undefined,
                    date: editorType === 'one-time' ? date : undefined,
                    remindMe,
                    flexWindow,
                    expires,
                    steps: steps,
                    isActive: true,
                    createdAt: new Date()
                };
                if (isEditMode) {
                    await ActivityService.update(activityData.id, activityData);
                    toast.success("Routine updated!");
                } else {
                    await ActivityService.add(activityData);
                    toast.success(editorType === 'one-time' ? "Task created!" : "Routine created!");
                }
            }
            router.push('/parent/routines');
        } catch (e) { console.error(e); showError("Failed to save."); toast.error("Failed to save."); }
    };

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

    const RenderIcon = ({ name, size = "w-5 h-5", className }: { name: string, size?: string, className?: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name];
        if (LucideIcon) return <LucideIcon className={cn(size, className)} />;
        return <span className={cn(size?.includes('w-6') ? 'text-2xl' : 'text-xl', "leading-none", className)}>{name}</span>;
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Item...</div>;

    const isGoal = editorType === 'goal';

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans">
            {/* Header */}
            <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="w-10 h-10 p-0 text-slate-500 hover:bg-slate-100 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold text-slate-900">
                    {isEditMode ? 'Edit ' : 'New '}
                    {editorType === 'goal' ? 'Goal' : (editorType === 'one-time' ? 'Task' : 'Routine')}
                    <HelpButton title="How it Works" text="1. You create a Routine, Task, or Goal here. 
2. It appears instantly on your child's dashboard. 
3. They tap it to start, follow your steps/instructions, and earn stars when they finish!" />
                </h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-screen-md mx-auto px-4">
                {/* 1. TOP TOGGLE (Segmented Control) */}
                <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex">
                    <button onClick={() => setEditorType('recurring')} className={cn("flex-1 py-2.5 rounded-lg text-xs font-bold transition-all", editorType === 'recurring' ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>Routine</button>
                    <button onClick={() => setEditorType('one-time')} className={cn("flex-1 py-2.5 rounded-lg text-xs font-bold transition-all", editorType === 'one-time' ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>One-Time</button>
                    <button onClick={() => setEditorType('goal')} className={cn("flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1", editorType === 'goal' ? "bg-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}>Goal 🏆</button>
                </div>

                {/* 2. MAIN CONFIGURATION CARD */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col gap-6">

                    {isGoal ? (
                        <>
                            {/* GOAL LAYOUT */}
                            {/* 1. Title (Full Width) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    Goal Title
                                    <HelpButton title="Goal Title" text="Give your goal a clear name like 'Read 5 Books' or 'Save $50'. Make it specific so your child knows exactly what to aim for!" />
                                </label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Read 5 Books"
                                    className="h-12 bg-slate-50 border-slate-200 text-slate-900 font-bold text-base focus-visible:ring-violet-500"
                                />
                            </div>

                            {/* 2. Row: Icon | Due Date */}
                            <div className="grid grid-cols-[80px_1fr] gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Icon
                                        <HelpButton title="Choose an Icon" text="Pick a fun emoji that represents this goal. Visuals help children recognize their tasks quickly, even if they can't read well yet." />
                                    </label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowIconModal(!showIconModal)}
                                            className="w-full h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary hover:scale-105 transition-transform"
                                        >
                                            <RenderIcon name={icon} size="w-6 h-6" />
                                        </button>
                                        {showIconModal && (
                                            <>
                                                <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setShowIconModal(false)} />
                                                <div className="absolute top-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 w-[340px] h-[300px] bg-white animate-in slide-in-from-top-2 fade-in-20">
                                                    <IconSelector value={icon} onChange={setIcon} onClose={() => setShowIconModal(false)} isPremium={isPremium} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 relative z-10">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Due Date
                                        <HelpButton title="Due Date" text="Optional: Set a deadline for this goal. Great for long-term missions like 'Summer Reading List'. Leave blank for ongoing goals." />
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                                            className="h-12 border-slate-200 text-sm font-bold text-slate-900 block w-full bg-slate-50"
                                        />
                                        {!dueDate && <div className="absolute right-3 top-3 pointer-events-none text-slate-400"><CalendarIcon className="w-5 h-5" /></div>}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Description */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    Description (Optional)
                                    <HelpButton title="Description" text="Add extra details for yourself. For example, 'Pack the blue lunchbox' or 'Read Chapter 3 to 5'." />
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add details..."
                                    className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-y"
                                />
                            </div>

                            {/* 4. Row: Voice Note | Reward */}
                            <div className="flex flex-col gap-6">
                                {/* Voice Note */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Voice Note
                                        <HelpButton title="Voice Note" text="Record a voice message for your child! They can listen to your instructions instead of reading them. Great for younger kids." />
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <AudioRecorder
                                            initialAudio={audioUrl}
                                            onRecordingComplete={(base64) => setAudioUrl(base64)}
                                            onDelete={() => setAudioUrl('')}
                                        />
                                    </div>
                                </div>

                                {/* Reward */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Reward
                                        <HelpButton title="Goal Reward" text="How many stars will they earn for completing this ENTIRE goal? Big achievements deserve big rewards! (e.g., 500 Stars)" />
                                    </label>
                                    <div className="h-12 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between px-3">
                                        <div className="flex items-center gap-2 flex-1">
                                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={goalRewardStars}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '') setGoalRewardStars('');
                                                    else if (/^\d+$/.test(val)) setGoalRewardStars(Number(val));
                                                }}
                                                className="h-8 bg-transparent border-none text-yellow-700 font-bold text-lg p-0 focus-visible:ring-0 w-full text-center shadow-none"
                                            />
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button onClick={() => setGoalRewardStars(s => Math.max(0, (Number(s) || 0) - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm border border-yellow-100 hover:bg-yellow-100 font-bold text-lg">-</button>
                                            <button onClick={() => setGoalRewardStars(s => (Number(s) || 0) + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm border border-yellow-100 hover:bg-yellow-100 font-bold text-lg">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* ROUTINE / ONE-TIME LAYOUT (Original) */}
                            {/* Title & Icon Row */}
                            <div className="flex gap-4">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Title
                                        <HelpButton title="Routine Title" text="Give it a simple name like 'Morning Routine' or 'Bedtime'. This is what appears on the dashboard." />
                                    </label>
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Morning Routine"
                                        className="h-12 bg-slate-50 border-slate-200 text-slate-900 font-bold text-base focus-visible:ring-primary/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Icon
                                        <HelpButton title="Icon" text="Choose a visual that makes this routine easy to recognize instantly." />
                                    </label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowIconModal(!showIconModal)}
                                            className="w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary hover:scale-105 transition-transform"
                                        >
                                            <RenderIcon name={icon} size="w-6 h-6" />
                                        </button>
                                        {showIconModal && (
                                            <>
                                                <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setShowIconModal(false)} />
                                                <div className="absolute top-14 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 w-[340px] h-[300px] bg-white animate-in slide-in-from-top-2 fade-in-20">
                                                    <IconSelector value={icon} onChange={setIcon} onClose={() => setShowIconModal(false)} isPremium={isPremium} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    Description (Optional)
                                    <HelpButton title="Description" text="Add extra details for yourself. For example, 'Pack the blue lunchbox' or 'Read Chapter 3 to 5'." />
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add details..."
                                    className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-y"
                                />
                            </div>

                            {/* Voice Note (Full Width) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    Voice Note
                                    <HelpButton title="Voice Note" text="Record a voice message for your child! They can listen to your instructions instead of reading them. Great for younger kids." />
                                </label>
                                <div className="flex items-center gap-3">
                                    <AudioRecorder
                                        initialAudio={audioUrl}
                                        onRecordingComplete={(base64) => setAudioUrl(base64)}
                                        onDelete={() => setAudioUrl('')}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                </div>

                {/* 3. TYPE-SPECIFIC SETTINGS */}
                {isGoal ? (
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col gap-6">

                        {/* Goal Type Selection */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                Progress Goal
                                <HelpButton title="Goal Type" text="Choose how to track progress: 'Counter' for amounts (books, laps), 'Checklist' for multi-step projects, or 'Done?' for simple yes/no completion." />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {TRACKING_TYPES.map(t => {
                                    const isSelected = goalType === t.id;
                                    const Icon = t.icon;
                                    return (
                                        <button key={t.id} onClick={() => setGoalType(t.id as GoalType)} className={cn("relative p-3 rounded-xl border-2 flex flex-col items-start gap-2 transition-all text-left", isSelected ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-300")}>
                                            <div className="flex justify-between w-full">
                                                <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><Icon className="w-5 h-5" /></div>
                                                {isSelected && <Check className="w-4 h-4 text-primary" />}
                                            </div>
                                            <div><div className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-slate-600")}>{t.label}</div></div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* REWARD & DUE DATE - Moved Up per request */}


                        {/* Checklist Section */}
                        {goalType === 'checklist' && (
                            <div className="flex flex-col gap-3 pt-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist Items</label>
                                <div className="flex flex-col gap-2">
                                    {goalChecklistItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-sm">{idx + 1}</div>
                                            <Input value={item} onChange={e => updateChecklistItem(idx, e.target.value)} placeholder={`Item ${idx + 1}`} className="h-10 border-slate-200 text-sm font-medium" />
                                            <button onClick={() => removeChecklistItem(idx)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    <Button onClick={addChecklistItem} variant="outline" className="h-10 border-dashed border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 bg-slate-50">+ Add Item</Button>
                                </div>
                            </div>
                        )}

                        {/* Counter/Slider Target Section */}
                        {goalType !== 'checklist' && goalType !== 'binary' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Amount</label>
                                    <Input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="h-10 text-sm font-bold border-slate-200 text-slate-900 bg-slate-50" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        Unit Label
                                        <HelpButton title="Unit Label" text="What are we counting? e.g., 'Pages', 'Laps', 'Minutes'. This shows up next to the number." />
                                    </label>
                                    <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Pages" className="h-10 text-sm font-bold border-slate-200 text-slate-900 bg-slate-50" />
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    // ROUTINE SCHEDULE
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col gap-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-5 h-5 text-slate-900" />
                            <h3 className="font-bold text-slate-900">Schedule</h3>
                            <HelpButton title="Scheduling" text="Set when this routine should happen. 'Recurring' repeats on specific days (like school days). 'One-Time' is for a specific date." />
                        </div>

                        {editorType === 'recurring' ? (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                                        <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-10 text-sm font-bold border-slate-200 text-slate-900 bg-slate-50" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Repeat On</label>
                                        <div className="flex justify-between gap-1">
                                            {DAYS.map(day => (
                                                <button key={day.id} onClick={() => toggleDay(day.id)} className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all", selectedDays.includes(day.id) ? "bg-primary text-white shadow-md scale-105" : "bg-slate-100 text-slate-400")}>{day.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                                        className="h-10 border-slate-200 text-sm font-bold border-slate-900 block w-full bg-slate-50"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-10 text-sm font-bold border-slate-200 text-slate-900 bg-slate-50" />
                                </div>
                            </div>
                        )}

                        {/* ADVANCED SCHEDULING FIELDS (Remind, Flex, Expire) */}
                        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm relative">
                                        <Bell className="w-5 h-5 fill-current" />
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <p className="text-sm font-bold text-slate-700">Remind Me</p>
                                            <HelpButton title="Reminders" text="We can send a push notification to your device (or the child's device) to remind you when this routine is starting." />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">Push alert</p>
                                    </div>
                                </div>
                                <select
                                    value={remindMe}
                                    onChange={e => setRemindMe(e.target.value)}
                                    className="text-right font-bold text-sm text-blue-600 bg-transparent outline-none cursor-pointer w-32 appearance-none active:scale-95 transition-transform"
                                >
                                    <option>At start time</option>
                                    <option>5 min before</option>
                                    <option>15 min before</option>
                                    <option>No reminder</option>
                                </select>
                            </div>

                            {/* Flex Window */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
                                        <Clock className="w-5 h-5 fill-current" />
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <p className="text-sm font-bold text-slate-700">Flex Window</p>
                                            <HelpButton title="Flex Window" text="How early can this be started? '15 min before' means if it starts at 8:00 AM, they can see/start it at 7:45 AM." />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">Time to start</p>
                                    </div>
                                </div>
                                <select
                                    value={flexWindow}
                                    onChange={e => setFlexWindow(e.target.value)}
                                    className="text-right font-bold text-sm text-green-600 bg-transparent outline-none cursor-pointer w-32 appearance-none active:scale-95 transition-transform"
                                >
                                    <option>Anytime Today</option>
                                    <option>15 min before</option>
                                    <option>30 min before</option>
                                    <option>1 Hour before</option>
                                    <option>3 Hour before</option>
                                </select>
                            </div>

                            {/* Expires */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm">
                                        <XCircle className="w-5 h-5 fill-current" />
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <p className="text-sm font-bold text-slate-700">Expires</p>
                                            <HelpButton title="Expires" text="When should this task disappear? 'End of Day' means it resets tomorrow. 'Never' keeps it there until done." />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">Remove task</p>
                                    </div>
                                </div>
                                <select
                                    value={expires}
                                    onChange={e => setExpires(e.target.value)}
                                    className="text-right font-bold text-sm text-red-500 bg-transparent outline-none cursor-pointer w-32 appearance-none active:scale-95 transition-transform"
                                >
                                    <option>End of Day</option>
                                    <option>1 Hour later</option>
                                    <option>2 Hours later</option>
                                    <option>Never</option>
                                </select>
                            </div>

                        </div>
                    </div>
                )}


                {/* 4. ASSIGN TO */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-slate-400 flex items-center">
                        Assign To
                        <HelpButton title="Assign Child" text="Which child is this for? You can assign a routine to multiple children at once to save time!" />
                    </h3>

                    {childProfiles.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center">
                            <p className="text-sm text-slate-500 font-medium">No child profiles found.</p>
                            <Button onClick={() => setShowQuickAddProfile(true)} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                                + Create Child Profile
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide items-center">
                            {childProfiles?.map(child => {
                                const isSelected = assignedChildIds.includes(child.id!);
                                // Dynamic Avatar Lookup
                                const AVATAR_MAP: Record<string, string> = {
                                    boy: '🧑‍🚀', girl: '👩‍🚀', superhero: '🦸', superhero_girl: '🦸‍♀️',
                                    ninja: '🥷', wizard: '🧙', princess: '👸', pirate: '🏴‍☠️',
                                    alien: '👽', robot: '🤖', dinosaur: '🦖', unicorn: '🦄'
                                };
                                const AvatarIcon = AVATAR_MAP[child.avatarId] || '👶';
                                return (
                                    <button key={child.id} onClick={() => toggleChild(child.id!)} className="flex flex-col items-center gap-2 group min-w-[64px]">
                                        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all border-2 shadow-sm relative", isSelected ? "border-primary bg-primary/5 scale-105" : "bg-slate-50 border-slate-100")}>
                                            {AvatarIcon}
                                            {isSelected && <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-white"><Check className="w-3 h-3" /></div>}
                                        </div>
                                        <span className={cn("text-xs font-medium truncate w-full text-center", isSelected ? "text-primary font-bold" : "text-slate-500")}>{child.name}</span>
                                    </button>
                                );
                            })}

                            {/* Quick Add Button at end of list */}
                            <button
                                onClick={() => setShowQuickAddProfile(true)}
                                className="flex flex-col items-center gap-2 group min-w-[64px]"
                            >
                                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all border-2 border-dashed border-slate-300 bg-slate-50 hover:border-primary/50 hover:bg-primary/5 text-slate-400 hover:text-primary">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-medium text-slate-400">Add New</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* 5. STEPS (For Routine Only) */}
                {
                    !isGoal && (
                        <div className="flex flex-col gap-2 mb-8">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    Routine Steps
                                    <HelpButton title="Routine Steps" text="Break this routine into small, easy actions. For 'Bedtime', add steps like 'Brush Teeth', 'Pajamas', 'Read Book'." />
                                </h3>
                            </div>
                            <div className="flex flex-col gap-3">
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
                                <Button variant="outline" onClick={openAddStep} className="h-12 border-dashed border-2 border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 bg-slate-50">+ Add Step</Button>
                            </div>
                        </div>
                    )
                }
            </main>

            {/* FIXED BOTTOM SAVE BAR */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-8 z-50 flex justify-center">
                <div className="max-w-screen-md w-full flex gap-3">
                    <Button variant="ghost" onClick={() => router.back()} className="flex-1 text-slate-500 font-bold">Cancel</Button>
                    <Button onClick={handleSave} className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-base shadow-lg shadow-slate-200">
                        Save
                    </Button>
                </div>
            </div>

            {/* ICON PICKER MODAL - GLOBAL (Mobile Fallback) */}
            {
                showIconModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 p-4 animate-in fade-in" onClick={() => setShowIconModal(false)}>
                        <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[60vh] border border-slate-200" onClick={e => e.stopPropagation()}>
                            <IconSelector value={icon} onChange={setIcon} onClose={() => setShowIconModal(false)} isPremium={isPremium} />
                        </div>
                    </div>
                )
            }

            <StepEditorModal key={editingStep?.id || 'new'} isOpen={isStepModalOpen} initialData={editingStep} onClose={() => setIsStepModalOpen(false)} onSave={handleSaveStep} onDelete={() => editingStep && handleDeleteStep(editingStep.id)} />

            <Modal isOpen={errorModalOpen} onClose={() => setErrorModalOpen(false)} title="Required" className="max-w-xs">
                <div className="p-4 pt-0">
                    <p className="text-slate-600 font-medium mb-6">{errorMessage}</p>
                    <Button onClick={() => setErrorModalOpen(false)} className="w-full bg-primary text-white">Okay</Button>
                </div>
            </Modal>

            <Modal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} title={helpContent.title} className="max-w-xs">
                <div className="p-4 pt-0">
                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">{helpContent.text}</p>
                    <Button onClick={() => setHelpModalOpen(false)} className="w-full bg-primary text-white">Got it</Button>
                </div>
            </Modal>
            <QuickAddChildModal
                isOpen={showQuickAddProfile}
                onClose={() => setShowQuickAddProfile(false)}
                onProfileCreated={(newId) => {
                    setAssignedChildIds(prev => [...prev, newId]);
                    // Implicitly closes via onClose inside modal or we can double check logic
                }}
            />
        </div>
    );
}

