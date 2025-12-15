"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { db, Activity, Step } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

function RoutinePlayerContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [routine, setRoutine] = useState<Activity | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (id) {
            db.activities.get(id).then(data => setRoutine(data || null));
        }
    }, [id]);

    const handleStepComplete = () => {
        if (!routine) return;
        const step = routine.steps[currentStepIndex];

        // Play sound? (Phase 4)

        setCompletedSteps(prev => [...prev, step.id]);

        if (currentStepIndex < routine.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            finishRoutine();
        }
    };

    const finishRoutine = async () => {
        if (!routine || !activeProfile) return;

        setIsComplete(true);
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        // 1. Log Completion
        await db.activityLogs.add({
            id: crypto.randomUUID(),
            accountId: routine.accountId,
            profileId: activeProfile.id,
            activityId: routine.id,
            date: new Date().toISOString().split('T')[0], // Today YYYY-MM-DD
            status: 'completed',
            completedAt: new Date(),
            earnedStars: routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0),
            earnedXP: 50 // Flat XP per routine for now
        });

        // 2. Award Stars/XP to Profile
        const totalStars = routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0);
        await db.profiles.update(activeProfile.id, {
            stars: (activeProfile.stars || 0) + totalStars,
            xp: (activeProfile.xp || 0) + 50
        });

        // Refresh session is needed ideally, but ignoring for now.

        setTimeout(() => {
            router.push('/child/dashboard');
        }, 3000);
    };

    if (!routine) return <div className="text-white text-center pt-20">Loading Mission...</div>;

    if (isComplete) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center text-6xl shadow-xl shadow-yellow-500/50"
                >
                    🏆
                </motion.div>
                <h1 className="text-4xl font-fredoka text-white drop-shadow-lg">Mission Complete!</h1>
                <p className="text-xl text-yellow-200 font-bold">You earned stars!</p>
            </div>
        );
    }

    const step = routine.steps[currentStepIndex];

    return (
        <main className="flex-1 flex flex-col h-[calc(100vh-80px)]">
            {/* Progress Bar */}
            <div className="px-6 py-2">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-amber-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStepIndex) / routine.steps.length) * 100}%` }}
                    />
                </div>
                <p className="text-center text-white/50 text-xs mt-2 font-bold uppercase tracking-widest">
                    Step {currentStepIndex + 1} of {routine.steps.length}
                </p>
            </div>

            {/* Step Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={step.id}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center gap-6 border-b-8 border-slate-200"
                    >
                        <div className="w-24 h-24 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center text-5xl shadow-inner">
                            {/* Dynamic Icon Phase 4 */}
                            ⭐
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 font-fredoka">{step.title}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2 text-amber-500 font-bold bg-amber-50 px-3 py-1 rounded-full mx-auto w-fit">
                                <span>+{step.stars}</span>
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                        </div>

                        {/* Timer Logic could go here. For now, just 'Done' */}
                        {step.duration > 0 && (
                            <div className="text-slate-400 font-medium text-sm">
                                Target: {step.duration} mins
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Action Button */}
            <div className="p-6">
                <Button
                    onClick={handleStepComplete}
                    className="w-full h-16 text-xl rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-lg border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all"
                >
                    {currentStepIndex === routine.steps.length - 1 ? 'Finish Mission! 🚀' : 'I Did It! Next →'}
                </Button>
            </div>
        </main>
    );
}

export default function RoutinePlayerPage() {
    return (
        <Suspense fallback={<div className="text-white text-center pt-20">Loading...</div>}>
            <RoutinePlayerContent />
        </Suspense>
    );
}
