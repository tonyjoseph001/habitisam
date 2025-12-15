"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ParentNavBar } from '@/components/layout/ParentNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { db, Profile } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, Save } from 'lucide-react';

export default function AddChildProfilePage() {
    const router = useRouter();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [theme, setTheme] = useState<'cosmic' | 'enchanted'>('cosmic');

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) return;

        const newProfile: Profile = {
            id: uuidv4(),
            accountId: user.uid,
            name: name.trim(),
            type: 'child',
            theme: 'cosmic', // Default for now
            avatarId: 'child-1',
            stars: 0,
            xp: 0,
            dob: dob || undefined,
            createdAt: new Date()
        };

        await db.profiles.add(newProfile as any);
        router.push('/parent/dashboard');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Header */}
            <header className="px-4 py-4 bg-white shadow-sm sticky top-0 z-30 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-0 hover:bg-transparent">
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </Button>
                <h1 className="text-xl font-bold text-slate-900">Add Child Profile</h1>
            </header>

            <main className="p-6 flex flex-col gap-6 max-w-sm mx-auto">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">Child's Name</label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Maya"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">Date of Birth (Optional)</label>
                    <Input
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                    />
                    <p className="text-xs text-slate-400">Used for birthday surprises!</p>
                </div>

                {/* Theme Picker Placeholder - For Phase 4 */}

                <Button
                    variant="cosmic"
                    size="lg"
                    className="mt-4 gap-2"
                    onClick={handleSave}
                    disabled={!name.trim()}
                >
                    <Save className="w-4 h-4" /> Create Profile
                </Button>
            </main>

            <ParentNavBar />
        </div>
    );
}
