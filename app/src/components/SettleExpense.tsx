import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletStatus } from '../contexts/WalletConnectionProvider';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import idlJson from '../ledgerandpay.json';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';
import { toast } from 'sonner';

// Cast IDL
const idl = idlJson as Idl;

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
  usdcMint?: PublicKey;
  groupPda: PublicKey;
}

const SettleExpense: React.FC<SettleExpenseProps> = ({
  // Default USDC mint for Devnet
  usdcMint = new PublicKey("7pvFhTvjetnAG7YiakCQFnvpjwTdp7LhLqgFfPq1ZG7G"),
  groupPda
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = useWallet();

  const [expenses, setExpenses] = useState<ExpenseAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!wallet || !publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { preflightCommitment: 'processed' }
      );
      // Use 'any' type for program to bypass TypeScript's strict checking
      const program = new Program(idl, provider) as any;

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
        .filter(({ account }: { account: any }) =>
          account &&
          account.group &&
          account.participants &&
          Array.isArray(account.participants) &&
          account.payer &&
          typeof account.settled !== 'undefined' &&
          account.group.equals(groupPda) &&
          account.participants.some((p: PublicKey) => p.equals(publicKey!)) &&
          !account.payer.equals(publicKey!) &&
          !account.settled
        )
        .map((item: any) => {
          return {
            pubkey: item.publicKey,
            account: item.account
          } as ExpenseAccount;
        });

      setExpenses(list);
    } catch (err) {
      console.error('Failed to load expenses:', err);
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
      setError('Connect your wallet first');
      return;
    }

    // Prevent double-submitting the same transaction
    if (settling) {
      return;
    }

    setSettling(expPubkey.toBase58());
    setError(null);
    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { preflightCommitment: 'processed' }
      );
      // Use 'any' type for program to bypass TypeScript's strict checking
      const program = new Program(idl, provider) as any;
      const exp = expenses.find(e => e.pubkey.equals(expPubkey));
      if (!exp) throw new Error('Expense not found');

      // Log the group PDA being used for debugging
      console.log('Using group PDA:', groupPda.toString());
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
        group: groupPda,
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
        .accounts(accounts)
        .rpc();

      setTxId(sig);
      console.log(`Settled expense with transaction: ${sig}`);

      // Show success toast notification
      toast.success('Payment successful! Your expense has been settled.', {
        duration: 5000,
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, '_blank')
        }
      });

      await fetchExpenses();
    } catch (err: any) {
      console.error('Settlement error:', err);

      // Check for "already processed" error
      if (err.message && err.message.includes("already been processed")) {
        // This is actually a success case - the transaction was already processed
        setError(null);

        // Show toast indicating expense is already settled
        toast.success('This expense has already been settled!', {
          duration: 5000
        });

        // Refresh expenses to get the latest state
        await fetchExpenses();
      } else {
        // Handle other errors
        setError(err.message || 'Failed to settle');

        toast.error('Settlement failed: ' + (err.message || 'Unknown error'), {
          duration: 8000
        });
      }
    } finally {
      setSettling(null);
    }
  };

  if (!publicKey) {
    return (
      <div style={{ padding: 16, border: "1px solid #ccc", marginTop: 24, textAlign: 'center' }}>
        <h3>Settle Expenses</h3>
        <p>Connect your wallet to see expenses you owe</p>
        <WalletMultiButton />
      </div>
    );
  }

  const totalOwed = expenses.reduce((sum, e) => {
    // Get your share
    const yourIndex = e.account.participants.findIndex(p => p.equals(publicKey));
    if (yourIndex >= 0 && e.account.shares && yourIndex < e.account.shares.length) {
      return sum + e.account.shares[yourIndex].toNumber();
    }
    // Fallback to equal split if shares aren't available
    return sum + e.account.amount.toNumber() / e.account.participants.length;
  }, 0);

  return (
    <div style={{ padding: 16, border: "1px solid #ccc", marginTop: 24 }}>
      <h3>Settle Expenses</h3>
      {loading ? (
        <p>Loading expenses...</p>
      ) : expenses.length === 0 ? (
        <p>No outstanding expenses found</p>
      ) : (
        <>
          <div style={{
            padding: '8px 16px',
            marginBottom: 16,
            backgroundColor: '#f0f0f0',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <strong>Total You Owe:</strong>
            <span>{totalOwed.toFixed(2)} USDC</span>
          </div>

          {error && (
            <div style={{
              backgroundColor: "#FEE2E2",
              color: "#B91C1C",
              padding: 12,
              borderRadius: 4,
              marginBottom: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 8
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong style={{ marginBottom: 4, display: "block" }}>Settlement Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {txId && (
            <div style={{
              backgroundColor: "#ECFDF5",
              color: "#065F46",
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
              border: "1px solid #10B981",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            }}>
              <div style={{
                backgroundColor: "#34D399",
                borderRadius: "50%",
                width: 50,
                height: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 18 }}>Payment Successful!</h3>
              <p style={{ margin: "0 0 12px 0" }}>Your expense has been settled successfully.</p>
              <a
                href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  backgroundColor: '#065F46',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: 4,
                  fontSize: 14
                }}
              >
                View on Explorer
              </a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {expenses.map(e => {
              // Get your share
              const yourIndex = e.account.participants.findIndex(p => p.equals(publicKey!));
              const share = yourIndex >= 0 && e.account.shares && yourIndex < e.account.shares.length
                ? e.account.shares[yourIndex].toNumber()
                : e.account.amount.toNumber() / e.account.participants.length;

              const busy = settling === e.pubkey.toBase58();

              return (
                <div
                  key={e.pubkey.toBase58()}
                  style={{
                    padding: 16,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{e.account.description || 'Expense'}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Payee: {e.account.payer.toBase58().slice(0, 6)}...
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{share.toFixed(2)} USDC</div>
                    <button
                      onClick={() => handleSettle(e.pubkey)}
                      disabled={busy}
                      style={{
                        backgroundColor: busy ? '#a3a3a3' : '#4f46e5',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: 6,
                        cursor: busy ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      {busy ? 'Settling...' : 'Pay Up'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SettleExpense;
