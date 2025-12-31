"use client";

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { ProfileService } from '@/lib/firestore/profiles.service';

interface StampModalProps {
    isOpen: boolean;
    onClose: () => void;
    childProfileId: string;
}

// Visual Mapping for Stamps (Virtual Assets)
// In a real app, these would be URLs or imported images.
// For now, we use high-quality Emojis or Icons wrapped in a stamp style.
const STAMP_ASSETS: Record<string, { label: string, emoji: string, color: string }> = {
    'star': { label: 'Champion Star', emoji: '⭐', color: 'bg-yellow-100 text-yellow-500 border-yellow-200' },
    'rocket': { label: 'Space Explorer', emoji: '🚀', color: 'bg-blue-100 text-blue-500 border-blue-200' },
    'planet': { label: 'Cosmic Planet', emoji: '🪐', color: 'bg-purple-100 text-purple-500 border-purple-200' },
    'bear': { label: 'Happy Bear', emoji: '🐻', color: 'bg-amber-100 text-amber-600 border-amber-200' },
    'robot': { label: 'Techno Bot', emoji: '🤖', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'unicorn': { label: 'Magic Unicorn', emoji: '🦄', color: 'bg-pink-100 text-pink-500 border-pink-200' },
    'dino': { label: 'T-Rex Info', emoji: '🦖', color: 'bg-green-100 text-green-600 border-green-200' },
    'crown': { label: 'Royal Crown', emoji: '👑', color: 'bg-orange-100 text-orange-500 border-orange-200' },
};

export function StampModal({ isOpen, onClose, childProfileId }: StampModalProps) {
    console.log("StampModal Rendered. Open:", isOpen, "ProfileID:", childProfileId);

    const { profiles } = useProfiles();
    const profile = profiles.find(p => p.id === childProfileId);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        console.log("StampModal Mounted");
    }, []);

    const handleSelectStamp = async (stampId: string) => {
        console.log("Selecting stamp:", stampId);
        if (!profile) return;
        try {
            await ProfileService.update(childProfileId, { activeStamp: stampId });
            onClose();
        } catch (e) {
            console.error("Failed to update stamp", e);
        }
    };

    if (!mounted) return null;

    // Portal is REQUIRED because parent Layout has Framer Motion (transforms)
    // which trap 'fixed' positioning.
    return createPortal(
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    {/* Backdrop - High Contrast Debug Color if needed, using dark overlay normally */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => { console.log("Backdrop clicked"); onClose(); }}
                    />

                    {/* Modal */}
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden transform transition-all">
                        <div className="bg-[#EEF2FF] px-6 py-4 flex items-center justify-between border-b border-indigo-50">
                            <div>
                                <h2 className="text-xl font-extrabold text-[#3B82F6]">My Stamp Book</h2>
                                <p className="text-xs font-bold text-slate-400">Tap to equip a stamp!</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                            {profile?.unlockedStamps?.map((stampId) => {
                                const asset = STAMP_ASSETS[stampId] || STAMP_ASSETS['star'];
                                const isActive = profile.activeStamp === stampId;

                                return (
                                    <button
                                        key={stampId}
                                        onClick={() => handleSelectStamp(stampId)}
                                        className={`relative aspect-square rounded-full flex items-center justify-center text-3xl shadow-sm border-4 transition-all ${isActive ? 'ring-4 ring-indigo-200 scale-105 z-10' : ''}`}
                                    >
                                        <div className={`w-full h-full rounded-full flex items-center justify-center border-2 border-white border-dashed ${asset.color}`}>
                                            {asset.emoji}
                                        </div>
                                        {isActive && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-white shadow-md">
                                                <Check className="w-3 h-3" strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                );
                            }) || (
                                    <p className="col-span-3 text-center text-slate-400 text-sm py-8">
                                        Loading stamps...
                                    </p>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
}
