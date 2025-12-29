"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { db, Activity } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, ChevronRight, Play, Pause, RefreshCw, SkipForward, Volume2, ArrowLeft, Clock } from 'lucide-react';
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

        const audioUrl = step.audioUrl;

        // ONLY play if recorded audio exists
        if (audioUrl) {
            setIsAudioPlaying(true);
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                setIsAudioPlaying(false);
                audioInstanceRef.current = null; // Clear ref after playback
            };
            audio.play().catch(e => {
                console.warn("Autoplay blocked or failed", e);
                setIsAudioPlaying(false);
                audioInstanceRef.current = null;
            });
            audioInstanceRef.current = audio; // Store the audio instance
        } else {
            setIsAudioPlaying(false); // No audio to play
        }
    };

    const toggleAudio = () => {
        // Can only toggle if audio actually exists for the current step
        if (!routine) return;
        const step = routine.steps[currentStepIndex];
        if (!step.audioUrl) return;

        if (isAudioPlaying) {
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                audioInstanceRef.current = null;
            }
            setIsAudioPlaying(false);
        } else {
            playAudio(); // Re-trigger playAudio, which will handle setting isAudioPlaying
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
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
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
        await db.activityLogs.add({
            id: crypto.randomUUID(),
            accountId: routine.accountId,
            profileId: activeProfile.id,
            activityId: routine.id,
            date: new Date().toISOString(),
            status: 'completed',
            completedAt: new Date(),
            starsEarned: routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0),
            earnedXP: 50,
            stepsCompleted: routine.steps.length // Add this explicitly for completeness
        });

        // 2. Award Stars/XP to Profile (Fetch fresh to avoid stale state)
        const freshProfile = await db.profiles.get(activeProfile.id);
        if (freshProfile) {
            const totalStars = routine.steps.reduce((acc, step) => acc + (step.stars || 0), 0);
            await db.profiles.update(activeProfile.id, {
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
        const timeString = `${minutes}m ${seconds}s`;

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

    const step = routine.steps[currentStepIndex];
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeProfile.name}&clothing=graphicShirt`;
    // const totalRoutineStars = routine.steps.reduce((acc, s) => acc + (s.stars || 0), 0); // Replaced with earnedStars state

    // Orbital Badge Calculation
    const progressFraction = routine.steps.length > 0 ? completedStepIndices.size / routine.steps.length : 0;
    const orbitalRadius = 56;
    const center = 64; // 128px / 2 (w-32 h-32 container is 128px)
    // Start at -90deg (Top)
    const angle = (progressFraction * 2 * Math.PI) - (Math.PI / 2);
    const badgeX = center + orbitalRadius * Math.cos(angle);
    const badgeY = center + orbitalRadius * Math.sin(angle);

    return (
        <main className="bg-[#EEF2FF] min-h-screen flex flex-col pt-8 pb-8 select-none relative overflow-hidden font-sans">

            {/* Skip Confirmation Modal */}
            <AnimatePresence>
                {isSkipModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsSkipModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <SkipForward className="w-8 h-8 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">Skip this task?</h2>
                            <p className="text-gray-500 font-medium mb-8">
                                Are you sure? You won't earn stars for this step if you skip it.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsSkipModalOpen(false)}
                                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSkip}
                                    className="py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl transition-colors border border-orange-200"
                                >
                                    Yes, Skip
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header / Progress */}
            <div className="px-6 mb-4 text-center z-10 pt-4 flex flex-col items-center relative w-full">

                {/* Top Left Navigation & Timer */}
                <div className="absolute left-6 top-6 flex items-center gap-3 z-50">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-500 shadow-sm border border-gray-100 active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    {/* Timer Badge */}
                    <div className={`h-12 px-4 rounded-full font-black font-mono text-xl shadow-sm border flex items-center gap-2 transition-colors ${isRunning ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-white text-gray-400 border-gray-100'}`}>
                        <Clock className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {/* Avatar Badge */}
                <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 mb-4 mt-2 max-w-[80%]">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 border border-white shadow-sm flex items-center justify-center text-sm shrink-0">
                        {(() => {
                            // Inline helper or use effect, but better to just switch here or duplicate helper
                            const aid = activeProfile.avatarId;
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
                    <span className="text-xs font-bold text-gray-600 leading-tight text-left line-clamp-2">{routine.title}</span>
                </div>

                {/* Progress Circle Container (Smaller) */}
                <div className="relative w-32 h-32 flex items-center justify-center bg-white rounded-full shadow-sm">
                    {/* SVG Ring */}
                    <div className="absolute inset-0 p-1">
                        <svg className="w-full h-full transform -rotate-90">
                            {/* Background Track */}
                            <circle
                                cx="50%" cy="50%" r="56"
                                stroke="#F3F4F6" strokeWidth="8" fill="none"
                            />
                            {/* Progress Arc */}
                            <circle
                                cx="50%" cy="50%" r="56"
                                stroke="#3B82F6" strokeWidth="8" fill="none"

                                strokeLinecap="round"
                                strokeDasharray={351.86} // 2 * PI * 56
                                strokeDashoffset={351.86 - (progressFraction * 351.86)}
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                    </div>

                    {/* Center Text */}
                    <div className="flex flex-col items-center z-10">
                        <span className="text-3xl font-black text-gray-800 tracking-tight">
                            {Math.round(progressFraction * 100)}%
                        </span>
                    </div>

                    {/* Integrated Orbital Star Badge (Smaller) */}
                    <div
                        className="absolute bg-white border-4 border-yellow-50 rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-lg z-20"
                        style={{
                            left: badgeX,
                            top: badgeY,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 0.7s ease-out, top 0.7s ease-out'
                        }}
                    >
                        <div ref={starTargetRef} className="relative mb-[-2px]">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <div className="absolute inset-0 animate-ping opacity-20 bg-yellow-400 rounded-full"></div>
                        </div>
                        <span className="font-black text-gray-800 text-sm leading-none">
                            +{earnedStars}
                        </span>
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
                    onDragEnd={(e, { offset }) => {
                        const swipe = offset.x; // negative is left (next)
                        if (swipe < -50 && currentStepIndex < routine.steps.length - 1) {
                            // Swipe = Navigation ONLY. Do not trigger rewards/completion.
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
                        const displayStars = isActive ? activeStepRemainingStars : stepItem.stars;

                        return (
                            <motion.div
                                key={stepItem.id || index}
                                className={`flex-shrink-0 bg-white rounded-[2.5rem] p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] relative transition-all duration-300 ${isActive ? 'scale-100 opacity-100 ring-4 ring-transparent' : 'scale-90 opacity-50 blur-[1px] grayscale'}`}
                                style={{ width: cardWidth }}
                                onClick={() => {
                                    if (!isActive) setCurrentStepIndex(index);
                                }}
                            >
                                {/* Step Stars Badge (Bigger, Top Right) */}
                                {displayStars > 0 && (
                                    <div
                                        ref={isActive ? activeStepStarRef : null}
                                        className="absolute -top-4 -right-4 w-16 h-16 bg-white border-4 border-yellow-100 rounded-full shadow-lg flex flex-col items-center justify-center transform rotate-12 z-20"
                                    >
                                        <Star className="w-6 h-6 fill-yellow-400 text-yellow-400 mb-[-2px]" />
                                        <span className="text-lg font-black text-gray-800 leading-none">+{displayStars}</span>
                                    </div>
                                )}

                                <h2
                                    className={`text-3xl font-extrabold text-gray-800 text-center mb-4 mt-2 cursor-pointer transition-all active:scale-[98%] ${isTitleExpanded ? '' : 'line-clamp-2'}`}
                                    onClick={(e) => {
                                        if (!isActive) return;
                                        e.stopPropagation();
                                        setIsTitleExpanded(!isTitleExpanded);
                                    }}
                                >
                                    {stepItem.title}
                                </h2>

                                <div className="flex flex-col items-center mb-6">
                                    {/* Description Text */}
                                    <div className="bg-blue-50/50 rounded-2xl p-4 mb-4 w-full">
                                        <p className="text-gray-600 text-base font-medium text-center leading-relaxed">
                                            {stepItem.description || "You can do it! Follow the steps."}
                                        </p>
                                    </div>

                                    {/* Audio Button - Only Active IF Audio Exists */}
                                    {stepItem.audioUrl && (
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
                                            <span>{isAudioPlaying ? "Stop" : "Listen"}</span>
                                        </button>
                                    )}
                                </div>

                                {/* Step Icon (Centered) */}
                                <div className="flex items-center justify-center mb-8 h-32">
                                    <div className="w-32 h-32 flex items-center justify-center bg-gray-50 rounded-full">
                                        <div className="text-7xl filter drop-shadow-sm transform -rotate-6 transition-transform hover:rotate-12 duration-500">
                                            {/* We can use RenderIcon here if available, or just emoji fallback */}
                                            {stepItem.icon?.length < 3 ? stepItem.icon : (stepItem.icon === 'toothbrush' ? '🦷' : '✨')}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls - Compact Controls */}
                                <div className={`flex justify-between items-center gap-2 mt-2 w-full transition-opacity duration-300 ${!isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <button onClick={(e) => { e.stopPropagation(); resetTimer(); }} className="w-12 h-12 flex-shrink-0 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-200 transition-colors shadow-sm active:scale-95">
                                        <RefreshCw className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                                        className={`flex-1 h-14 rounded-xl shadow-[0_3px_0_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-white ${isRunning
                                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_3px_0_0_#e68a00]'
                                            : 'bg-gradient-to-r from-[#10B981] to-[#059669] shadow-[0_3px_0_0_#059669]'
                                            }`}
                                    >
                                        <span className="font-bold text-base">{isRunning ? "Pause" : "Start"}</span>
                                        {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} className="w-12 h-12 flex-shrink-0 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm active:scale-95">
                                        <SkipForward className="w-5 h-5" />
                                    </button>
                                </div>

                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* FLYING STAR ANIMATION LAYER */}
            <AnimatePresence>
                {flyingStars.map((star) => (
                    <motion.div
                        key={star.id}
                        initial={{
                            x: star.start.x,
                            y: star.start.y,
                            scale: 1,
                            opacity: 1
                        }}
                        animate={{
                            x: star.end.x,
                            y: star.end.y,
                            scale: 0.5,
                            rotate: 360
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                            duration: 0.4, // Super Fast flight
                            ease: "backIn" // "backIn" pulls back slightly then shoots, or "easeInOut"
                            // No delay (handled by spawn time)
                        }}
                        className="fixed top-0 left-0 z-[100] w-8 h-8 text-yellow-400 pointer-events-none drop-shadow-xl"
                    >
                        <Star className="w-full h-full fill-yellow-400 stroke-yellow-600" />
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Footer Button */}
            <div className="px-6 w-full max-w-md mx-auto z-10">
                <button
                    onClick={handleStepComplete}
                    disabled={isCompleting}
                    className={`w-full bg-slate-900 text-white text-lg font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${isCompleting
                        ? 'opacity-70 cursor-not-allowed scale-[0.98]'
                        : 'shadow-lg shadow-slate-300 active:scale-95'
                        }`}
                >
                    <span>I'm Done!</span>
                    <Check className="w-6 h-6" />
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
