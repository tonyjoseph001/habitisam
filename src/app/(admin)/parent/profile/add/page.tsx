"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { Profile } from '@/lib/db';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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

export default function AddProfilePage() {
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
            createdAt: new Date().toISOString() as any, // Firestore stores dates as strings usually in my converter or Timestamps
            // Actually my converter handles Date -> Timestamp usually, but strictly keeping it Date object matches interface most likely.
            // Wait, previous file used `new Date()` for createdAt.
            // Let's stick to `new Date()` if interface allows, else ISO string.
            // `Profile` interface probably has `createdAt: Date`.
        };

        try {
            await ProfileService.add(newProfile);
            toast.success("Profile created successfully!");
            router.push('/parent/dashboard');
        } catch (e) {
            console.error(e);
            toast.error("Failed to create profile");
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* Header */}
            <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] bg-white shadow-sm sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200">
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
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="Enter 4-digit PIN"
                                className="bg-white h-10 border-slate-200"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
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
                        <label className="text-xs font-bold text-slate-500 uppercase">Avatar</label>
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

