"use client";

import { useEffect, useRef } from 'react';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export function TaskNotificationListener() {
    const { activeProfile } = useSessionStore();
    const { routines } = useRoutines();

    // Store mapped set of IDs to detect new ones
    const knownTaskIdsRef = useRef<Set<string>>(new Set());
    const isFirstRun = useRef(true);

    // 1. Request Permissions on Mount
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            LocalNotifications.checkPermissions().then(async (perm) => {
                if (perm.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
            });
        }
    }, []);

    // 2. Diffing Logic
    useEffect(() => {
        if (!activeProfile || !routines) return;

        // Filter routines relevant to this child (using the fix we just made)
        const myRoutines = routines.filter(r => r.profileIds?.includes(activeProfile.id));
        const currentIds = new Set(myRoutines.map(r => r.id));

        // Skip alerting on initial load
        if (isFirstRun.current) {
            knownTaskIdsRef.current = currentIds;
            isFirstRun.current = false;
            return;
        }

        // Detect New Tasks
        const newTasks = myRoutines.filter(r => !knownTaskIdsRef.current.has(r.id));

        newTasks.forEach(task => {
            // Only alert if created recently (e.g., last 5 minutes) to avoid spamming old syncs
            const createdAt = new Date(task.createdAt || 0); // Handle Firestore Timestamps if needed
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

            // Check if it's actually new-ish
            if (createdAt > fiveMinsAgo) {
                console.log("🔔 New Task Detected:", task.title);
                triggerNotification(task.title);
            }
        });

        // Update Ref
        knownTaskIdsRef.current = currentIds;

    }, [routines, activeProfile]);

    const triggerNotification = async (taskTitle: string) => {
        // 1. Sound Effect (HTML5 Audio for Web/Hybrid overlap)
        try {
            const audio = new Audio('/assets/sounds/notification_ping.mp3'); // We need to ensure this asset exists
            audio.play().catch(e => console.error("Audio Play Error", e));
        } catch (e) { }

        // 2. Native Notification
        if (Capacitor.isNativePlatform()) {
            await LocalNotifications.schedule({
                notifications: [{
                    title: "New Mission! 🚀",
                    body: `New task assigned: ${taskTitle}`,
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 100) }, // Immediate
                    sound: 'beban.wav', // Default or custom
                    actionTypeId: "",
                    extra: null
                }]
            });
        } else {
            // Web Fallback
            toast.info(`New Mission: ${taskTitle}`, {
                icon: '🚀',
                duration: 5000
            });
        }
    };

    return null; // Logic only component
}
