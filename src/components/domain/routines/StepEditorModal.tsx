"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, ChevronDown, ArrowLeft, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Step } from '@/lib/db';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

// Hardcoded Icon Options for Kids
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
    const [isTimerEnabled, setIsTimerEnabled] = useState(false);
    const [timerDuration, setTimerDuration] = useState<number>(120); // seconds (default 2m)
    const [isInputFocused, setIsInputFocused] = useState(false);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setIcon(initialData.icon);
                setTimerDuration(initialData.timerDuration || 120);
                setIsTimerEnabled(!!initialData.timerDuration && initialData.timerDuration > 0);
            } else {
                setTitle('');
                setIcon('Smile');
                setTimerDuration(120);
                setIsTimerEnabled(false);
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
            stars: 5 // Default star value
        };
        onSave(finalStep);
    };

    // Helper to render Lucide icon dynamically
    const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
        // @ts-ignore - Dynamic access
        const LucideIcon = Icons[name as keyof typeof Icons] || Icons.HelpCircle;
        // @ts-ignore
        return <LucideIcon className={className} />;
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

                                {isTimerEnabled && (
                                    <div className="relative z-10 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white/90 text-sm font-bold border border-white/10">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{Math.floor(timerDuration / 60)}:{(timerDuration % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                )}
                            </div>

                            {/* 3. Step Name Input */}
                            <div className="flex flex-col gap-1">
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
                            </div>

                            {/* 4. Icon Selector */}
                            <div className="flex flex-col gap-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Icon</h4>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                    {AVAILABLE_ICONS.map((iconName) => {
                                        const isSelected = icon === iconName;
                                        return (
                                            <button
                                                key={iconName}
                                                onClick={() => setIcon(iconName)}
                                                className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200",
                                                    isSelected
                                                        ? "bg-violet-50 border-violet-500 text-violet-600 shadow-sm scale-105"
                                                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                                )}
                                            >
                                                <RenderIcon name={iconName} className="w-6 h-6" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5. Timer Settings */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-4 flex items-center justify-between border-b border-slate-50">
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
                                        className="p-6 bg-slate-50 flex flex-col items-center gap-4"
                                    >
                                        {/* Digital Clock Display */}
                                        <div className="bg-white border border-slate-200 rounded-xl px-8 py-4 shadow-inner">
                                            <span className="font-mono text-3xl font-bold text-slate-700 tracking-wider">
                                                {formatTime(timerDuration)}
                                            </span>
                                        </div>

                                        {/* Quick Chips + Manual Controls */}
                                        <div className="w-full flex flex-col gap-3">
                                            <div className="flex justify-center gap-2">
                                                {[60, 120, 300].map(seconds => (
                                                    <button
                                                        key={seconds}
                                                        onClick={() => setTimerDuration(seconds)}
                                                        className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
                                                    >
                                                        {seconds / 60}m
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-center gap-4">
                                                <Button
                                                    variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200 bg-white"
                                                    onClick={() => setTimerDuration(prev => Math.max(0, prev - 30))}
                                                >
                                                    <Minus className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Adjust</span>
                                                <Button
                                                    variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200 bg-white"
                                                    onClick={() => setTimerDuration(prev => prev + 30)}
                                                >
                                                    <Plus className="w-4 h-4 text-slate-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* 6. Footer / Delete */}
                            <div className="mt-4 pb-8 flex justify-center">
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
