"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { Bell, Star, ChevronLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';

export default function ChildHeader({ showBack = false }: { showBack?: boolean }) {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);

    // Live Profile Data to catch Star updates
    const liveProfile = useLiveQuery(
        async () => activeProfile ? await db.profiles.get(activeProfile.id) : null,
        [activeProfile?.id]
    );

    if (!activeProfile) return null;

    const displayProfile = liveProfile || activeProfile;
    const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayProfile.name}&clothing=graphicShirt`;

    return (
        <>
            <div className="px-6 pt-8 pb-4 flex justify-between items-center bg-transparent z-20 relative">
                {/* Left: Back + Avatar/Switcher */}
                <div className="flex items-center gap-2">
                    {showBack && (
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 shadow-sm transition-colors active:scale-95"
                        >
                            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                        </button>
                    )}

                    <button
                        onClick={() => setIsProfileSwitcherOpen(true)}
                        className="flex items-center gap-3 bg-white pl-1 pr-4 py-1 rounded-full shadow-sm active:scale-95 transition-transform"
                    >
                        <div className="w-10 h-10 rounded-full bg-yellow-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-inset ring-black/5">
                            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 leading-none">Playing as</div>
                            <div className="text-sm font-bold text-gray-800 leading-none">{displayProfile.name}</div>
                        </div>
                    </button>
                </div>

                {/* Right: Notifications & Stars */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/child/notifications')}
                        className="bg-white p-2.5 rounded-full shadow-sm text-gray-500 relative transition-transform active:scale-95"
                    >
                        <Bell className="w-6 h-6" />
                        {/* We could allow passing "notificationCount" prop if needed later */}
                    </button>

                    {/* Currency / Stats */}
                    <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                        <span className="text-sm font-bold text-gray-700 font-mono">{displayProfile.stars || 0}</span>
                    </div>
                </div>
            </div>

            <ProfileSwitcherModal
                isOpen={isProfileSwitcherOpen}
                onClose={() => setIsProfileSwitcherOpen(false)}
            />
        </>
    );
}
