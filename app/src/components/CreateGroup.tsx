import React, { useState } from "react";
import {
    useAnchorWallet,
    useConnection,
    useWallet,
} from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import idl from "../../idl.json";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

// Constants
const programID = new PublicKey(idl.address);
const systemProgram = web3.SystemProgram.programId;

const CreateGroup = () => {
    const [groupName, setGroupName] = useState("");
    const [groupDesc, setGroupDesc] = useState("");
    const [txSignature, setTxSignature] = useState("");
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const handleCreateGroup = async () => {
        if (!wallet || !publicKey) return alert("Wallet not connected");

        const provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: "processed",
        });

        const program = new Program(idl as any, programID, provider);

        // Derive PDA
        const [groupPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("group"), publicKey.toBuffer()],
            program.programId
        );

        try {
            const tx = await program.methods
                .createGroup(groupName, groupDesc)
                .accounts({
                    group: groupPda,
                    creator: publicKey,
                    systemProgram,
                })
                .rpc();

            setTxSignature(tx);
            alert("Group created successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to create group.");
        }
    };

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Create a New Group</h2>
            <WalletMultiButton />
            <div style={{ marginTop: "1rem" }}>
                <input
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Description"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                />
            </div>
            <button onClick={handleCreateGroup} style={{ marginTop: "1rem" }}>
                Create Group
            </button>
            {txSignature && (
                <p>
                    ✅ Tx:{" "}
                    <a
                        href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View on Solana Explorer
                    </a>
                </p>
            )}
        </div>
    );
};

export default CreateGroup;
