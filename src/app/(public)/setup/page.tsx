"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";
import { type Profile } from "@/lib/db";
import { ProfileService } from "@/lib/firestore/profiles.service";
import { InviteService } from "@/lib/firestore/invites.service";
import { AccountService } from "@/lib/firestore/accounts.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { v4 as uuidv4 } from 'uuid';
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck, Ticket } from "lucide-react";

export default function SetupPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { setActiveProfile } = useSessionStore();

    const [name, setName] = useState("");
    const [pin, setPin] = useState(["", "", "", ""]);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (!loading && !user) {
            router.push("/login"); // Security redirect
        }
    }, [user, loading, router]);

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits
        if (value.length > 1) {
            // Handle paste? For now just take last char
            value = value.slice(-1);
        }

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 3) {
            document.getElementById(`pin-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            document.getElementById(`pin-${index - 1}`)?.focus();
        }
    };

    const [inviteCode, setInviteCode] = useState("");

    const handleCompleteSetup = async () => {
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        const pinString = pin.join("");
        if (pinString.length !== 4) {
            setError("Please enter a 4-digit PIN.");
            return;
        }

        if (!user) {
            setError("Session lost. Please log in again.");
            return;
        }

        setIsSubmitting(true);
        setError(""); // Clear previous errors

        try {
            console.log("Setting up profile for:", user.uid);

            let targetAccountId = user.uid;

            // --- Join Household Flow ---
            if (inviteCode.trim()) {
                const invite = await InviteService.validate(inviteCode.trim());
                if (!invite) {
                    throw new Error("Invalid or expired invite code.");
                }
                targetAccountId = invite.accountId;
                console.log("Joining existing household:", targetAccountId);

                // Add user to account's members list
                await AccountService.joinHousehold(user, targetAccountId);

                // Redeem (delete) the invite
                await InviteService.redeem(inviteCode.trim());
            }

            // Create new Parent Profile linked to either new account (self) or joined account
            const newProfile: Profile = {
                id: uuidv4(),
                accountId: targetAccountId, // <--- Linked here
                ownerUid: user.uid, // Link to Auth User
                name: name.trim(),
                type: 'parent',
                pin: pinString,
                theme: 'default',
                avatarId: 'parent-1',
                createdAt: new Date()
            };

            // Race Firestore against a timeout to prevent infinite hang
            await Promise.race([
                ProfileService.add(newProfile),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection timed out - please try again")), 30000))
            ]);
            setActiveProfile(newProfile);
            console.log("Profile created, redirecting...");
            router.push("/parent/dashboard");
        } catch (err) {
            console.error("Setup failed", err);
            setError("Failed to complete setup. " + (err as Error).message);
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f0eff5] lg:py-10">
            {/* Device Container */}
            <div className="relative w-full h-[100vh] lg:w-[480px] lg:h-[844px] lg:max-h-[90vh] lg:rounded-[3rem] lg:border-[12px] lg:border-white lg:shadow-2xl overflow-hidden flex flex-col items-center">

                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    {/* Using img3.png as requested for consistency */}
                    <Image
                        src="/img3.png"
                        alt="Background"
                        fill
                        className="object-cover object-bottom"
                        priority
                    />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-start pt-32 px-8">

                    {/* Header */}
                    <div className="w-full text-center mb-8 animate-in slide-in-from-bottom-5 fade-in duration-700">
                        <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Welcome to Habitisam!</h1>
                        <p className="text-sm font-medium text-slate-600">
                            Let's set up your admin profile.
                        </p>
                    </div>

                    {/* Main Form Card (Transparent/Glass effect) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full space-y-6 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-lg"
                    >
                        {/* Name Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                Admin Name
                            </label>
                            <Input
                                placeholder="e.g., Mom"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-white/80 border-slate-200 h-12 text-lg focus:ring-violet-500 rounded-xl"
                            />
                        </div>

                        {/* PIN Input */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-violet-600" />
                                Create Security PIN
                            </label>
                            <div className="flex gap-3 justify-between">
                                {[0, 1, 2, 3].map((i) => (
                                    <input
                                        key={i}
                                        id={`pin-${i}`}
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={pin[i]}
                                        onChange={(e) => handlePinChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-12 h-12 border-2 border-white/50 rounded-xl text-center text-2xl font-bold text-slate-800 bg-white/70 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all outline-none shadow-sm"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Invite Code Input */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                                <Ticket className="w-3 h-3" />
                                Family Invite Code (Optional)
                            </label>
                            <Input
                                placeholder="Enter 6-digit code"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="bg-slate-50 border-slate-200 h-10 text-center font-mono tracking-widest text-sm focus:ring-emerald-500 rounded-xl"
                            />
                            <p className="text-[10px] text-slate-400 text-center">
                                If your partner invited you, enter the code here to join your family.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50/90 text-red-600 text-xs p-3 rounded-lg text-center font-bold border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Action Button */}
                        <Button
                            onClick={handleCompleteSetup}
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                            {isSubmitting ? "Creating..." : "Complete Setup"}
                            {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
