"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Gift, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ParentNavBar() {
    const pathname = usePathname();

    const navItems = [
        { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
        { label: 'Routines', href: '/parent/routines', icon: ListTodo },
        { label: 'Rewards', href: '/parent/rewards', icon: Gift },
        { label: 'Profiles', href: '/parent/profiles', icon: Users },
        { label: 'Reports', href: '/parent/reports', icon: BarChart3 },
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
                            "group relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors", // Added 'group' and 'relative'
                            isActive ? "text-primary" : "text-slate-400 hover:text-slate-600" // Replaced text-violet-600 with text-primary
                        )}
                    >
                        <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                        <span className={cn( // Modified span className
                            "text-[10px] font-bold mt-1 transition-colors",
                            isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                        )}>{item.label}</span>
                        {isActive && ( // Added motion.div for active indicator
                            <motion.div
                                layoutId="navIndicator"
                                className="absolute -top-3 w-12 h-1 bg-primary rounded-full shadow-[0_2px_8px_hsl(var(--primary)/0.4)]"
                            />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
