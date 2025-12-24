"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, ThemeType } from '@/lib/db';

type ThemeContextType = {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeType>('default');

    // 1. Initialize from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('app-theme') as ThemeType;
        if (saved) {
            setThemeState(saved);
            applyTheme(saved);
        }
    }, []);

    // 2. Helper to apply to DOM
    const applyTheme = (t: ThemeType) => {
        const root = document.documentElement;
        if (t === 'default') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', t);
        }
    };

    // 3. Exposed Setter
    const setTheme = (t: ThemeType) => {
        setThemeState(t);
        applyTheme(t);
        localStorage.setItem('app-theme', t);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
}
