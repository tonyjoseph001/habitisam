"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link';
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ProfileService } from "@/lib/firestore/profiles.service";
import { AccountService } from "@/lib/firestore/accounts.service";
import { useSessionStore } from "@/lib/store/useSessionStore";

function LoginPageContent() {
    const { user, signInWithGoogle, signInAnonymouslyUser, signInAsDev, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const { setActiveProfile } = useSessionStore();


    const isDev = process.env.NODE_ENV === 'development';

    // Redirect logic
    useEffect(() => {
        async function checkRouting() {
            if (!loading && user && !isRedirecting) {
                setIsRedirecting(true); // Show loading immediately

                // Check if this is a forgot PIN flow
                const pendingReset = localStorage.getItem('pendingPinReset');
                if (pendingReset) {
                    // User has re-authenticated, now set the reset flag
                    localStorage.setItem('resetPinForProfile', pendingReset);
                    localStorage.removeItem('pendingPinReset');
                }

                // Normal login flow (including forgot PIN - modal will show on dashboard)
                let profiles: any[] = [];
                try {
                    // Race Firestore against a 10s timeout to prevent infinite hang
                    profiles = await Promise.race([
                        (async () => {
                            // 1. Find all accounts I belong to (My own + Shared)
                            const accounts = await AccountService.getForUser(user.uid);
                            // 2. Fetch profiles for each account
                            const promises = accounts.map(acc => ProfileService.getByAccountId(acc.uid));
                            const results = await Promise.all(promises);
                            return results.flat();
                        })(),
                        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("Firestore Timeout")), 10000))
                    ]);
                } catch (e) {
                    console.warn("Profile check failed or timed out (redirecting to setup)", e);
                    // Treat as no profiles found -> go to setup
                }

                if (profiles.length === 0) {
                    router.push("/setup");
                } else {
                    // 1. Try to restore last active profile
                    try {
                        const stored = localStorage.getItem('habitisim-session-storage');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            const lastProfile = parsed?.state?.activeProfile;

                            // Verify it belongs to this user (or household)
                            // We check if the stored profile ID is in the fetched list of valid profiles
                            if (lastProfile && profiles.some(p => p.id === lastProfile.id)) {
                                if (lastProfile.type === 'child') {
                                    setActiveProfile(lastProfile);
                                    router.push("/child/dashboard");
                                    return;
                                } else if (lastProfile.type === 'parent') {
                                    // SECURITY: Do NOT auto-verify parent PIN
                                    setActiveProfile(lastProfile);
                                    router.push("/parent/dashboard");
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Failed to restore session", e);
                    }

                    // 2. Fallback: Default to Parent (Locked)
                    const parentProfile = profiles.find(p => p.type === 'parent');
                    if (parentProfile) {
                        setActiveProfile(parentProfile);
                        router.push("/parent/dashboard");
                    } else {
                        // No parent profile found? Weird. Go to Setup for safety.
                        router.push("/setup");
                    }
                }
            }
        }
        checkRouting();
    }, [user, loading, router, isRedirecting, setActiveProfile]);



    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    // Show loading screen during redirect
    if (isRedirecting) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#2E1065] to-[#0B0F19]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <p className="text-white/60 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f0eff5] lg:py-10">
            {/* Device Container: Full screen on mobile, Framed on Tablet/Desktop */}
            <div className="relative w-full h-[100vh] lg:w-[480px] lg:h-[844px] lg:max-h-[90vh] lg:rounded-[3rem] lg:border-[12px] lg:border-white lg:shadow-2xl overflow-hidden flex flex-col items-center">

                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/img3.png"
                        alt="Background"
                        fill
                        className="object-cover object-bottom"
                        priority
                    />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-between pb-6 pt-12 px-8">

                    {/* Top/Center Section: Branding & Forms */}
                    <div className="flex-1 w-full flex flex-col items-center justify-start pt-24">

                        {/* Branding */}
                        <div className="w-full text-center mb-8 animate-in slide-in-from-bottom-5 fade-in duration-700 delay-100">
                            <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Habitisam</h1>
                            <h2 className="text-xl font-bold text-slate-700 mb-2">Let’s Get Your Family Started!</h2>
                            <p className="text-sm font-medium text-slate-500">
                                Build better habits and make daily routines fun.
                            </p>
                        </div>

                        {/* Buttons Container */}
                        <div className="w-full space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
                            <Button
                                variant="default"
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full h-14 rounded-full bg-white/70 hover:bg-white/80 backdrop-blur-md border border-white/50 text-slate-900 font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />
                                Sign up with Google
                            </Button>

                            {isDev && (
                                <>
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-slate-300"></div>
                                        <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">Or</span>
                                        <div className="flex-grow border-t border-slate-300"></div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() => signInAnonymouslyUser()}
                                        disabled={loading}
                                        className="w-full h-12 rounded-full border-slate-300 text-slate-600 hover:bg-slate-50 font-medium transition-all"
                                    >
                                        Continue as Guest (No Setup)
                                    </Button>

                                    <button
                                        onClick={() => signInAsDev()}
                                        disabled={loading}
                                        className="w-full text-center text-[10px] uppercase tracking-widest text-slate-400/50 hover:text-indigo-600 font-bold transition-colors py-2"
                                    >
                                        Dev Bypass 🕵️
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer / Terms - Pinned to Bottom */}
                    <div className="w-full text-center pt-4">
                        <p className="text-[11px] text-slate-500 font-medium mix-blend-multiply">
                            By signing up, you agree to our<br />
                            <Link href="/privacy" className="underline decoration-slate-400 hover:text-slate-800">Privacy Policy</Link> &amp; <Link href="/terms" className="underline decoration-slate-400 hover:text-slate-800">Terms of Service</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-[#2E1065] to-[#0B0F19]" />}>
            <LoginPageContent />
        </Suspense>
    );
}
