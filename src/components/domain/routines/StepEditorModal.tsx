"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Star, Trash2, Award, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { cn } from '@/lib/utils';
import { Step } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AudioRecorder } from '@/components/ui/AudioRecorder';
import { Textarea } from '@/components/ui/textarea';

interface StepEditorModalProps {
    isOpen: boolean;
    initialData?: Step;
    onClose: () => void;
    onSave: (step: Step) => void;
    onDelete?: () => void;
}

const TIMER_OPTIONS = [
    { label: '15m', value: 900 },
    { label: '30m', value: 1800 },
    { label: '45m', value: 2700 }, // Added 45m as a useful intermediate since we removed 10m and 1h
];

export function StepEditorModal({ isOpen, initialData, onClose, onSave, onDelete }: StepEditorModalProps) {
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState('Smile');
    const [showPicker, setShowPicker] = useState(false);

    // Timer
    const [isTimerEnabled, setIsTimerEnabled] = useState(false);
    const [timerDuration, setTimerDuration] = useState<number>(600); // default 10m
    const [customMinutes, setCustomMinutes] = useState<string>(''); // For custom input

    // Fields
    const [starReward, setStarReward] = useState<number | ''>(5);
    const [description, setDescription] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

    // Initialize state
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setIcon(initialData.icon);
                const duration = initialData.timerDuration || 600;
                setTimerDuration(duration);
                setIsTimerEnabled(!!initialData.timerDuration && initialData.timerDuration > 0);
                setStarReward(initialData.stars || 5);
                setDescription(initialData.description || '');
                setAudioUrl(initialData.audioUrl);
            } else {
                setTitle('');
                setIcon('Smile');
                setTimerDuration(600);
                setIsTimerEnabled(false);
                setStarReward(5);
                setDescription('');
                setAudioUrl(undefined);
            }
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        if (!title.trim()) return;

        const finalStep: Step = {
            id: initialData?.id || '',
            title: title.trim(),
            duration: Math.ceil((isTimerEnabled ? timerDuration : 0) / 60) || 5,
            timerDuration: isTimerEnabled ? timerDuration : 0,
            icon,
            stars: Number(starReward) || 0,
            description: description.trim(),
            audioUrl: audioUrl
        };
        onSave(finalStep);
    };

    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore
        const LucideIcon = Icons[name as keyof typeof Icons] as any;
        if (LucideIcon) return <LucideIcon className={className} />;
        return <span className={cn(className?.includes('w-6') ? 'text-2xl' : 'text-xl', "leading-none")}>{name}</span>;
    };

    const handleCustomTimerChange = (val: string) => {
        setCustomMinutes(val);
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            setTimerDuration(num * 60);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-[#F8FAFC] w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
                    >
                        {/* Header */}
                        <header className="bg-white px-4 h-14 flex items-center shadow-sm shrink-0 z-10 border-b border-slate-100 justify-between">
                            <div className="flex items-center">
                                <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <h2 className="ml-2 font-bold text-lg text-slate-800">Step</h2>
                            </div>

                            <div className="flex items-center gap-2">
                                {onDelete && (
                                    <button onClick={onDelete} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}

                            </div>
                        </header>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 pb-8 flex flex-col gap-6">

                            {/* 1. Title */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step Title</label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Brush Teeth"
                                    className="h-12 bg-slate-50 border-slate-200 text-slate-900 font-bold text-sm focus-visible:ring-primary/50 placeholder:text-slate-300"
                                    autoFocus
                                />
                            </div>

                            {/* 2. Row: Icon | Reward */}
                            <div className="grid grid-cols-[80px_1fr] gap-4">
                                {/* Icon */}
                                <div className="flex flex-col gap-2 relative">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Icon</label>
                                    <button
                                        onClick={() => setShowPicker(!showPicker)}
                                        className="w-full h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary hover:scale-105 transition-transform"
                                    >
                                        <RenderIcon name={icon} className="w-6 h-6" />
                                    </button>

                                    {/* Icon Picker Popover */}
                                    {showPicker && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40 bg-black/5"
                                                onClick={() => setShowPicker(false)}
                                            />
                                            <div className="absolute top-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 w-[300px] animate-in slide-in-from-top-2">
                                                <div className="bg-white p-3 border-b border-slate-100 flex items-center justify-between">
                                                    <h3 className="font-bold text-xs text-slate-600 uppercase">Choose Icon</h3>
                                                    <button onClick={() => setShowPicker(false)} className="p-1 bg-slate-100 rounded-full hover:bg-slate-200"><Icons.X className="w-3 h-3 text-slate-400" /></button>
                                                </div>
                                                <EmojiPicker
                                                    onEmojiClick={(d) => { setIcon(d.emoji); setShowPicker(false); }}
                                                    width="100%"
                                                    height={300}
                                                    lazyLoadEmojis={true}
                                                    searchDisabled={false}
                                                    skinTonesDisabled={true}
                                                    previewConfig={{ showPreview: false }}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Reward */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reward</label>
                                    <div className="h-12 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between px-3">
                                        <div className="flex items-center gap-2 flex-1">
                                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={starReward}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '') setStarReward('');
                                                    else if (/^\d+$/.test(val)) setStarReward(Number(val));
                                                }}
                                                className="h-8 bg-transparent border-none text-yellow-700 font-bold text-lg p-0 focus-visible:ring-0 w-full text-center shadow-none"
                                            />
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button onClick={() => setStarReward(s => Math.max(0, (Number(s) || 0) - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm border border-yellow-100 hover:bg-yellow-100 font-bold text-sm">-</button>
                                            <button onClick={() => setStarReward(s => (Number(s) || 0) + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm border border-yellow-100 hover:bg-yellow-100 font-bold text-sm">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Timer */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-slate-500" />
                                        <h3 className="font-bold text-slate-700 text-sm">Timer</h3>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isTimerEnabled} onChange={(e) => setIsTimerEnabled(e.target.checked)} />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {isTimerEnabled && (
                                    <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 fade-in">
                                        {TIMER_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => { setTimerDuration(opt.value); setCustomMinutes(''); }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all h-9",
                                                    (timerDuration === opt.value && !customMinutes)
                                                        ? "bg-primary text-white border-primary shadow-sm"
                                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                        <div className="flex items-center gap-2 ml-2 border-l border-slate-200 pl-4">
                                            <Input
                                                type="number"
                                                placeholder="Custom"
                                                value={customMinutes}
                                                onChange={e => handleCustomTimerChange(e.target.value)}
                                                className="h-9 w-20 text-xs font-bold bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-primary/50"
                                            />
                                            <span className="text-xs font-bold text-slate-400">min</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. Description */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instructions (Optional)</label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add details..."
                                    className="bg-slate-50 border-slate-200 min-h-[80px] text-sm font-medium focus:ring-primary/50 text-slate-900 placeholder:text-slate-300"
                                />
                            </div>

                            {/* 5. Voice Note */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice Instruction</label>
                                <AudioRecorder
                                    initialAudio={audioUrl}
                                    onRecordingComplete={(base64) => setAudioUrl(base64)}
                                    onDelete={() => setAudioUrl(undefined)}
                                />
                            </div>
                        </div>


                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <Button
                                onClick={handleSave}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl h-12 text-lg shadow-lg shadow-primary/20"
                            >
                                Save Step
                            </Button>
                        </div>

                    </motion.div>
                </div >
            )
            }
        </AnimatePresence >
    );
}
