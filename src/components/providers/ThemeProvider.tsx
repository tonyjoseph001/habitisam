"use client";

import React, { useEffect } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { activeProfile } = useSessionStore();

    useEffect(() => {
        // Default to 'light' or base if no profile
        const theme = activeProfile?.theme || 'light';

        // Apply to document element or body
        document.documentElement.setAttribute('data-theme', theme);

        // Also toggle a class for Tailwind 'dark' mode if needed, though we use data-attributes
        if ((theme as string) === 'cosmic' || (theme as string) === 'enchanted') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

    }, [activeProfile]);

    return <>{children}</>;
}
