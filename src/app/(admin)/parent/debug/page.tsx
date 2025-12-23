"use client";

import React from 'react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DebugPage() {
    const handleSeed = async () => {
        try {
            // 1. Get Account ID (from first parent)
            const parent = await db.profiles.where('type').equals('parent').first();
            if (!parent) {
                toast.error("No parent profile found. Please create a parent first.");
                return;
            }
            const accountId = parent.accountId;
            const childId = crypto.randomUUID();

            // 2. Create Child Profile
            await db.profiles.add({
                id: childId,
                accountId,
                name: "Test Kid",
                type: "child",
                avatarId: "robot",
                colorTheme: "green",
                theme: "cosmic",
                createdAt: new Date(),
                stars: 150,
                xp: 320,
                activeStamp: 'dino',
                unlockedStamps: ['dino', 'rocket']
            });

            // 3. Create Routine (Recurring)
            await db.activities.add({
                id: crypto.randomUUID(),
                accountId,
                profileIds: [childId],
                title: "Morning Startup",
                type: "recurring",
                days: [0, 1, 2, 3, 4, 5, 6], // Daily
                timeOfDay: "07:30",
                icon: "Sun",
                steps: [
                    { id: crypto.randomUUID(), title: "Make Bed", duration: 5, stars: 10, icon: "Bed" },
                    { id: crypto.randomUUID(), title: "Brush Teeth", duration: 3, stars: 5, icon: "Brush" },
                    { id: crypto.randomUUID(), title: "Get Dressed", duration: 10, stars: 10, icon: "Sun" }
                ],
                isActive: true, // Fix Lint
                createdAt: new Date()
            });

            // 4. Create Task (One-time, Overdue/Today)
            const today = new Date();
            await db.activities.add({
                id: crypto.randomUUID(),
                accountId,
                profileIds: [childId],
                title: "Finish Science Project",
                type: "one-time",
                date: today.toISOString(),
                timeOfDay: "16:00",
                icon: "Rocket",
                steps: [
                    { id: crypto.randomUUID(), title: "Glue planets", duration: 20, stars: 20, icon: "Rocket" },
                    { id: crypto.randomUUID(), title: "Write labels", duration: 15, stars: 15, icon: "Book" }
                ],
                isActive: true, // Fix Lint
                createdAt: new Date()
            });

            // 5. Create Goal (Slider)
            await db.goals.add({
                id: crypto.randomUUID(),
                accountId,
                profileId: childId,
                title: "Read 10 Books",
                description: "Read science fiction books",
                type: "slider",
                target: 10,
                current: 4,
                unit: "Books",
                stars: 100,
                icon: "Book",
                status: "active",
                createdAt: new Date()
            });

            // 6. Create Goal (Pending Approval)
            await db.goals.add({
                id: crypto.randomUUID(),
                accountId,
                profileId: childId,
                title: "New Bike",
                type: "savings",
                target: 200,
                current: 0,
                unit: "Stars",
                stars: 0, // Cost
                icon: "Bicycle", // Assuming fallback
                status: "pending_approval",
                createdAt: new Date()
            });

            toast.success("Test Child 'Test Kid' created with routines & goals!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to seed data.");
        }
    };

    const handleClear = async () => {
        if (confirm("Are you sure? This deletes ALL data.")) {
            await db.delete();
            await db.open();
            toast.success("Database cleared.");
            window.location.reload();
        }
    };

    return (
        <div className="p-10 max-w-lg mx-auto flex flex-col gap-6">
            <h1 className="text-3xl font-bold">🛠️ Debug & Testing</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold mb-2">Seed Data</h2>
                <p className="text-sm text-slate-500 mb-4">Creates a "Test Kid" with sample routines, tasks, and goals.</p>
                <Button onClick={handleSeed} className="w-full">
                    Combine DNA & Create 'Test Kid' 🧬
                </Button>
            </div>

            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h2 className="font-bold text-red-700 mb-2">Danger Zone</h2>
                <Button onClick={handleClear} variant="destructive" className="w-full">
                    Reset Database 💥
                </Button>
            </div>
        </div>
    );
}
