"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firestore/core';
import { Account } from '@/lib/db';
import { useAuth } from './useAuth';
import { useSessionStore } from '@/lib/store/useSessionStore';

interface UseAccountResult {
    account: Account | null;
    loading: boolean;
    error: Error | null;
    isPro: boolean;
}

export function useAccount(): UseAccountResult {
    const { user } = useAuth();
    const { activeProfile } = useSessionStore();

    // Prioritize the profile's linked account (Household ID). 
    // Fallback to Auth User ID if logged in as parent but no profile selected yet.
    const accountId = activeProfile?.accountId || user?.uid;

    const [account, setAccount] = useState<Account | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const processSnapshot = (snapshot: any) => {
        const data = snapshot.data();
        const typedAccount: Account = {
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt),
            licenseExpiry: data.licenseExpiry || null
        } as Account;
        setAccount(typedAccount);
        setLoading(false);
    };

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const setupSubscription = async () => {
            // Case 1: Active Profile Context (Explicit)
            if (activeProfile?.accountId) {
                setLoading(true);
                const { doc, onSnapshot } = await import('firebase/firestore');
                unsubscribe = onSnapshot(doc(db, 'accounts', activeProfile.accountId),
                    (snap) => {
                        if (snap.exists()) processSnapshot(snap);
                        else { setAccount(null); setLoading(false); }
                    },
                    (err) => { setError(err); setLoading(false); }
                );
                return;
            }

            // Case 2: Parent Global View (Find my household)
            if (!user?.uid) {
                setAccount(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            const { query, collection, where, limit, onSnapshot } = await import('firebase/firestore');

            const q = query(
                collection(db, 'accounts'),
                where('members', 'array-contains', user.uid),
                limit(1)
            );

            unsubscribe = onSnapshot(q,
                (snapshot) => {
                    if (!snapshot.empty) {
                        processSnapshot(snapshot.docs[0]);
                    } else {
                        // Fallback: If array-contains didn't work (e.g. legacy account not synced yet), 
                        // try direct ID match if uid exists in accounts (Owner).
                        // Note: To do this properly, we'd need a secondary fallback query or just rely on AccountService.sync to fix it.
                        // For now, we return null to avoid infinite loops. The Sync logic usually runs on login.
                        setAccount(null);
                        setLoading(false);
                    }
                },
                (err) => { setError(err); setLoading(false); }
            );
        };

        setupSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user?.uid, activeProfile?.accountId]);

    // Derived Pro Status
    // Valid if: licenseType is 'pro' AND status is 'active' AND (expiry is null OR expiry > now)
    const isPro = account?.licenseType === 'pro' &&
        account?.subscriptionStatus === 'active' &&
        (!account.licenseExpiry || new Date(account.licenseExpiry) > new Date());

    return { account, loading, error, isPro };
}
