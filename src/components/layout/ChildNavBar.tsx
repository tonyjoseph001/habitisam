"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Gift, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ChildNavBar() {
    const pathname = usePathname();

    const navItems = [
        { label: 'Home', href: '/child/dashboard', icon: Home },
        { label: 'Goals', href: '/child/goals', icon: Target },
        { label: 'Rewards', href: '/child/rewards', icon: Gift },
        { label: 'Activity', href: '/child/activity', icon: Clock },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around pb-safe-bottom z-40">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "group relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                            isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600" // Using indigo-600 to match child theme (or primary?)
                        )}
                    >
                        <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                        <span className={cn(
                            "text-[10px] font-bold mt-1 transition-colors",
                            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                        )}>{item.label}</span>
                        {isActive && (
                            <motion.div
                                layoutId="childNavIndicator" // Distinct ID
                                className="absolute -top-3 w-12 h-1 bg-indigo-600 rounded-full shadow-[0_2px_8px_rgba(79,70,229,0.4)]"
                            />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
