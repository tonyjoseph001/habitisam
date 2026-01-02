"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile } from '@/lib/db';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { getLimits } from '@/config/tiers';
import { db } from '@/lib/db';

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

export default function AddProfilePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { profiles } = useProfiles(); // Added hook

    // Constant type 'child'
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('boy');

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) return alert('Please enter a name');

        // --- LIMIT CHECK ---
        const childCount = profiles.filter(p => p.type === 'child').length;
        // Fetch license
        const account = await db.accounts.get(user.uid);
        const license = account?.licenseType || 'free';
        const limits = getLimits(license);

        if (childCount >= limits.maxChildren) {
            toast.error(`Free tier limit reached (${limits.maxChildren} children). Upgrade to add more!`);
            setTimeout(() => router.push('/parent/subscription'), 1000); // Small delay for toast visibility
            return;
        }
        // -------------------

        const newProfile: Profile = {
            id: uuidv4(),
            accountId: user.uid,
            name: name.trim(),
            type: 'child', // Always child
            theme: 'default',
            colorTheme: 'cyan',
            avatarId: selectedAvatar,
            stars: 0,
            xp: 0,
            dob: dob || undefined,
            createdAt: new Date() as any,
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
                <h1 className="text-lg font-bold text-slate-900">New Child Profile</h1>
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-sm mx-auto">
                <div className="mx-4 text-sm text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                    <p>Creating a profile for a child allows them to track habits and earn rewards.</p>
                </div>

                {/* 1. Details */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Child's Name</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ethan"
                            className="bg-white h-10 border-slate-200"
                        />
                    </div>

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
                </div>

                {/* 2. Avatar Selection */}
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

