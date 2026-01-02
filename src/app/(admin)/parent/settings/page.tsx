"use client";

import { useTheme } from '@/components/providers/ThemeContext';
import { ThemeType } from '@/lib/db';
import { ArrowLeft, Bell, ChevronDown, Palette, Key, Users, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { InviteService } from '@/lib/firestore/invites.service';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/lib/hooks/useAuth';
import { AccountService } from '@/lib/firestore/accounts.service';
import { useProfiles } from '@/lib/hooks/useProfiles';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { activeProfile, setActiveProfile } = useSessionStore();
    const { profiles } = useProfiles(); // Fetch all profiles
    const [showPinModal, setShowPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');

    const parents = profiles.filter(p => p.type === 'parent');

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

    const handleResetPin = async () => {
        if (!activeProfile?.id) return;
        if (!newPin.trim()) return alert('Please enter a new PIN');
        if (newPin.length < 4) return alert('PIN must be at least 4 digits');

        try {
            await ProfileService.update(activeProfile.id, { pin: newPin });
            setShowPinModal(false);
            setNewPin('');
            alert('PIN updated successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to update PIN');
        }
    };

    // --- Invite Logic ---
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
    const [joinPin, setJoinPin] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    const handleJoinHousehold = async () => {
        if (!joinCode || !user) return;
        // if (joinPin.length !== 4) return alert("PIN must be 4 digits."); // Removed pin check

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
                        <h2 className="text-lg font-bold text-slate-800">Appearance</h2>
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
                            <h2 className="text-lg font-bold text-slate-800">Security</h2>
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
                        <h2 className="text-lg font-bold text-slate-800">
                            {isOwner ? "Join a Family" : "Family Membership"}
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
                            <h2 className="text-lg font-bold text-slate-800">Family Management</h2>
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
                            <p className="text-xs text-slate-500 mb-3">
                                Generate a code to let another parent join this household.
                            </p>
                            <button
                                onClick={handleGenerateInvite}
                                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="text-lg">🔗</span> Generate Invite Code
                            </button>
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
                        <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-slate-600 font-medium">Daily Reminders</span>
                        {/* Toggle Switch (Visual Only for now) */}
                        <div className="w-12 h-6 bg-primary/20 rounded-full relative cursor-pointer">
                            <div className="w-6 h-6 bg-primary rounded-full absolute right-0 shadow-sm border-2 border-white"></div>
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
                                            // NOTE: We do NOT delete the Firebase Auth user. 
                                            // This preserves the UID so the account can be Reactivated upon future login.
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
            </div>

            {/* PIN Reset Modal */}
            <Modal
                isOpen={showPinModal}
                onClose={() => {
                    setShowPinModal(false);
                    setNewPin('');
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
                        <Input
                            type="password"
                            value={newPin}
                            onChange={e => setNewPin(e.target.value)}
                            placeholder="Enter 4-digit PIN"
                            maxLength={6}
                            className="h-12 bg-white border-slate-200"
                        />
                        <p className="text-xs text-slate-500 mt-2">Minimum 4 digits</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            onClick={() => {
                                setShowPinModal(false);
                                setNewPin('');
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
        </div >
    );
}
