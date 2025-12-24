import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Bell, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ParentHeaderProps {
    title: string | React.ReactNode;
    rightAction?: React.ReactNode;
}

export function ParentHeader({ title, rightAction }: ParentHeaderProps) {
    const router = useRouter();
    const { activeProfile } = useSessionStore();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    return (
        <>
            <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm sticky top-0 z-30 border-b border-slate-200">
                {/* Left: Profile Switcher */}
                <button
                    onClick={() => setIsSwitcherOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 border border-violet-200">
                        {activeProfile?.avatarId ? (
                            <span className="text-sm font-bold">{activeProfile.name[0]}</span>
                        ) : (
                            <UserIcon className="w-4 h-4" />
                        )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {/* Center: Title / Content */}
                <div className="flex-1 flex justify-center">
                    {typeof title === 'string' ? (
                        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
                    ) : (
                        title
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Notification Bell (Visual Only for now) */}
                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>

                    {/* Custom Right Action or Default Settings */}
                    {rightAction ? (
                        rightAction
                    ) : (
                        <Link href="/parent/profiles" className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-full">
                            <Settings className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </header>

            <ProfileSwitcherModal
                isOpen={isSwitcherOpen}
                onClose={() => setIsSwitcherOpen(false)}
            />
        </>
    );
}
