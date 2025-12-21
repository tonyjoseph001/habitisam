"use client";

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { db, Goal } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChildGoalsPage() {
    const { activeProfile } = useSessionStore();
    const [mockGoals, setMockGoals] = useState<Goal[]>([]);

    // Real Data Query
    const goals = useLiveQuery(async () => {
        if (!activeProfile) return [];
        return await db.goals
            .where('profileId').equals(activeProfile.id)
            .toArray();
    }, [activeProfile?.id]);

    // Format Helpers
    const getStatusColor = (goal: Goal) => {
        // Mapping based on mock design colors
        // We can randomize or use specific logic based on type
        switch (goal.type) {
            case 'checklist': return 'purple';
            case 'slider': return 'blue';
            case 'counter': return 'green';
            case 'binary': return 'orange';
            case 'savings': return 'yellow';
            case 'timer': return 'indigo';
            default: return 'pink';
        }
    };

    const getTwColors = (color: string) => {
        switch (color) {
            case 'purple': return { bg: 'bg-purple-50', border: 'border-purple-50', text: 'text-purple-600', badgeBs: 'bg-purple-100', accent: 'bg-purple-500', iconBg: 'bg-purple-50', btn: 'bg-purple-100 text-purple-700 hover:bg-purple-200' };
            case 'blue': return { bg: 'bg-blue-50', border: 'border-blue-50', text: 'text-blue-600', badgeBs: 'bg-blue-100', accent: 'bg-blue-500', iconBg: 'bg-blue-50', btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200' };
            case 'green': return { bg: 'bg-green-50', border: 'border-green-50', text: 'text-green-600', badgeBs: 'bg-green-100', accent: 'bg-green-500', iconBg: 'bg-green-50', btn: 'bg-green-500 text-white hover:bg-green-600 shadow-sm' };
            case 'yellow': return { bg: 'bg-yellow-50', border: 'border-yellow-50', text: 'text-yellow-700', badgeBs: 'bg-yellow-100', accent: 'bg-yellow-600', iconBg: 'bg-yellow-50', btn: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' };
            case 'orange': return { bg: 'bg-orange-50', border: 'border-orange-50', text: 'text-orange-600', badgeBs: 'bg-orange-100', accent: 'bg-orange-500', iconBg: 'bg-orange-50', btn: 'bg-gray-900 text-white shadow-lg active:scale-95' };
            case 'indigo': return { bg: 'bg-indigo-50', border: 'border-indigo-50', text: 'text-indigo-600', badgeBs: 'bg-indigo-100', accent: 'bg-indigo-500', iconBg: 'bg-indigo-50', btn: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' };
            default: return { bg: 'bg-pink-50', border: 'border-pink-50', text: 'text-pink-600', badgeBs: 'bg-pink-100', accent: 'bg-pink-500', iconBg: 'bg-pink-50', btn: 'bg-pink-100 text-pink-700 hover:bg-pink-200' };
        }
    };

    // Fallback if no real data (Mock for demonstration/dev based on screenshot)
    const displayGoals = (goals && goals.length > 0) ? goals : [
        { id: '1', title: 'Science Project', description: 'Multi-step task', type: 'checklist', current: 25, target: 100, stars: 500, icon: '🌋', dueDate: 'Nov 15', status: 'active', accountId: '', profileId: '', color: 'purple' },
        { id: '2', title: 'Piano Practice', description: "Master 'Fur Elise'", type: 'slider', current: 50, target: 100, stars: 300, icon: '🎹', dueDate: 'Dec 01', status: 'active', accountId: '', profileId: '', color: 'blue' },
        { id: '3', title: 'Read 10 Books', description: 'Summer Reading', type: 'counter', current: 3, target: 10, stars: 1000, icon: '📚', dueDate: 'Aug 20', status: 'active', accountId: '', profileId: '', color: 'green' },
        { id: '4', title: 'Lego Castle', description: 'Creative Build', type: 'checklist', current: 0, target: 1, stars: 250, icon: '🏰', dueDate: 'This Weekend', status: 'active', accountId: '', profileId: '', color: 'pink' },
        { id: '5', title: 'Math Time', description: 'Goal: 60 Mins', type: 'timer', current: 20, target: 60, stars: 100, icon: '⏱️', dueDate: 'Weekly', status: 'active', accountId: '', profileId: '', color: 'indigo' },
        { id: '6', title: 'Save for Bike', description: 'Goal: $50.00', type: 'savings', current: 15, target: 50, stars: 500, icon: '🐷', dueDate: 'Ongoing', status: 'active', accountId: '', profileId: '', color: 'yellow' },
        { id: '7', title: 'Clean Garage', description: 'One-time Big Job', type: 'binary', current: 0, target: 1, stars: 800, icon: '🧹', dueDate: 'Sunday', status: 'active', accountId: '', profileId: '', color: 'orange' },
    ];

    if (!activeProfile) return null;

    return (
        <main className="bg-[#EEF2FF] min-h-screen pb-32 select-none relative font-sans">

            {/* Header */}
            <div className="px-5 pt-6 pb-2 sticky top-0 bg-[#EEF2FF] z-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-extrabold text-gray-800">My Quests</h1>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                        <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs shadow-sm">⭐</div>
                        <span className="text-sm font-extrabold text-gray-700">{activeProfile.stars?.toLocaleString() || 0}</span>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="px-5 space-y-5">

                {displayGoals.map((goal: any) => {
                    const colors = getTwColors(goal.color || getStatusColor(goal));

                    return (
                        <div key={goal.id} className={`bg-white rounded-3xl p-5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] border-2 ${colors.border} relative group`}>

                            {/* Date Badge */}
                            {goal.dueDate && (
                                <div className={`absolute top-0 right-0 ${colors.badgeBs} ${colors.text} text-[10px] font-extrabold px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl`}>
                                    📅 Due: {goal.dueDate}
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-start gap-4 mb-3">
                                <div className={`w-14 h-14 ${colors.iconBg} rounded-2xl flex items-center justify-center text-3xl`}>
                                    {goal.icon}
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-lg font-extrabold text-gray-800 leading-tight">{goal.title}</h3>
                                    <p className="text-xs font-bold text-gray-400 mt-1">{goal.description}</p>
                                </div>
                            </div>

                            {/* Dynamic Content based on Type */}
                            <div className="mb-4">
                                {goal.type === 'checklist' && (
                                    <>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-xs font-bold text-gray-400">Progress</span>
                                            <span className={`text-xs font-bold ${colors.text}`}>{Math.round((goal.current / goal.target) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${colors.accent} rounded-full`} style={{ width: `${(goal.current / goal.target) * 100}%` }}></div>
                                        </div>
                                    </>
                                )}

                                {goal.type === 'slider' && (
                                    <>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-xs font-bold text-gray-400">Confidence</span>
                                            <span className={`text-xs font-bold ${colors.text}`}>{goal.current}%</span>
                                        </div>
                                        <input type="range" className={`w-full accent-${colors.accent.replace('bg-', '')}`} value={goal.current} readOnly />
                                    </>
                                )}

                                {goal.type === 'counter' && (
                                    <div className={`flex items-center justify-between ${colors.bg} rounded-xl p-2 mb-2`}>
                                        <button className={`w-8 h-8 bg-white rounded-lg shadow-sm ${colors.text} font-bold hover:scale-95 transition`}>-</button>
                                        <span className={`text-xl font-black ${colors.text}`}>{goal.current} <span className="text-xs text-gray-400 font-bold">/ {goal.target}</span></span>
                                        <button className={`w-8 h-8 ${colors.accent} rounded-lg shadow-sm text-white font-bold hover:opacity-90 active:scale-95 transition`}>+</button>
                                    </div>
                                )}

                                {goal.type === 'savings' && (
                                    <div className={`${colors.bg} rounded-xl p-2 flex justify-between items-center mb-2 border ${colors.border}`}>
                                        <span className="text-xs font-bold text-gray-500 ml-2">Saved:</span>
                                        <span className={`text-xl font-black ${colors.text} mr-2`}>${goal.current.toFixed(2)}</span>
                                    </div>
                                )}

                                {goal.type === 'timer' && (
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full w-[33%] ${colors.accent} rounded-full`}></div>
                                        </div>
                                        <span className={`text-xs font-bold ${colors.text}`}>{goal.current}m / {goal.target}m</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Actions */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                    <span className="text-sm">⭐</span>
                                    <span className="text-xs font-black text-yellow-600">{goal.stars} Stars</span>
                                </div>

                                {goal.type !== 'counter' && (
                                    <button className={`${colors.btn} font-bold py-2 px-4 rounded-xl text-xs transition-colors`}>
                                        {goal.type === 'checklist' ? 'View Steps' :
                                            goal.type === 'slider' ? 'Update' :
                                                goal.type === 'savings' ? 'Add $' :
                                                    goal.type === 'timer' ? '+ Log Time' :
                                                        'I Did It'}
                                    </button>
                                )}
                            </div>

                        </div>
                    );
                })}

            </div>
        </main>
    );
}
