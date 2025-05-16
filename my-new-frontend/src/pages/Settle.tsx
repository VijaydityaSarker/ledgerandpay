// src/pages/SettleExpense.tsx
import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Card } from '../components/ui/Card';
import SettleExpense from '../components/SettleExpense';

const USDC_MINT = new PublicKey('7pvFhTvjetnAG7YiakCQFnvpjwTdp7LhLqgFfPq1ZG7G');

export default function SettleUp() {
  const [groupInput, setGroupInput] = useState('');
  const [groupPda, setGroupPda]     = useState<PublicKey|null>(null);
  const [error, setError]           = useState<string|null>(null);

  const handleUseGroup = () => {
    try {
        console.log(groupInput.trim());
      const pk = new PublicKey(groupInput.trim());
      setGroupPda(pk);
      setError(null);
    } catch {
      setError('Invalid group public key');
      setGroupPda(null);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Settle Up</h2>

      <Card>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2"
            placeholder="Paste group public key"
            value={groupInput}
            onChange={(e) => setGroupInput(e.target.value)}
          />
          <button onClick={handleUseGroup} className="btn-primary">
            Use Group
          </button>
        </div>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </Card>

      {groupPda && (
        <SettleExpense usdcMint={USDC_MINT} groupPda={groupPda} />
      )}
    </div>
  );
}
