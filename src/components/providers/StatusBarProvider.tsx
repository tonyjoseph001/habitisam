"use client";

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

/**
 * StatusBarProvider
 * Initializes the Capacitor StatusBar plugin on app load
 * Sets dark status bar with light text/icons
 */
export function StatusBarProvider() {
    useEffect(() => {
        // Only run on native platforms (Android/iOS)
        if (!Capacitor.isNativePlatform()) {
            return;
        }

        const initializeStatusBar = async () => {
            try {
                // Set status bar to transparent with dark text/icons (Style.Light = Dark Content)
                await StatusBar.setStyle({ style: Style.Light });

                // Overlay webview for full-screen effect (transparent background)
                await StatusBar.setOverlaysWebView({ overlay: true });

                console.log('StatusBar initialized successfully');
            } catch (error) {
                console.error('Failed to initialize StatusBar:', error);
            }
        };

        initializeStatusBar();
    }, []);

    return null; // This component doesn't render anything
}
