"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { AccountService } from '@/lib/firestore/accounts.service';
import { Button } from '@/components/ui/button';
import { Users, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

function JoinContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, signInWithGoogle } = useAuth();

    // "code" is actually the target User ID (Owner UID)
    const targetUid = searchParams.get('code');

    const [status, setStatus] = useState<'idle' | 'joining' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!targetUid) {
            setStatus('error');
            setErrorMessage("Invalid invite link. No code provided.");
        }
    }, [targetUid]);

    const handleJoin = async () => {
        if (!targetUid) return;

        try {
            setStatus('joining');

            // 1. Ensure User is Signed In
            let currentUser = user;
            if (!currentUser) {
                currentUser = await signInWithGoogle();
            }

            if (!currentUser) {
                setStatus('error');
                setErrorMessage("You must be signed in to join a household.");
                return;
            }

            // 2. Cannot join own household
            if (currentUser.uid === targetUid) {
                setStatus('error');
                setErrorMessage("You cannot join your own household!");
                return;
            }

            // 3. Call Service
            await AccountService.joinHousehold(currentUser, targetUid);

            setStatus('success');
            setTimeout(() => {
                router.push('/parent/dashboard');
            }, 1000);

        } catch (error: any) {
            console.error("Join Failed", error);
            setStatus('error');
            setErrorMessage(error.message || "Failed to join household. Please try again.");
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-violet-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Welcome Home!</h1>
                    <p className="text-slate-500">You successfully joined the household.</p>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-violet-500" />
                    <p className="text-xs text-slate-400">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                {/* Header Graphic */}
                <div className="h-32 bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/30 transform rotate-3">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Join Household</h1>
                        <p className="text-slate-500">
                            You've been invited to sync devices and manage this family together.
                        </p>
                    </div>

                    {status === 'error' && (
                        <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100 text-red-700 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {!user ? (
                            <Button onClick={handleJoin} size="lg" className="w-full h-14 text-lg bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-200">
                                Sign In to Accept
                            </Button>
                        ) : (
                            <Button
                                onClick={handleJoin}
                                disabled={status === 'joining'}
                                size="lg"
                                className="w-full h-14 text-lg bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-200 disabled:opacity-70"
                            >
                                {status === 'joining' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Joining...
                                    </>
                                ) : (
                                    "Accept Invitation"
                                )}
                            </Button>
                        )}

                        <p className="text-center text-xs text-slate-400">
                            By joining, you will share access to all children profiles and activities.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-8 text-slate-400 text-sm font-medium">Habitisim Family Sync</div>
        </div>
    );
}

export default function JoinHouseholdPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-violet-600" /></div>}>
            <JoinContent />
        </Suspense>
    );
}
