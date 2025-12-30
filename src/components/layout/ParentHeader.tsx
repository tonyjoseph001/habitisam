import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Bell, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { ProfileSwitcherModal } from '@/components/domain/ProfileSwitcherModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/hooks/useAuth';

interface ParentHeaderProps {
    title: string | React.ReactNode;
    rightAction?: React.ReactNode;
}

export function ParentHeader({ title, rightAction }: ParentHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    const accountId = user?.uid || activeProfile?.accountId;

    // Count pending notifications
    const notificationCount = useLiveQuery(async () => {
        if (!accountId) return 0;

        const pendingGoals = await db.goals.where('status').equals('pending_approval').count();
        const pendingPurchases = await db.purchaseLogs.where({ accountId, status: 'pending' }).count();
        const unseenCompletions = await db.activityLogs
            .where('accountId')
            .equals(accountId)
            .filter(log => log.status === 'completed' && !log.seenByParent)
            .count();

        return pendingGoals + pendingPurchases + unseenCompletions;
    }, [accountId]);

    return (
        <>
            <header className="px-4 pt-[calc(max(env(safe-area-inset-top),25px)+0.75rem)] pb-3 flex items-center justify-between bg-white shadow-sm sticky top-0 z-30 border-b border-slate-200">
                {/* Left: Profile Switcher */}
                <button
                    onClick={() => setIsSwitcherOpen(true)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
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
                    {/* Notification Bell */}
                    <Link href="/parent/notifications" className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative">
                        <Bell className="w-5 h-5" />
                        {(notificationCount ?? 0) > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {notificationCount! > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </Link>

                    {/* Custom Right Action or Default Settings */}
                    {rightAction ? (
                        rightAction
                    ) : (
                        <Link href="/parent/settings" className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-full">
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
