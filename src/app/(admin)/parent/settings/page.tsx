"use client";

import { useTheme } from '@/components/providers/ThemeContext';
import { ThemeType } from '@/lib/db';
import { ArrowLeft, Bell, ChevronDown, Palette, Key } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/lib/hooks/useAuth'; // Added Import

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { activeProfile } = useSessionStore();
    const [showPinModal, setShowPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');

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
        </div>
    );
}
