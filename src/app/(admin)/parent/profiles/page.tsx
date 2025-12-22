"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Plus, Edit2, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProfilesPage() {
    const router = useRouter();
    const profiles = useLiveQuery(() => db.profiles.toArray());

    const handleEdit = (id: string) => {
        router.push(`/parent/profile/edit?id=${id}`);
    };

    const handleAddNew = () => {
        router.push('/parent/profile/add');
    };

    // Helper to get avatar icon
    const getAvatarIcon = (avatarId: string) => {
        switch (avatarId) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'rocket': return '🚀';
            default: return '👶';
        }
    };

    const getColorClass = (theme: string) => {
        switch (theme) {
            case 'cyan': return 'bg-cyan-100 text-cyan-600 border-cyan-200';
            case 'purple': return 'bg-violet-100 text-violet-600 border-violet-200';
            case 'green': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
            case 'orange': return 'bg-orange-100 text-orange-600 border-orange-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center justify-between border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-900">Profiles</h1>
                <Button size="sm" variant="cosmic" className="gap-2" onClick={handleAddNew}>
                    <Plus className="w-4 h-4" />
                    Add New
                </Button>
            </header>

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {/* Profiles List */}
                <div className="space-y-3">
                    {profiles?.map((profile) => (
                        <div
                            key={profile.id}
                            onClick={() => handleEdit(profile.id)}
                            className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between group hover:border-violet-300 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2",
                                    getColorClass(profile.colorTheme || 'cyan')
                                )}>
                                    {getAvatarIcon(profile.avatarId)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">{profile.name}</h3>
                                    <span className={cn(
                                        "text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                        profile.type === 'parent' ? "bg-slate-100 text-slate-500" : "bg-violet-100 text-violet-600"
                                    )}>
                                        {profile.type === 'parent' ? 'Administrator' : 'Child'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-300 group-hover:text-violet-400 transition-colors">
                                <span className="text-xs font-medium mr-2">Edit</span>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                    ))}

                    {profiles?.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            Loading profiles...
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 text-sm">
                    <div className="bg-blue-100 rounded-full p-1 h-fit">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-bold mb-1">Manage Family</p>
                        <p className="opacity-80 leading-relaxed">
                            Add profiles for each child to track their own habits and rewards.
                            You can switch between them from the Dashboard.
                        </p>
                    </div>
                </div>
            </main>

            <ParentNavBar />
        </div>
    );
}
