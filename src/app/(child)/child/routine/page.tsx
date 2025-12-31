
"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Activity } from '@/lib/db'; // Keep Type Import only
import { ActivityService } from '@/lib/firestore/activities.service';
import { LogService } from '@/lib/firestore/logs.service';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, ChevronRight, Play, Pause, RefreshCw, SkipForward, SkipBack, Volume2, ArrowLeft, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
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

    // Animation State
    const [earnedStars, setEarnedStars] = useState(0);
    const starTargetRef = useRef<HTMLDivElement>(null);
    const activeStepStarRef = useRef<HTMLDivElement>(null);
    const [flyingStars, setFlyingStars] = useState<{ id: string, start: { x: number, y: number }, end: { x: number, y: number } }[]>([]);

    // Progress State (Decoupled from Navigation)
    const [completedStepIndices, setCompletedStepIndices] = useState<Set<number>>(new Set());

    // UI State
    const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
    const [activeStepRemainingStars, setActiveStepRemainingStars] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isTitleExpanded, setIsTitleExpanded] = useState(false);

    // Sync remaining stars when step changes
    useEffect(() => {
        setIsTitleExpanded(false); // Reset expansion
        if (routine && routine.steps[currentStepIndex]) {
            setActiveStepRemainingStars(routine.steps[currentStepIndex].stars || 0);
        }
    }, [routine, currentStepIndex]);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Audio State
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const audioInstanceRef = useRef<HTMLAudioElement | null>(null); // New Ref for HTML Audio

    // Fetch Routine
    useEffect(() => {
        if (id) {
            ActivityService.get(id).then(data => {
                if (data) {
                    setRoutine(data);
                    // Initialize timer for first step
                    if (data.steps && data.steps.length > 0) {
                        const duration = (data.steps[0].duration || 2) * 60;
                        setTotalTime(duration);
                        setTimeLeft(duration);
                    }
                } else {
                    console.error("Routine not found:", id);
                }
            });
        }
    }, [id]);

    // Cleanup Audio on Unmount
    useEffect(() => {
        return () => {
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                audioInstanceRef.current = null;
            }
        };
    }, []);

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
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                audioInstanceRef.current = null;
            }
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

    // Sync Audio with Timer Logic
    useEffect(() => {
        const step = routine?.steps[currentStepIndex];
        if (step?.audioUrl && audioInstanceRef.current) {
            if (isRunning && !isAudioPlaying) {
                audioInstanceRef.current.play().catch(console.error);
                setIsAudioPlaying(true);
            } else if (!isRunning && isAudioPlaying) {
                audioInstanceRef.current.pause();
                setIsAudioPlaying(false);
            }
        }
    }, [isRunning, currentStepIndex, routine, isAudioPlaying]);

    // Audio Logic
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
    }, []);

    const playAudio = () => {
        if (!routine) return;
        const step = routine.steps[currentStepIndex];
        if (!step) return; // Safety check

        // Stop existing audio if any
        if (audioInstanceRef.current) {
            audioInstanceRef.current.pause();
            audioInstanceRef.current = null;
        }
        if (synthRef.current) {
            synthRef.current.cancel();
        }

        const audioUrl = step.audioUrl;

        if (audioUrl) {
            // Priority 1: Play Recorded Audio
            setIsAudioPlaying(true);
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                setIsAudioPlaying(false);
                audioInstanceRef.current = null;
            };
            audio.play().catch(e => {
                console.warn("Autoplay blocked or failed", e);
                setIsAudioPlaying(false);
                audioInstanceRef.current = null;
            });
            audioInstanceRef.current = audio;
        } else {
            // Priority 2: Text-to-Speech
            if (!synthRef.current) return;

            const textToRead = `${step.title}. ${step.description || ''}`;
            if (!textToRead.trim()) return;

            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.rate = 0.9;
            utterance.pitch = 1.1; // Slightly friendly/child-like

            // Try to find a good voice
            const voices = synthRef.current.getVoices();
            // simple heuristic for a decent English voice
            const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English')) || voices.find(v => v.lang.startsWith('en'));
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onstart = () => setIsAudioPlaying(true);
            utterance.onend = () => setIsAudioPlaying(false);
            utterance.onerror = () => setIsAudioPlaying(false);

            synthRef.current.speak(utterance);
        }
    };

    const toggleAudio = () => {
        // Can toggle BOTH recorded audio AND TTS
        if (!routine) return;

        if (isAudioPlaying) {
            // Stop everything
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                audioInstanceRef.current = null;
            }
            if (synthRef.current) {
                synthRef.current.cancel();
            }
            setIsAudioPlaying(false);
        } else {
            playAudio();
        }
    };

    // Auto-Play on Step Change
    useEffect(() => {
        if (routine && !isComplete) {
            // Small delay to allow transition/interaction
            const timer = setTimeout(() => {
                playAudio();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [currentStepIndex, routine]);


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
        return `${m}:${sec < 10 ? '0' : ''}${sec} `;
    };

    const handleStepComplete = async () => {
        if (!routine) return;
        const currentStep = routine.steps[currentStepIndex];
        if (!currentStep) return; // Safety check

        if (isCompleting) return; // Prevent double clicks
        setIsCompleting(true);

        // Stop audio/timer
        if (synthRef.current) synthRef.current.cancel();
        if (audioInstanceRef.current) {
            audioInstanceRef.current.pause();
            audioInstanceRef.current = null;
        }
        setIsAudioPlaying(false);
        setIsRunning(false);

        // TRIGGER ANIMATION if step has stars
        if (currentStep.stars > 0 && activeStepStarRef.current && starTargetRef.current) {
            const startRect = activeStepStarRef.current.getBoundingClientRect();
            const endRect = starTargetRef.current.getBoundingClientRect();

            // Target Center - Adjusted for visual accuracy
            // Determine centers
            const startCenter = {
                x: startRect.left + startRect.width / 2,
                y: startRect.top + startRect.height / 2
            };
            const endCenter = {
                x: endRect.left + endRect.width / 2,
                y: endRect.top + endRect.height / 2
            };

            // Create multiple stars
            // Create multiple stars
            const visualStarCount = Math.min(currentStep.stars, 30); // Max 30 flying stars
            const starSize = 32; // 32px (w-8 h-8)
            let currentSpawnDelay = 0;

            const flightDuration = 400; // 0.4s flight time (Super Fast)
            const maxSpawnDuration = 600; // Finish spawning by 0.6s

            // Calculate value per flying star to ensure total matches currentStep.stars
            const baseValue = Math.floor(currentStep.stars / visualStarCount);
            const remainder = currentStep.stars % visualStarCount;

            // Schedule Spawns
            for (let i = 0; i < visualStarCount; i++) {
                // Distribute remainder across first few stars
                const starValue = baseValue + (i < remainder ? 1 : 0);

                // Distribute spawns evenly or with slight randomness within window
                const gap = maxSpawnDuration / visualStarCount;
                // Add slight randomness (+/- 10ms) but keep tight
                const randomizedGap = gap + (Math.random() * 20 - 10);

                currentSpawnDelay += Math.max(10, randomizedGap);

                setTimeout(() => {
                    // Add slight random jitter to start position
                    const jitterX = (Math.random() - 0.5) * 20;
                    const jitterY = (Math.random() - 0.5) * 20;

                    setFlyingStars(prev => [...prev, {
                        id: crypto.randomUUID(),
                        start: {
                            x: (startCenter.x - starSize / 2) + jitterX,
                            y: (startCenter.y - starSize / 2) + jitterY
                        },
                        end: {
                            x: endCenter.x - starSize / 2,
                            y: endCenter.y - starSize / 2
                        }
                    }]);
                    setActiveStepRemainingStars(prev => Math.max(0, prev - starValue)); // Decrement source by weighted value
                }, currentSpawnDelay);

                // Increment Counter on Arrival
                setTimeout(() => {
                    setEarnedStars(prev => prev + starValue); // Increment target by weighted value
                    playSound('select'); // Tick sound on arrival
                }, currentSpawnDelay + flightDuration);
            }

            // Wait for all stars to finish
            // Total time = Last Spawn Delay + Flight Duration + Buffer
            const totalDuration = currentSpawnDelay + flightDuration + 200;

            await new Promise(r => setTimeout(r, totalDuration));

            setFlyingStars([]);
            // setEarnedStars handled incrementally above
            setCompletedStepIndices(prev => new Set(prev).add(currentStepIndex)); // Mark as done
            playSound('complete'); // Ding sound when it hits
        } else {
            setCompletedStepIndices(prev => new Set(prev).add(currentStepIndex)); // Mark as done even if no stars
            playSound('select');
        }

        // Calculate Next Step or Finish
        const isLastStep = currentStepIndex >= routine.steps.length - 1;

        // Navigation
        if (isLastStep) {
            // Buffer before showing Mission Accomplished
            await new Promise(r => setTimeout(r, 1000));
            finishRoutine();
            // Don't enable button, we are navigating
        } else {
            setCurrentStepIndex(currentStepIndex + 1);
            setIsCompleting(false); // Re-enable for next step
        }
    };

    const handleSkip = () => {
        setIsSkipModalOpen(true);
    };

    const confirmSkip = () => {
        if (!routine) return;
        setIsSkipModalOpen(false); // Close Modal

        // Stop audio/timer
        if (synthRef.current) synthRef.current.cancel();
        if (audioInstanceRef.current) {
            audioInstanceRef.current.pause();
            audioInstanceRef.current = null;
        }
        setIsAudioPlaying(false);
        setIsRunning(false);

        // Move Next WITHOUT awarding stars or marking complete
        playSound('select');

        if (currentStepIndex < routine.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            finishRoutine();
        }
    };

    const startTimeRef = useRef(Date.now());

    // ... (keep usage of id, db, etc)

    // ... (skip down to finishRoutine)

    const finishRoutine = async () => {
        if (!routine || !activeProfile) return;

        setIsComplete(true);
        playSound('complete');
        // Stop any audio
        if (synthRef.current) synthRef.current.cancel();
        if (audioInstanceRef.current) {
            audioInstanceRef.current.pause();
            audioInstanceRef.current = null;
        }
        setIsAudioPlaying(false);

        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        });

        // 1. Log Completion
        // Use full ISO string to match Dashboard filter logic and preserve local time intent
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        await LogService.add({
            id: `${routine.id}_${activeProfile.id}_${dateStr}`, // Deterministic ID to overwrite 'missed' status
            accountId: routine.accountId,
            profileId: activeProfile.id,
            activityId: routine.id,
            date: dateStr,
            status: 'completed',
            completedAt: new Date(),
            starsEarned: routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0),
            earnedXP: 50,
            stepsCompleted: routine.steps.length
        });

        // 2. Award Stars/XP to Profile (Fetch fresh to avoid stale state)
        const freshProfile = await ProfileService.get(activeProfile.id);
        if (freshProfile) {
            const totalStars = routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0);
            await ProfileService.update(activeProfile.id, {
                stars: (freshProfile.stars || 0) + totalStars,
                xp: (freshProfile.xp || 0) + 50
            });
        }

        // Removed auto-redirect. User will click "Okay".
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
        // Calculate Stats
        const timeTakenMs = Date.now() - startTimeRef.current;
        const minutes = Math.floor(timeTakenMs / 60000);
        const seconds = Math.floor((timeTakenMs % 60000) / 1000);
        const timeString = `${minutes}m ${seconds} s`;

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 bg-[#EEF2FF] min-h-screen animate-in fade-in zoom-in duration-500">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center text-6xl shadow-xl shadow-yellow-500/50 mb-4"
                >
                    🏆
                </motion.div>

                <div className="space-y-2 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">Mission Accomplished!</h1>
                    <p className="text-lg text-gray-500 font-bold">You are a superstar!</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    {/* Stars */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 mb-2" />
                        <span className="text-2xl font-black text-gray-800">{earnedStars}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Stars Earned</span>
                    </div>
                    {/* Steps */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <span className="text-3xl mb-1">👣</span>
                        <span className="text-2xl font-black text-gray-800">{completedStepIndices.size} / {routine.steps.length}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Steps Done</span>
                    </div>
                    {/* Time */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <span className="text-3xl mb-1">⏱️</span>
                        <span className="text-2xl font-black text-gray-800">{timeString}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Time Taken</span>
                    </div>
                    {/* Percentage */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <span className="text-3xl mb-1">💯</span>
                        <span className="text-2xl font-black text-gray-800">{Math.round((completedStepIndices.size / routine.steps.length) * 100)}%</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Complete</span>
                    </div>
                </div>

                {/* Okay Button */}
                <button
                    onClick={() => router.push('/child/dashboard')}
                    className="w-full max-w-xs py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-green-500/30 transform active:scale-95 transition-all mt-8"
                >
                    Okay! 👍
                </button>
            </div>
        );
    }

    const currentStep = routine.steps[currentStepIndex];
    // Orbital Badge Calculation (For new layout, we reuse progress calc for stars mainly)
    const progressFraction = routine.steps.length > 0 ? completedStepIndices.size / routine.steps.length : 0;
    const accumulatedStars = routine.steps.reduce((acc, step, idx) => completedStepIndices.has(idx) ? acc + (step.stars || 0) : acc, 0);

    // Derived values for new layout
    const isActive = true; // Always active in single view

    return (
        <main className="h-screen bg-gradient-to-b from-[#0B1120] via-[#111827] to-[#1E293B] flex flex-col font-sans overflow-hidden text-slate-100">

            {/* Skip Confirmation Modal */}
            <AnimatePresence>
                {isSkipModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
                        onClick={() => setIsSkipModalOpen(false)}
                    >
                        {/* ... modal content ... */}
                        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4 text-white">Skip this step?</h2>
                            <p className="text-slate-400 mb-6 text-sm">You won't earn stars for this step.</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setIsSkipModalOpen(false)} className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-colors">Cancel</button>
                                <button onClick={confirmSkip} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-colors">Skip</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NEW LAYOUT: Header Bar + Scrollable Body */}
            <div className="flex flex-col h-full w-full relative z-10">

                {/* 1. Cosmic Header Bar */}
                <div className="bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5 flex-shrink-0 pt-[env(safe-area-inset-top)]">
                    <div className="h-16 flex items-center justify-between px-4 w-full">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white border border-white/10 shadow-sm active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shadow-lg shadow-purple-500/20">
                                <div className="w-full h-full bg-[#0B1120] rounded-full flex items-center justify-center text-lg">
                                    {(() => {
                                        const aid = activeProfile?.avatarId;
                                        switch (aid) {
                                            case 'boy': return '🧑‍🚀';
                                            case 'girl': return '👩‍🚀';
                                            case 'superhero': return '🦸';
                                            case 'superhero_girl': return '🦸‍♀️';
                                            case 'ninja': return '🥷';
                                            case 'wizard': return '🧙';
                                            case 'princess': return '👸';
                                            case 'pirate': return '🏴‍☠️';
                                            case 'alien': return '👽';
                                            case 'robot': return '🤖';
                                            case 'dinosaur': return '🦖';
                                            case 'unicorn': return '🦄';
                                            case 'dragon': return '🐉';
                                            case 'rocket': return '🚀';
                                            default: return '👶';
                                        }
                                    })()}
                                </div>
                            </div>
                            <h1 className="font-bold text-white text-base tracking-wide truncate max-w-[150px] opacity-90">{routine.title}</h1>
                        </div>

                        <div className="bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30">
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                Task {currentStepIndex + 1}/{routine.steps.length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center pb-32">

                    {/* Top Section: Glowing Progress Dome */}
                    <div className="w-full relative flex flex-col items-center pt-8 pb-4">
                        {/* Background Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-indigo-600/20 blur-[80px] rounded-full pointer-events-none"></div>

                        {/* Progress Dome (Half Circle) */}
                        <div className="relative w-56 h-32 mt-4 z-10">
                            <svg className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                <defs>
                                    <linearGradient id="gradientMetrics" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#818cf8" />
                                        <stop offset="100%" stopColor="#c084fc" />
                                    </linearGradient>
                                </defs>
                                {/* Track (Semi Circle) */}
                                <path
                                    d="M 12,110 A 100,100 0 0,1 212,110"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                />
                                {/* Progress (Semi Circle) */}
                                {isActive && (
                                    <path
                                        d="M 12,110 A 100,100 0 0,1 212,110"
                                        fill="none"
                                        stroke="url(#gradientMetrics)"
                                        strokeWidth="16"
                                        strokeLinecap="round"
                                        strokeDasharray={314} // Approx arc length for r=100 (PI * 100)
                                        strokeDashoffset={314 - (progressFraction * 314)}
                                        className="transition-all duration-1000 ease-out"
                                        id="progress-arc"
                                    />
                                )}
                            </svg>

                            {/* Floating Star Badge on top of Arc */}
                            <div className="absolute -top-5 right-1/2 translate-x-1/2 w-14 h-14 bg-[#1E293B] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center border-2 border-[#334155] z-20">
                                <Star className="w-6 h-6 fill-yellow-400 text-yellow-500 drop-shadow-sm" />
                                <span className="text-[11px] font-black text-white leading-none mt-0.5">{accumulatedStars}</span>
                            </div>

                            {/* Time Display (Inside Dome) */}
                            <div className="absolute top-10 left-0 right-0 text-center flex flex-col items-center">
                                <span className={`text-5xl font-black tracking-tight drop-shadow-lg ${timeLeft <= 30 && isRunning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                    {isActive ? formatTime(timeLeft) : `${currentStep.duration || 2}:00`}
                                </span>
                                <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest mt-1 opacity-80">
                                    {isRunning ? 'Remaining' : 'Time'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Character & Content Card */}
                    <div className="w-full max-w-sm px-6 flex flex-col items-center relative z-10">

                        {/* Title */}
                        <div className="text-center mb-6 mt-2 animate-in slide-in-from-bottom-5 fade-in duration-500">
                            <div className="text-5xl mb-3 filter drop-shadow-lg animate-bounce-slow inline-block">
                                {currentStep.icon?.length < 3 ? currentStep.icon : (currentStep.icon === 'toothbrush' ? '🦷' : '✨')}
                            </div>
                            <h2 className="text-3xl font-black text-white leading-tight drop-shadow-md">
                                {currentStep.title}
                            </h2>
                        </div>

                        {/* Instruction Card */}
                        <div className="w-full bg-[#1E293B]/80 backdrop-blur-md rounded-[24px] p-6 shadow-xl border border-white/5 mb-6">
                            <ul className="space-y-4 text-slate-200 font-medium text-[15px] text-left">
                                {(currentStep.description || "Follow the steps carefully!").split('. ').map((sentence, i) => (
                                    sentence.trim() && (
                                        <li key={i} className="flex gap-3 items-start">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                                            <span className="leading-relaxed opacity-90">{sentence.trim()}{sentence.trim().endsWith('.') ? '' : '.'}</span>
                                        </li>
                                    )
                                ))}
                            </ul>
                        </div>

                        {/* Control Deck */}
                        <div className="w-full bg-[#0F172A]/60 backdrop-blur-xl rounded-[2rem] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/5 relative overflow-hidden group">

                            {/* Controls Row */}
                            <div className="flex items-center justify-between gap-4 px-2 mb-5 mt-1">
                                <button
                                    onClick={() => {
                                        if (currentStepIndex > 0) {
                                            setCurrentStepIndex(currentStepIndex - 1);
                                            playSound('select');
                                        }
                                    }}
                                    disabled={currentStepIndex === 0}
                                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                >
                                    <SkipBack className="w-6 h-6 fill-current" />
                                </button>

                                <button
                                    onClick={toggleTimer}
                                    className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all active:scale-95 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] border-4 ${isRunning
                                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 border-[#0F172A] shadow-emerald-500/20'
                                        : 'bg-gradient-to-br from-indigo-500 to-violet-600 border-[#0F172A] shadow-indigo-500/20'
                                        }`}
                                >
                                    {isRunning ? <Pause className="w-8 h-8 text-white fill-current" /> : <Play className="w-8 h-8 text-white fill-current ml-1" />}
                                </button>

                                <button
                                    onClick={() => setIsSkipModalOpen(true)}
                                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <SkipForward className="w-6 h-6 fill-current" />
                                </button>
                            </div>

                            {/* Timeline */}
                            <div className="relative px-2 pt-2">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-2 tracking-wider uppercase">
                                    <span>Elapsed</span>
                                    <span>Total</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                        animate={{ width: `${((totalTime - timeLeft) / totalTime) * 100}%` }}
                                        transition={{ duration: 1, ease: 'linear' }}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sticky Bottom Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent z-40 flex justify-center pb-8 safe-area-bottom pointer-events-none">
                    <button
                        onClick={handleStepComplete}
                        disabled={isCompleting}
                        className={`w-full max-w-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-black py-4 rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-green-400/20 pointer-events-auto ${isCompleting ? 'opacity-80 scale-95' : 'active:scale-[0.98] hover:scale-[1.02]'}`}
                    >
                        <span>I Did It!</span>
                        <div className="bg-white/20 p-1.5 rounded-full">
                            <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                    </button>
                </div>

            </div>

            {/* FLYING STAR ANIMATION LAYER */}
            <AnimatePresence>
                {flyingStars.map((star) => (
                    <motion.div
                        key={star.id}
                        initial={{
                            x: star.start.x,
                            y: star.start.y,
                            scale: 0.2, // Start even smaller
                            opacity: 0
                        }}
                        animate={{
                            x: star.end.x,
                            y: star.end.y,
                            scale: [1, 0.5], // Pop then shrink
                            opacity: 1,
                            rotate: 720
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: "circOut"
                        }}
                        className="fixed top-0 left-0 z-[100] w-10 h-10 pointer-events-none filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                    >
                        <Star className="w-full h-full fill-yellow-300 text-yellow-100" />
                    </motion.div>
                ))}
            </AnimatePresence>
        </main >
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
