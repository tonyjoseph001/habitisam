"use client";

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Activity } from '@/lib/db';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { addMinutes, parse, format, getDay } from 'date-fns';

export function NotificationScheduler() {
    const { activeProfile } = useSessionStore();

    // Track previous routines JSON to avoid re-scheduling if data is identical
    const prevRoutinesRef = useRef<string>('');

    // Fetch routines for current child
    const routines = useLiveQuery(async () => {
        if (!activeProfile || activeProfile.type !== 'child') return [];
        return await db.activities
            .where('profileIds')
            .equals(activeProfile.id)
            .filter(a => a.isActive === true) // Only active routines
            .toArray();
    }, [activeProfile?.id]);

    useEffect(() => {
        // Only run on native platforms to avoid "Not implemented on web" errors
        if (!Capacitor.isNativePlatform()) return;

        // 1. Request Permissions on mount
        const init = async () => {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }

                // Create Channel (Android Only)
                if (Capacitor.getPlatform() === 'android') {
                    await LocalNotifications.createChannel({
                        id: 'habitisam_reminders',
                        name: 'Routine Reminders',
                        description: 'Reminders for your daily tasks',
                        importance: 5, // High
                        visibility: 1, // Public
                        sound: 'default_notification_sound.wav', // or default
                        vibration: true
                    });
                }
            } catch (e) {
                console.error("Notification permission error", e);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!routines) return;
        if (!Capacitor.isNativePlatform()) return;

        const schedule = async () => {
            // Simple diff check
            const currentJson = JSON.stringify(routines.map(r => ({ id: r.id, days: r.days, date: r.date, time: r.timeOfDay, remind: r.remindMe, title: r.title, type: r.type })));
            if (currentJson === prevRoutinesRef.current) return;
            prevRoutinesRef.current = currentJson;

            try {
                // 1. Cancel ALL pending for this app to ensure clean slate
                // (Alternatively we could track IDs, but brute force cancel is safer for sync)
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.length > 0) {
                    await LocalNotifications.cancel(pending);
                }

                const notificationsToSchedule: any[] = [];

                routines.forEach(routine => {
                    // Check if reminder enabled
                    if (!routine.remindMe || routine.remindMe === 'No reminder') return;

                    // Calculate Offset Minutes
                    let offset = 0;
                    if (routine.remindMe === '5 min before') offset = -5;
                    else if (routine.remindMe === '15 min before') offset = -15;
                    // 'At start time' = 0

                    // Parse Time (Arbitrary date)
                    const now = new Date();
                    const taskTime = parse(routine.timeOfDay, 'HH:mm', now);
                    const triggerTime = addMinutes(taskTime, offset);

                    const hour = triggerTime.getHours();
                    const minute = triggerTime.getMinutes();

                    // Base notification object
                    const baseNotif = {
                        title: "It's Time! ⏰",
                        body: `Time for: ${routine.title}`,
                        channelId: 'habitisam_reminders',
                        sound: undefined, // default
                    };

                    if (routine.type === 'recurring' && routine.days) {
                        // Schedule for each day
                        routine.days.forEach(dayIndex => {
                            // Capacitor Weekday: 1=Sun (0 in JS), 2=Mon...
                            const weekday = dayIndex + 1;

                            // Generate unique ID: hash(routine.id + dayIndex)
                            // Simple hash: Sum char codes + dayIndex
                            const id = Math.abs(stringHash(routine.id) + dayIndex);

                            notificationsToSchedule.push({
                                ...baseNotif,
                                id: id,
                                schedule: {
                                    on: {
                                        weekday: weekday,
                                        hour: hour,
                                        minute: minute
                                    },
                                    allowWhileIdle: true
                                }
                            });
                        });
                    } else if (routine.type === 'one-time' && routine.date) {
                        // One Time
                        // Parse date + time
                        const targetDate = parse(`${routine.date} ${routine.timeOfDay}`, 'yyyy-MM-dd HH:mm', new Date());
                        const notifyAt = addMinutes(targetDate, offset);

                        // Only schedule if in future
                        if (notifyAt > new Date()) {
                            const id = Math.abs(stringHash(routine.id));
                            notificationsToSchedule.push({
                                ...baseNotif,
                                id: id,
                                schedule: { at: notifyAt, allowWhileIdle: true }
                            });
                        }
                    }
                });

                if (notificationsToSchedule.length > 0) {
                    await LocalNotifications.schedule({ notifications: notificationsToSchedule });
                    console.log(`Scheduled ${notificationsToSchedule.length} reminders.`);
                }

            } catch (e) {
                console.error("Scheduling error", e);
            }
        };

        schedule();
    }, [routines]);

    return null; // Render nothing
}

// Simple string hash for numeric IDs
function stringHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}
