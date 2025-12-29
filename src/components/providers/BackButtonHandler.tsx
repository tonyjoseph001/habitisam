"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { App } from '@capacitor/app';

/**
 * BackButtonHandler
 * Intercepts the native Android back button to navigate within the app
 * instead of immediately exiting.
 */
export function BackButtonHandler() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Root pages where back button should exit the app
        const rootPages = [
            '/login',
            '/child/dashboard',
            '/parent/dashboard',
            '/setup'
        ];

        const handleBackButton = () => {
            // If on a root page, allow default behavior (exit app)
            if (rootPages.includes(pathname)) {
                App.exitApp();
            } else {
                // Otherwise, navigate back in the router
                router.back();
            }
        };

        // Listen to the back button event
        let listenerHandle: any;

        App.addListener('backButton', handleBackButton).then(handle => {
            listenerHandle = handle;
        });

        // Cleanup listener on unmount
        return () => {
            if (listenerHandle) {
                listenerHandle.remove();
            }
        };
    }, [pathname, router]);

    return null; // This component doesn't render anything
}
