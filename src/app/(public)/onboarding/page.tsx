"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowRight } from "lucide-react";

const slides = [
    {
        id: 1,
        title: "Understanding Their World",
        text: "Habitisim bridges the gap between daily expectations and your child's unique way of processing the world.",
        image: "/splash-1.png"
    },
    {
        id: 2,
        title: "Build Helthy Habits",
        text: "Teach kids independence and responsibility through daily tasks.",
        image: "/splash-2.png"
    },
    {
        id: 3,
        title: "Motivate with Rewards",
        text: "Set a goal and offer a fun rewards to encourage progress.",
        image: "/splash-3.png"
    },
    {
        id: 4,
        title: "Thrive Together",
        text: "Smart reinforcement supports ADHD & Autism,building lasting habits while turning everyday challenges into shared moments and small wins.",
        image: "/splash-4.png"
    }
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        // Mark onboarding as seen
        localStorage.setItem("habitisim-onboarding-completed", "true");
        router.push("/login");
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f0eff5] lg:py-10">
            {/* Device Container */}
            <div className="relative w-full h-[100vh] lg:w-[480px] lg:h-[844px] lg:max-h-[90vh] lg:rounded-[3rem] lg:border-[12px] lg:border-white lg:shadow-2xl overflow-hidden flex flex-col items-center">

                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0"
                        >
                            <Image
                                src={slides[currentIndex].image}
                                alt="Background"
                                fill
                                className="object-cover object-bottom"
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Content Overlay - Matching Login Page Layout */}
                <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-between pb-12 px-8 pt-32">

                    {/* Top Section: Text */}
                    <div className="w-full text-center mb-8 min-h-[120px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
                                    {slides[currentIndex].title}
                                </h1>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                    {slides[currentIndex].text}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bottom Section: Controls */}
                    <div className="w-full space-y-6">
                        {/* Indicators */}
                        <div className="flex justify-center gap-2">
                            {slides.map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "w-8 bg-slate-800" : "w-2 bg-slate-300"}`}
                                />
                            ))}
                        </div>

                        <Button
                            onClick={handleNext}
                            className="w-full h-14 rounded-full bg-white/70 hover:bg-white/80 backdrop-blur-md border border-white/50 text-slate-900 font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"
                        >
                            {currentIndex === slides.length - 1 ? (
                                <span className="flex items-center gap-2">Get Started <ArrowRight className="w-5 h-5" /></span>
                            ) : (
                                "Next"
                            )}
                        </Button>

                        <button
                            onClick={handleComplete}
                            className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Skip
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
