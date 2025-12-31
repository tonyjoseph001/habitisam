"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Bell, Star, ChevronLeft } from 'lucide-react';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useInbox } from '@/lib/hooks/useInbox';

export default function ChildHeader({ showBack = false, title }: { showBack?: boolean; title?: string }) {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);

    const { profiles } = useProfiles();
    const { inboxItems } = useInbox(activeProfile?.id);

    // Live Profile Data to catch Star updates AND Pending Rewards
    const currentProfile = profiles.find(p => p.id === activeProfile?.id);
    const pendingCount = inboxItems?.filter(r => r.status === 'pending').length || 0;

    const displayProfile = currentProfile ? { ...currentProfile, pendingRewardCount: pendingCount } : activeProfile ? { ...activeProfile, pendingRewardCount: pendingCount } : null;

    if (!activeProfile || !displayProfile) return null;

    const getAvatarEmoji = (avatarId?: string) => {
        switch (avatarId) {
            case 'boy': return '🧑‍🚀';
            case 'girl': return '👩‍🚀';
            case 'superhero': return '🦸';
            case 'superhero_girl': return '🦸‍♀️';
            case 'ninja': return '🥷';
            case 'wizard': return '🧙';
            case 'princess': return '👸';
            case 'pirate': return '🏴‍☠️';
            case 'alien': return '👽';
            case 'robot': return '🤖';
            case 'dinosaur': return '🦖';
            case 'unicorn': return '🦄';
            case 'dragon': return '🐉';
            case 'rocket': return '🚀';
            default: return '👶';
        }
    };

    const avatarEmoji = getAvatarEmoji(displayProfile.avatarId);

    return (
        <>
            <div className="w-full z-50 px-6 pt-[calc(max(env(safe-area-inset-top),25px)+1rem)] pb-4 flex justify-between items-center bg-[#EEF2FF] backdrop-blur-sm transition-all">
                {/* Left: Back + Avatar/Switcher */}
                {/* Left: Avatar/Switcher (Always Visible) */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsProfileSwitcherOpen(true)}
                        className="flex items-center gap-3 bg-white pl-1 pr-4 py-1 rounded-full shadow-sm active:scale-95 transition-transform"
                    >
                        <div className="w-10 h-10 rounded-full bg-yellow-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-inset ring-black/5 flex items-center justify-center text-xl">
                            {avatarEmoji}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-800 leading-none">{displayProfile.name}</div>
                        </div>
                    </button>
                </div>

                {/* Center: Title (Optional) */}
                {title && (
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <h1 className="text-lg font-black text-slate-800 tracking-tight">{title}</h1>
                    </div>
                )}

                {/* Right: Notifications */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/child/notifications')}
                        className="bg-white p-2.5 rounded-full shadow-sm text-gray-500 relative transition-transform active:scale-95 group"
                    >
                        <Bell className="w-6 h-6 group-hover:text-indigo-500 transition-colors" />

                        {/* Notification Counter */}
                        {(displayProfile.pendingRewardCount || 0) > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                {(displayProfile.pendingRewardCount || 0)}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <ProfileSwitcherModal
                isOpen={isProfileSwitcherOpen}
                onClose={() => setIsProfileSwitcherOpen(false)}
            />
        </>
    );
}
