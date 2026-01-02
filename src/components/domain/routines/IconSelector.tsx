"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

// Define Premium Icons that actually exist in the categories
// We lock some desirable emojis to create value
// Define Premium Icons that actually exist in the categories
// We lock some desirable emojis to create value
const PREMIUM_ICONS = [
    // SPECIAL / FANTASY
    '👑', '💎', '🚀', '🦄', '🦁', '🦖', '🎢', '🏰', '🏎️', '🚁', '🏆', '🥇', '🌈', '🔥', '✨', '🧜‍♀️', '🧞‍♂️', '🦸', '🦹', '🐉',

    // TREATS & FOOD
    '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍫', '🍿', '🧁', '🥤',

    // FUN & GAMES
    '🎮', '🕹️', '📺', '📱', '🎧', '🎬', '🎲', '🧩', '🧸',

    // SPORTS & ACTION
    '⚽', '🏀', '🏊', '🤸', '🛹', '🚲', '🛴', '🥋', '🥊'
];

const ROUTINE_CATEGORIES = [
    {
        id: 'morning',
        label: 'Morning',
        icons: ['☀️', '🌅', '⏰', '🛏️', '🍳', '🥞', '🥣', '🥪', '🥛', '👕', '👟', '🎒', '🚌', '🔒']
    },
    {
        id: 'hygiene',
        label: 'Hygiene',
        icons: ['🛁', '🚿', '🚽', '🧼', '🧽', '💦', '🪥', '🦷', '💇', '🧴', '💅', '💊']
    },
    {
        id: 'chores',
        label: 'Chores',
        icons: ['🧹', '🧺', '🛏️', '🧸', '🗑️', '🍽️', '🧼', '👕', '🪴', '🌱', '🐶', '🐕', '🐈']
    },
    {
        id: 'school',
        label: 'School',
        icons: ['📚', '📖', '✏️', '🖍️', '✍️', '📝', '🎨', '🧠', '🚌', '🏫', '🧑‍🏫', '🎒', '📎', '💻', '🎯', '⏸️']
    },
    {
        id: 'food',
        label: 'Food',
        icons: ['🍎', '🍌', '🥕', '🥦', '🍕', '🍔', '🥪', '🍳', '🍽️', '🥨', '🥤', '💧', '🍪']
    },
    {
        id: 'activities',
        label: 'Activities',
        icons: ['⚽', '🏀', '🚲', '🛴', '🎨', '🎹', '🎵', '🎮', '🤸', '🩰', '🏊', '🛝', '💃', '🧩', '✨', '🚶']
    },
    {
        id: 'bedtime',
        label: 'Bedtime',
        icons: ['🌙', '⭐', '💤', '😴', '📖', '📕', '🧸', '🛌', '👚', '🥛', '🌃', '🦉', '🕯️', '😌', '🌬️', '👨‍👩‍👧']
    },
    {
        id: 'feelings',
        label: 'Feelings & Misc',
        icons: ['😊', '❤️', '⭐', '🏆', '👑', '🌈', '🔥', '🎁', '👍', '🚩', '😌', '✨']
    }
];

const REWARD_CATEGORIES = [
    {
        id: 'instant',
        label: 'Instant Rewards',
        icons: ['⭐', '🌟', '🎉', '🎈', '🏅', '🏆', '💎', '🎖️', '✨', '👍']
    },
    {
        id: 'treats',
        label: 'Treats & Fun',
        icons: ['🍬', '🍪', '🍫', '🍦', '🍭', '🍿', '🧁', '🍩', '🥤', '🍕', '🍔']
    },
    {
        id: 'screen',
        label: 'Screen & Play',
        icons: ['🎮', '📺', '📱', '🎧', '🎬', '🕹️', '🎲', '🧩', '🧸', '🎨']
    },
    {
        id: 'activity',
        label: 'Activity-Based',
        icons: ['🏃', '🛝', '⚽', '🚲', '🏊', '🤸', '🧗', '🏕️', '🌳', '🐶', '🎯']
    },
    {
        id: 'emotional',
        label: 'Emotional & Social',
        icons: ['💖', '❤️', '😊', '🤗', '🌈', '👏', '🎵', '👨‍👩‍👧', '🧠', '🌟', '🙌']
    }
];

// Helper to render either Lucide icon or Emoji string
const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    // @ts-ignore
    const LucideIcon = Icons[name];
    if (LucideIcon) return <LucideIcon className={className} />;

    // Fallback for Emojis or invalid names
    // Check if it's likely an emoji (non-alphanumeric usually)
    const isEmoji = !/^[A-Za-z0-9]+$/.test(name);

    if (isEmoji) {
        return <span className={cn("text-3xl leading-none", className)}>{name}</span>;
    }

    // Fallback text if legacy name
    return <span className="text-xs truncate">{name}</span>;
};

interface IconSelectorProps {
    value: string;
    onChange: (icon: string) => void;
    onClose: () => void;
    mode?: 'routine' | 'reward';
    isPremium?: boolean;
}

export function IconSelector({ value, onChange, onClose, mode = 'routine', isPremium = false }: IconSelectorProps) {
    const categories = mode === 'reward' ? REWARD_CATEGORIES : ROUTINE_CATEGORIES;
    const [selectedCategory, setSelectedCategory] = React.useState(categories[0].id);

    // Reset category if mode changes
    React.useEffect(() => {
        if (!categories.find(c => c.id === selectedCategory)) {
            setSelectedCategory(categories[0].id);
        }
    }, [mode, categories, selectedCategory]);

    const handleSelect = (iconName: string) => {
        const isLocked = !isPremium && PREMIUM_ICONS.includes(iconName);
        if (isLocked) {
            toast.error("This icon is for Premium members only!", {
                description: "Upgrade to unlock all premium icons.",
                action: {
                    label: "Upgrade",
                    onClick: () => { /* TODO: Trigger Upgrade Modal */ }
                }
            });
            return;
        }
        onChange(iconName);
        onClose();
    };

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-xs text-slate-600 uppercase tracking-wider">Choose Icon</h3>
                <button onClick={onClose} className="p-1.5 bg-slate-200/50 rounded-full hover:bg-slate-200 transition-colors">
                    <Icons.X className="w-3.5 h-3.5 text-slate-500" />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Categories Sidebar */}
                <div className="w-24 bg-slate-50 border-r border-slate-100 overflow-y-auto py-2 flex flex-col gap-1">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                "text-[10px] font-bold px-3 py-2.5 text-left w-full transition-colors relative",
                                selectedCategory === cat.id
                                    ? "bg-white text-primary"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            )}
                        >
                            {selectedCategory === cat.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Icons Grid */}
                <div className="flex-1 overflow-y-auto p-4 content-start">
                    <div className="grid grid-cols-4 gap-4">
                        {categories.find(c => c.id === selectedCategory)?.icons.map(iconName => {
                            const isLocked = !isPremium && PREMIUM_ICONS.includes(iconName);
                            return (
                                <button
                                    key={iconName}
                                    onClick={() => handleSelect(iconName)}
                                    className={cn(
                                        "aspect-square rounded-2xl flex items-center justify-center transition-all border-2 relative overflow-hidden",
                                        value === iconName
                                            ? "border-primary bg-primary/5 shadow-sm scale-110"
                                            : "border-transparent bg-slate-50 hover:bg-slate-100 hover:scale-105"
                                    )}
                                >
                                    <RenderIcon name={iconName} className={cn("w-8 h-8 text-slate-700", isLocked && "opacity-40")} />

                                    {isLocked && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50">
                                            <Icons.Lock className="w-4 h-4 text-slate-400" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
