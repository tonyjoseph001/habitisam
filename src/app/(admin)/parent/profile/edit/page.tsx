"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { db, Profile } from '@/lib/db';
import { ChevronLeft, Save, Check, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
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



import { Suspense } from 'react';

function EditProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const profileId = searchParams.get('id');

    const profile = useLiveQuery(
        () => profileId ? db.profiles.get(profileId) : undefined,
        [profileId]
    );

    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [pin, setPin] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('boy');
    const [selectedTheme, setSelectedTheme] = useState('cyan');
    const [isLoaded, setIsLoaded] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (profile && !isLoaded) {
            setName(profile.name);
            setDob(profile.dob || '');
            setPin(profile.pin || '');
            setSelectedAvatar(profile.avatarId);
            setSelectedTheme(profile.colorTheme || 'cyan');
            setIsLoaded(true);
        }
    }, [profile, isLoaded]);

    const handleSave = async () => {
        if (!profile || !profileId) return;
        if (!name.trim()) return;

        await db.profiles.update(profileId, {
            name: name.trim(),
            dob: dob || undefined,
            pin: pin || undefined,
            avatarId: selectedAvatar,
            colorTheme: selectedTheme,
        });

        toast.success("Profile updated successfully");
        router.back();
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!profileId) return;
        await db.profiles.delete(profileId);
        toast.success("Profile deleted");
        router.back();
    };

    if (!profileId) return <div className="p-8 text-center text-slate-500">Invalid Profile ID</div>;
    if (!profile && isLoaded) return <div className="p-8 text-center text-slate-500">Profile not found</div>;

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* Header */}
            <header className="px-4 py-3 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 hover:bg-transparent text-slate-500">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-lg font-bold text-slate-900">Edit Profile</h1>
                </div>
                {profile?.type !== 'parent' && (
                    <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={handleDeleteClick}>
                        <Trash2 className="w-5 h-5" />
                    </Button>
                )}
            </header>

            <main className="py-4 flex flex-col gap-4 max-w-sm mx-auto">

                {/* 1. Details */}
                <div className="bg-white rounded-xl mx-4 p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Ethan"
                            className="bg-white h-10 border-slate-200"
                        />
                    </div>

                    {profile?.type === 'parent' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Security PIN (4 Digits)</label>
                            <Input
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="Enter 4-digit PIN"
                                className="bg-white h-10 border-slate-200"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                            />
                        </div>
                    )}

                    {profile?.type !== 'parent' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={dob}
                                    onChange={e => setDob(e.target.value)}
                                    className="bg-white h-10 border-slate-200 block w-full"
                                    onClick={(e) => e.currentTarget.showPicker()}
                                />
                            </div>
                        </div>
                    )}
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



                {/* Read Only Info */}
                {profile?.type === 'parent' && (
                    <div className="mx-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-amber-800 text-xs">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <p>Parent profiles govern the account and cannot be deleted easily. Changing the name here affects how the child sees you.</p>
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
                        Save Changes
                    </Button>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity"
                        onClick={() => setShowDeleteModal(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative z-10 bg-white w-full max-w-sm m-4 sm:rounded-2xl rounded-t-2xl p-6 pointer-events-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex flex-col gap-4 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                                <Trash2 className="w-8 h-8" />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Delete Profile?</h3>
                                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                    Are you sure you want to delete <strong>{profile?.name}</strong>?
                                    All progress, stars, and history will be lost forever.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 text-slate-600 border-slate-200 font-bold"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold border-0 shadow-lg shadow-red-200"
                                    onClick={handleConfirmDelete}
                                >
                                    Yes, Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EditProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditProfileContent />
        </Suspense>
    );
}
