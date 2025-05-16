// src/pages/SettleUp.tsx
import React, { useState } from 'react';
import LogExpense from '../components/LogExpense';
import { Card } from '../components/ui/Card';
import { PublicKey } from '@solana/web3.js';

export default function SettleUp() {
    // raw text input
    const [groupInput, setGroupInput] = useState('');
    // validated PublicKey or null
    const [groupPda, setGroupPda] = useState<PublicKey | null>(null);
    // any parsing error
    const [error, setError] = useState<string | null>(null);

    const handleUseGroup = () => {
        try {
            const pk = new PublicKey(groupInput.trim());
            setGroupPda(pk);
            setError(null);
        } catch {
            setGroupPda(null);
            setError('Invalid group public key');
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Enter the Expense details
            </h2>

            <Card>
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Group PDA
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Paste group public key"
                            className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                            value={groupInput}
                            onChange={(e) => setGroupInput(e.target.value)}
                        />
                        <button
                            onClick={handleUseGroup}
                            className="btn-primary"
                        >
                            Use Group
                        </button>
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}

                    {/* Only render when groupPda is a real PublicKey */}
                    {groupPda && (
                        <LogExpense groupPda={groupPda} />
                    )}
                </div>
            </Card>
        </div>
    );
}
