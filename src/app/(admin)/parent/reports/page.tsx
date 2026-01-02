"use client";

import React, { useState, useMemo } from 'react';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { ParentHeader } from '@/components/layout/ParentHeader';
import { TrendingUp, Star, AlertTriangle, Clock, Trophy, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';

import { useRouter } from 'next/navigation'; // Added
import { useAuth } from '@/lib/hooks/useAuth'; // Added
import { getLimits } from '@/config/tiers'; // Added
import { db } from '@/lib/db'; // Added
import { APP_CONFIG } from '@/config/app';
import { SystemService } from '@/lib/firestore/system.service'; // Added

// ... imports

export default function ReportsPage() {
    const router = useRouter(); // Added router
    const { user } = useAuth(); // Added user
    const { activeProfile } = useSessionStore();

    // License Check
    const [isLoadingLicense, setIsLoadingLicense] = useState(true);

    React.useEffect(() => {
        const checkAccess = async () => {
            // 1. Fetch System Config (Remote or Cache)
            const sysConfig = await SystemService.getConfig();
            const enableProCheck = sysConfig?.featureFlags?.enableProExclusivity ?? APP_CONFIG.defaultFeatureFlags.enableProExclusivity;

            // 2. Check Feature Flag
            if (!enableProCheck) {
                setIsLoadingLicense(false);
                return;
            }

            if (!user) {
                // User not loaded yet, keep loading
                return;
            }

            // 3. Fetch Account License Status
            const account = await db.accounts.get(user.uid);
            // Default to 'free' if missing or not set
            const license = account?.licenseType || 'free';

            const limits = getLimits(license);

            if (!limits.canAccessAnalytics) {
                // Redirect to Subscription Page
                router.replace('/parent/subscription');
            } else {
                setIsLoadingLicense(false);
            }
        };
        checkAccess();
    }, [user, router]); // Added deps

    const [timeRange, setTimeRange] = useState<'Week' | 'Month'>('Week');
    const [selectedChildId, setSelectedChildId] = useState<string>('all');

    const { profiles } = useProfiles();
    const children = profiles.filter(p => p.type === 'child');

    const { logs: allLogs } = useActivityLogs();

    const logs = useMemo(() => {
        if (!allLogs) return [];
        let filtered = allLogs;

        // Filter by child
        if (selectedChildId !== 'all') {
            filtered = filtered.filter(log => log.profileId === selectedChildId);
        }

        // Date Filtering
        const today = new Date();
        const pastDate = new Date();
        if (timeRange === 'Week') {
            pastDate.setDate(today.getDate() - 7);
        } else {
            pastDate.setMonth(today.getMonth() - 6); // Last 6 Months
        }
        const pastDateStr = pastDate.toISOString().split('T')[0];

        return filtered.filter(log => log.date >= pastDateStr);
    }, [allLogs, selectedChildId, timeRange]);

    // --- Stats Calculation ---
    const totalStars = logs?.reduce((acc, log) => acc + (log.starsEarned || 0), 0) || 0;
    const earnedValue = totalStars / 100; // Mock conversion rate: 100 stars = $1

    const completedCount = logs?.filter(l => l.status === 'completed').length || 0;
    const missedCount = logs?.filter(l => l.status === 'missed').length || 0;
    const totalAttempts = completedCount + missedCount;
    const consistency = totalAttempts > 0 ? Math.round((completedCount / totalAttempts) * 100) : 0;

    // --- Chart Data & Logic ---
    const COLORS = ['#EA580C', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
    const today = new Date();

    // 1. Identify which profiles to plot
    const targetProfiles = selectedChildId === 'all'
        ? (children || [])
        : (children?.filter(c => c.id === selectedChildId) || []);

    // 2. Generate data points for each profile
    const datasets = targetProfiles.map((profile, index) => {
        let points = [];

        if (timeRange === 'Week') {
            points = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const dateStr = d.toISOString().split('T')[0];
                const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });

                const count = logs?.filter(l => l.profileId === profile.id && l.date === dateStr && l.status === 'completed').length || 0;
                return { label: dayLabel, count, isHighlight: i === 6 };
            });
        } else {
            // Last 6 Months Aggregation
            points = Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setMonth(today.getMonth() - (5 - i));
                const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
                const monthNum = d.getMonth();
                const yearNum = d.getFullYear();

                // Filter logs that match this specific month and year
                const count = logs?.filter(l => {
                    // Safer manual check:
                    const [lYear, lMonth] = l.date.split('-').map(Number);
                    return l.profileId === profile.id &&
                        l.status === 'completed' &&
                        lMonth === (monthNum + 1) &&
                        lYear === yearNum;
                }).length || 0;

                return { label: monthLabel, count, isHighlight: i === 5 };
            });
        }

        return {
            id: profile.id,
            name: profile.name,
            color: COLORS[index % COLORS.length],
            points
        };
    });

    // 3. Normalize Data (Shared Scale)
    const allCounts = datasets.flatMap(d => d.points.map(p => p.count));
    const maxCount = Math.max(...allCounts, 5); // Minimum scale of 5

    const normalizedDatasets = datasets.map(dataset => ({
        ...dataset,
        points: dataset.points.map(p => ({
            ...p,
            percentage: (p.count / maxCount) * 100
        }))
    }));

    // X-Axis Labels (Shared)
    const xAxisLabels = normalizedDatasets[0]?.points.map(p => p.label) || [];

    const avgTasks = Math.round(completedCount / (timeRange === 'Week' ? 7 : 30));
    // Note: avgTasks is for the currently filtered view (so if 'all', it's total of all children). 
    // Since 'completedCount' comes from 'logs' which is already filtered by 'selectedChildId' (or not if 'all'), this remains correct.

    // --- Needs Attention ---
    const missedLogs = logs?.filter(l => l.status === 'missed').slice(0, 3) || [];

    if (isLoadingLicense) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
            {/* Header */}
            <ParentHeader title="Reports" />

            <div className="sticky top-[60px] z-40 bg-slate-50/95 backdrop-blur-sm px-6 py-4 border-b border-slate-200 shadow-sm mb-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{timeRange === 'Week' ? 'Weekly' : 'Monthly'} View</span>
                    <div className="bg-white p-1 rounded-xl flex text-xs font-bold border border-slate-200">
                        <button onClick={() => setTimeRange('Week')} className={cn("px-3 py-1.5 rounded-lg transition", timeRange === 'Week' ? "bg-slate-100 text-slate-900 shadow-inner" : "text-slate-400 hover:text-slate-600")}>Week</button>
                        <button onClick={() => setTimeRange('Month')} className={cn("px-3 py-1.5 rounded-lg transition", timeRange === 'Month' ? "bg-slate-100 text-slate-900 shadow-inner" : "text-slate-400 hover:text-slate-600")}>Month</button>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    <button onClick={() => setSelectedChildId('all')} className={cn("flex flex-col items-center gap-1 min-w-[3rem] transition flex-shrink-0", selectedChildId === 'all' ? "opacity-100" : "opacity-40 hover:opacity-100")}><span className={cn("text-sm font-bold pb-1", selectedChildId === 'all' ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-600")}>All</span></button>
                    {children?.map((child) => (
                        <button key={child.id} onClick={() => setSelectedChildId(child.id)} className={cn("flex flex-col items-center gap-1 min-w-[3rem] transition flex-shrink-0", selectedChildId === child.id ? "opacity-100" : "opacity-40 hover:opacity-100")}><span className={cn("text-sm font-bold pb-1", selectedChildId === child.id ? "text-slate-900 border-b-2 border-slate-900" : "text-slate-600")}>{child.name}</span></button>
                    ))}
                </div>
            </div>

            <main className="max-w-md mx-auto p-6 space-y-8">
                {/* Stats Sections */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
                            <span className="text-xs font-bold text-slate-400 uppercase">Consistency</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">{consistency}%</div>
                        <div className="text-[10px] font-bold text-green-600 bg-green-50 inline-block px-1.5 py-0.5 rounded mt-1">Calculated from logs</div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center"><Star className="w-5 h-5 fill-current" /></div>
                            <span className="text-xs font-bold text-slate-400 uppercase">Earned</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">{totalStars}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">~ ${earnedValue.toFixed(2)} value</div>
                    </div>
                </section>

                <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tasks Completed</h2>
                        {/* Legend for Multi-Child View */}
                        {datasets.length > 1 && (
                            <div className="flex gap-2">
                                {datasets.map(d => (
                                    <div key={d.id} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                        <span className="text-[10px] font-bold text-slate-400">{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {datasets.length === 1 && <span className="text-xs font-bold text-slate-400">Avg: {avgTasks}/day</span>}
                    </div>

                    {/* Chart Area */}
                    <div className="flex gap-2 h-40 mt-4">
                        {/* Y-Axis */}
                        <div className="flex flex-col justify-between text-[10px] font-bold text-slate-300 py-1 h-full">
                            <span>{maxCount}</span>
                            <span>{Math.round(maxCount / 2)}</span>
                            <span>0</span>
                        </div>

                        {/* Chart Render */}
                        <div className="flex-1 relative h-full w-full">
                            <svg className="w-full h-full overflow-visible relative z-10" preserveAspectRatio="none" viewBox={`0 0 ${xAxisLabels.length * 10} 100`}>
                                {normalizedDatasets.map((dataset) => (
                                    <g key={dataset.id}>
                                        {(() => {
                                            const points = dataset.points.map((d, i) => [i * 10 + 5, 100 - d.percentage]);

                                            const line = (pointA: number[], pointB: number[]) => {
                                                const lengthX = pointB[0] - pointA[0];
                                                const lengthY = pointB[1] - pointA[1];
                                                return { length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)), angle: Math.atan2(lengthY, lengthX) }
                                            }
                                            const controlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
                                                const p = previous || current;
                                                const n = next || current;
                                                const smoothing = 0.2;
                                                const o = line(p, n);
                                                const angle = o.angle + (reverse ? Math.PI : 0);
                                                const length = o.length * smoothing;
                                                const x = current[0] + Math.cos(angle) * length;
                                                const y = current[1] + Math.sin(angle) * length;
                                                return [x, y];
                                            }
                                            const bezierCommand = (point: number[], i: number, a: number[][]) => {
                                                const cps = controlPoint(a[i - 1], a[i - 2], point);
                                                const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
                                                return `C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`;
                                            }
                                            if (points.length === 0) return null;
                                            const d = points.reduce((acc, point, i, a) => i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${bezierCommand(point, i, a)}`, "");

                                            return (
                                                <>
                                                    {/* No area fill for multi-line to avoid clutter */}
                                                    <motion.path
                                                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}
                                                        d={d} fill="none" stroke={dataset.color} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"
                                                    />
                                                </>
                                            );
                                        })()}

                                        {/* Dots */}
                                        {dataset.points.map((d, i) => (
                                            <motion.circle
                                                key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + (i * 0.1) }}
                                                cx={i * 10 + 5} cy={100 - d.percentage} r="0.5" fill="white" stroke={dataset.color} strokeWidth="0.5"
                                            />
                                        ))}
                                    </g>
                                ))}
                            </svg>

                            {/* X-Axis Labels */}
                            <div className="flex justify-between mt-2 px-1 relative z-10 w-full absolute -bottom-6">
                                {xAxisLabels.map((label, i) => (
                                    <div key={i} className="flex flex-col items-center w-6">
                                        <span className="text-[10px] font-bold text-slate-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Needs Attention</h2>
                    <div className="space-y-3">
                        {missedLogs.length === 0 ? (
                            <div className="text-center py-4 bg-white rounded-2xl border border-slate-100 text-sm text-slate-400 font-bold border-dashed">
                                No missed tasks! Great job! 🎉
                            </div>
                        ) : (
                            missedLogs.map(log => (
                                <div key={log.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">Missed Task</h3>
                                            <p className="text-[10px] font-bold text-slate-400">{log.date}</p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
                                        Details
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Highlights</h2>

                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
                        <Trophy className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10 rotate-12" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/10">
                                    🦁
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Ethan's on Fire!</h3>
                                    <p className="text-xs font-medium text-indigo-100">Most active child this week</p>
                                </div>
                            </div>

                            <div className="h-1 w-full bg-black/20 rounded-full mb-1">
                                <div className="h-full bg-white rounded-full w-3/4"></div>
                            </div>
                            <p className="text-[10px] font-bold text-indigo-200 text-right">Keep it up!</p>
                        </div>
                    </div>
                </section>

            </main>

            <ParentNavBar />
        </div>
    );
}
