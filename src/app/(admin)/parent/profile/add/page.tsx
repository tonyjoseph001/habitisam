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

// Profile Types
const PROFILE_TYPES = [
    { id: 'child', label: 'Child Profile', icon: '👶', description: 'For kids to track tasks and earn rewards' },
    { id: 'parent', label: 'Parent Profile', icon: '👨‍👩‍👧', description: 'For additional parent accounts' },
];

export default function AddChildProfilePage() {
    const router = useRouter();
    const { user } = useAuth();

    const [profileType, setProfileType] = useState<'child' | 'parent'>('child');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('boy');
    const [pin, setPin] = useState('');

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) return alert('Please enter a name');
        if (profileType === 'parent' && !pin.trim()) return alert('Please enter a PIN for parent profile');
        if (profileType === 'parent' && pin.length < 4) return alert('PIN must be at least 4 digits');

        const newProfile: Profile = {
            id: uuidv4(),
            accountId: user.uid,
            name: name.trim(),
            type: profileType,
            theme: 'default',
            colorTheme: 'cyan',
            avatarId: profileType === 'child' ? selectedAvatar : 'parent',
            stars: profileType === 'child' ? 0 : undefined,
            xp: profileType === 'child' ? 0 : undefined,
            dob: (profileType === 'child' && dob) ? dob : undefined,
            pin: profileType === 'parent' ? pin : undefined,
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
                <h1 className="text-lg font-bold text-slate-900">New Profile</h1>
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-sm mx-auto">

                {/* 1. Profile Type Selection */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Profile Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        {PROFILE_TYPES.map(type => {
                            const isSelected = profileType === type.id;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setProfileType(type.id as 'child' | 'parent')}
                                    className={cn(
                                        "p-3 rounded-xl border-2 transition-all text-left",
                                        isSelected
                                            ? "border-violet-600 bg-violet-50"
                                            : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="text-2xl mb-1">{type.icon}</div>
                                    <div className="text-sm font-bold text-slate-900">{type.label}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{type.description}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Details */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{profileType === 'child' ? "Child's Name" : "Parent's Name"}</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Ethan"
                            className="bg-white h-10 border-slate-200"
                        />
                    </div>

                    {profileType === 'parent' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">PIN (Required)</label>
                            <Input
                                type="password"
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                placeholder="Enter 4-digit PIN"
                                maxLength={6}
                                className="bg-white h-10 border-slate-200"
                            />
                            <p className="text-xs text-slate-500">This PIN will be used to access the parent dashboard</p>
                        </div>
                    )}

                    {profileType === 'child' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth (Optional)</label>
                            <Input
                                type="date"
                                value={dob}
                                onChange={e => setDob(e.target.value)}
                                className="bg-white h-10 border-slate-200 block w-full"
                                onClick={(e) => e.currentTarget.showPicker()}
                            />
                        </div>
                    )}
                </div>

                {/* 3. Avatar Selection (Child Only) */}
                {profileType === 'child' && (
                    <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Choose Avatar</label>
                        <div className="grid grid-cols-5 gap-3">
                            {AVATARS.map(avatar => {
                                const isSelected = selectedAvatar === avatar.id;
                                return (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.id)}
                                        className={cn(
                                            "flex-shrink-0 w-full aspect-square rounded-xl flex items-center justify-center text-3xl bg-white border-2 transition-all relative",
                                            isSelected
                                                ? "border-violet-600 shadow-md scale-105"
                                                : "border-slate-200 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        {avatar.icon}
                                        {isSelected && (
                                            <div className="absolute -top-1 -right-1 bg-violet-600 text-white rounded-full p-1 border-2 border-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}



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
