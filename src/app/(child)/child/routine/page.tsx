"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { db, Activity } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, ChevronRight, Play, Pause, RefreshCw, SkipForward, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/sound';

// Initialize directly if possible to avoid flash
const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addListener(listener);
        // Ensure state is synced if it changed between init and effect
        if (media.matches !== matches) setMatches(media.matches);

        return () => media.removeListener(listener);
    }, [matches, query]);
    return matches;
}


function RoutinePlayerContent() {
    // --- Layout Logic (Top Level Hook) ---
    const isTabletOrDesktop = useMediaQuery('(min-width: 768px)');
    const cardWidth = isTabletOrDesktop ? '500px' : '85vw';
    // Remove inner calc(), use parens for safety in outer calc
    const stride = isTabletOrDesktop ? '516px' : '(85vw + 16px)';
    // Offsets: Tablet=(50vw-250px), Mobile=7.5vw
    const centerOffset = isTabletOrDesktop ? '(50vw - 250px)' : '7.5vw';

    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [routine, setRoutine] = useState<Activity | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Audio State
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Fetch Routine
    useEffect(() => {
        if (id) {
            db.activities.get(id).then(data => {
                if (data) {
                    setRoutine(data);
                    // Initialize timer for first step
                    if (data.steps && data.steps.length > 0) {
                        const duration = (data.steps[0].duration || 2) * 60;
                        setTotalTime(duration);
                        setTimeLeft(duration);
                    }
                }
            });
        }
    }, [id]);

    // Update Timer when Step Changes
    useEffect(() => {
        if (routine && routine.steps[currentStepIndex]) {
            const step = routine.steps[currentStepIndex];
            const duration = (step.duration || 2) * 60; // Default 2 mins
            setTotalTime(duration);
            setTimeLeft(duration);
            setIsRunning(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            // Cancel any playing audio
            if (synthRef.current) synthRef.current.cancel();
            setIsAudioPlaying(false);
        }
    }, [currentStepIndex, routine]);

    // Timer Interval Logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                        setIsRunning(false);
                        playSound('complete'); // Optional tick or chime
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isRunning, timeLeft]);

    // Audio Logic
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
    }, []);

    const toggleAudio = () => {
        if (!synthRef.current || !routine) return;
        const step = routine.steps[currentStepIndex];
        const textToRead = step.description || step.title || "No instructions provided.";

        if (isAudioPlaying) {
            synthRef.current.cancel();
            setIsAudioPlaying(false);
        } else {
            utteranceRef.current = new SpeechSynthesisUtterance(textToRead);
            utteranceRef.current.onend = () => setIsAudioPlaying(false);
            synthRef.current.speak(utteranceRef.current);
            setIsAudioPlaying(true);
        }
    };

    // Timer Controls
    const toggleTimer = () => setIsRunning(!isRunning);
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(totalTime);
    };

    // Progress Ring Calculation
    const radius = 56;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - ((timeLeft / totalTime) * circumference);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleStepComplete = () => {
        if (!routine) return;

        // Stop audio/timer
        if (synthRef.current) synthRef.current.cancel();
        setIsAudioPlaying(false);
        setIsRunning(false);

        if (currentStepIndex < routine.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            playSound('select');
        } else {
            finishRoutine();
        }
    };

    const handleSkip = () => {
        if (confirm("Skip this task?")) {
            handleStepComplete();
        }
    };

    const finishRoutine = async () => {
        if (!routine || !activeProfile) return;

        setIsComplete(true);
        playSound('complete');
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        });

        // 1. Log Completion
        await db.activityLogs.add({
            id: crypto.randomUUID(),
            accountId: routine.accountId,
            profileId: activeProfile.id,
            activityId: routine.id,
            date: new Date().toISOString().split('T')[0],
            status: 'completed',
            completedAt: new Date(),
            starsEarned: routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0),
            earnedXP: 50
        });

        // 2. Award Stars/XP to Profile
        const totalStars = routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0);
        await db.profiles.update(activeProfile.id, {
            stars: (activeProfile.stars || 0) + totalStars,
            xp: (activeProfile.xp || 0) + 50
        });

        setTimeout(() => {
            router.push('/child/dashboard');
        }, 3000);
    };

    // --- RENDER ---

    if (!routine || !activeProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#EEF2FF]">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold animate-pulse">Loading Mission...</p>
            </div>
        );
    }

    if (isComplete) {
        // ... (existing completion code) ...
    }

    const step = routine.steps[currentStepIndex];
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeProfile.name}&clothing=graphicShirt`;

    return (
        <main className="bg-[#EEF2FF] min-h-screen flex flex-col pt-8 pb-8 select-none relative overflow-hidden font-sans">
            {/* Header */}
            <div className="px-6 mb-4 text-center z-10">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 mb-4">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 overflow-hidden">
                        <img src={avatarSrc} className="w-full h-full object-cover" alt="Avatar" />
                    </div>
                    <span className="text-sm font-bold text-gray-600 truncate max-w-[200px]">{routine.title} • Step {currentStepIndex + 1}</span>
                </div>

                <div className="flex justify-center mb-6 relative">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="#F1F5F9" strokeWidth="12" fill="none" />
                            <circle
                                cx="64" cy="64" r="56"
                                stroke="#10B981" strokeWidth="12" fill="none"
                                strokeLinecap="round"
                                strokeDasharray={351.86} // 2 * PI * 56
                                strokeDashoffset={351.86 - ((currentStepIndex / routine.steps.length) * 351.86)}
                                className="transition-all duration-500 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-gray-800">
                                {Math.round((currentStepIndex / routine.steps.length) * 100)}%
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                {currentStepIndex} / {routine.steps.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Carousel */}
            <div className="routine-carousel flex-1 w-full overflow-hidden flex flex-col justify-center z-10">
                <motion.div
                    className="flex gap-4 px-4"
                    initial={false}
                    animate={{ x: `calc(${centerOffset} - ${currentStepIndex} * ${stride})` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ width: "fit-content" }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(e, { offset, velocity }) => {
                        const swipe = offset.x; // negative is left (next)
                        if (swipe < -50 && currentStepIndex < routine.steps.length - 1) {
                            handleStepComplete(); // Use existing logic or just custom setIndex
                            // Note: handleStepComplete actually marks it done. For pure nav, strict sliding might just setIndex.
                            // But user said "slide horizontal" - usually implies navigation.
                            // Let's stick to setIndex logic here to differentiate from "Completion".

                            // Actually, let's just navigate for now to let them peek.
                            setCurrentStepIndex(currentStepIndex + 1);
                            playSound('select');
                        }
                        if (swipe > 50 && currentStepIndex > 0) {
                            setCurrentStepIndex(currentStepIndex - 1);
                            playSound('select');
                        }
                    }}
                >
                    {routine.steps.map((stepItem, index) => {
                        const isActive = index === currentStepIndex;
                        const isPast = index < currentStepIndex;

                        return (
                            <motion.div
                                key={stepItem.id || index}
                                className={`flex-shrink-0 bg-white rounded-[2.5rem] p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] relative transition-all duration-300 ${isActive ? 'scale-100 opacity-100 ring-4 ring-transparent' : 'scale-90 opacity-50 blur-[1px] grayscale'}`}
                                style={{ width: cardWidth }}
                                onClick={() => {
                                    if (!isActive) setCurrentStepIndex(index);
                                }}
                            >
                                <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-2">{stepItem.title}</h2>

                                <div className="flex flex-col items-center mb-6">
                                    <p className="text-gray-500 text-xs font-bold text-center px-4 leading-relaxed mb-3 min-h-[3rem] flex items-center justify-center">
                                        {stepItem.description || "You can do it! Follow the steps."}
                                    </p>

                                    {/* Audio Button - Only Active */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isActive) toggleAudio();
                                        }}
                                        className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-xs font-bold transition-all border group active:scale-95 ${isActive && isAudioPlaying
                                            ? 'bg-blue-100 text-blue-600 border-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                                            : 'bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-100'
                                            } ${!isActive && 'opacity-0 pointer-events-none'}`}
                                    >
                                        {!isAudioPlaying ? (
                                            <Volume2 className="w-4 h-4" />
                                        ) : (
                                            <div className="flex items-center gap-0.5 h-4">
                                                <div className="w-[3px] bg-blue-500 rounded-full animate-wave h-2.5 [animation-delay:0.1s]"></div>
                                                <div className="w-[3px] bg-blue-500 rounded-full animate-wave h-4 [animation-delay:0.2s]"></div>
                                                <div className="w-[3px] bg-blue-500 rounded-full animate-wave h-3 [animation-delay:0.3s]"></div>
                                            </div>
                                        )}
                                        <span>{isAudioPlaying ? "Stop" : "Read"}</span>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between mb-8 px-2 relative min-h-[140px]">
                                    {/* Static Icon */}
                                    <div className="w-28 h-28 relative flex items-center justify-center">
                                        <div className="text-6xl filter drop-shadow-md transform -rotate-12">
                                            {/* We can use RenderIcon here if available, or just emoji fallback */}
                                            {stepItem.icon?.length < 3 ? stepItem.icon : (stepItem.icon === 'toothbrush' ? '🦷' : '✨')}
                                        </div>
                                    </div>

                                    {/* Timer Ring - Only Active */}
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        {isActive ? (
                                            <>
                                                {stepItem.stars > 0 && (
                                                    <div className="absolute -top-6 -right-6 bg-white border border-gray-100 px-2 py-1 rounded-xl shadow-sm text-xs font-black text-gray-600 flex items-center gap-1 z-30 animate-bounce-slow whitespace-nowrap">
                                                        +{stepItem.stars} <span className="text-yellow-400 text-sm">⭐</span>
                                                    </div>
                                                )}
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="64" cy="64" r={radius} stroke="#F1F5F9" strokeWidth="8" fill="none"></circle>
                                                    <circle
                                                        cx="64" cy="64" r={radius}
                                                        stroke="#3B82F6" strokeWidth="8" fill="none"
                                                        strokeLinecap="round"
                                                        strokeDasharray={circumference}
                                                        strokeDashoffset={strokeDashoffset}
                                                        className="transition-all duration-1000 ease-linear"
                                                    ></circle>
                                                </svg>
                                                <div className="absolute text-center z-10">
                                                    <span className="text-3xl font-black text-gray-700 tracking-tight tabular-nums">
                                                        {formatTime(timeLeft)}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            /* Inactive State - just static time */
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <span className="text-2xl font-bold text-gray-400">
                                                    {(stepItem.duration || 2)}:00
                                                </span>
                                                <span className="text-xs font-bold text-gray-300 uppercase">Min</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Controls - Only Active */}
                                <div className={`flex justify-between items-center gap-3 mt-4 w-full transition-opacity duration-300 ${!isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <button onClick={(e) => { e.stopPropagation(); resetTimer(); }} className="w-14 h-14 flex-shrink-0 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center hover:bg-orange-200 transition-colors shadow-sm active:scale-95">
                                        <RefreshCw className="w-6 h-6" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                                        className={`flex-1 h-16 rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-white ${isRunning
                                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_4px_0_0_#e68a00]'
                                            : 'bg-gradient-to-r from-[#10B981] to-[#059669] shadow-[0_4px_0_0_#059669]'
                                            }`}
                                    >
                                        <span className="font-bold text-lg">{isRunning ? "Pause" : "Start"}</span>
                                        {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} className="w-14 h-14 flex-shrink-0 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm active:scale-95">
                                        <SkipForward className="w-6 h-6" />
                                    </button>
                                </div>

                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Footer Button */}
            <div className="px-6 w-full max-w-md mx-auto z-10">
                <button
                    onClick={handleStepComplete}
                    className="w-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-lg font-bold py-4 rounded-3xl shadow-[0_4px_0_0_#059669] transform active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                    <span>I Did It! Next</span>
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </main>
    );
}

// Export as Client-Only Component to ensure window access for sizing
import dynamic from 'next/dynamic';

const RoutinePlayerContentNoSSR = dynamic(() => Promise.resolve(RoutinePlayerContent), {
    ssr: false,
    loading: () => <div className="text-gray-400 text-center pt-20 font-bold">Loading...</div>
});

export default function RoutinePlayerPage() {
    return (
        <Suspense fallback={<div className="text-gray-400 text-center pt-20 font-bold">Loading...</div>}>
            <RoutinePlayerContentNoSSR />
        </Suspense>
    );
}
