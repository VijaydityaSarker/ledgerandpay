// app/src/components/RenameGroup.tsx
import React, { useState } from "react";
import { useConnection, useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./ledgerandpay.json";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const RenameGroup: React.FC = () => {
    const [groupPdaStr, setGroupPdaStr] = useState("");
    const [newName, setNewName] = useState("");
    const [txSignature, setTxSignature] = useState<string | null>(null);

    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();

    const handleRename = async () => {
        if (!wallet || !publicKey) {
            alert("🔌 Wallet not connected");
            return;
        }

        try {
            const groupPda = new PublicKey(groupPdaStr);
            const provider = new AnchorProvider(connection, wallet, {
                preflightCommitment: "processed",
            });
            const program = new Program(idl as any, provider);

            const tx = await program.methods
                .renameGroup(newName)
                .accounts({ group: groupPda, creator: publicKey })
                .rpc();

            setTxSignature(tx);
            alert("✅ Group renamed! Tx: " + tx);
        } catch (err) {
            console.error("❌ renameGroup RPC error:", err);
            alert("❌ Failed to rename group");
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 480, margin: "auto" }}>
            <h2>Rename Group</h2>
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
                placeholder="New Group Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ width: "100%", padding: 8 }}
            />
            <button onClick={handleRename} style={{ marginTop: 16, padding: "8px 16px" }}>
                Rename Group
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

export default RenameGroup;
