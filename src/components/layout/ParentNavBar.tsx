"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Gift, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ParentNavBar() {
    const pathname = usePathname();

    const navItems = [
        { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
        { label: 'Routines', href: '/parent/routines', icon: ListTodo },
        { label: 'Rewards', href: '/parent/rewards', icon: Gift },
        { label: 'Settings', href: '/parent/settings', icon: Settings },
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
                            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                            isActive ? "text-violet-600" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
