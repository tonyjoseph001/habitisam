import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
    avatarId?: string; // e.g. 'boy', 'robot', 'princess'
    name?: string;     // For initials fallback
    type?: 'parent' | 'child'; // To determine fallback style
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
    // Removed parent fallbacks to use Icon/Initials instead
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

const ICON_SIZES = {
    'sm': 'w-4 h-4',
    'md': 'w-5 h-5',
    'lg': 'w-7 h-7',
    'xl': 'w-10 h-10',
    '2xl': 'w-12 h-12',
};

export function Avatar({ avatarId, name, type, size = 'md', className, showBorder = true }: AvatarProps) {
    const mapEntry = AVATAR_MAP[avatarId || ''];
    let content: React.ReactNode = mapEntry;

    // Gradient logic
    const gradient = GRADIENT_MAP[avatarId || ''];
    const isCustomAvatar = !!gradient;

    // Fallback Logic
    if (!content) {
        if (type === 'parent' || avatarId?.startsWith('parent')) {
            if (name) {
                // Show Initials for Parent if name exists
                content = <span className="font-bold">{name[0].toUpperCase()}</span>;
            } else {
                // Show User Icon
                content = <User className={cn(ICON_SIZES[size], "text-violet-600")} />;
            }
        } else {
            // Child Default
            content = '🧒';
        }
    }

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center relative shrink-0 transition-transform",
                // Base styles
                SIZE_CLASSES[size],
                // Gradient or plain bg
                isCustomAvatar ? `bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/10` : "bg-violet-50 border border-violet-100 text-violet-700",
                // Border ring
                showBorder && isCustomAvatar && "ring-4 ring-white",
                className
            )}
        >
            <span className="leading-none select-none filter drop-shadow-sm transform hover:scale-110 transition-transform duration-200 flex items-center justify-center">
                {content}
            </span>
        </div>
    );
}
