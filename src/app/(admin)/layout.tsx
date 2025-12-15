"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useAuth } from '@/lib/hooks/useAuth';

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
        // In a real app, we might also force a parent profile selection here if activeProfile is null.
        // However, the dashboard itself might be the place to pick the profile.
        // For now, simple auth check is enough.
    }, [user, loading, router]);

    if (loading) return null; // Or a spinner

    return <>{children}</>;
}
