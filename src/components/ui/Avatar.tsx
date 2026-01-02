import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
    avatarId?: string; // e.g. 'boy', 'robot', 'princess'
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    showBorder?: boolean;
}

const AVATAR_MAP: Record<string, string> = {
    'boy': '🧑‍🚀',
    'girl': '👩‍🚀',
    'superhero': '🦸',
    'superhero_girl': '🦸‍♀️',
    'ninja': '🥷',
    'wizard': '🧙',
    'princess': '👸',
    'pirate': '🏴‍☠️',
    'alien': '👽',
    'robot': '🤖',
    'dinosaur': '🦖',
    'unicorn': '🦄',
    'dragon': '🐉',
    'rocket': '🚀',
    'parent': '👤' // Fallback for parent type
};

// Deterministic gradients for specific avatars
const GRADIENT_MAP: Record<string, string> = {
    'boy': 'from-blue-400 to-indigo-500',
    'girl': 'from-pink-400 to-rose-500',
    'superhero': 'from-red-500 to-orange-600',
    'superhero_girl': 'from-fuchsia-500 to-purple-600',
    'ninja': 'from-slate-700 to-slate-900',
    'wizard': 'from-indigo-500 to-violet-700',
    'princess': 'from-pink-300 to-rose-400',
    'pirate': 'from-red-700 to-slate-900',
    'alien': 'from-green-400 to-emerald-600',
    'robot': 'from-cyan-400 to-blue-500',
    'dinosaur': 'from-lime-500 to-green-700',
    'unicorn': 'from-purple-300 to-pink-400',
    'dragon': 'from-orange-500 to-red-600',
    'rocket': 'from-sky-400 to-blue-600',
};

const SIZE_CLASSES = {
    'sm': 'w-8 h-8 text-sm',
    'md': 'w-10 h-10 text-xl',
    'lg': 'w-14 h-14 text-3xl',
    'xl': 'w-20 h-20 text-5xl',
    '2xl': 'w-24 h-24 text-6xl',
};

export function Avatar({ avatarId, size = 'md', className, showBorder = true }: AvatarProps) {
    const emoji = AVATAR_MAP[avatarId || ''] || (avatarId === 'child' ? '🧒' : '👤');

    // Default gradient if no match (e.g. parent or new avatar)
    const gradient = GRADIENT_MAP[avatarId || ''] || 'from-slate-100 to-slate-200';
    const isParentOrPlain = !GRADIENT_MAP[avatarId || ''];

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center relative shrink-0 transition-transform",
                // Base styles
                SIZE_CLASSES[size],
                // Gradient or plain bg
                isParentOrPlain ? "bg-slate-100 border border-slate-200" : `bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/10`,
                // Border ring
                showBorder && !isParentOrPlain && "ring-4 ring-white",
                className
            )}
        >
            <span className="leading-none select-none filter drop-shadow-sm transform hover:scale-110 transition-transform duration-200">
                {emoji}
            </span>
        </div>
    );
}
