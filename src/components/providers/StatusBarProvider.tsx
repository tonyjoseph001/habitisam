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
                // Set status bar to dark background with light text/icons
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#1e293b' });

                // Don't overlay the webview - push content down instead
                await StatusBar.setOverlaysWebView({ overlay: false });

                console.log('StatusBar initialized successfully');
            } catch (error) {
                console.error('Failed to initialize StatusBar:', error);
            }
        };

        initializeStatusBar();
    }, []);

    return null; // This component doesn't render anything
}
