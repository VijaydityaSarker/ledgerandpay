// src/components/SettleExpense.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import idlJson from './ledgerandpay.json';
import type { Ledgerandpay } from './ledgerandpay';
import { toast } from 'sonner';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

// Cast IDL
const idl = idlJson as Idl;
const PROGRAM_ID = new PublicKey((idlJson as any).address);

import { BN } from '@coral-xyz/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';

export interface ExpenseAccount {
  pubkey: PublicKey;
  account: {
    payer: PublicKey;
    participants: PublicKey[];
    amount: BN;
    shares: BN[];
    bump: number;
    settled: boolean;
    description: string;
    timestamp: BN;
    group: PublicKey;
  };
}

interface SettleExpenseProps {
  usdcMint: PublicKey;
  groupPda: PublicKey;
}

const SettleExpense: React.FC<SettleExpenseProps> = ({ usdcMint, groupPda }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey } = useWallet();

  const [expenses, setExpenses] = useState<ExpenseAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!wallet || !publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const provider = new AnchorProvider(connection, wallet, { preflightCommitment: 'processed' });
      const program: Program<Ledgerandpay> = new Program(idl, provider);

      // Use Anchor's all() to fetch and decode all expense accounts
      const allExpenses = await program.account.expense.all();
      console.log("All expenses raw:", JSON.stringify(allExpenses, (key, value) => {
        // Convert PublicKey objects to string for better readability
        if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'PublicKey') {
          return value.toString();
        }
        // Convert BN objects to string
        if (value && typeof value === 'object' && value.toNumber) {
          return value.toString();
        }
        return value;
      }, 2));

      // Filter for this group, where you owe and not yet settled (with defensive checks)
      const list: ExpenseAccount[] = allExpenses
        .filter(({ account }) =>
          account &&
          account.group &&
          account.participants &&
          Array.isArray(account.participants) &&
          account.payer &&
          typeof account.settled !== 'undefined' &&
          account.group.equals(groupPda) &&
          account.participants.some(p => p.equals(publicKey!)) &&
          !account.payer.equals(publicKey!) &&
          !account.settled
        )
        .map(item => {
          return {
            pubkey: item.publicKey,
            account: item.account
          } as ExpenseAccount;
        });

      setExpenses(list);
    } catch (err) {
      console.error('Failed to load expenses:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      setError('Failed to load expenses: ' + (err instanceof Error ? err.message : String(err)));

    } finally {
      setLoading(false);
    }
  }, [connection, wallet, publicKey, groupPda]);

  useEffect(() => {
    if (wallet && publicKey) fetchExpenses();
    else setExpenses([]);
  }, [wallet, publicKey, groupPda, fetchExpenses]);

  const handleSettle = async (expPubkey: PublicKey) => {
    if (!wallet || !publicKey) {
      toast.error('Connect your wallet first');
      return;
    }
    setSettling(expPubkey.toBase58());
    setError(null);
    try {
      const provider = new AnchorProvider(connection, wallet, { preflightCommitment: 'processed' });
      const program: Program<Ledgerandpay> = new Program(idl, provider);
      const exp = expenses.find(e => e.pubkey.equals(expPubkey));
      if (!exp) throw new Error('Expense not found');
      // Use the groupPda passed as prop instead of deriving a new one
      const group = groupPda;
      
      // Log the group PDA being used for debugging
      console.log('Using group PDA:', group.toString(), 'from input');
      console.log('Original expense group:', exp.account.group.toString());
      // associated token accounts
      const [payerUsdc] = await web3.PublicKey.findProgramAddress(
        [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), usdcMint.toBuffer()],
        ASSOCIATED_PROGRAM_ID
      );
      const [payeeUsdc] = await web3.PublicKey.findProgramAddress(
        [exp.account.payer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), usdcMint.toBuffer()],
        ASSOCIATED_PROGRAM_ID
      );
      const accounts = {
        group,
        expense: expPubkey,
        payer: publicKey,
        payerUsdc,
        payee: exp.account.payer,
        payeeUsdc,
        usdcMint,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
      console.log('Settlement accounts:', JSON.stringify(accounts, (key, value) => {
        // Convert PublicKey objects to string for better readability
        if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'PublicKey') {
          return value.toString();
        }
        return value;
      }, 2));
      const sig = await program.methods
        .settleExpense()
        .accountsStrict(accounts)
        .rpc();
      toast.success(`Settled: ${sig}`);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Settlement error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      setError(err.message || 'Failed to settle');
      toast.error(err.message || 'Failed to settle');
    } finally {
      setSettling(null);
    }
  };

  if (!publicKey) return <p className="text-center p-4">Connect your wallet to settle expenses.</p>;
  if (loading) return <p className="text-center p-4">Loading expenses…</p>;

  const totalOwed = expenses.reduce((sum, e) => sum + e.account.amount.toNumber() / e.account.participants.length, 0);

  return (
    <div className="space-y-6">
      {error && <p className="text-red-600">{error}</p>}
      <Card>
        <div className="flex justify-between items-center">
          <p className="font-semibold">Total You Owe:</p>
          <p className="font-bold text-primary-light">{totalOwed.toFixed(2)} USDC</p>
        </div>
      </Card>
      {expenses.map(e => {
        const share = e.account.amount.toNumber() / e.account.participants.length;
        const busy = settling === e.pubkey.toBase58();
        return (
          <Card key={e.pubkey.toBase58()}>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{e.account.description || 'Expense'}</h4>
                <p className="text-sm">Payee: {e.account.payer.toBase58().slice(0,6)}…</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{share.toFixed(2)} USDC</p>
                <Button disabled={busy} onClick={() => handleSettle(e.pubkey)}>
                  {busy ? 'Settling…' : 'Pay Up'}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default SettleExpense;
