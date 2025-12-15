"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Profile, db } from '@/lib/db';
import { Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProfileSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSwitcherModal({ isOpen, onClose }: ProfileSwitcherProps) {
    const { user } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    // Load profiles
    useEffect(() => {
        if (isOpen && user) {
            db.profiles.where('accountId').equals(user.uid).toArray().then(setProfiles);
            setSelectedProfileId(activeProfile?.id || null);
            setPin("");
            setError("");
        }
    }, [isOpen, user, activeProfile]);

    const handleProfileSelect = (profile: Profile) => {
        setSelectedProfileId(profile.id);
        setPin("");
        setError("");

        // If child, instant switch
        if (profile.type === 'child') {
            setActiveProfile(profile);
            onClose();
        }
    };

    const handlePinInput = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError("");
        }
    };

    const handleUnlock = () => {
        const targetProfile = profiles.find(p => p.id === selectedProfileId);
        if (!targetProfile) return;

        if (targetProfile.pin === pin) {
            setActiveProfile(targetProfile);
            onClose();
        } else {
            setError("Incorrect PIN");
            setPin("");
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const isParentSelected = selectedProfile?.type === 'parent';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Who's using Habitisim?">
            <div className="p-6 flex flex-col gap-6">

                {/* Profile List */}
                <div className="flex gap-4 overflow-x-auto pb-2 justify-center">
                    {profiles.map(profile => {
                        const isSelected = selectedProfileId === profile.id;
                        return (
                            <button
                                key={profile.id}
                                onClick={() => handleProfileSelect(profile)}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className={cn(
                                    "w-16 h-16 rounded-full flex items-center justify-center text-2xl relative transition-all",
                                    isSelected ? "ring-4 ring-violet-500 scale-105" : "opacity-70 hover:opacity-100",
                                    profile.type === 'parent' ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                                )}>
                                    {profile.type === 'parent' ? <span>👤</span> : <span>🧒</span>}
                                    {profile.type === 'parent' && (
                                        <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-1 text-white">
                                            <Lock className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className={cn("text-xs font-bold", isSelected ? "text-violet-700" : "text-slate-500")}>
                                    {profile.name}
                                </span>
                            </button>
                        )
                    })}
                    {/* Add Child Placeholder */}
                    <button className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                            <Plus className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">Add</span>
                    </button>
                </div>

                {/* PIN Entry (Conditional) */}
                {isParentSelected && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h4 className="text-center font-medium text-slate-700 mb-4">
                            Enter PIN for {selectedProfile?.name}
                        </h4>

                        {/* PIN Display */}
                        <div className="flex justify-center gap-4 mb-6">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="w-12 h-12 border-2 border-slate-200 rounded-lg flex items-center justify-center text-2xl bg-slate-50">
                                    {pin[i] ? '•' : ''}
                                </div>
                            ))}
                        </div>

                        {error && <p className="text-center text-red-500 text-sm mb-4">{error}</p>}

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handlePinInput(num.toString())}
                                    className="h-14 rounded-full bg-slate-100 text-xl font-bold text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="h-14" /> {/* Empty Slot */}
                            <button
                                onClick={() => handlePinInput("0")}
                                className="h-14 rounded-full bg-slate-100 text-xl font-bold text-slate-700 hover:bg-slate-200"
                            >
                                0
                            </button>
                            <button
                                onClick={handleBackspace}
                                className="h-14 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
                            >
                                ⌫
                            </button>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                            <Button
                                variant="cosmic"
                                className="flex-1"
                                onClick={handleUnlock}
                                disabled={pin.length !== 4}
                            >
                                Unlock
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
