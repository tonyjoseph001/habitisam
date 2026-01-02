"use client";

import React, { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { SystemService, RemoteSystemConfig } from '@/lib/firestore/system.service';
import { AlertCircle, Download, Hammer } from 'lucide-react';

// Semantic Version Comparison
// Returns true if v1 < v2
const isOutdated = (current: string, required: string) => {
    const v1 = current.split('.').map(Number);
    const v2 = required.split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const n1 = v1[i] || 0;
        const n2 = v2[i] || 0;
        if (n1 < n2) return true;
        if (n1 > n2) return false;
    }
    return false; // Equal
};

export default function VersionGuard({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<RemoteSystemConfig | null>(null);
    const [status, setStatus] = useState<'loading' | 'ok' | 'force_update' | 'maintenance'>('loading');

    useEffect(() => {
        const checkSystem = async () => {
            const data = await SystemService.getConfig();

            if (!data) {
                setStatus('ok'); // Default to OK if offline/missing
                return;
            }

            setConfig(data);

            // 1. Check Maintenance Mode
            if (data.maintenanceMode) {
                setStatus('maintenance');
                return;
            }

            // 2. Check Force Update
            if (data.minSupportedVersion && isOutdated(APP_CONFIG.version, data.minSupportedVersion)) {
                setStatus('force_update');
                return;
            }

            setStatus('ok');
        };

        checkSystem();
    }, []);

    const handleUpdate = () => {
        // Platform detection could go here
        const url = /android/i.test(navigator.userAgent) ? APP_CONFIG.paddingStoreUrl : APP_CONFIG.appStoreUrl;
        window.open(url, '_blank');
    };

    if (status === 'loading') return <>{children}</>; // Don't block loading
    if (status === 'ok') return <>{children}</>;

    // --- BLOCKING SCREENS ---

    if (status === 'maintenance') {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="max-w-md">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Hammer className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-4">Under Maintenance</h1>
                    <p className="text-slate-400 font-medium">
                        {config?.maintenanceMessage || "We're currently performing scheduled maintenance. Please check back shortly!"}
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'force_update') {
        return (
            <div className="fixed inset-0 z-[9999] bg-violet-900 flex items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white rounded-3xl p-8 shadow-2xl">
                    <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Download className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Update Required</h1>
                    <p className="text-slate-500 font-medium mb-8">
                        The version you are using ({APP_CONFIG.version}) is no longer supported.
                        Please update to the latest version to continue using Habitisim.
                    </p>

                    <button
                        onClick={handleUpdate}
                        className="w-full bg-violet-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
                    >
                        <span>Update Now</span>
                    </button>

                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600"
                    >
                        Check Again
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
