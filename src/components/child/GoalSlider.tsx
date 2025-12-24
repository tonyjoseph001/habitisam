"use client";

import React, { useState, useEffect } from 'react';
import { type Goal } from '@/lib/db';

interface GoalSliderProps {
    goal: Goal;
    colors: any; // TwColors object
    onUpdate: (val: number) => void;
}

export function GoalSlider({ goal, colors, onUpdate }: GoalSliderProps) {
    const [localValue, setLocalValue] = useState(goal.current);

    useEffect(() => {
        setLocalValue(goal.current);
    }, [goal.current]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(Number(e.target.value));
    };

    const handleCommit = () => {
        if (localValue !== goal.current) {
            onUpdate(localValue);
        }
    };

    return (
        <>
            <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-gray-400">Confidence</span>
                <span className={`text-xs font-bold ${colors.text}`}>{localValue}%</span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-${colors.accent.replace('bg-', '')}`}
                value={localValue}
                onChange={handleChange}
                onPointerUp={(e) => {
                    handleCommit();
                    // releasePointerCapture can throw if called when not capturing
                    try {
                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                        }
                    } catch (err) {
                        // ignore
                    }
                }}
                disabled={goal.status !== 'active'}
            />
        </>
    );
}
