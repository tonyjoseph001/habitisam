"use client";

import React, { useState } from 'react';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Settings, Plus, Star, Zap, ChevronDown, Check, Clock } from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Profile } from '@/lib/db';
// Need a Profile Switcher Modal later. For now, placeholders.
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';

export default function ParentDashboard() {
    const { activeProfile } = useSessionStore();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* 1. Header Bar */}
            <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-30">
                <button
                    onClick={() => setIsSwitcherOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
                >
                    {/* Avatar Placeholder */}
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold border border-violet-200">
                        {activeProfile?.name?.[0] || 'P'}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>

                <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full">
                    <Settings className="w-6 h-6" />
                </button>
            </header>

            <ProfileSwitcherModal
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />

            <main className="px-4 py-6 flex flex-col gap-6 max-w-screen-md mx-auto">

                {/* 2. Quick Stats Card */}
                <div className="w-full bg-gradient-to-r from-violet-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow relative overflow-hidden">
                    {/* Subtle background glow/noise could go here */}
                    <div className="relative z-10 flex justify-between items-center text-center">
                        <div className="flex-1 border-r border-white/20">
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Today's Progress</p>
                            <p className="text-3xl font-heading font-bold mt-1">2/3</p>
                            <p className="text-xs opacity-70">Routines Done</p>
                        </div>
                        <div className="flex-1 border-r border-white/20">
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Total Stars</p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <span className="text-3xl font-heading font-bold">150</span>
                                <span className="text-2xl">⭐</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Current Streak</p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <span className="text-3xl font-heading font-bold">5</span>
                                <span className="text-2xl">🔥</span>
                            </div>
                            <p className="text-xs opacity-70">Days</p>
                        </div>
                    </div>
                </div>

                {/* 3. Children Toggle Section */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Children</h3>
                    <div className="flex items-center gap-4 overflow-x-auto py-1">
                        {/* Example Child 1 (Active) */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 rounded-full bg-blue-100 border-[3px] border-violet-600 relative flex items-center justify-center shadow-md">
                                {/* Avatar Image would go here */}
                                <span className="text-2xl">👦</span>
                                <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-[2px]">
                                    <Check className="w-3 h-3" />
                                </div>
                            </div>
                            <span className="text-xs font-medium text-violet-700">Ethan</span>
                        </div>

                        {/* Example Child 2 (Inactive) */}
                        <div className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-pink-100 border border-slate-200 flex items-center justify-center">
                                <span className="text-2xl">👧</span>
                            </div>
                            <span className="text-xs font-medium text-slate-600">Ryan</span>
                        </div>

                        {/* Add Child Button */}
                        <button className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-slate-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-500">Add</span>
                        </button>
                    </div>
                </div>

                {/* 4. Quick Action FABs */}
                <div className="flex justify-between gap-4 px-2">
                    <button className="flex flex-col items-center gap-2 group">
                        <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Plus className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xs font-medium text-slate-700">New Routine</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                        <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Star className="w-8 h-8 text-white fill-current" />
                        </div>
                        <span className="text-xs font-medium text-slate-700">Add Stars</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                        <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Zap className="w-8 h-8 text-white fill-current" />
                        </div>
                        <span className="text-xs font-medium text-slate-700">Quick Task</span>
                    </button>
                </div>

                {/* 5. Today's Routines List */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Today's Routines</h3>

                    {/* Card 1: Completed */}
                    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-lg">☀️</div>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-slate-900">Morning Rush</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1">
                                        👦 Ethan
                                    </span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 7:30 AM</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                <Check className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-green-600">Done</span>
                        </div>
                    </div>

                    {/* Card 2: Pending */}
                    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between border border-slate-100 opacity-90">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">🎒</div>
                            <div className="flex flex-col">
                                <h4 className="font-bold text-slate-900">After School</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1">
                                        👧 Ryan
                                    </span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 3:00 PM</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-amber-500">Pending</span>
                        </div>
                    </div>
                </div>

            </main>

            <ParentNavBar />
        </div>
    );
}
