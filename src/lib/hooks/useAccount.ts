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

    useEffect(() => {
        if (!accountId) {
            setAccount(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const accountRef = doc(db, 'accounts', accountId);

        const unsubscribe = onSnapshot(accountRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    // Manual date conversion for non-timestamp fields if needed, 
                    // though Firestore hooks usually handle generic data well.
                    // We ensure 'createdAt' and 'lastLoginAt' are Dates.
                    const data = snapshot.data();
                    const typedAccount: Account = {
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                        lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt),
                        licenseExpiry: data.licenseExpiry || null // Ensure null if undefined
                    } as Account;

                    setAccount(typedAccount);
                } else {
                    setAccount(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching account:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [accountId]);

    // Derived Pro Status
    // Valid if: licenseType is 'pro' AND status is 'active' AND (expiry is null OR expiry > now)
    const isPro = account?.licenseType === 'pro' &&
        account?.subscriptionStatus === 'active' &&
        (!account.licenseExpiry || new Date(account.licenseExpiry) > new Date());

    return { account, loading, error, isPro };
}
