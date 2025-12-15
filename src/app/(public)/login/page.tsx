"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
// We need to import the exact path to the generated image artifact. 
// Since I cannot know the exact path of the *previously* generated artifact dynamically in code without checking, 
// I will assume I need to copy it to public. 
// WAIT: The browser/client code can't see the .gemini artifacts folder. 
// I MUST move the generated image to `public/` first. I will add a TODO or do it in the next step.
// For now, I will point to a placeholder path that I will fulfill in a moment: "/hero-cosmic.png"

export default function LoginPage() {
    const { user, signInWithGoogle, signInAsDev, loading } = useAuth();
    const router = useRouter();

    // Redirect logic
    useEffect(() => {
        async function checkRouting() {
            if (!loading && user) {
                // User is authenticated. Check if they have a profile.
                const profiles = await db.profiles
                    .where("accountId")
                    .equals(user.uid)
                    .toArray();

                if (profiles.length === 0) {
                    // No profiles -> Go to Setup
                    router.push("/setup");
                } else {
                    // Has profiles -> Go to Dashboard (which should trigger Profile Switcher/PIN)
                    // Actually, as per spec: "Redirect to Screen 2 (Parent PIN)" -> which effectively is the dashboard entry gate.
                    // We'll trust /parent/dashboard to handle the lock logic, or we create a specific /lock screen.
                    // For now, let's route to /parent/dashboard.
                    router.push("/parent/dashboard");
                }
            }
        }
        checkRouting();
    }, [user, loading, router]);

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            // Effect will handle redirect
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-between bg-gradient-to-b from-[#2E1065] to-[#0B0F19] text-white overflow-hidden relative">
            {/* 1. Hero Illustration */}
            <div className="relative w-full flex-1 flex items-center justify-center p-6">
                {/* Floating animation container */}
                <div className="animate-float relative z-10 max-w-md w-full aspect-square">
                    {/* 
                IMPORTANT: I will ensure 'hero-cosmic.png' exists in public directory in the next step. 
             */}
                    <Image
                        src="/hero-cosmic.png"
                        alt="Parent and Child Astronaut High-Five"
                        fill
                        className="object-contain drop-shadow-2xl"
                        priority
                    />
                </div>

                {/* Background stars/particles could go here as absolute divs */}
            </div>

            {/* 2. Brand Header */}
            <div className="text-center z-10 px-4 -mt-10 mb-8">
                <h1 className="font-heading font-bold text-5xl mb-2 text-white drop-shadow-[0_0_15px_rgba(124,58,237,0.8)]">
                    Cosmic Routine
                </h1>
                <p className="font-sans font-medium text-[#94A3B8] text-lg">
                    Blast off to stress-free mornings.
                </p>
            </div>

            {/* 3. Authentication Action Area */}
            <div className="w-full bg-white rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 animate-slide-up">
                <div className="max-w-sm mx-auto flex flex-col gap-4">
                    <Button
                        variant="google"
                        size="lg"
                        onClick={handleLogin}
                        className="w-full h-14 text-base font-medium flex items-center gap-3"
                        disabled={loading}
                    >
                        {/* Google "G" Icon SVG */}
                        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </Button>

                    <p className="text-center text-xs text-[#64748B]">
                        No password needed. Secure signup via Google.
                    </p>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-300 text-xs">DEV TOOLS</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signInAsDev()}
                        className="w-full text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                        disabled={loading}
                    >
                        🕵️ Bypass Login (Dev Mode)
                    </Button>
                </div>

                {/* 4. Footer Links */}
                <div className="mt-8 flex justify-center gap-6 text-xs text-[#94A3B8]">
                    <a href="#" className="hover:underline">Privacy Policy</a>
                    <a href="#" className="hover:underline">Terms of Service</a>
                </div>
            </div>
        </div>
    );
}
