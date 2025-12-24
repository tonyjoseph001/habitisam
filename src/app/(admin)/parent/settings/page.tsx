"use client";

import { useTheme } from '@/components/providers/ThemeContext';
import { ThemeType } from '@/lib/db';
import { ArrowLeft, Bell, ChevronDown, Palette } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const themes: { value: ThemeType; label: string }[] = [
        { value: 'default', label: 'Default Indigo' },
        { value: 'ocean', label: 'Ocean Blue' },
        { value: 'sunset', label: 'Sunset Orange' },
        { value: 'forest', label: 'Forest Green' },
        { value: 'candy', label: 'Cotton Candy' },
        { value: 'midnight', label: 'Midnight Dark' },
    ];

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

            </div>
        </div>
    );
}
