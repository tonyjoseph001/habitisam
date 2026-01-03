"use client";

import { useTheme } from '@/components/providers/ThemeContext';
import { APP_CONFIG } from '@/config/app';
import { ThemeType } from '@/lib/db';
import { ArrowLeft, Bell, ChevronDown, Palette, Key, Users, Copy, HelpCircle, Crown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { InviteService } from '@/lib/firestore/invites.service';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

import { useAuth } from '@/lib/hooks/useAuth';
import { AccountService } from '@/lib/firestore/accounts.service';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useAccount } from '@/lib/hooks/useAccount';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const { profiles } = useProfiles(); // Fetch all profiles
    const { isPro } = useAccount();
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinDigits, setPinDigits] = useState(['', '', '', '']);
    const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const parents = profiles.filter(p => p.type === 'parent');

    // Help System
    const [helpModalOpen, setHelpModalOpen] = useState(false);
    const [helpContent, setHelpContent] = useState({ title: '', text: '' });

    const openHelp = (title: string, text: string) => {
        setHelpContent({ title, text });
        setHelpModalOpen(true);
    };

    const HelpButton = ({ title, text }: { title: string, text: string }) => (
        <button
            onClick={(e) => { e.stopPropagation(); openHelp(title, text); }}
            className="text-slate-400 hover:text-primary transition-colors ml-1.5 align-middle"
        >
            <HelpCircle className="w-5 h-5" />
        </button>
    );

    // Determine if current user is the "Owner" (Primary Parent) of the household
    // The Account ID is the UID of the creator.
    const isOwner = user?.uid === activeProfile?.accountId;

    const handleRemoveParent = async (parentProfile: any) => {
        if (!isOwner) return alert("Only the primary parent can remove members.");
        if (parentProfile.ownerUid === activeProfile?.accountId) return alert("Cannot remove the primary parent.");

        if (!confirm(`Are you sure you want to remove ${parentProfile.name}? They will lose access to this household.`)) return;

        try {
            if (parentProfile.ownerUid) {
                // Atomic cleanup: Remove access + Delete profile
                await AccountService.removeParent(activeProfile!.accountId, parentProfile.ownerUid, parentProfile.id);
                // Also wipe their personal account data (Nuclear option)
                // Pass activeProfile.accountId as protectedUid to ensure we NEVER delete the household owner
                await AccountService.deleteFullAccount(parentProfile.ownerUid, activeProfile!.accountId);
            } else {
                console.warn("No ownerUid found on profile, only deleting profile doc.");
                await ProfileService.delete(parentProfile.id);
            }
            alert("Parent removed successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to remove parent.");
        }
    };

    const params = {
        parents,
        onRemove: handleRemoveParent
    };

    const themes: { value: ThemeType; label: string }[] = [
        { value: 'default', label: 'Default Indigo' },
        { value: 'ocean', label: 'Ocean Blue' },
        { value: 'sunset', label: 'Sunset Orange' },
        { value: 'forest', label: 'Forest Green' },
        { value: 'candy', label: 'Cotton Candy' },
        { value: 'midnight', label: 'Midnight Dark' },
    ];

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Numbers only

        const newDigits = [...pinDigits];
        newDigits[index] = value.slice(-1); // Take last char if multiple pasted
        setPinDigits(newDigits);

        // Auto-advance
        if (value && index < 3) {
            pinRefs[index + 1].current?.focus();
        }
    };

    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
            pinRefs[index - 1].current?.focus();
        }
    };

    const handleResetPin = async () => {
        if (!activeProfile?.id) return;
        const finalPin = pinDigits.join('');

        if (finalPin.length !== 4) return alert('PIN must be exactly 4 digits');

        try {
            await ProfileService.update(activeProfile.id, { pin: finalPin });
            setShowPinModal(false);
            setPinDigits(['', '', '', '']);
            // alert('PIN updated successfully!'); // Removed as per user request
        } catch (error) {
            console.error(error);
            alert('Failed to update PIN');
        }
    };

    // --- Notification Settings ---
    const dailyRemindersEnabled = activeProfile?.settings?.dailyReminders ?? false;

    const toggleDailyReminders = async () => {
        if (!activeProfile) return;
        const newState = !dailyRemindersEnabled;

        // Optimistic Update (Store will catch up)
        try {
            // Trigger Permissions if turning ON
            if (newState && Capacitor.isNativePlatform()) {
                const perm = await LocalNotifications.requestPermissions();
                if (perm.display !== 'granted') {
                    alert("Notifications permission denied. Please enable in Device Settings.");
                    return;
                }
            }

            await ProfileService.update(activeProfile.id, {
                settings: {
                    ...activeProfile.settings, // Keep other settings if added later
                    dailyReminders: newState
                }
            });
            // Update local store immediately for responsiveness if needed, 
            // but ProfileService update usually triggers listener if subscribed.
            // For now, relies on Firestore real-time sync or reload.
        } catch (e) {
            console.error(e);
            alert("Failed to update settings.");
        }
    };
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const handleGenerateInvite = async () => {
        if (!activeProfile?.accountId) return alert("Error: No Household ID found.");
        setInviteLoading(true);
        try {
            const code = await InviteService.create(activeProfile.accountId, activeProfile.name || 'Parent');
            setInviteCode(code);
            setShowInviteModal(true);
        } catch (error) {
            console.error(error);
            alert("Failed to generate invite.");
        } finally {
            setInviteLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteCode);
        alert("Copied to clipboard!");
    };

    // --- Join Household Logic ---
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    const handleJoinHousehold = async () => {
        if (!joinCode || !user) return;

        setJoinLoading(true);
        try {
            // 1. Validate Invite
            const invite = await InviteService.validate(joinCode);
            if (!invite) throw new Error("Invalid or expired code.");

            // 2. Prevent Loops
            if (invite.accountId === user.uid) throw new Error("You cannot join your own household (Self-Loop).");
            if (activeProfile?.accountId === invite.accountId) throw new Error("You are already in this household.");

            // 3. Join Account
            await AccountService.joinHousehold(user, invite.accountId);
            await InviteService.redeem(joinCode);

            // 4. Create Profile in NEW Household - REUSE existing PIN if possible, or force reset later
            // We assume activeProfile.pin exists.
            const existingPin = activeProfile?.pin;
            if (!existingPin) {
                // Should technically not happen if they are on settings page, but safety:
                throw new Error("Please set a PIN for your current profile before joining another family.");
            }

            const { v4: uuidv4 } = await import('uuid');
            const newProfile: any = {
                id: uuidv4(),
                accountId: invite.accountId,
                ownerUid: user.uid,
                name: user.displayName || 'Parent',
                type: 'parent',
                pin: existingPin,
                theme: 'default',
                avatarId: 'parent-1',
                createdAt: new Date()
            };

            await ProfileService.add(newProfile);

            // 5. Switch
            setActiveProfile(newProfile);

            // Auto-verify session since they just created the PIN (or reused valid one)
            try {
                sessionStorage.setItem('parentPinVerified_' + newProfile.id, 'true');
            } catch (e) {
                console.error("Failed to set session storage", e);
            }

            alert("Success! You have linked this account.");
            window.location.href = '/parent/dashboard'; // Hard reload to clear state
        } catch (e: any) {
            console.error(e);
            alert("Failed to join: " + e.message);
        } finally {
            setJoinLoading(false);
        }
    };

    const handleLeaveHousehold = async () => {
        if (!activeProfile || !user) return;

        if (confirm("Are you sure you want to leave this family? You will lose access to this dashboard.")) {
            try {
                // Atomic cleanup: Remove self from account members + Delete my profile
                await AccountService.removeParent(activeProfile.accountId, user.uid, activeProfile.id);
                // Clear any stored verification
                sessionStorage.removeItem('parentPinVerified_' + activeProfile.id);

                alert("You have successfully left the family.");
                // Hard reload to reset state back to original account (or login)
                window.location.href = '/login';
            } catch (e: any) {
                console.error(e);
                alert("Failed to leave household: " + e.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center gap-4 z-10 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Settings</h1>
            </div>

            <div className="max-w-md mx-auto p-6 space-y-6">

                {/* Appearance Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-primary">
                        <Palette className="w-6 h-6" />
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            Appearance
                            <HelpButton title="Appearance" text="Choose a theme that suits your style. This changes the color scheme across the entire app for your profile." />
                        </h2>
                    </div>

                    <label className="block text-sm font-medium text-slate-500 mb-2">App Theme</label>

                    <div className="relative">
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value as ThemeType)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-primary font-medium transition-colors"
                        >
                            {themes.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-3">
                        This color will be applied to all buttons, tabs, and highlights.
                    </p>
                </div>

                {/* Security Card - PIN Recovery */}
                {activeProfile?.type === 'parent' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <Key className="w-6 h-6" />
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                Security
                                <HelpButton title="Security" text="Your PIN protects the parent dashboard. Keep it secret so children cannot approve their own rewards!" />
                            </h2>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-slate-700 mb-1">Parent PIN</p>
                                <p className="text-xs text-slate-500 mb-3">
                                    Reset your PIN if you've forgotten it or want to change it for security.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPinModal(true)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                            >
                                Reset PIN
                            </button>
                        </div>
                    </div>
                )}

                {/* Join / Leave Family Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-violet-600">
                        <Users className="w-6 h-6" />
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            {isOwner ? "Join a Family" : "Family Membership"}
                            <HelpButton title="Family Management" text="You can link multiple parents to the same household so everyone can manage the children's routines." />
                        </h2>
                    </div>

                    {!isOwner ? (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                                <p className="text-sm font-medium text-slate-600 mb-1">
                                    You are a member of this household.
                                </p>
                                <p className="text-xs text-slate-400">
                                    To join another family or create your own, you must leave this one first.
                                </p>
                            </div>

                            <Button
                                onClick={handleLeaveHousehold}
                                className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold shadow-sm"
                            >
                                Leave Family
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-slate-700 mb-1">Have an Invite Code?</p>
                                <p className="text-xs text-slate-500 mb-3">
                                    Enter the code shared by the primary parent. Your current PIN will be used.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Input
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="INVITE CODE (6-DIGIT)"
                                    className="uppercase font-mono tracking-widest text-center"
                                    maxLength={6}
                                />
                            </div>

                            <Button
                                onClick={handleJoinHousehold}
                                disabled={!joinCode || joinLoading}
                                className="w-full bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold shadow-sm"
                            >
                                {joinLoading ? "Joining..." : "Join Family"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Family Management Card (Owner Only) */}
                {isOwner && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-4 text-emerald-600">
                            <Users className="w-6 h-6" />
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                Family Management
                                <HelpButton title="Managing Parents" text="As the owner, you can Invite other parents or remove them. Removed parents lose access to this household." />
                            </h2>
                        </div>

                        {/* Parent List */}
                        <div className="flex flex-col gap-3 mb-6">
                            {params.parents.filter((p: any) => p.id !== activeProfile?.id).map((parent: any) => (
                                <div key={parent.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                            {parent.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{parent.name}</p>
                                            {parent.ownerUid === activeProfile?.accountId && <span className="text-[10px] bg-violet-100 text-violet-700 px-1 rounded ml-2">Owner</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => params.onRemove(parent)}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-white border border-red-100 rounded-lg hover:bg-red-50"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {params.parents.filter((p: any) => p.id !== activeProfile?.id).length === 0 && (
                                <div className="text-sm text-slate-500 italic text-center py-2">
                                    No other parents linked.
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-1">Link Another Parent</p>

                            {!isPro ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                                            <Crown className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 mb-1">Premium Feature</p>
                                            <p className="text-xs text-slate-600 mb-3">
                                                Adding more parents to your household requires a Pro subscription.
                                            </p>
                                            <Link href="/parent/subscription">
                                                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-none shadow-sm">
                                                    Upgrade to Add Parents
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-slate-500 mb-3">
                                        Generate a code to let another parent join this household.
                                    </p>
                                    <button
                                        onClick={handleGenerateInvite}
                                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="text-lg">🔗</span> Generate Invite Code
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Support & Feedback Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-sky-500">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span>💬</span> Support
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                        Found a bug or have an idea? We'd love to hear from you.
                    </p>
                    <Link
                        href="/parent/feedback"
                        className="block w-full bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold py-3.5 px-4 rounded-xl text-center transition-colors shadow-sm"
                    >
                        Send Feedback / Report Bug
                    </Link>
                </div>

                {/* Notifications Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-slate-400">
                        <Bell className="w-6 h-6" />
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            Notifications
                            <HelpButton title="Notifications" text="Get alerted when children complete tasks or request rewards." />
                        </h2>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-slate-600 font-medium">Daily Reminders (8:00 PM)</span>
                            <button
                                onClick={toggleDailyReminders}
                                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${dailyRemindersEnabled ? 'bg-primary/20' : 'bg-slate-200'}`}
                            >
                                <div className={`w-6 h-6 rounded-full absolute top-0 shadow-sm border-2 border-white transition-all ${dailyRemindersEnabled ? 'bg-primary right-0' : 'bg-slate-400 left-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Account Actions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-slate-400">
                        <Key className="w-6 h-6" />
                        <h2 className="text-lg font-bold text-slate-800">Account</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-sm text-slate-500 py-2 border-b border-slate-50">
                            <span>Logged in as</span>
                            <span className="font-bold text-slate-700 truncate max-w-[150px]">{user?.email}</span>
                        </div>

                        <button
                            onClick={async () => {
                                if (confirm("Are you sure you want to sign out?")) {
                                    await signOut();
                                    router.push('/login');
                                }
                            }}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                            Sign Out
                        </button>

                        <button
                            onClick={async () => {
                                if (!user) return;
                                if (confirm("DANGER: This will permanently delete your account and all data. This cannot be undone.")) {
                                    if (confirm("Are you absolutely sure?")) {
                                        try {
                                            // Soft Delete (Deactivate) data
                                            await AccountService.deleteFullAccount(user.uid);

                                            // Sign Out
                                            await signOut();
                                            router.push('/login');
                                        } catch (e: any) {
                                            console.error("Delete Account Error:", e);
                                            alert("Error deleting account: " + e.message);
                                        }
                                    }
                                }
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 text-xs"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>

                {/* About & Legal */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-slate-400">
                        <span className="text-xl">⚖️</span>
                        <h2 className="text-lg font-bold text-slate-800">Legal</h2>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link href="/privacy" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <span className="text-sm font-bold text-slate-600">Privacy Policy</span>
                            <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
                        </Link>
                        <Link href="/terms" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <span className="text-sm font-bold text-slate-600">Terms of Service</span>
                            <ArrowLeft className="w-4 h-4 rotate-180 text-slate-400" />
                        </Link>
                    </div>
                </div>

                {/* Version Footer */}
                <p className="text-center text-[10px] text-slate-400 font-mono mt-8 mb-4 opacity-50">
                    Habitisam v{APP_CONFIG.version} (Build {APP_CONFIG.buildNumber})
                </p>

            </div>

            {/* PIN Reset Modal */}
            <Modal
                isOpen={showPinModal}
                onClose={() => {
                    setShowPinModal(false);
                    setPinDigits(['', '', '', '']);
                }}
                title="Reset PIN"
                className="max-w-sm"
            >
                <div className="p-4 pt-0">
                    <p className="text-slate-600 text-sm mb-4">
                        Enter a new PIN to secure your parent account. This PIN will be required to access the parent dashboard.
                    </p>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-600 mb-2">New PIN</label>
                        <div className="flex gap-3 justify-center">
                            {pinDigits.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={pinRefs[i]}
                                    type="text" // 'tel' ensures numeric keyboard on mobile but allows text manipulation easier
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handlePinChange(i, e.target.value)}
                                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                                    className="w-14 h-14 text-center text-2xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none transition-all"
                                />
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-4 text-center">4-digit code</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            onClick={() => {
                                setShowPinModal(false);
                                setPinDigits(['', '', '', '']);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                            onClick={handleResetPin}
                        >
                            Update PIN
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Invite Code Modal */}
            <Modal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                title="Invite Parent"
                className="max-w-sm"
            >
                <div className="p-6 pt-2 text-center">
                    <p className="text-slate-600 mb-6">
                        Share this code with another parent. They can enter it on the login screen to join this household.
                    </p>

                    <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-6 mb-6 relative group cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={copyToClipboard}>
                        <div className="text-4xl font-black text-slate-800 tracking-widest font-mono">
                            {inviteCode}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wide">
                            Expires in 24 hours
                        </p>

                        <div className="absolute top-2 right-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-5 h-5" />
                        </div>
                    </div>

                    <Button
                        className="w-full bg-slate-900 text-white hover:bg-slate-800"
                        onClick={() => setShowInviteModal(false)}
                    >
                        Done
                    </Button>
                </div>
            </Modal>

            {/* Help Modal */}
            <Modal
                isOpen={helpModalOpen}
                onClose={() => setHelpModalOpen(false)}
                title={helpContent.title}
                className="max-w-xs"
            >
                <div className="p-4 pt-0">
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">{helpContent.text}</p>
                    <Button onClick={() => setHelpModalOpen(false)} className="w-full bg-primary text-white">Got it</Button>
                </div>
            </Modal>
        </div>
    );
}
