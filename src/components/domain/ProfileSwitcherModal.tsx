"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Profile, db } from '@/lib/db';
import { Lock, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProfileSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSwitcherModal({ isOpen, onClose }: ProfileSwitcherProps) {
    const { user } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    // UI State for PIN
    const [showPinPad, setShowPinPad] = useState(false);
    const [targetProfile, setTargetProfile] = useState<Profile | null>(null);

    // Load profiles
    useEffect(() => {
        if (isOpen && user) {
            db.profiles.where('accountId').equals(user.uid).toArray().then(setProfiles);
            setSelectedProfileId(activeProfile?.id || null);
            setPin("");
            setError("");
            setShowPinPad(false);
            setTargetProfile(null);
        }
    }, [isOpen, user, activeProfile]);

    const handleSelect = async (profile: Profile) => {
        setSelectedProfileId(profile.id);
        setPin("");
        setError("");

        if (profile.type === 'parent') {
            setShowPinPad(true);
            setTargetProfile(profile);
        } else {
            // Child: Just switch
            setActiveProfile(profile);
            onClose();
            router.push('/child/dashboard');
        }
    };

    const handlePinSuccess = () => {
        if (targetProfile) {
            setActiveProfile(targetProfile);
            onClose();
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
            if (targetProfile.type === 'parent') {
                sessionStorage.setItem('parentPinVerified_' + targetProfile.id, 'true');
            }
            handlePinSuccess();
        } else {
            setError("Incorrect PIN");
            setPin("");
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const getAvatarEmoji = (profile: Profile) => {
        if (profile.type === 'parent' && !profile.avatarId) return '👤';

        switch (profile.avatarId) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'superhero': return '🦸';
            case 'superhero_girl': return '🦸‍♀️';
            case 'ninja': return '🥷';
            case 'wizard': return '🧙';
            case 'princess': return '👸';
            case 'pirate': return '🏴‍☠️';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'dinosaur': return '🦖';
            case 'unicorn': return '🦄';
            case 'dragon': return '🐉';
            case 'rocket': return '🚀';
            default: return profile.type === 'parent' ? '👤' : '🧒';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Switch Profile">
            {showPinPad ? (
                // PIN PAD VIEW
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center text-4xl mb-3 mx-auto">
                            {targetProfile ? getAvatarEmoji(targetProfile) : '👤'}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Enter PIN for {targetProfile?.name}</h3>
                        <div className="flex justify-center gap-2 mt-4">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-4 h-4 rounded-full transition-all ${pin.length > i ? "bg-violet-600 scale-110" : "bg-slate-200"}`} />
                            ))}
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2 font-bold animate-pulse">{error}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handlePinInput(num.toString())}
                                className="h-14 rounded-2xl bg-white border-2 border-slate-100 shadow-sm text-xl font-bold text-slate-700 active:scale-95 transition-all hover:bg-slate-50 hover:border-violet-100"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={() => { setShowPinPad(false); setPin(""); }} className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider">Back</button>
                        <button onClick={() => handlePinInput("0")} className="h-14 rounded-2xl bg-white border-2 border-slate-100 shadow-sm text-xl font-bold text-slate-700 active:scale-95 transition-all hover:bg-slate-50 hover:border-violet-100">0</button>
                        <button onClick={handleBackspace} className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-red-500"><ChevronLeft className="w-5 h-5" /></button>
                    </div>

                    <div className="flex flex-col items-center gap-4 w-full">
                        <button
                            onClick={handleUnlock}
                            disabled={pin.length < 4}
                            className="w-full py-4 rounded-2xl bg-violet-600 text-white font-bold shadow-lg shadow-violet-200 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 text-lg"
                        >
                            <Lock className="w-5 h-5" /> Unlock
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Forgot PIN? Please sign in again with Google to verify account.")) {
                                    window.location.href = '/login';
                                }
                            }}
                            className="text-xs text-violet-600 hover:text-violet-700 font-medium underline"
                        >
                            Forgot PIN?
                        </button>
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
                                {getAvatarEmoji(profile)}
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
                </div>
            )}
        </Modal>
    );
}
