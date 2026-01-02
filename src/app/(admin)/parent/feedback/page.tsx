"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { FeedbackService } from '@/lib/firestore/feedback.service';
import { v4 as uuidv4 } from 'uuid';
import { Feedback } from '@/lib/db';

export default function FeedbackPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [message, setMessage] = useState("");
    const [type, setType] = useState<Feedback['type']>('general');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message) {
            toast.error("Please enter a message");
            return;
        }

        setIsSubmitting(true);

        try {
            await FeedbackService.add({
                id: uuidv4(),
                userId: user?.uid || 'anonymous',
                type,
                message,
                contactEmail: user?.email || undefined,
                createdAt: new Date(),
                metadata: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            });

            setIsSuccess(true);
            toast.success("Feedback sent! Thank you!");
            setMessage("");

            // Auto-redirect after short delay
            setTimeout(() => router.back(), 2000);

        } catch (error) {
            console.error(error);
            toast.error("Failed to send feedback. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center max-w-sm animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Thank You!</h1>
                    <p className="text-slate-500">
                        Your feedback has been received. We appreciate your help in making Habitisim better!
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="mt-8 text-violet-600 font-bold hover:underline"
                    >
                        Return to Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 px-6 py-4 flex items-center gap-4 border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-800">Feedback</h1>
            </header>

            <main className="max-w-md mx-auto p-6">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">We'd love to hear from you.</h2>
                    <p className="text-slate-500 text-sm">
                        Found a bug? Have a feature request? Or just want to say hi? Let us know below.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Type Selector */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
                            { id: 'feature', label: 'Idea', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
                            { id: 'general', label: 'General', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isSelected = type === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setType(item.id as any)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                                            ? `${item.bg} ${item.border} border-opacity-100 ring-2 ring-violet-100`
                                            : 'bg-white border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <Icon className={`w-6 h-6 ${item.color}`} />
                                    <span className={`text-xs font-bold ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                            Your Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={
                                type === 'bug' ? "Describe what happened and how we can reproduce it..." :
                                    type === 'feature' ? "What would make this app even better?" :
                                        "Anything on your mind..."
                            }
                            className="w-full h-40 p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-50 transition-all resize-none font-medium text-slate-700 placeholder:text-slate-300"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !message.trim()}
                        className="w-full py-4 rounded-2xl bg-violet-600 text-white font-bold text-lg shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Sending...</span>
                        ) : (
                            <>
                                <span>Send Feedback</span>
                                <Send className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        We review every message. Thank you for your support!
                    </p>
                </form>
            </main>
        </div>
    );
}
