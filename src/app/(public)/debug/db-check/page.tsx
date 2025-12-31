"use client";

import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firestore/core';

export default function DbCheckPage() {
    const [status, setStatus] = useState("Ready");
    const [err, setErr] = useState("");

    const testWrite = async () => {
        setStatus("Writing...");
        setErr("");
        try {
            console.log("Testing write with shared DB:", db);
            const ref = doc(db, 'db_check', 'test_' + Date.now());
            await setDoc(ref, { success: true, method: 'shared_db' });
            setStatus("Success! Check Emulator UI.");
        } catch (e: any) {
            console.error(e);
            setStatus("Failed");
            setErr(e.message);
        }
    };

    return (
        <div className="p-10 space-y-4">
            <h1 className="text-xl font-bold">Shared DB Connection Check</h1>
            <p>Database ID: {db.app.options.projectId} / {db.databaseId}</p>
            <button 
                onClick={testWrite}
                className="px-4 py-2 bg-green-600 text-white rounded"
            >
                Test Write with Shared DB
            </button>
            <div className="font-mono">{status}</div>
            {err && <div className="text-red-500 font-mono text-sm">{err}</div>}
        </div>
    );
}
