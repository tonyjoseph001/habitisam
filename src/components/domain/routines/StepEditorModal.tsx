"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Minus, Plus, Clock, Star, Trash2 } from 'lucide-react';
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

// 10 Kid-friendly icons as requested + extras
const AVAILABLE_ICONS = [
    'Shirt', 'Book', 'Bed', 'Smile', 'Utensils',
    'Bath', 'Sun', 'Moon', 'Backpack', 'Toy'
];

export function StepEditorModal({ isOpen, initialData, onClose, onSave, onDelete }: StepEditorModalProps) {
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState('Smile');
    const [showPicker, setShowPicker] = useState(false);
    const [isTimerEnabled, setIsTimerEnabled] = useState(false);
    const [timerDuration, setTimerDuration] = useState<number>(120); // seconds (default 2m)
    const [isInputFocused, setIsInputFocused] = useState(false);

    // New Fields
    const [starReward, setStarReward] = useState(5);
    const [description, setDescription] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setIcon(initialData.icon);
                setTimerDuration(initialData.timerDuration || 120);
                setIsTimerEnabled(!!initialData.timerDuration && initialData.timerDuration > 0);
                setStarReward(initialData.stars || 5);
                setDescription(initialData.description || '');
                setAudioUrl(initialData.audioUrl);
            } else {
                setTitle('');
                setIcon('Smile');
                setTimerDuration(120);
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
            id: initialData?.id || '', // specific ID handling upstream
            title: title.trim(),
            duration: Math.ceil((isTimerEnabled ? timerDuration : 0) / 60) || 5, // Visual mins
            timerDuration: isTimerEnabled ? timerDuration : 0,
            icon,
            stars: starReward,
            description: description.trim(),
            audioUrl: audioUrl
        };
        onSave(finalStep);
    };

    // Helper to render Lucide icon dynamically
    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore - Dynamic access
        const LucideIcon = Icons[name as keyof typeof Icons] as any;
        if (LucideIcon) return <LucideIcon className={className} />;
        return <span className={cn(className?.includes('w-') ? 'text-4xl' : 'text-xl', "leading-none")}>{name}</span>;
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content - Full Screen on Mobile, Card on Desktop */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-[#F8FAFC] w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
                    >
                        {/* 1. Top App Bar */}
                        <header className="bg-white px-4 h-16 flex items-center justify-between shadow-sm shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <h2 className="font-fredoka font-semibold text-xl text-[#1E293B]">Edit Step</h2>
                            </div>
                            <button
                                onClick={handleSave}
                                className="text-[#7C3AED] font-bold text-base px-2 py-1 rounded-md hover:bg-violet-50 transition-colors"
                            >
                                Save
                            </button>
                        </header>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">

                            {/* 2. Child Preview Card */}
                            <div className="w-full bg-[#1E1B4B] rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center gap-4 text-center aspect-[4/3] relative overflow-hidden shrink-0">
                                {/* Subtle background glow effect */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />

                                <div className="relative z-10">
                                    <RenderIcon name={icon} className="w-16 h-16 text-white drop-shadow-md" />
                                </div>
                                <h3 className="relative z-10 font-fredoka text-3xl text-white tracking-wide">
                                    {title || "Step Name"}
                                </h3>

                                {/* Badges Row */}
                                <div className="relative z-10 flex gap-2">
                                    {isTimerEnabled && (
                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white/90 text-sm font-bold border border-white/10">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{Math.floor(timerDuration / 60)}:{(timerDuration % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                    )}
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-yellow-300 text-sm font-bold border border-white/10">
                                        <Star className="w-3.5 h-3.5 fill-yellow-300" />
                                        <span>+{starReward}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Basic Info & Rewards */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-6">
                                {/* Step Name Input */}
                                <div className={cn(
                                    "relative rounded-lg border-2 bg-white transition-all duration-200",
                                    isInputFocused ? "border-violet-500" : "border-slate-300"
                                )}>
                                    <label className={cn(
                                        "absolute left-3 transition-all duration-200 pointer-events-none bg-white px-1",
                                        (isInputFocused || title)
                                            ? "-top-2.5 text-xs font-bold text-violet-600"
                                            : "top-3 text-slate-400 text-base"
                                    )}>
                                        Step Name
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onFocus={() => setIsInputFocused(true)}
                                        onBlur={() => setIsInputFocused(false)}
                                        className="w-full h-12 px-4 pt-1 bg-transparent outline-none text-slate-900 font-medium rounded-lg"
                                    />
                                </div>

                                {/* Reward Stepper */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">REWARD (STARS)</span>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setStarReward(prev => Math.max(1, prev - 1))}
                                            className="rounded-full w-10 h-10 border-slate-200"
                                        >
                                            <Minus className="w-4 h-4 text-slate-500" />
                                        </Button>
                                        <div className="flex items-center gap-1.5 min-w-[3rem] justify-center">
                                            <span className="text-2xl font-bold text-slate-800">{starReward}</span>
                                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        </div>
                                        <Button
                                            size="icon"
                                            onClick={() => setStarReward(prev => Math.min(20, prev + 1))}
                                            className="rounded-full w-10 h-10 bg-violet-600 hover:bg-violet-700"
                                        >
                                            <Plus className="w-4 h-4 text-white" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Visuals (Icon & Timer) */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-6">
                                {/* Icon Selector */}
                                <div className="flex flex-col gap-3 relative">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Icon</h4>
                                    <button
                                        onClick={() => setShowPicker(!showPicker)}
                                        className="w-full h-16 rounded-xl border-2 border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all flex items-center gap-4 px-4 shadow-sm"
                                    >
                                        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-2xl">
                                            <RenderIcon name={icon || 'Smile'} className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-slate-600">
                                            {showPicker ? 'Close Picker' : 'Choose Icon...'}
                                        </span>
                                    </button>

                                    {showPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="shadow-2xl rounded-xl overflow-hidden border border-slate-200">
                                                <EmojiPicker
                                                    onEmojiClick={(emojiData) => {
                                                        setIcon(emojiData.emoji);
                                                        setShowPicker(false);
                                                    }}
                                                    width="100%"
                                                    height={350}
                                                    lazyLoadEmojis={true}
                                                    searchDisabled={false}
                                                    skinTonesDisabled={true}
                                                    previewConfig={{ showPreview: false }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* Timer Settings */}
                                <div className="">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#1E293B]">Enable Timer</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isTimerEnabled}
                                                onChange={(e) => setIsTimerEnabled(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                                        </label>
                                    </div>

                                    {isTimerEnabled && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            className="pt-6 flex flex-col items-center gap-4"
                                        >
                                            {/* Digital Clock Display */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-8 py-4 shadow-inner">
                                                <span className="font-mono text-3xl font-bold text-slate-700 tracking-wider">
                                                    {formatTime(timerDuration)}
                                                </span>
                                            </div>

                                            {/* Quick Chips */}
                                            <div className="flex justify-center gap-2 w-full">
                                                {[60, 120, 300].map(seconds => (
                                                    <button
                                                        key={seconds}
                                                        onClick={() => setTimerDuration(seconds)}
                                                        className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                                                    >
                                                        {seconds / 60}m
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* 5. Instructions (Description & Voice) */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions (Optional)</label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a short note for your child..."
                                        className="bg-slate-50 border-slate-200 min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Voice Instruction</label>
                                    <AudioRecorder
                                        initialAudio={audioUrl}
                                        onRecordingComplete={(base64) => setAudioUrl(base64)}
                                        onDelete={() => setAudioUrl(undefined)}
                                    />
                                </div>
                            </div>

                            {/* 6. Footer / Delete */}
                            <div className="pb-8 flex justify-center">
                                {onDelete && (
                                    <button
                                        onClick={onDelete}
                                        className="text-[#EF4444] font-medium text-sm hover:underline flex items-center gap-2"
                                    >
                                        Remove this step
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
