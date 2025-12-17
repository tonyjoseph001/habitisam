"use client";

import React from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Play, Clock, Star, Bell, Menu, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MissionControlPage() {
    const { activeProfile, setActiveProfile } = useSessionStore();
    const router = useRouter();

    const routines = useLiveQuery(async () => {
        if (!activeProfile) return [];
        return await db.activities
            .where('profileIds')
            .equals(activeProfile.id)
            .toArray();
    }, [activeProfile?.id]);

    if (!activeProfile) return null;

    const upNextRoutine = routines?.[0];
    const assignedTasks = routines?.slice(1) || [];

    // Avatar Logic
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeProfile.name}&clothing=graphicShirt`;

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
                <div className="w-20 h-20 flex-shrink-0 animate-bounce-slow">
                    {/* Using the monkey image from HTML or a similar safe placeholder */}
                    <img src="https://cdn-icons-png.flaticon.com/512/4193/4193246.png" className="w-full h-full object-contain" alt="Monkey Mascot" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800">Hello {activeProfile.name}!</h1>
                    <div className="flex items-center gap-1 mt-1 text-sm font-bold text-gray-500">
                        <span className="text-xl">🎖️</span>
                        <span>Level 2: Champion</span>
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

        </main>
    );
}
