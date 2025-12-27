"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { db, Profile } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Avatar Options
const AVATARS = [
    { id: 'boy', label: 'Boy', icon: '🧑‍🚀' },
    { id: 'girl', label: 'Girl', icon: '👩‍🚀' },
    { id: 'superhero', label: 'Superhero', icon: '🦸' },
    { id: 'superhero_girl', label: 'Superhero Girl', icon: '🦸‍♀️' },
    { id: 'ninja', label: 'Ninja', icon: '🥷' },
    { id: 'wizard', label: 'Wizard', icon: '🧙' },
    { id: 'princess', label: 'Princess', icon: '👸' },
    { id: 'pirate', label: 'Pirate', icon: '🏴‍☠️' },
    { id: 'alien', label: 'Alien', icon: '👽' },
    { id: 'robot', label: 'Robot', icon: '🤖' },
    { id: 'dinosaur', label: 'Dinosaur', icon: '🦖' },
    { id: 'unicorn', label: 'Unicorn', icon: '🦄' },
    { id: 'dragon', label: 'Dragon', icon: '🐉' },
    { id: 'rocket', label: 'Rocket', icon: '🚀' },
];

// Theme Options
const THEMES = [
    { id: 'cyan', label: 'Cyan', color: 'bg-cyan-400' },
    { id: 'purple', label: 'Purple', color: 'bg-violet-500' },
    { id: 'green', label: 'Green', color: 'bg-emerald-400' },
    { id: 'orange', label: 'Orange', color: 'bg-orange-400' },
];

export default function AddChildProfilePage() {
    const router = useRouter();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('boy');
    const [selectedTheme, setSelectedTheme] = useState('cyan');

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) return;

        const newProfile: Profile = {
            id: uuidv4(),
            accountId: user.uid,
            name: name.trim(),
            type: 'child',
            theme: 'default', // System theme
            colorTheme: selectedTheme, // Persist visual choice
            avatarId: selectedAvatar,
            stars: 0,
            xp: 0,
            dob: dob || undefined,
            createdAt: new Date()
        };

        await db.profiles.add(newProfile as any);
        router.push('/parent/dashboard');
    };

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* Header */}
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 hover:bg-transparent text-slate-500">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold text-slate-900">Add New Explorer</h1>
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-sm mx-auto">

                {/* 1. Details */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Child's Name</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Ethan"
                            className="bg-white h-10 border-slate-200"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                        <Input
                            type="date"
                            value={dob}
                            onChange={e => setDob(e.target.value)}
                            className="bg-white h-10 border-slate-200 block w-full"
                            onClick={(e) => e.currentTarget.showPicker()}
                        />
                    </div>
                </div>

                {/* 2. Avatar Selection */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Choose Avatar</label>
                    <div className="flex gap-3 overflow-x-auto pb-1 px-1 scrollbar-hide">
                        {AVATARS.map(avatar => {
                            const isSelected = selectedAvatar === avatar.id;
                            return (
                                <button
                                    key={avatar.id}
                                    onClick={() => setSelectedAvatar(avatar.id)}
                                    className={cn(
                                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white border-2 transition-all relative",
                                        isSelected
                                            ? "border-violet-600 shadow-md scale-105"
                                            : "border-slate-200 opacity-70 hover:opacity-100"
                                    )}
                                >
                                    {avatar.icon}
                                    {isSelected && (
                                        <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 border-2 border-white">
                                            <Check className="w-2 h-2" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 3. Theme Selection */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Interface Color</label>
                    <div className="flex gap-4 items-center">
                        {THEMES.map(theme => {
                            const isSelected = selectedTheme === theme.id;
                            return (
                                <button
                                    key={theme.id}
                                    onClick={() => setSelectedTheme(theme.id)}
                                    className={cn(
                                        "w-10 h-10 rounded-full transition-all relative",
                                        theme.color,
                                        isSelected
                                            ? "ring-2 ring-offset-2 ring-violet-400 scale-110 shadow-md"
                                            : "opacity-80 hover:opacity-100"
                                    )}
                                    aria-label={theme.label}
                                >
                                    {isSelected && (
                                        <div className="absolute inset-0 flex items-center justify-center text-white/90">
                                            <Check className="w-5 h-5 drop-shadow-sm" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="px-4 mt-2">
                    <Button
                        variant="cosmic"
                        size="lg"
                        className="w-full text-base h-11 shadow-lg shadow-violet-200"
                        onClick={handleSave}
                        disabled={!name.trim()}
                    >
                        Create Profile
                    </Button>
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
