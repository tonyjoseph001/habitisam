"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

function LoginPageContent() {
    const { user, signInWithGoogle, signInAsDev, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isRedirecting, setIsRedirecting] = useState(false);


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
                const profiles = await db.profiles
                    .where("accountId")
                    .equals(user.uid)
                    .toArray();

                if (profiles.length === 0) {
                    router.push("/setup");
                } else {
                    // 1. Try to restore last active profile
                    try {
                        const stored = localStorage.getItem('habitisim-session-storage');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            const lastProfile = parsed?.state?.activeProfile;

                            // Verify it belongs to this user
                            if (lastProfile && lastProfile.accountId === user.uid) {
                                if (lastProfile.type === 'child') {
                                    router.push("/child/dashboard");
                                    return;
                                } else if (lastProfile.type === 'parent') {
                                    // SECURITY: Do NOT auto-verify parent PIN
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
                    router.push("/parent/dashboard");
                }
            }
        }
        checkRouting();
    }, [user, loading, router, isRedirecting]);



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
                <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-end pb-12 px-8">

                    {/* Main Sign Up Button */}
                    <div className="w-full space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
                        <Button
                            variant="default" // Reset to default or custom
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full h-14 rounded-full bg-white/70 hover:bg-white/80 backdrop-blur-md border border-white/50 text-slate-900 font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />
                            Sign up with Google
                        </Button>

                        <p className="text-center text-sm font-medium text-slate-600/90 leading-relaxed px-4">
                            Start your family's adventure! We will create your account and securely link it to Google.
                        </p>
                    </div>

                    {/* Footer / Terms */}
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-[11px] text-slate-500 font-medium">
                            By signing up, you agree to our<br />
                            <a href="#" className="underline decoration-slate-400 hover:text-slate-800">Privacy Policy</a> &amp; <a href="#" className="underline decoration-slate-400 hover:text-slate-800">Terms of Service</a>
                        </p>

                        {/* Dev Bypass (Subtle) */}
                        <div className="pt-4 border-t border-slate-200/30 w-full max-w-[200px] mx-auto">
                            <button
                                onClick={() => signInAsDev()}
                                disabled={loading}
                                className="text-[10px] uppercase tracking-widest text-slate-400/70 hover:text-indigo-600 font-bold transition-colors"
                            >
                                Dev Bypass 🕵️
                            </button>
                        </div>
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
