"use client";

import React, { useMemo } from 'react';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Check, Clock, Calendar, Filter, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActivityLogs } from '@/lib/hooks/useActivityLogs';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useRoutines } from '@/lib/hooks/useRoutines';

export default function HistoryPage() {
    const { activeProfile } = useSessionStore();
    const { logs } = useActivityLogs();
    const { profiles } = useProfiles();
    const { routines } = useRoutines();

    // Fetch logs joined with activity and profile data
    const history = useMemo(() => {
        if (!logs) return [];

        return logs
            .slice()
            .sort((a, b) => {
                const dateA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
                const dateB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
                return dateB - dateA; // Descending
            })
            .map((log) => {
                const profile = profiles.find(p => p.id === log.profileId);
                const routine = routines?.find(r => r.id === log.activityId);

                return {
                    ...log,
                    activityTitle: routine?.title || log.metadata?.title || 'Unknown Mission',
                    profileName: profile?.name
                };
            });
    }, [logs, profiles, routines]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">History</h1>
                <Button variant="ghost" size="sm" className="text-slate-500">
                    <Filter className="w-4 h-4" />
                </Button>
            </header>

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {history?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-slate-700">No History Yet</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            Completed missions from your children will appear here.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {history?.map((log) => (
                        <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${log.status === 'completed' ? 'bg-green-100' : 'bg-slate-100'}`}>
                                    {log.status === 'completed' ? '🏆' : '⏳'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{log.activityTitle}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                            {log.profileName}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {log.date}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                {log.status === 'completed' ? (
                                    <span className="flex items-center gap-1 text-green-600 font-bold text-xs uppercase">
                                        <Check className="w-3 h-3" /> Done
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-slate-400 font-bold text-xs uppercase">
                                        <XCircle className="w-3 h-3" /> {log.status}
                                    </span>
                                )}
                                {/* Ensure completedAt is a Date object before calling toLocaleTimeString */}
                                {log.completedAt && (
                                    <span className="text-[10px] text-slate-400 mt-1">
                                        {new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
