"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Star, Clock, Trash2, Save } from 'lucide-react';
import { Activity, Step, Profile, db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/lib/hooks/useAuth';

interface RoutineEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        title: string,
        time: string,
        steps: Step[],
        profileIds: string[]
    ) => Promise<void>;
    initialData?: Activity;
}

export function RoutineEditorModal({ isOpen, onClose, onSave, initialData }: RoutineEditorProps) {
    const { user } = useAuth();

    // Form State
    const [title, setTitle] = useState('');
    const [timeOfDay, setTimeOfDay] = useState('08:00');
    const [steps, setSteps] = useState<Step[]>([]);
    const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

    // Available Profiles
    const [profiles, setProfiles] = useState<Profile[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Reset or Load Data
            if (initialData) {
                setTitle(initialData.title);
                setTimeOfDay(initialData.timeOfDay);
                setSteps(initialData.steps);
                setSelectedProfileIds(initialData.profileIds);
            } else {
                setTitle('');
                setTimeOfDay('08:00');
                setSteps([]);
                setSelectedProfileIds([]);
            }

            // Fetch Profiles
            if (user) {
                db.profiles.where('accountId').equals(user.uid).filter(p => p.type === 'child').toArray().then(setProfiles);
            }
        }
    }, [isOpen, initialData, user]);

    const handleAddStep = () => {
        const newStep: Step = {
            id: uuidv4(),
            title: '',
            duration: 5,
            icon: 'star',
            stars: 10
        };
        setSteps([...steps, newStep]);
    };

    const updateStep = (id: string, field: keyof Step, value: any) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeStep = (id: string) => {
        setSteps(prev => prev.filter(s => s.id !== id));
    };

    const toggleProfile = (id: string) => {
        setSelectedProfileIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        await onSave(title, timeOfDay, steps, selectedProfileIds);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Routine" : "New Routine"} className="max-w-xl">
            <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">

                {/* 1. Basic Info */}
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Routine Name</label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Morning Rush"
                            className="mt-1"
                        />
                    </div>
                    <div className="w-1/3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                        <Input
                            type="time"
                            value={timeOfDay}
                            onChange={e => setTimeOfDay(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                </div>

                {/* 2. Assign to Children */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assign To</label>
                    <div className="flex gap-3">
                        {profiles.map(p => {
                            const isSelected = selectedProfileIds.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => toggleProfile(p.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${isSelected ? 'bg-violet-100 border-violet-500 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    <span>{isSelected ? '✓' : '+'}</span>
                                    <span className="text-sm font-medium">{p.name}</span>
                                </button>
                            )
                        })}
                        {profiles.length === 0 && <p className="text-sm text-slate-400 italic">No child profiles found.</p>}
                    </div>
                </div>

                {/* 3. Steps Editor */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Steps</label>
                    </div>

                    <div className="flex flex-col gap-3">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in slide-in-from-left-2 duration-200">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-xs font-bold text-slate-500 mt-2">
                                    {index + 1}
                                </div>

                                <div className="flex-1 flex flex-col gap-2">
                                    <Input
                                        value={step.title}
                                        onChange={e => updateStep(step.id, 'title', e.target.value)}
                                        placeholder="Step task (e.g. Brush Teeth)"
                                        className="h-10 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 h-8 w-24">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <input
                                                type="number"
                                                className="w-full text-xs outline-none bg-transparent"
                                                value={step.duration}
                                                onChange={e => updateStep(step.id, 'duration', parseInt(e.target.value))}
                                            />
                                            <span className="text-[10px] text-slate-400">m</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 h-8 w-24">
                                            <Star className="w-3 h-3 text-amber-400 fill-current" />
                                            <input
                                                type="number"
                                                className="w-full text-xs outline-none bg-transparent"
                                                value={step.stars}
                                                onChange={e => updateStep(step.id, 'stars', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeStep(step.id)}
                                    className="p-1 hover:bg-red-100 hover:text-red-500 rounded text-slate-400 mt-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        <Button variant="outline" size="sm" onClick={handleAddStep} className="gap-2 border-dashed">
                            <Plus className="w-4 h-4" /> Add Step
                        </Button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="cosmic" onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" /> Save Routine
                    </Button>
                </div>

            </div>
        </Modal>
    );
}
