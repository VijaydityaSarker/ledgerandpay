import React, { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import {
    Program,
    AnchorProvider,
    web3,
    BN,
    Idl,
} from "@coral-xyz/anchor";
import {
    useConnection,
    useAnchorWallet,
    useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import idlJson from "../idl.json";

// our IDL type now needs an `address` field at top level
type LedgerandpayIDL = Idl & { address: string };
const idl = idlJson as LedgerandpayIDL;

export default function LogExpense({
    groupPda,
}: {
    groupPda: PublicKey;
}) {
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

        // 2) ***NEW*** only pass (idl, provider)
        const program = new Program(idl, provider);

        // 3) derive your expense PDA as before
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
                    systemProgram: web3.SystemProgram.programId,
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
        <div style={{ padding: 16, border: "1px solid #ccc", marginTop: 24 }}>
            <h3>Log an Expense</h3>
            <WalletMultiButton />

            <div style={{ marginTop: 12 }}>
                <input
                    type="number"
                    placeholder="Total amount"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    style={{ width: "100%", padding: 8, marginBottom: 8 }}
                />
                <input
                    type="text"
                    placeholder="Description (≤ 32 bytes)"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    style={{ width: "100%", padding: 8, marginBottom: 8 }}
                />
                <textarea
                    placeholder="Participants' public keys (comma-separated)"
                    rows={3}
                    value={participants.map((pk) => pk.toBase58()).join(",")}
                    onChange={(e) => {
                        const arr = e
                            .target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                        setParticipants(arr.map((s) => new PublicKey(s)));
                    }}
                    style={{ width: "100%", padding: 8 }}
                />
            </div>

            {shares.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <h4>Each owes:</h4>
                    <ul>
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
                style={{ marginTop: 12, padding: "8px 16px" }}
            >
                Submit Expense
            </button>

            {tx && (
                <p style={{ marginTop: 12 }}>
                    ✅ Tx:{" "}
                    <a
                        href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View on Explorer
                    </a>
                </p>
            )}
        </div>
    );
}
