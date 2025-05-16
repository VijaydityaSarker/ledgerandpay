import React, { useState, useEffect } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
    Program,
    AnchorProvider,
    BN,
    Idl,
} from "@coral-xyz/anchor";
import {
    useConnection,
    useAnchorWallet,
    useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import idlJson from "../ledgerandpay.json";
import { createGroupService, isValidPublicKey } from "../services/groupService";

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
    const [invalidParticipants, setInvalidParticipants] = useState<string[]>([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [groupMembers, setGroupMembers] = useState<PublicKey[]>([]);
    const [shares, setShares] = useState<number[]>([]);
    const [tx, setTx] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    // Load group members when component mounts or groupPda changes
    useEffect(() => {
        async function loadGroupMembers() {
            if (!wallet || !groupPda) return;

            setLoadingParticipants(true);
            try {
                const groupService = createGroupService(connection, wallet);
                const members = await groupService.getAllGroupMembers(groupPda);
                setGroupMembers(members);
                console.log("Group members loaded:", members.length);
            } catch (err) {
                console.error("Failed to load group members:", err);
                setError("Failed to load group members. Check console for details.");
            } finally {
                setLoadingParticipants(false);
            }
        }

        loadGroupMembers();
    }, [connection, wallet, groupPda]);

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

    const handleParticipantInput = (inputText: string) => {
        setError(null);
        const arr = inputText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        console.log("Processing participants:", arr);

        // Log group members to help with debugging
        console.log("Group members:", groupMembers.map(m => m.toBase58()));

        const newParticipants: PublicKey[] = [];
        const newInvalidParticipants: string[] = [];

        for (const s of arr) {
            try {
                // First validate that this is a proper base58 encoded public key
                if (isValidPublicKey(s)) {
                    const pubkey = new PublicKey(s);
                    newParticipants.push(pubkey);

                    // Just for logging purposes, don't block submission
                    if (groupMembers.length > 0 && !groupMembers.some(m => m.equals(pubkey))) {
                        console.warn(`Public key ${s} is valid but not a member of this group`);
                        // We won't add to invalidParticipants to allow testing
                    }
                } else {
                    console.error(`Invalid public key format: ${s}`);
                    newInvalidParticipants.push(s);
                }
            } catch (error) {
                console.error(`Invalid public key: ${s}`, error);
                newInvalidParticipants.push(s);
            }
        }

        setParticipants(newParticipants);
        setInvalidParticipants(newInvalidParticipants);

        // Only show warning for invalid public key formats
        if (newInvalidParticipants.length > 0) {
            setError(`Some public keys have invalid format. Please check and try again.`);
        }
    };

    const handleSubmit = async () => {
        setError(null);
        if (!wallet || !publicKey) {
            setError("Connect your wallet");
            return;
        }
        if (!desc || amount <= 0 || participants.length === 0) {
            setError("Fill out all fields");
            return;
        }
        if (invalidParticipants.length > 0) {
            setError("Some public keys have invalid format. Please check and try again.");
            return;
        }

        // Log the data we're submitting to help debug
        console.log("Submitting expense:", {
            groupPda: groupPda.toBase58(),
            amount,
            desc,
            participants: participants.map(p => p.toBase58())
        });

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
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setTx(sig);
            setError(null);
            alert("Logged expense!");
        } catch (err: any) {
            console.error(err);
            // Extract the error message from Anchor error if possible
            if (err.logs) {
                const anchorErr = err.logs.find((log: string) => log.includes("Error Code:"));
                if (anchorErr) {
                    const errorMessage = anchorErr.includes("Error Message:")
                        ? anchorErr.split("Error Message:")[1].trim()
                        : "Program error. Check console for details.";
                    setError(errorMessage);
                } else {
                    setError(err.message || "Failed to log expense");
                }
            } else {
                setError(err.message || "Failed to log expense");
            }
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
                    onChange={(e) => handleParticipantInput(e.target.value)}
                    style={{
                        width: "100%",
                        padding: 8,
                        borderColor: invalidParticipants.length > 0 ? "red" : undefined
                    }}
                />
                {invalidParticipants.length > 0 && (
                    <div style={{ color: "red", fontSize: "12px", marginTop: 4 }}>
                        One or more public keys have an invalid format. Please enter valid base58-encoded Solana addresses.
                    </div>
                )}
                {loadingParticipants && (
                    <div style={{ fontSize: "12px", marginTop: 4 }}>
                        Loading group members...
                    </div>
                )}
            </div>

            {error && (
                <div style={{
                    backgroundColor: "#FEE2E2",
                    color: "#B91C1C",
                    padding: 12,
                    borderRadius: 4,
                    marginTop: 12
                }}>
                    {error}
                </div>
            )}

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
                style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    backgroundColor: invalidParticipants.length > 0 ? "#ccc" : undefined,
                    cursor: invalidParticipants.length > 0 ? "not-allowed" : "pointer"
                }}
                disabled={invalidParticipants.length > 0}
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
