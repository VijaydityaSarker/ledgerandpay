// src/components/LogExpense.tsx
import React, { useState, useEffect } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";

import {
    useConnection,
    useAnchorWallet,
    useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import idlJson from "./ledgerandpay.json";

// our IDL type now needs an `address` field at top level
interface LedgerandpayIDL extends Idl {
    address: string;
}
const idl = idlJson as LedgerandpayIDL;

interface LogExpenseProps {
    groupPda: PublicKey;
    usdcMint: PublicKey;
}

export default function LogExpense({ groupPda, usdcMint }: LogExpenseProps) {
    const [amount, setAmount] = useState(0);
    const [desc, setDesc] = useState("");
    const [participants, setParticipants] = useState<PublicKey[]>([]);
    const [shares, setShares] = useState<number[]>([]);
    const [tx, setTx] = useState<string | null>(null);

    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    // recompute shares whenever inputs change
    useEffect(() => {
        const n = participants.length;
        if (n > 0) {
            const base = Math.floor(amount / n);
            const rem = amount % n;
            const s = Array(n).fill(base);
            for (let i = 0; i < rem; i++) s[i]++;
            setShares(s);
        } else {
            setShares([]);
        }
    }, [amount, participants]);

    const handleSubmit = async () => {
        if (!wallet || !publicKey) {
            return alert("Connect your wallet");
        }
        if (!desc || amount <= 0 || participants.length === 0) {
            return alert("Fill out all fields");
        }

        // 1) build our Anchor provider
        const provider = new AnchorProvider(
            connection,
            wallet,
            { preflightCommitment: "processed" }
        );

        // 2) only pass (idl, provider)
        const program = new Program(idl, provider);

        // 3) derive your expense PDA
        const [expensePda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("expense"),
                groupPda.toBuffer(),
                publicKey.toBuffer(),
                Buffer.from(desc),
            ],
            program.programId
        );

        try {
            const sig = await program.methods
                .logExpense(new BN(amount), participants, desc)
                .accounts({
                    payer: publicKey,
                    group: groupPda,
                    expense: expensePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setTx(sig);
            alert("Logged expense!");
        } catch (err) {
            console.error(err);
            alert("Failed to log expense");
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md mt-6">
            <h3 className="text-xl font-semibold mb-4">Log an Expense</h3>
            <WalletMultiButton className="mb-4" />

            <div className="space-y-4">
                <input
                    type="number"
                    placeholder="Total amount"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border rounded"
                />
                <input
                    type="text"
                    placeholder="Description (≤ 32 bytes)"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                />
                <textarea
                    placeholder="Participants' public keys (comma-separated)"
                    rows={3}
                    value={participants.map((pk) => pk.toBase58()).join(",")}
                    onChange={(e) => {
                        const arr = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                        setParticipants(arr.map((s) => new PublicKey(s)));
                    }}
                    className="w-full px-4 py-2 border rounded"
                />
            </div>

            {shares.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-medium">Each owes:</h4>
                    <ul className="list-disc list-inside">
                        {participants.map((pk, i) => (
                            <li key={i}>
                                {pk.toBase58().slice(0, 6)}…: <strong>{shares[i]}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button
                onClick={handleSubmit}
                className="mt-6 px-4 py-2 bg-primary-light text-white rounded"
            >
                Submit Expense
            </button>

            {tx && (
                <p className="mt-4">
                    ✅ Tx:{' '}
                    <a
                        href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                    >
                        View on Explorer
                    </a>
                </p>
            )}
        </div>
    );
}