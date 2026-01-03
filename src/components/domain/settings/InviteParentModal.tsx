import React from 'react';
import { Modal } from '@/components/ui/modal';
import { useAccount } from '@/lib/hooks/useAccount';
import { Button } from '@/components/ui/button';
import { Copy, Users, Check } from 'lucide-react';
import { toast } from 'sonner';

interface InviteParentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteParentModal({ isOpen, onClose }: InviteParentModalProps) {
    const { account } = useAccount();
    const [copied, setCopied] = React.useState(false);

    if (!account) return null;

    // Use the current domain + /join?code=UID
    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${account.uid}` : '';

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        toast.success("Invite link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invite Partner">
            <div className="p-6 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-violet-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Sync with another Parent</h3>
                    <p className="text-slate-500 text-sm">
                        Share this link to let another parent (spouse, partner, guardian) manage this household from their own device.
                    </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invite Link</label>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 truncate font-mono">
                            {inviteLink}
                        </code>
                        <Button onClick={handleCopy} size="icon" variant="outline" className="shrink-0">
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800">
                    <strong>Note:</strong> Anyone with this link can join your household. You can remove members later in Settings.
                </div>

                <div className="flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Done</Button>
                </div>
            </div>
        </Modal>
    );
}
