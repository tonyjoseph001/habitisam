"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Profile, db } from '@/lib/db';
import { Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProfileSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSwitcherModal({ isOpen, onClose }: ProfileSwitcherProps) {
    const { user } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter(); // ID: 6b0c9e64-1340-47e1-aa3e-a5160c24b3c3

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    // UI State for PIN
    const [showPinPad, setShowPinPad] = useState(false); // ID: 987fc1a6-1aed-43f0-88e7-8ba3d2ea7735
    const [targetProfile, setTargetProfile] = useState<Profile | null>(null); // ID: b7ab8b5d-735d-4d5c-b963-a497095b84ea

    // Load profiles
    useEffect(() => {
        if (isOpen && user) {
            db.profiles.where('accountId').equals(user.uid).toArray().then(setProfiles);
            setSelectedProfileId(activeProfile?.id || null);
            setPin("");
            setError("");
            setShowPinPad(false); // Reset PIN pad visibility
            setTargetProfile(null); // Reset target profile
        }
    }, [isOpen, user, activeProfile]);

    const handleSelect = async (profile: Profile) => {
        setSelectedProfileId(profile.id); // Keep track of selected profile for UI highlighting
        setPin("");
        setError("");

        if (profile.type === 'parent') {
            setShowPinPad(true);
            setTargetProfile(profile);
        } else {
            // Child: Just switch
            setActiveProfile(profile);
            onClose();
            // Route to Child Dashboard
            router.push('/child/dashboard');
        }
    };

    const handlePinSuccess = () => {
        if (targetProfile) {
            setActiveProfile(targetProfile);
            onClose();
            // Parent: Stay on dashboard or refresh state
            router.push('/parent/dashboard');
        }
    };

    const handlePinInput = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError("");
        }
    };

    const handleUnlock = () => {
        if (!targetProfile) return;

        if (targetProfile.pin === pin) {
            setError("");
            handlePinSuccess();
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
            {showPinPad ? (
                // PIN PAD VIEW
                <div className="flex flex-col gap-4 p-6">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-2">Enter PIN for {targetProfile?.name}</p>
                        <div className="flex justify-center gap-2 mb-4">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-3 h-3 rounded-full ${pin.length > i ? 'bg-violet-600' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-3 max-w-[200px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handlePinInput(num.toString())}
                                className="w-12 h-12 rounded-full bg-slate-100 text-lg font-bold text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                            >
                                {num}
                            </button>
                        ))}
                        <div /> {/* spacer */}
                        <button
                            onClick={() => handlePinInput('0')}
                            className="w-12 h-12 rounded-full bg-slate-100 text-lg font-bold text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                        >
                            0
                        </button>
                        <button
                            onClick={handleBackspace}
                            className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center"
                        >
                            ←
                        </button>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Button variant="ghost" className="flex-1" onClick={() => setShowPinPad(false)}>Cancel</Button>
                        <Button variant="cosmic" className="flex-1" onClick={handleUnlock} disabled={pin.length !== 4}>Unlock</Button>
                    </div>
                </div>
            ) : (
                // PROFILE LIST VIEW
                <div className="grid grid-cols-2 gap-4 p-6">
                    {profiles.map(profile => (
                        <button
                            key={profile.id}
                            onClick={() => handleSelect(profile)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedProfileId === profile.id
                                    ? 'border-violet-500 bg-violet-50 shadow-sm'
                                    : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl shadow-inner">
                                {profile.type === 'parent' ? '👤' : '🧒'}
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-slate-900">{profile.name}</h3>
                                <p className="text-xs text-slate-500 capitalize">{profile.type}</p>
                            </div>
                        </button>
                    ))}

                    {profiles.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-slate-400">
                            No profiles found.
                        </div>
                    )}

                    {/* Placeholder for Add Child - only visual or link to setup if we wanted */}
                    <button className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-violet-200 hover:shadow-sm opacity-50 cursor-not-allowed">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center">
                            <Plus className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">Manage in Dashboard</span>
                    </button>
                </div>
            )}
        </Modal>
    );
}
