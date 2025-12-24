"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Plus, Edit2, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import { ParentHeader } from '@/components/layout/ParentHeader';

export default function ProfilesPage() {
    const router = useRouter();
    const profiles = useLiveQuery(() => db.profiles.toArray());

    const handleEdit = (id: string) => {
        router.push(`/parent/profile/edit?id=${id}`);
    };

    const handleAddNew = () => {
        router.push('/parent/profile/add');
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this profile?")) {
            await db.profiles.delete(id);
        }
    };

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
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* Header */}
            <ParentHeader title="Profiles" />

            <main className="p-4 flex flex-col gap-4 max-w-screen-md mx-auto">
                {/* Profiles List */}
                <div className="space-y-3">
                    {profiles?.map((profile) => (
                        <div
                            key={profile.id}
                            className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl border",
                                    getColorClass(profile.colorTheme || 'cyan')
                                )}>
                                    {getAvatarIcon(profile.avatarId)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{profile.name}</h3>
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide inline-block mt-0.5",
                                        profile.type === 'parent' ? "bg-slate-100 text-slate-500" : "bg-violet-100 text-violet-600"
                                    )}>
                                        {profile.type === 'parent' ? 'Administrator' : 'Child'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(profile.id)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(profile.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}

                    {profiles?.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            Loading profiles...
                        </div>
                    )}
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 text-xs">
                    <div className="bg-blue-100 rounded-full p-1 h-fit">
                        <User className="w-3 h-3" />
                    </div>
                    <div>
                        <p className="font-bold mb-1">Manage Family</p>
                        <p className="opacity-80 leading-relaxed">
                            Add profiles for each child to track their own habits.
                        </p>
                    </div>
                </div>
            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 left-0 w-full px-6 flex justify-center z-40 pointer-events-none">
                <button
                    onClick={handleAddNew}
                    className="pointer-events-auto bg-slate-900 text-white pl-5 pr-6 py-4 rounded-full font-bold text-sm shadow-xl shadow-slate-300 flex items-center gap-2 hover:scale-105 active:scale-95 transition"
                >
                    <Plus className="w-5 h-5" />
                    Add Profile
                </button>
            </div>

            <ParentNavBar />
        </div>
    );
}
