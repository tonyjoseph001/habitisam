"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Gift, Save } from 'lucide-react';
import { Reward } from '@/lib/db';

interface RewardEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, cost: number, icon: string) => Promise<void>;
    initialData?: Reward;
}

export function RewardEditorModal({ isOpen, onClose, onSave, initialData }: RewardEditorProps) {
    const [title, setTitle] = useState('');
    const [cost, setCost] = useState(10);
    const [icon, setIcon] = useState('🎁');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setCost(initialData.cost);
                setIcon(initialData.icon);
            } else {
                setTitle('');
                setCost(10);
                setIcon('🎁');
            }
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim()) return;
        await onSave(title, cost, icon);
        onClose();
    };

    const presetEmojis = ['🎁', '🍦', '🎮', '🧸', '🍕', '🎡', '📱', '🎨'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Reward" : "New Reward"}>
            <div className="p-6 flex flex-col gap-6">

                {/* Title */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Reward Name</label>
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Ice Cream Trip"
                        className="mt-1"
                    />
                </div>

                {/* Cost */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Cost (Stars)</label>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 relative">
                            <Input
                                type="number"
                                value={cost}
                                onChange={e => setCost(parseInt(e.target.value))}
                                className="pl-10"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">⭐</div>
                        </div>
                    </div>
                </div>

                {/* Icon Picker */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Choose Icon</label>
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-4xl border-2 border-slate-200">
                            {icon}
                        </div>

                        <div className="flex flex-wrap gap-2 max-w-[200px]">
                            {presetEmojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => setIcon(emoji)}
                                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-lg"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="cosmic" onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" /> Save Reward
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
