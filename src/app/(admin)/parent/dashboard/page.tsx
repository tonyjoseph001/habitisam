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
    const childProfiles = useLiveQuery(
        () => db.profiles.where('type').equals('child').toArray()
    );

    const allRoutines = useLiveQuery(
        () => db.activities.toArray()
    );

    // Filter Logic
    const filteredRoutines = allRoutines?.filter(routine => {
        if (selectedChildIds.length === 0) return true;
        return routine.profileIds.some(id => selectedChildIds.includes(id));
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

    const totalStars = 150;
    const streak = 5;

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans">
            {/* 1. Header Bar: Compact */}
            <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm sticky top-0 z-30 border-b border-slate-200">
                <button
                    onClick={() => setIsSwitcherOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 border border-violet-200">
                        {activeProfile?.avatarId ? (
                            <span className="text-sm font-bold">{activeProfile.name[0]}</span>
                        ) : (
                            <UserIcon className="w-4 h-4" />
                        )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>

                <Link href="/parent/settings" className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-full">
                    <Settings className="w-5 h-5" />
                </Link>
            </header>

            <ProfileSwitcherModal
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />

            <main className="py-4 flex flex-col gap-6 max-w-screen-md mx-auto">

                {/* 2. Quick Stats Card: Compact with margins */}
                <div className="mx-4 bg-gradient-to-r from-violet-600 to-teal-400 rounded-xl p-4 text-white shadow-sm relative overflow-hidden border border-white/10">
                    <div className="relative z-10 flex justify-between items-start text-center">
                        <div className="flex flex-col items-center flex-1">
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mb-0.5">TODAY</p>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-extrabold leading-none">2/3</span>
                                <span className="text-[9px] lowercase opacity-80 mt-0.5">routines done</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mb-0.5">STARS</p>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-extrabold leading-none">{totalStars}</span>
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mb-0.5">STREAK</p>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-extrabold leading-none">{streak}</span>
                                <span className="text-xl">🔥</span>
                            </div>
                            <span className="text-[9px] opacity-80 mt-0.5">days</span>
                        </div>
                    </div>
                </div>

                {/* 3. Children Section: Compact */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Children</h3>
                        <button className="text-[10px] font-bold text-violet-600 uppercase tracking-wide opacity-50 cursor-not-allowed">Toggle</button>
                    </div>

                    <div className="flex items-center gap-4 overflow-x-auto py-1 px-4 scrollbar-hide">
                        {childProfiles?.map(child => {
                            const isSelected = selectedChildIds.includes(child.id!);

                            let AvatarIcon = '👶';
                            switch (child.avatarId) {
                                case 'boy': AvatarIcon = '🧑‍🚀'; break;
                                case 'girl': AvatarIcon = '👩‍🚀'; break;
                                case 'alien': AvatarIcon = '👽'; break;
                                case 'robot': AvatarIcon = '🤖'; break;
                                case 'rocket': AvatarIcon = '🚀'; break;
                                default: AvatarIcon = '👶';
                            }

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
                                    className="flex flex-col items-center gap-1 group min-w-[50px]"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 shadow-sm relative",
                                        isSelected
                                            ? "border-violet-600 bg-violet-50 scale-105"
                                            : `group-hover:border-violet-200 ${colorClass}`
                                    )}>
                                        <div className="text-2xl">
                                            {AvatarIcon}
                                        </div>

                                        {isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 border-2 border-white">
                                                <Check className="w-2 h-2" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-medium transition-colors truncate w-full text-center",
                                        isSelected ? "text-violet-700 font-bold" : "text-slate-500"
                                    )}>
                                        {child.name}
                                    </span>
                                </button>
                            );
                        })}

                        <Link href="/parent/profile/add" className="flex flex-col items-center gap-1 min-w-[50px]">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
                                <Plus className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">Add</span>
                        </Link>
                    </div>
                </div>

                {/* 4. Quick Actions: Smaller */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5">Quick Actions</h3>
                    <div className="flex justify-between gap-3 px-4">
                        <button
                            onClick={() => router.push('/parent/routines/new')}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 hover:border-violet-200 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-1">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">New Routine</span>
                        </button>

                        <button className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 opacity-60 cursor-not-allowed">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">Add Stars</span>
                        </button>

                        <button className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm flex-1 opacity-60 cursor-not-allowed">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-1">
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">Quick Task</span>
                        </button>
                    </div>
                </div>

                {/* 5. Today's Routines: Slim scale */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-5">Today's Routines</h3>

                    <div className="flex flex-col gap-2 px-4">
                        {filteredRoutines?.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs bg-white rounded-xl border border-slate-100 shadow-sm border-dashed">
                                No routines for selected children.
                            </div>
                        )}

                        {filteredRoutines?.map(routine => {
                            const childNames = routine.profileIds.map(pid => getChildName(pid)).join(', ');
                            return (
                                <div key={routine.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between border border-slate-200">
                                    <div className="flex flex-col">
                                        <h4 className="font-bold text-slate-800 text-sm">
                                            {routine.title} <span className="font-normal text-slate-500 text-xs">({childNames})</span>
                                        </h4>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            <span>{routine.timeOfDay}</span>
                                        </div>
                                    </div>

                                    {/* Status: Compact */}
                                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-wide">Pending</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>

            <ParentNavBar />
        </div>
    );
}
