"use client";

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const REMINDER_ID = 88888; // Fixed ID for the daily reminder

export function ParentNotificationListener() {
    const { activeProfile } = useSessionStore();
    const lastSettingRef = useRef<boolean | undefined>(undefined);

    useEffect(() => {
        if (!activeProfile || activeProfile.type !== 'parent') return;

        const isEnabled = activeProfile.settings?.dailyReminders ?? false; // Default off

        // Debounce/Diff: Only act if setting actually changed
        if (lastSettingRef.current === isEnabled) return;
        lastSettingRef.current = isEnabled;

        const syncNotifications = async () => {
            // Only run on Native for now (Web support is tricky with recurring)
            if (!Capacitor.isNativePlatform()) return;

            if (isEnabled) {
                // 1. Check Perms
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    const req = await LocalNotifications.requestPermissions();
                    if (req.display !== 'granted') return;
                }

                // 2. Schedule
                console.log("🔔 Scheduling Daily Reminder for 8:00 PM");
                await LocalNotifications.schedule({
                    notifications: [{
                        id: REMINDER_ID,
                        title: "Check in on your kids! 🌙",
                        body: "Take a moment to review today's progress and approve any rewards.",
                        schedule: {
                            on: { hour: 20, minute: 0 }, // 8:00 PM
                            allowWhileIdle: true
                        },
                        sound: 'beban.wav',
                        actionTypeId: "",
                        extra: null
                    }]
                });
                // toast.success("Daily reminder set for 8:00 PM"); // Optional feedback
            } else {
                // Cancel if exists
                console.log("🔕 Canceling Daily Reminder");
                await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
            }
        };

        syncNotifications();

    }, [activeProfile?.settings?.dailyReminders]); // specific deep dependency

    return null;
}
