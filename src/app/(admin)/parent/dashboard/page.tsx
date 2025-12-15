"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Settings, Plus, Star, Zap, ChevronDown, Check, Clock, User as UserIcon } from 'lucide-react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ParentDashboard() {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    // Directive A: Local State
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

    // Directive B: Real Data
    // 1. Fetch children profiles
    const childProfiles = useLiveQuery(
        () => db.profiles.where('type').equals('child').toArray()
    );

    // 2. Fetch today's routines
    // Simple logic: get all activities. In real app, filter by "days of week" vs today.
    // For prototype, we assume all recurring routines appear effectively "today".
    const allRoutines = useLiveQuery(
        () => db.activities.toArray()
    );

    // Filter Logic
    const filteredRoutines = allRoutines?.filter(routine => {
        // Filter Rule 2: Assignee
        // If no children selected, show ALL (or none? Usually "All" is better UX, let's assume ALL).
        // Wait, "Filter Rule 2: The list MUST filter based on the selected child IDs"
        // If selectedChildIds is empty, we likely show all.
        // If not empty, routine.profileIds must overlap with selectedChildIds.
        if (selectedChildIds.length === 0) return true;

        // Check overlap
        const hasOverlap = routine.profileIds.some(id => selectedChildIds.includes(id));
        return hasOverlap;
    });

    const toggleChildSelection = (id: string) => {
        if (selectedChildIds.includes(id)) {
            setSelectedChildIds(prev => prev.filter(cid => cid !== id));
        } else {
            setSelectedChildIds(prev => [...prev, id]);
        }
    };

    const getChildName = (id: string) => {
        const child = childProfiles?.find(p => p.id === id);
        return child ? child.name : 'Unknown';
    };

    // Placeholder stats
    const totalStars = 150; // In real app, sum from childProfiles or activityLogs
    const streak = 5;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* 1. Header Bar */}
            <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-30">
                <button
                    onClick={() => setIsSwitcherOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
                >
                    {/* Avatar Placeholder: Generic User Icon as requested */}
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 border border-violet-200">
                        {activeProfile?.avatarId ? (
                            // Ideally load avatar image, but directive says "replace 'P' icon with placeholder"
                            <span className="text-lg font-bold">{activeProfile.name[0]}</span>
                        ) : (
                            <UserIcon className="w-6 h-6" />
                        )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

                <Link href="/parent/settings" className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                    <Settings className="w-6 h-6" />
                </Link>
            </header>

            <ProfileSwitcherModal
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />

            <main className="px-4 py-6 flex flex-col gap-8 max-w-screen-md mx-auto">

                {/* 2. Quick Stats Card */}
                {/* Revert labels: Today, Total Stars, Streak. No dividers. */}
                <div className="w-full bg-gradient-to-r from-violet-600 to-teal-400 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start text-center">
                        <div className="flex flex-col items-center flex-1">
                            <p className="text-xs font-bold opacity-90 uppercase tracking-wider mb-1">TODAY</p>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-extrabold leading-none">2/3</span>
                                <span className="text-[10px] lowercase opacity-80 mt-1">routines done</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <p className="text-xs font-bold opacity-90 uppercase tracking-wider mb-1">TOTAL STARS</p>
                            <div className="flex items-center gap-1">
                                <span className="text-4xl font-extrabold leading-none">{totalStars}</span>
                                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <p className="text-xs font-bold opacity-90 uppercase tracking-wider mb-1">STREAK</p>
                            <div className="flex items-center gap-1">
                                <span className="text-4xl font-extrabold leading-none">{streak}</span>
                                <span className="text-2xl">🔥</span>
                            </div>
                            <span className="text-[10px] opacity-80 mt-1">days</span>
                        </div>
                    </div>
                </div>

                {/* 3. Children Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Children</h3>
                        {/* Visual Toggle Placeholder */}
                        <button className="text-xs font-bold text-violet-600 uppercase tracking-wide opacity-50 cursor-not-allowed">Toggle</button>
                    </div>

                    <div className="flex items-center gap-5 overflow-x-auto py-2 px-1">
                        {childProfiles?.map(child => {
                            const isSelected = selectedChildIds.includes(child.id!);

                            // Map avatarId to Icon
                            let AvatarIcon = '👶';
                            switch (child.avatarId) {
                                case 'boy': AvatarIcon = '🧑‍🚀'; break;
                                case 'girl': AvatarIcon = '👩‍🚀'; break;
                                case 'alien': AvatarIcon = '👽'; break;
                                case 'robot': AvatarIcon = '🤖'; break;
                                case 'rocket': AvatarIcon = '🚀'; break;
                                default: AvatarIcon = '👶';
                            }

                            // Dynamic Color Mapping
                            const colorMap: Record<string, string> = {
                                cyan: 'bg-cyan-100 border-cyan-300',
                                purple: 'bg-violet-100 border-violet-300',
                                green: 'bg-emerald-100 border-emerald-300',
                                orange: 'bg-orange-100 border-orange-300'
                            };
                            const colorClass = colorMap[child.colorTheme || 'cyan'] || 'bg-slate-100 border-slate-200';

                            return (
                                <button
                                    key={child.id}
                                    onClick={() => toggleChildSelection(child.id!)}
                                    className="flex flex-col items-center gap-2 group min-w-[60px]"
                                >
                                    <div className={cn(
                                        "w-16 h-16 rounded-full flex items-center justify-center transition-all border-[3px] shadow-sm relative",
                                        isSelected
                                            ? "border-violet-600 bg-violet-50 scale-105"
                                            : `group-hover:border-violet-200 ${colorClass}`
                                    )}>
                                        <div className="text-3xl">
                                            {AvatarIcon}
                                        </div>

                                        {isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-1 border-2 border-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium transition-colors",
                                        isSelected ? "text-violet-700 font-bold" : "text-slate-500"
                                    )}>
                                        {child.name}
                                    </span>
                                </button>
                            );
                        })}

                        {/* Add Child Button - Solid Circle */}
                        <Link href="/parent/profile/add" className="flex flex-col items-center gap-2 min-w-[60px]">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                <Plus className="w-8 h-8 text-slate-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-400">Add</span>
                        </Link>
                    </div>
                </div>

                {/* 4. Quick Actions */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">Quick Actions</h3>
                    <div className="flex justify-between gap-4 px-2">
                        <button
                            onClick={() => router.push('/parent/routines/new')}
                            className="flex flex-col items-center gap-2 group w-1/3"
                        >
                            <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-105 transition-transform">
                                <Plus className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-xs font-medium text-slate-700 mt-1">New Routine</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group w-1/3 opacity-50 cursor-not-allowed">
                            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
                                <Star className="w-8 h-8 text-white fill-current" />
                            </div>
                            <span className="text-xs font-medium text-slate-700 mt-1">Add Stars</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group w-1/3 opacity-50 cursor-not-allowed">
                            <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-200">
                                <Zap className="w-8 h-8 text-white fill-current" />
                            </div>
                            <span className="text-xs font-medium text-slate-700 mt-1">Quick Task</span>
                        </button>
                    </div>
                </div>

                {/* 5. Today's Routines */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">Today's Routines</h3>

                    {filteredRoutines?.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No routines found for today.
                        </div>
                    )}

                    {filteredRoutines?.map(routine => {
                        const childNames = routine.profileIds.map(pid => getChildName(pid)).join(', ');
                        return (
                            <div key={routine.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between border border-slate-100">
                                <div className="flex flex-col">
                                    <h4 className="font-bold text-slate-800 text-base">
                                        {routine.title} <span className="font-normal text-slate-500">({childNames})</span>
                                    </h4>
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{routine.timeOfDay}</span>
                                    </div>
                                </div>

                                {/* Status: Subtle Text-and-Icon */}
                                <div className="flex items-center gap-1 text-amber-500">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wide">Pending</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </main>

            <ParentNavBar />
        </div>
    );
}
