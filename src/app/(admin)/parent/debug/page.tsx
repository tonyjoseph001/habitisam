"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { ActivityService } from '@/lib/firestore/activities.service';
import { GoalService } from '@/lib/firestore/goals.service';

export default function DebugPage() {
    const { user } = useAuth();

    const handleSeed = async () => {
        if (!user?.uid) {
            toast.error("Not authenticated");
            return;
        }

        try {
            const accountId = user.uid;

            // Check if parent profile exists (optional, but good practice)
            const profiles = await ProfileService.getByAccountId(accountId);
            const parent = profiles.find(p => p.type === 'parent');
            if (!parent) {
                toast.error("No parent profile found. Please create one first.");
                return;
            }

            const childId = crypto.randomUUID();

            // 1. Create Child Profile
            await ProfileService.add({
                id: childId,
                accountId,
                name: "Test Kid",
                type: "child",
                avatarId: "robot",
                colorTheme: "green",
                theme: "ocean",
                createdAt: new Date(),
                stars: 150,
                xp: 320,
                activeStamp: 'dino',
                unlockedStamps: ['dino', 'rocket']
            });

            // 2. Create Routine (Recurring)
            await ActivityService.add({
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
                isActive: true,
                createdAt: new Date()
            });

            // 3. Create Task (One-time, Overdue/Today)
            const today = new Date();
            await ActivityService.add({
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
                isActive: true,
                createdAt: new Date()
            });

            // 4. Create Goal (Slider/Counter)
            await GoalService.add({
                id: crypto.randomUUID(),
                accountId,
                profileId: childId,
                title: "Read 10 Books",
                description: "Read science fiction books",
                type: "counter",
                target: 10,
                current: 4,
                unit: "Books",
                stars: 100,
                icon: "Book",
                status: "active",
                createdAt: new Date()
            });

            // 5. Create Goal (Pending Approval)
            await GoalService.add({
                id: crypto.randomUUID(),
                accountId,
                profileId: childId,
                title: "New Bike",
                type: "savings",
                target: 200,
                current: 0,
                unit: "Stars",
                stars: 0, // Cost
                icon: "Bicycle",
                status: "pending_approval",
                createdAt: new Date()
            });

            toast.success("Test Child 'Test Kid' created with routines & goals!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to seed data.");
        }
    };

    return (
        <div className="p-10 max-w-lg mx-auto flex flex-col gap-6">
            <h1 className="text-3xl font-bold">🛠️ Debug & Testing</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold mb-2">Seed Data</h2>
                <p className="text-sm text-slate-500 mb-4">Creates a "Test Kid" with sample routines, tasks, and goals in Cloud DB.</p>
                <Button onClick={handleSeed} className="w-full">
                    Combine DNA & Create 'Test Kid' 🧬
                </Button>
            </div>
        </div>
    );
}
