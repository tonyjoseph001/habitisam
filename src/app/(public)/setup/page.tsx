"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { db, type Profile } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { v4 as uuidv4 } from 'uuid';

export default function SetupPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { setActiveProfile } = useSessionStore();

    const [name, setName] = useState("");
    const [pin, setPin] = useState(["", "", "", ""]);
    const [error, setError] = useState("");

    const handlePinChange = (index: number, value: string) => {
        if (value.length > 1) return; // Prevent multiple chars

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

        if (!user) return; // Should not happen if guarded

        try {
            // Create new Parent Profile
            const newProfile: Profile = {
                id: uuidv4(),
                accountId: user.uid,
                name: name.trim(),
                type: 'parent',
                pin: pinString,
                theme: 'admin',
                avatarId: 'parent-1', // Default
                createdAt: new Date()
            };

            await db.profiles.add(newProfile as any);

            // Update session
            setActiveProfile(newProfile);

            // Redirect to dashboard
            router.push("/parent/dashboard");
        } catch (err) {
            console.error("Setup failed", err);
            setError("Failed to create profile. Please try again.");
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-6">
            {/* 1. Header */}
            <div className="mt-12 mb-8 text-center">
                <h2 className="text-violet-600 font-bold text-xl mb-2">Habitisim</h2>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Welcome to Habitisim!</h1>
                <p className="text-slate-500">Let's set up your parent profile to get started.</p>
            </div>

            {/* 2. Main Content Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-6">

                {/* Name Input */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Your Name</label>
                    <Input
                        placeholder="e.g., Alex"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* PIN Creation */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">Create 4-digit PIN</label>
                    <div className="flex gap-4 justify-center">
                        {[0, 1, 2, 3].map((i) => (
                            <input
                                key={i}
                                id={`pin-${i}`}
                                type="password"
                                inputMode="numeric"
                                className="w-14 h-14 border border-slate-300 rounded-lg text-center text-2xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                                maxLength={1}
                                value={pin[i]}
                                onChange={(e) => handlePinChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 text-center">Secure your admin dashboard</p>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                {/* Action Button */}
                <Button
                    variant="cosmic"
                    size="lg"
                    className="w-full mt-2"
                    onClick={handleCompleteSetup}
                >
                    Complete Setup
                </Button>

            </div>
        </div>
    );
}
