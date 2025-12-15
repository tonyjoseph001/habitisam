"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { db, type Profile } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { v4 as uuidv4 } from 'uuid';
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function SetupPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { setActiveProfile } = useSessionStore();

    const [name, setName] = useState("");
    const [pin, setPin] = useState(["", "", "", ""]);
    const [error, setError] = useState("");

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

        if (!user) return;

        try {
            // Create new Parent Profile
            const newProfile: Profile = {
                id: uuidv4(),
                accountId: user.uid,
                name: name.trim(),
                type: 'parent',
                pin: pinString,
                theme: 'admin',
                avatarId: 'parent-1',
                createdAt: new Date()
            };

            await db.profiles.add(newProfile as any);
            setActiveProfile(newProfile);
            router.push("/parent/dashboard");
        } catch (err) {
            console.error("Setup failed", err);
            setError("Failed to create profile. Please try again.");
        }
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-pink-50 flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                {/* Header Section */}
                <div className="text-center mb-8 space-y-2">
                    <div className="w-16 h-16 bg-violet-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-violet-200 rotate-3 transform hover:rotate-6 transition-transform">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome to Habitisim!</h1>
                    <p className="text-lg text-slate-500 max-w-xs mx-auto">Let's set up your admin profile to check mission status.</p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8 border border-white/50 backdrop-blur-sm">
                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            Admin Name
                        </label>
                        <Input
                            placeholder="e.g., Mom, Dad, or Captain"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-50 border-slate-200 h-14 text-lg focus:ring-violet-500 focus:border-violet-500 transition-all rounded-xl"
                        />
                    </div>

                    {/* PIN Input */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-violet-500" />
                            Create Security PIN
                        </label>
                        <div className="flex gap-4 justify-between px-4">
                            {[0, 1, 2, 3].map((i) => (
                                <motion.input
                                    key={i}
                                    id={`pin-${i}`}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={pin[i]}
                                    onChange={(e) => handlePinChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    whileFocus={{ scale: 1.1, borderColor: "#7c3aed", boxShadow: "0 0 0 4px rgba(124, 58, 237, 0.1)" }}
                                    className="w-16 h-16 border-2 border-slate-200 rounded-2xl text-center text-3xl font-bold text-slate-800 bg-slate-50 outline-none transition-all shadow-sm focus:bg-white"
                                />
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 text-center font-medium">This PIN protects your settings from curious little fingers.</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium border border-red-100"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Action Button */}
                    <Button
                        variant="cosmic"
                        size="lg"
                        className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-violet-200 active:scale-95 transition-all"
                        onClick={handleCompleteSetup}
                    >
                        Complete Setup <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
