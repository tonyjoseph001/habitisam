import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Profile } from '@/lib/db';
import { Lock, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useAccount } from '@/lib/hooks/useAccount';
import { Avatar } from '@/components/ui/Avatar'; // Added

interface ProfileSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSwitcherModal({ isOpen, onClose }: ProfileSwitcherProps) {
    const { user, signInWithGoogle } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter();
    const { profiles, addProfile } = useProfiles();
    const { account } = useAccount();

    // const [profiles, setProfiles] = useState<Profile[]>([]); // Removed local state
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    // UI State for PIN
    const [showPinPad, setShowPinPad] = useState(false);
    const [targetProfile, setTargetProfile] = useState<Profile | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            // db.profiles... call removed
            setSelectedProfileId(activeProfile?.id || null);
            setPin("");
            setError("");
            setShowPinPad(false);
            setTargetProfile(null);
        }
    }, [isOpen, activeProfile]); // Removed user dependency as profiles updates automatically

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

    // Removed duplicated getAvatarEmoji

    // Filter profiles: Show all children, but only the current user's parent profile.
    // We hide other parents (e.g. spouse) as requested, to keep the view focused on the active user.
    const visibleProfiles = profiles.filter(p =>
        p.type !== 'parent' ||
        (p.ownerUid ? p.ownerUid === user?.uid : (user?.uid === p.accountId))
    );



    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Switch Profile ${account?.displayName ? `(${account.displayName})` : ''}`}>
            {showPinPad ? (
                // PIN PAD VIEW
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <Avatar avatarId={targetProfile?.avatarId} size="xl" />
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
                            onClick={async () => {
                                if (!targetProfile) return;
                                try {
                                    // Trigger Google Re-auth
                                    const resultUser = await signInWithGoogle(); // Use function from hook
                                    // Check if the signed-in user OWNS this profile
                                    if (resultUser.uid === targetProfile.accountId) {
                                        // Success! Bypass PIN
                                        sessionStorage.setItem('parentPinVerified_' + targetProfile.id, 'true');
                                        setActiveProfile(targetProfile);
                                        onClose();
                                        router.push('/parent/profile/edit?id=' + targetProfile.id);
                                        // Ideally show toast here: "Identity Verified"
                                    } else {
                                        setError("Verification Failed: Wrong Account");
                                    }
                                } catch (e) {
                                    console.error("PIN Recovery Failed", e);
                                    // User closed popup or error
                                }
                            }}
                            className="text-xs text-violet-600 hover:text-violet-700 font-medium underline"
                        >
                            Forgot PIN? (Verify with Google)
                        </button>
                    </div>
                </div>
            ) : (
                // PROFILE LIST VIEW
                <div className="grid grid-cols-2 gap-4 p-6">
                    {visibleProfiles.map(profile => (
                        <button
                            key={profile.id}
                            onClick={() => handleSelect(profile)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedProfileId === profile.id
                                ? 'border-violet-500 bg-violet-50 shadow-sm'
                                : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="mb-2">
                                <Avatar
                                    avatarId={profile.avatarId}
                                    name={profile.name}
                                    type={profile.type}
                                    size="lg"
                                    showBorder={false}
                                />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-slate-900">{profile.name}</h3>
                                <p className="text-xs text-slate-500 capitalize">{profile.type}</p>
                            </div>
                        </button>
                    ))}

                    {/* Missing Parent Recovery Option */}
                    {!visibleProfiles.some(p => p.type === 'parent') && (
                        <button
                            onClick={async () => {
                                if (confirm("No parent profile detected. Create a new Admin profile to restore access?")) {
                                    try {
                                        // Default: Name per Auth, Avatar 1, PIN 0000
                                        await addProfile(user?.displayName || "Admin", 'parent', 'parent-1', '0000');
                                        alert("Profile Created! Default PIN is 0000.");
                                    } catch (e) {
                                        alert("Failed to create profile: " + e);
                                    }
                                }
                            }}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all text-slate-400"
                        >
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl border border-slate-200">
                                ➕
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-slate-600">Create Admin</h3>
                                <p className="text-xs text-slate-400">Recovery Mode</p>
                            </div>
                        </button>
                    )}

                    {visibleProfiles.length === 0 && !visibleProfiles.some(p => p.type === 'parent') && (
                        <div className="col-span-2 text-center py-8 text-slate-400">
                            No profiles found.
                        </div>
                    )}


                </div>
            )}
        </Modal>
    );
}
