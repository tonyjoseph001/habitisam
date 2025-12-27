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

    // Determine Logic/Display based on Type
    const isPercentage = goal.type === 'checklist' || goal.type === 'slider' || goal.unit === '%';
    const max = goal.target > 0 ? goal.target : 100;
    const label = goal.type === 'checklist' ? 'Progress' :
        goal.type === 'slider' ? 'Confidence' :
            goal.type === 'timer' ? 'Time Logged' :
                goal.type === 'savings' ? 'Saved' : 'Count';

    // Display Value Formatting
    const displayValue = isPercentage
        ? `${Math.round((localValue / max) * 100)}%`
        : goal.type === 'savings' ? `$${localValue}`
            : `${localValue} / ${max} ${goal.unit || (goal.type === 'timer' ? 'm' : '')}`;

    return (
        <>
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wide">{label}</span>
                <span className={`text-xs font-bold ${colors.text}`}>{displayValue}</span>
            </div>
            <input
                type="range"
                min="0"
                max={max}
                className={`w-full h-3 rounded-full appearance-none cursor-pointer bg-black/20 accent-white border border-white/10 relative z-10`}
                style={{
                    background: `linear-gradient(to right, white 0%, white ${(localValue / max) * 100}%, rgba(0,0,0,0.2) ${(localValue / max) * 100}%, rgba(0,0,0,0.2) 100%)`
                }}
                value={localValue}
                onChange={handleChange}
                onMouseUp={handleCommit}
                onTouchEnd={handleCommit}
                disabled={goal.status !== 'active'}
                step={goal.type === 'savings' ? 0.01 : 1}
            />
        </>
    );
}
