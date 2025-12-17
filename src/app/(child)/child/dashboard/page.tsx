"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Play, Clock, Star, Bell, Menu, ArrowRight, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';


// Visual Mapping for Stamps (Duplicate for now, ideally shared)
const STAMP_ASSETS: Record<string, { emoji: string, color: string }> = {
    'star': { emoji: '⭐', color: 'bg-yellow-100 text-yellow-500 border-yellow-200' },
    'rocket': { emoji: '🚀', color: 'bg-blue-100 text-blue-500 border-blue-200' },
    'planet': { emoji: '🪐', color: 'bg-purple-100 text-purple-500 border-purple-200' },
    'bear': { emoji: '🐻', color: 'bg-amber-100 text-amber-600 border-amber-200' },
    'robot': { emoji: '🤖', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'unicorn': { emoji: '🦄', color: 'bg-pink-100 text-pink-500 border-pink-200' },
    'dino': { emoji: '🦖', color: 'bg-green-100 text-green-600 border-green-200' },
    'crown': { emoji: '👑', color: 'bg-orange-100 text-orange-500 border-orange-200' },
};

export default function MissionControlPage() {
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter();

    const [isStampModalOpen, setIsStampModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const liveProfile = useLiveQuery(
        () => db.profiles.get(activeProfile?.id || ''),
        [activeProfile?.id]
    );

    const routines = useLiveQuery(async () => {
        if (!activeProfile) return [];
        return await db.activities
            .where('profileIds')
            .equals(activeProfile.id)
            .toArray();
    }, [activeProfile?.id]);

    // Stamp Selection Handler
    const handleSelectStamp = async (stampId: string) => {
        if (!activeProfile) return;
        await db.profiles.update(activeProfile.id, { activeStamp: stampId });
        setIsStampModalOpen(false);
    };

    if (!activeProfile) return null;

    // Use live data if available, otherwise fallback to session
    const displayProfile = liveProfile || activeProfile;

    const upNextRoutine = routines?.[0];
    const assignedTasks = routines?.slice(1) || [];

    // Avatar Logic
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayProfile.name}&clothing=graphicShirt`;

    // Stamp Logic
    const activeStampId = displayProfile.activeStamp || 'star';
    const stampAsset = STAMP_ASSETS[activeStampId] || STAMP_ASSETS['star'];

    // Helper for Icon Rendering
    const RenderIcon = ({ name, className }: { name?: string; className?: string }) => {
        // @ts-ignore
        const LucideIcon = React.useMemo(() => {
            if (!name) return Star; // Fallback
            // @ts-ignore
            return require('lucide-react')[name] || Star;
        }, [name]);

        return <LucideIcon className={className || "w-6 h-6"} />;
    };

    return (
        <main className="w-full max-w-md mx-auto pb-4">

            {/* Header (HTML Match) */}
            <div className="px-6 pt-8 pb-4 flex justify-between items-center">
                <button className="bg-white p-2.5 rounded-full shadow-sm text-gray-500">
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 overflow-hidden border-2 border-white shadow-sm">
                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <button className="bg-white p-2.5 rounded-full shadow-sm text-gray-500 relative">
                        <Bell className="w-6 h-6" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
                    </button>
                </div>
            </div>

            {/* Welcome Section */}
            <div className="px-6 mb-6 flex items-center gap-4">

                {/* Stamp Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log("OPENING MODAL");
                        setIsStampModalOpen(true);
                    }}
                    className="w-24 h-24 flex-shrink-0 animate-bounce-slow relative z-30 flex items-center justify-center pointer-events-auto"
                >
                    <div className="text-[5rem] leading-none select-none drop-shadow-xl filter">
                        {stampAsset.emoji}
                    </div>
                </button>

                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Hello {activeProfile.name}!</h1>
                    <div className="flex items-center gap-1 mt-1 text-sm font-bold text-gray-500">
                        <span className="text-xl">🎖️</span>
                        <span>Level 2: {activeStampId.charAt(0).toUpperCase() + activeStampId.slice(1)}</span>
                    </div>
                </div>
            </div>

            {/* Upcoming Task */}
            <div className="px-6 mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-full text-blue-500">
                        <Bell className="w-4 h-4 fill-current" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Upcoming Task</h2>
                </div>

                {upNextRoutine ? (
                    <div className="bg-white rounded-[2rem] p-5 shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-blue-50 relative overflow-hidden group">

                        {/* Timer Badge (Absolute) */}
                        <div className="absolute top-4 left-4 z-10">
                            <div className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-xs font-bold border border-red-100 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Starts in 10m</span>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4 mt-8">
                            <div className="w-16 h-16 rounded-2xl bg-orange-100 overflow-hidden flex-shrink-0 border-2 border-gray-100 p-2 flex items-center justify-center text-orange-500">
                                <RenderIcon name={upNextRoutine.icon} className="w-8 h-8" />
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{upNextRoutine.title}</h3>

                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                        <span className="text-sm">⏱️</span>
                                        <span className="text-xs font-bold text-gray-600">
                                            {upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.duration || 0), 0)}m
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
                                        <span className="text-sm">⭐</span>
                                        <span className="text-xs font-bold text-yellow-600">
                                            +{upNextRoutine.steps.reduce((acc: number, s: any) => acc + (s.stars || 0), 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="mb-5">
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl overflow-x-auto scrollbar-hide">
                                {upNextRoutine.steps.slice(0, 3).map((step: any, i: number) => (
                                    <React.Fragment key={step.id || i}>
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-500 shadow-sm flex-shrink-0">
                                            <RenderIcon name={step.icon} className="w-4 h-4" />
                                        </div>
                                        {i < Math.min(upNextRoutine.steps.length, 3) - 1 && (
                                            <div className="text-gray-300 text-[10px]">➜</div>
                                        )}
                                    </React.Fragment>
                                ))}
                                {upNextRoutine.steps.length > 3 && (
                                    <div className="ml-auto text-xs font-bold text-gray-400 pl-2">+{upNextRoutine.steps.length - 3}</div>
                                )}
                            </div>
                        </div>

                        {/* INLINED PORTAL MODAL */}
                        {mounted && isStampModalOpen && (
                            (() => {
                                console.log("RENDERING PORTAL CONTENT");
                                return createPortal(
                                    <div
                                        className="fixed inset-0 flex items-end justify-center sm:items-center pointer-events-none"
                                        style={{ zIndex: 999999 }}
                                    >
                                        {/* Backdrop */}
                                        <div
                                            className="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-300 backdrop-blur-[2px]"
                                            onClick={() => setIsStampModalOpen(false)}
                                        />

                                        {/* Bottom Sheet Drawer */}
                                        <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom duration-300">

                                            {/* Drag Handle */}
                                            <div className="w-full flex justify-center pt-3 pb-1">
                                                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                                            </div>

                                            {/* Header */}
                                            <div className="px-8 pt-4 pb-2 flex items-center justify-between">
                                                <h2 className="text-xl font-extrabold text-[#1F2937]">Select Buddy</h2>
                                                <Link href="/parent/rewards" className="text-xs font-bold text-gray-400 hover:text-indigo-500 transition-colors">
                                                    Get more in Rewards
                                                </Link>
                                            </div>

                                            {/* Stamp Grid */}
                                            <div className="p-8 grid grid-cols-3 gap-6 overflow-y-auto max-h-[50vh]">
                                                {(displayProfile.unlockedStamps?.length ? displayProfile.unlockedStamps : ['star', 'rocket', 'planet', 'bear', 'robot', 'dino']).map((stampId) => {
                                                    const asset = STAMP_ASSETS[stampId] || STAMP_ASSETS['star'];
                                                    const isActive = displayProfile.activeStamp === stampId;

                                                    return (
                                                        <button
                                                            key={stampId}
                                                            onClick={() => handleSelectStamp(stampId)}
                                                            className={`relative aspect-square rounded-full flex items-center justify-center text-4xl transition-all ${isActive ? 'scale-110' : 'hover:scale-105 active:scale-95'}`}
                                                        >
                                                            {/* Circle Background */}
                                                            <div className={`absolute inset-0 rounded-full opacity-20 ${isActive ? 'bg-indigo-500' : 'bg-gray-100'}`}></div>

                                                            {/* Asset */}
                                                            <div className="relative z-10 drop-shadow-sm">
                                                                {asset.emoji}
                                                            </div>

                                                            {/* Active Ring */}
                                                            {isActive && (
                                                                <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500">
                                                                    <div className="absolute top-0 right-0 bg-indigo-500 text-white rounded-full p-1 shadow-sm transform translate-x-1/4 -translate-y-1/4">
                                                                        <Check className="w-2.5 h-2.5" strokeWidth={4} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Footer Button */}
                                            <div className="p-6 pt-2 pb-8">
                                                <button
                                                    onClick={() => setIsStampModalOpen(false)}
                                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-colors active:scale-95"
                                                >
                                                    Close
                                                </button>
                                            </div>

                                        </div>
                                    </div>,
                                    document.body
                                );
                            })()
                        )}
                        <Link href={`/child/routine?id=${upNextRoutine.id}`} className="block">
                            <button className="w-full bg-[#FF9F1C] hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Play className="w-5 h-5 fill-current" />
                                START TASK
                            </button>
                        </Link>

                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 bg-white rounded-[2rem] shadow-sm">No upcoming tasks!</div>
                )}
            </div>

            {/* Assigned Tasks */}
            <div className="px-6 mb-24">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-purple-100 rounded-full text-purple-500">
                        <Clock className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Assigned Tasks ({assignedTasks.length})</h2>
                </div>

                <div className="space-y-4">
                    {assignedTasks.length === 0 && <p className="text-slate-400 text-sm text-center">All caught up!</p>}

                    {assignedTasks.map((task, i) => (
                        <div key={task.id} className={`bg-white rounded-3xl p-4 shadow-[0_10px_20px_rgba(0,0,0,0.05)] flex items-center gap-4 border ${i % 2 === 0 ? 'border-blue-50' : 'border-red-50'}`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${i % 2 === 0 ? 'bg-blue-100 text-blue-500' : 'bg-red-100 text-red-500'}`}>
                                <RenderIcon name={task.icon} className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 text-lg">{task.title}</h4>
                                <p className="text-xs font-bold text-gray-400">{task.steps.length} steps</p>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 text-gray-500 font-bold text-xs bg-gray-50 px-2 py-1 rounded-md">
                                    <span>{task.timeOfDay}</span>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-600 font-bold text-xs bg-yellow-50 px-2 py-1 rounded-md">
                                    <span>⭐ +{task.steps?.reduce((a: number, b: any) => a + (b.stars || 0), 0) || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
            `}</style>

        </main >
    );
}
