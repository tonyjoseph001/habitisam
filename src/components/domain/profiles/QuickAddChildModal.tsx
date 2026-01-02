"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { getLimits } from '@/config/tiers';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/hooks/useAuth';

const AVATARS = [
    { id: 'boy', label: 'Boy', icon: '🧑‍🚀' },
    { id: 'girl', label: 'Girl', icon: '👩‍🚀' },
    { id: 'superhero', label: 'Superhero', icon: '🦸' },
    { id: 'superhero_girl', label: 'Superhero Girl', icon: '🦸‍♀️' },
    { id: 'ninja', label: 'Ninja', icon: '🥷' },
    { id: 'wizard', label: 'Wizard', icon: '🧙' },
    { id: 'princess', label: 'Princess', icon: '👸' },
    { id: 'pirate', label: 'Pirate', icon: '🏴‍☠️' },
    { id: 'alien', label: 'Alien', icon: '👽' },
    { id: 'robot', label: 'Robot', icon: '🤖' },
    { id: 'dinosaur', label: 'Dinosaur', icon: '🦖' },
    { id: 'unicorn', label: 'Unicorn', icon: '🦄' },
];

interface QuickAddChildModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileCreated: (profileId: string) => void;
}

export function QuickAddChildModal({ isOpen, onClose, onProfileCreated }: QuickAddChildModalProps) {
    const { user } = useAuth();
    const { profiles, addProfile } = useProfiles();
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('boy');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            // --- LIMIT CHECK ---
            const childCount = profiles.filter(p => p.type === 'child').length;
            const account = await db.accounts.get(user.uid);
            const license = account?.licenseType || 'free';
            const limits = getLimits(license);

            if (childCount >= limits.maxChildren) {
                toast.error(`Free tier limit reached (${limits.maxChildren} children). Upgrade to add more!`);
                onClose(); // Close modal so they can navigate if they want
                // Optionally could redirect or show upgrade modal here
                return;
            }

            const newId = await addProfile(name.trim(), 'child', selectedAvatar, undefined, undefined, dob || undefined);
            toast.success("Child profile created!");
            onProfileCreated(newId);
            onClose();
            setName(''); // Reset
            setDob('');
            setSelectedAvatar('boy');
        } catch (e) {
            console.error(e);
            toast.error("Failed to create profile");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Child Profile">
            <div className="p-4 pt-0 gap-6 flex flex-col">
                {/* Name */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Child's Name</label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ethan"
                        className="bg-slate-50 border-slate-200 font-bold"
                        autoFocus
                    />
                </div>

                {/* Date of Birth (Optional) */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth (Optional)</label>
                    <Input
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                        className="bg-slate-50 border-slate-200 font-bold block w-full"
                        onClick={(e) => e.currentTarget.showPicker()}
                    />
                </div>

                {/* Avatar */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Avatar</label>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                        {AVATARS.map(avatar => {
                            const isSelected = selectedAvatar === avatar.id;
                            return (
                                <button
                                    key={avatar.id}
                                    onClick={() => setSelectedAvatar(avatar.id)}
                                    className={cn(
                                        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white border-2 transition-all relative",
                                        isSelected
                                            ? "border-primary shadow-md scale-105"
                                            : "border-slate-100 opacity-70 hover:opacity-100"
                                    )}
                                >
                                    {avatar.icon}
                                    {isSelected && (
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-white">
                                            <Check className="w-2 h-2" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={!name.trim() || isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-base shadow-lg shadow-primary/20 mt-2"
                >
                    {isSubmitting ? 'Creating...' : 'Create & Select'}
                </Button>
            </div>
        </Modal>
    );
}
