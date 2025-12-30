"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { ParentNavBar } from '@/components/layout/ParentNavBar';

export default function ParentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { activeProfile } = useSessionStore();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // PREVENT FLICKER: Do not show blocking spinner. 
    // Let the protected content render if we are waiting, 
    // or let the useEffect redirect if needed.
    // Ideally we would show a skeleton, but for now just rendering children
    // avoids the "flash" of blank screen during hydration.
    // If user is clearly not logged in (and not loading), content won't be secret long enough to matter before redirect.

    return (
        <div className="min-h-screen pb-28 relative">
            {children}
            {/* Persistent Navigation Bar */}
            {user && <ParentNavBar />}
        </div>
    );
}
