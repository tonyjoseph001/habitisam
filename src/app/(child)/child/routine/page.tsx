
"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Activity } from '@/lib/db'; // Keep Type Import only
import { ActivityService } from '@/lib/firestore/activities.service';
import { LogService } from '@/lib/firestore/logs.service';
import { ProfileService } from '@/lib/firestore/profiles.service';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, ChevronRight, Play, Pause, RefreshCw, SkipForward, SkipBack, Volume2, ArrowLeft, Clock, Info, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';

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
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
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
            stopAlarm();
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
                        playFinishAlarm(); // Start 1-min alarm
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
        if (!routine) return;

        // Only handle PAUSING via effect (e.g. if timer stops automatically)
        if (!isRunning) {
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
            }
            if (synthRef.current && synthRef.current.speaking) {
                synthRef.current.pause();
            }
            setIsAudioPlaying(false);
        }
    }, [isRunning]);

    // Audio Logic
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
    }, []);

    // Alarm / Beep Logic
    const alarmContextRef = useRef<AudioContext | null>(null);

    const stopAlarm = () => {
        if (alarmContextRef.current) {
            alarmContextRef.current.close().catch(() => { });
            alarmContextRef.current = null;
        }
    };

    const playStartupBeep = () => {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High beep
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    };

    const playFinishAlarm = () => {
        stopAlarm(); // Clear existing

        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        alarmContextRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square'; // Alarm style
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

        // Schedule 60 seconds of beeps (1 per second)
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);

        for (let i = 0; i < 60; i++) {
            const t = now + i;
            // Beep ON
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.setValueAtTime(0.05, t + 0.5);
            // Beep OFF
            gain.gain.linearRampToValueAtTime(0, t + 0.55);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(now + 61);

        // Auto-stop context after 1 min
        setTimeout(() => {
            if (alarmContextRef.current === ctx) {
                stopAlarm();
            }
        }, 61000);
    };

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

        // Fallback: If step has no audio, but Routine has "Intro" audio, play that for the FIRST step only.
        const audioUrl = step.audioUrl || (currentStepIndex === 0 ? routine.audioUrl : undefined);

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
        if (!routine) return;

        if (isAudioPlaying) {
            // PAUSE
            if (audioInstanceRef.current) {
                audioInstanceRef.current.pause();
                // Do NOT nullify, so we can resume
            }
            if (synthRef.current && synthRef.current.speaking) {
                synthRef.current.pause();
            }
            setIsAudioPlaying(false);
        } else {
            // RESUME or PLAY
            if (audioInstanceRef.current && audioInstanceRef.current.paused) {
                audioInstanceRef.current.play().catch(console.error);
                setIsAudioPlaying(true);
            } else if (synthRef.current && synthRef.current.paused && synthRef.current.speaking) {
                synthRef.current.resume();
                setIsAudioPlaying(true);
            } else {
                // Determine if we should restart or if it was finished.
                // If refs are null, we start fresh.
                playAudio();
            }
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
    const toggleTimer = () => {
        const nextState = !isRunning;
        setIsRunning(nextState);

        if (nextState) {
            playStartupBeep(); // Beep on start
            // STARTING: Explicitly trigger audio
            if (audioInstanceRef.current) {
                // Resume Recorded Audio
                if (audioInstanceRef.current.paused) {
                    audioInstanceRef.current.play().catch(console.error);
                    setIsAudioPlaying(true);
                }
            } else if (synthRef.current && synthRef.current.paused && synthRef.current.speaking) {
                // Resume TTS
                synthRef.current.resume();
                setIsAudioPlaying(true);
            } else {
                // Start New
                playAudio();
            }
        } else {
            // STOPPING: Handled by useEffect, but we can do it here for responsiveness
            if (audioInstanceRef.current) audioInstanceRef.current.pause();
            if (synthRef.current) synthRef.current.pause();
            setIsAudioPlaying(false);
        }
    };
    const resetTimer = () => {
        stopAlarm();
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

    const [isSubmitting, setIsSubmitting] = useState(false);

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
    };

    const handleCollectRewards = async () => {
        if (!routine || !activeProfile || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Calculate Stars based on COMPLETED steps (verified)
            const calculatedStars = routine.steps.reduce((acc, step, index) => {
                // If it's in the set OR if it's the last step we just finished (might not be in set yet if we transitioned fast? No, set happens before finishRoutine)
                // Actually, handleStepComplete adds to set BEFORE calling finishRoutine.
                // But let's be safe: if we are here, we consider it done.
                if (completedStepIndices.has(index)) {
                    return acc + (step.stars || 5);
                }
                return acc;
            }, 0);

            // Fallback: Use earnedStars state if logic matches, but calculated is safer for DB.
            // But let's ensure we display the Calculated one or ensure they sync.

            // 1. Log Completion
            const dateStr = format(new Date(), 'yyyy-MM-dd');
            await LogService.add({
                id: `${routine.id}_${activeProfile.id}_${dateStr}`,
                accountId: routine.accountId,
                profileId: activeProfile.id,
                activityId: routine.id,
                date: dateStr,
                status: 'completed',
                completedAt: new Date(),
                starsEarned: calculatedStars,
                earnedXP: 50,
                stepsCompleted: completedStepIndices.size
            });

            // 2. Update Profile
            const freshProfile = await ProfileService.get(activeProfile.id);
            if (freshProfile) {
                await ProfileService.update(activeProfile.id, {
                    stars: (freshProfile.stars || 0) + calculatedStars,
                    xp: (freshProfile.xp || 0) + 50
                });
            }

            router.back();
        } catch (e) {
            console.error("Reward collection failed", e);
            setIsSubmitting(false);
        }
    };

    const restartFullRoutine = () => {
        setIsComplete(false);
        setIsCompleting(false);
        setCompletedStepIndices(new Set());
        setEarnedStars(0);
        setIsRunning(false);
        setIsSkipModalOpen(false);
        setIsDetailsModalOpen(false);
        stopAlarm();

        // Check if we need to manually reset step 0 state (if index won't change)
        if (currentStepIndex === 0 && routine && routine.steps.length > 0) {
            const step = routine.steps[0];
            const duration = (step.duration || 2) * 60;
            setTotalTime(duration);
            setTimeLeft(duration);
            // Trigger audio manually since Effect won't fire for same index
            setTimeout(() => playAudio(), 500);
        }

        setCurrentStepIndex(0);
    };

    // --- RENDER ---

    // Check if current step is already done
    const isStepCompleted = completedStepIndices.has(currentStepIndex);

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

        // Correct Star Calc (Live verification from Completed Indices)
        const finishStars = routine.steps.reduce((acc, step, i) => completedStepIndices.has(i) ? acc + (step.stars || 5) : acc, 0);

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
                        <span className="text-2xl font-black text-gray-800">{finishStars}</span>
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

                {/* Actions */}
                <div className="w-full max-w-xs space-y-3 mt-8">
                    <button
                        onClick={handleCollectRewards}
                        disabled={isSubmitting}
                        className={`w-full py-4 text-white rounded-2xl font-black text-xl shadow-lg transform transition-all ${isSubmitting ? 'bg-green-600 opacity-80 scale-95 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30 active:scale-95'}`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <span>Collecting...</span>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : (
                            "Collect Reward! 🎁"
                        )}
                    </button>

                    <button
                        onClick={restartFullRoutine}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-lg shadow-sm border border-slate-200 active:scale-95 transition-all"
                    >
                        Restart Task 🔄
                    </button>
                </div>
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
        <main className="h-[100dvh] bg-[#F8FAFC] flex flex-col font-sans overflow-hidden text-slate-800">

            {/* Skip Confirmation Modal */}
            <AnimatePresence>
                {isSkipModalOpen && (
                    <motion.div
                        key="skip-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
                        onClick={() => setIsSkipModalOpen(false)}
                    >
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4 text-slate-800">Skip this step?</h2>
                            <p className="text-slate-500 mb-6 text-sm">You won't earn stars for this step.</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setIsSkipModalOpen(false)} className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-colors">Cancel</button>
                                <button onClick={confirmSkip} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-colors">Skip</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Details/Info Modal */}
                {isDetailsModalOpen && (
                    <motion.div
                        key="details-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
                        onClick={() => setIsDetailsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white border border-slate-200 rounded-3xl p-0 w-full max-w-sm shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-indigo-500" />
                                    Task Details
                                </h2>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                                    <Check className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {/* Routine Info */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Routine</h3>
                                    <h4 className="text-slate-800 font-bold text-lg">{routine.title}</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        {routine.description || "No description provided."}
                                    </p>
                                </div>

                                {/* All Steps List */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white py-2 z-10">Mission Steps</h3>
                                    {routine.steps.map((step, index) => {
                                        const isCurrent = index === currentStepIndex;
                                        return (
                                            <div key={step.id} className={`p-4 rounded-xl border transition-all ${isCurrent ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-bold text-base flex items-center gap-4 mb-1.5 ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            <span className="text-xl flex-shrink-0 leading-none">{step.icon}</span>
                                                            <span className="truncate leading-tight pt-0.5">{step.title}</span>
                                                        </h4>
                                                        <p className="text-slate-500 text-sm leading-relaxed break-words">
                                                            {step.description || "No details."}
                                                        </p>
                                                    </div>

                                                    {/* Audio Icon */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isCurrent) toggleAudio();
                                                        }}
                                                        className={`flex-shrink-0 p-2 rounded-lg transition-colors border ${isCurrent && isAudioPlaying
                                                            ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse shadow-lg shadow-indigo-500/40'
                                                            : 'bg-white/5 text-slate-500 border-white/5 hover:text-indigo-300 hover:border-indigo-500/30'}`}
                                                    >
                                                        {isCurrent && isAudioPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-200">
                                <button onClick={() => setIsDetailsModalOpen(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20">
                                    Got it!
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NEW LAYOUT: Header Bar + Scrollable Body */}
            <div className="flex flex-col h-full w-full relative z-10">

                {/* 1. Cosmic Header Bar (Light) */}
                <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 flex-shrink-0 pt-[env(safe-area-inset-top)]">
                    <div className="h-16 flex items-center justify-between px-4 w-full">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-white hover:bg-slate-50 rounded-full flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center">
                            {/* Step Counter - Top Right */}
                            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 backdrop-blur-sm shadow-sm">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    Step {currentStepIndex + 1} / {routine.steps.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Scrollable Content Area - Updated for Tablet */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center pb-48 md:justify-center md:pb-0">

                    {/* MAX WIDTH WRAPPER FOR TABLET */}
                    <div className="w-full max-w-5xl flex flex-col flex-grow md:flex-row md:gap-16 md:items-center md:px-8">

                        {/* LEFT COLUMN (Visuals: Timer, Icon, Dome) */}
                        <div className="w-full md:flex-1 flex flex-col items-center px-6 md:px-0">

                            {/* Top Section: Glowing Progress Dome */}
                            <div className="w-full relative flex flex-col items-center pt-8 pb-4 md:pt-0">
                                {/* Background Glow */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-indigo-600/20 blur-[80px] rounded-full pointer-events-none"></div>

                                {/* Progress Dome (Half Circle) */}
                                <div className="relative w-56 h-32 mt-4 z-10 md:scale-125 md:mb-8 transition-transform">
                                    {/* ... (SVG matches existing) ... */}
                                    <svg viewBox="0 0 224 120" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                        <defs>
                                            <linearGradient id="gradientMetrics" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#818cf8" />
                                                <stop offset="100%" stopColor="#c084fc" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M 12,110 A 100,100 0 0,1 212,110"
                                            fill="none"
                                            stroke="rgba(0,0,0,0.05)"
                                            strokeWidth="16"
                                            strokeLinecap="round"
                                        />
                                        {isActive && (
                                            <path
                                                d="M 12,110 A 100,100 0 0,1 212,110"
                                                fill="none"
                                                stroke="url(#gradientMetrics)"
                                                strokeWidth="16"
                                                strokeLinecap="round"
                                                strokeDasharray={314}
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
                                    <div className="absolute top-14 left-0 right-0 text-center flex flex-col items-center group">
                                        <span className={`text-4xl font-medium tracking-tight drop-shadow-sm ${timeLeft <= 30 && isRunning ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
                                            {isActive ? formatTime(timeLeft) : `${currentStep.duration || 2}:00`}
                                        </span>
                                        <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest opacity-80">
                                            {isRunning ? 'Remaining' : 'Time'}
                                        </span>
                                    </div>
                                    {/* Reset Button - Always visible */}
                                    <div className="absolute top-28 left-0 right-0 flex justify-center z-30">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); resetTimer(); }}
                                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 text-indigo-500 text-[11px] font-bold uppercase tracking-wider transition-all border border-slate-200 shadow-sm active:scale-95 ${timeLeft === totalTime ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Title - Moved Here for Tablet Layout */}
                            {/* Title - Aligned Horizontally */}
                            <div className="flex items-center justify-center gap-6 mt-4 animate-in slide-in-from-bottom-5 fade-in duration-500 md:mt-8">
                                <div className="text-4xl filter drop-shadow-md animate-bounce-slow md:text-5xl">
                                    {currentStep.icon?.length < 3 ? currentStep.icon : (currentStep.icon === 'toothbrush' ? '🦷' : '✨')}
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 leading-tight drop-shadow-sm md:text-3xl text-left">
                                    {currentStep.title}
                                </h2>
                            </div>
                        </div>

                        {/* RIGHT COLUMN (Controls: Instructions, Audio, Deck) */}
                        <div className="w-full max-w-sm px-6 flex flex-col items-center relative z-10 gap-6 mt-auto md:mt-0 md:flex-1 md:max-w-md">

                            {/* Unified Control Card */}
                            <div className="w-full bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(30,58,138,0.05)] border border-slate-200/60 relative overflow-hidden group">



                                {/* Timeline (Progress Bar) */}
                                <div className="relative px-2 mb-6">
                                    {/* Action Header: Details & Audio */}
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsDetailsModalOpen(true); }}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-slate-200 transition-all active:scale-95 hover:text-indigo-600"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                                Details
                                            </button>

                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-[11px] font-black border border-yellow-500/20 shadow-sm">
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                <span>+{currentStep.stars || 5}</span>
                                            </div>
                                        </div>



                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all active:scale-95 ${isAudioPlaying ? 'bg-indigo-50 border-indigo-200 text-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                                        >
                                            {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-2 tracking-wider uppercase">
                                        <span>Elapsed</span>
                                        <span>Total</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                            animate={{ width: `${((totalTime - timeLeft) / totalTime) * 100}%` }}
                                            transition={{ duration: 1, ease: 'linear' }}
                                        />
                                    </div>
                                </div>

                                {/* Controls Row (Just Payback) */}
                                <div className="flex items-center justify-center gap-10 px-0 mt-2">
                                    <button
                                        onClick={() => {
                                            if (currentStepIndex > 0) {
                                                setCurrentStepIndex(currentStepIndex - 1);
                                                playSound('select');
                                            }
                                        }}
                                        disabled={currentStepIndex === 0}
                                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                    >
                                        <SkipBack className="w-6 h-6 fill-current" />
                                    </button>

                                    <button
                                        onClick={toggleTimer}
                                        disabled={isStepCompleted}
                                        className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all active:scale-95 border-2 ${isStepCompleted
                                            ? 'bg-slate-100 border-slate-200 opacity-50 grayscale cursor-not-allowed'
                                            : (isRunning
                                                ? 'bg-gradient-to-br from-teal-500 to-emerald-600 border-[#0F172A] shadow-emerald-500/20 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                                                : 'bg-gradient-to-br from-indigo-500 to-violet-600 border-[#0F172A] shadow-indigo-500/20 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]')
                                            }`}
                                    >
                                        {isStepCompleted ? <Check className="w-8 h-8 text-slate-400" /> : (isRunning ? <Pause className="w-8 h-8 text-white fill-current" /> : <Play className="w-8 h-8 text-white fill-current ml-1" />)}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (isStepCompleted) {
                                                // If step is done, just navigate forward immediately
                                                if (currentStepIndex < routine.steps.length - 1) {
                                                    setCurrentStepIndex(currentStepIndex + 1);
                                                    playSound('select');
                                                } else {
                                                    finishRoutine();
                                                }
                                            } else {
                                                // If not done, show Skip confirmation
                                                setIsSkipModalOpen(true);
                                            }
                                        }}
                                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all"
                                    >
                                        <SkipForward className="w-6 h-6 fill-current" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent z-40 flex justify-center pb-8 safe-area-bottom pointer-events-none">
                <button
                    onClick={() => {
                        stopAlarm();
                        handleStepComplete();
                    }}
                    disabled={isCompleting || isStepCompleted}
                    className={`w-full max-w-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-black py-4 rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-green-400/20 pointer-events-auto ${(isCompleting || isStepCompleted) ? 'opacity-50 grayscale scale-95 cursor-not-allowed' : 'active:scale-[0.98] hover:scale-[1.02]'}`}
                >
                    <span>Finish Step</span>
                    <div className="bg-white/20 p-1.5 rounded-full">
                        <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                </button>
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
