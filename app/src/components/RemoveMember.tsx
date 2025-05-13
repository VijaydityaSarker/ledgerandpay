// app/src/components/RemoveMember.tsx
import React, { useState } from "react";
import { useConnection, useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../idl.json";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const RemoveMember: React.FC = () => {
    const [groupPdaStr, setGroupPdaStr] = useState("");
    const [memberPubkeyStr, setMemberPubkeyStr] = useState("");
    const [txSignature, setTxSignature] = useState<string | null>(null);

    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();

    const handleRemove = async () => {
        if (!wallet || !publicKey) {
            alert("🔌 Wallet not connected");
            return;
        }

        try {
            const groupPda = new PublicKey(groupPdaStr);
            const memberPubkey = new PublicKey(memberPubkeyStr);
            const provider = new AnchorProvider(connection, wallet, {
                preflightCommitment: "processed",
            });
            const program = new Program(idl as any, provider);

            const tx = await program.methods
                .removeMember(memberPubkey)
                .accounts({ group: groupPda, creator: publicKey })
                .rpc();

            setTxSignature(tx);
            alert("✅ Member removed! Tx: " + tx);
        } catch (err) {
            console.error("❌ removeMember RPC error:", err);
            alert("❌ Failed to remove member");
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 480, margin: "auto" }}>
            <h2>Remove a Member</h2>
            <WalletMultiButton />
            <input
                type="text"
                placeholder="Group PDA"
                value={groupPdaStr}
                onChange={(e) => setGroupPdaStr(e.target.value)}
                style={{ width: "100%", padding: 8, marginBottom: 8 }}
            />
            <input
                type="text"
                placeholder="Member PublicKey"
                value={memberPubkeyStr}
                onChange={(e) => setMemberPubkeyStr(e.target.value)}
                style={{ width: "100%", padding: 8 }}
            />
            <button onClick={handleRemove} style={{ marginTop: 16, padding: "8px 16px" }}>
                Remove Member
            </button>
            {txSignature && (
                <p style={{ marginTop: 16 }}>
                    ✅ Tx:{" "}
                    <a
                        href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View on Explorer
                    </a>
                </p>
            )}
        </div>
    );
};

export default RemoveMember;
