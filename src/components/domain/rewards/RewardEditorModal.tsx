"use client";

import React, { useState, useEffect } from 'react';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Gift, Save, Check } from 'lucide-react';
import { Reward, db } from '@/lib/db';
import { useSessionStore } from '@/lib/store/useSessionStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';

interface RewardEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, cost: number, icon: string, requiresApproval: boolean, assignedProfileIds?: string[]) => Promise<void>;
    initialData?: Reward;
}

export function RewardEditorModal({ isOpen, onClose, onSave, initialData }: RewardEditorProps) {
    const [title, setTitle] = useState('');
    const [cost, setCost] = useState(10);
    const [icon, setIcon] = useState('🎁');
    const [requiresApproval, setRequiresApproval] = useState(true);
    const [assignedProfileIds, setAssignedProfileIds] = useState<string[]>([]); // Empty = All

    const { activeProfile } = useSessionStore();
    const accountId = activeProfile?.accountId;

    const children = useLiveQuery(async () => {
        if (!accountId) return [];
        return await db.profiles
            .where('accountId').equals(accountId)
            .and(p => p.type === 'child')
            .toArray();
    }, [accountId]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setCost(initialData.cost);
                setIcon(initialData.icon);
                setRequiresApproval(initialData.requiresApproval !== false); // Default true
                setAssignedProfileIds(initialData.assignedProfileIds || []);
            } else {
                setTitle('');
                setCost(10);
                setIcon('🎁');
                setRequiresApproval(true);
                setAssignedProfileIds([]);
            }
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim()) return;
        await onSave(title, cost, icon, requiresApproval, assignedProfileIds.length > 0 ? assignedProfileIds : undefined);
        onClose();
    };

    const toggleChild = (childId: string) => {
        setAssignedProfileIds(prev => {
            if (prev.includes(childId)) {
                return prev.filter(id => id !== childId);
            } else {
                return [...prev, childId];
            }
        });
    };

    const handleAssignAll = () => {
        setAssignedProfileIds([]);
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
                        placeholder="Ice Cream Trip"
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

                {/* Approval Toggle */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <input
                        type="checkbox"
                        checked={requiresApproval}
                        onChange={e => setRequiresApproval(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        id="approval-check"
                    />
                    <label htmlFor="approval-check" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                        Require Parent Approval
                    </label>
                </div>

                {/* Assignment - Only show if children exist */}
                {children && children.length > 0 && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assign To</label>
                        <div className="flex flex-wrap gap-2">
                            {/* All Children Option */}
                            <button
                                onClick={handleAssignAll}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5",
                                    assignedProfileIds.length === 0
                                        ? "bg-violet-100 text-violet-700 border-violet-200"
                                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {assignedProfileIds.length === 0 && <Check className="w-3 h-3" />}
                                All Children
                            </button>

                            {/* Individual Children */}
                            {children.map(child => {
                                const isSelected = assignedProfileIds.includes(child.id);
                                return (
                                    <button
                                        key={child.id}
                                        onClick={() => toggleChild(child.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5",
                                            isSelected
                                                ? "bg-violet-100 text-violet-700 border-violet-200"
                                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        {child.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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
