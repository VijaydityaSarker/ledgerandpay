// app/src/components/JoinGroup.tsx
import React, { useState } from "react";
import { useConnection, useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./ledgerandpay.json";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";

interface GroupAccount {
    creator: PublicKey;
    uniqueSeed: Uint8Array;
    bump: number;
    groupName: string;
    description: string;
    participants: PublicKey[];
    createdAt: bigint;
}

export const JoinGroup: React.FC = () => {
    const [groupPdaStr, setGroupPdaStr] = useState("");
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const { publicKey } = useWallet();

    const handleJoin = async () => {
        if (!wallet || !publicKey) {
            setError("🔌 Please connect your wallet first");
            return;
        }

        if (!groupPdaStr) {
            setError("Please enter a valid group PDA address");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Validate the public key
            const groupPda = new PublicKey(groupPdaStr);
            const provider = new AnchorProvider(connection, wallet, {
                preflightCommitment: "confirmed",
            });

            // Cast the IDL to any to avoid TypeScript errors with the full program type
            const program = new Program(idl as any, provider) as any;

            // Fetch the group account to get the creator
            let groupAccount: GroupAccount;
            try {
                // Use bracket notation to access the account type
                const account = await program.account['groupAccount'].fetch(groupPda);
                groupAccount = account as GroupAccount;
            } catch (err) {
                throw new Error("Group not found. Please check the group PDA and try again.");
            }

            // Check if already a member
            if (groupAccount.participants.some(p => p.equals(publicKey))) {
                throw new Error("You are already a member of this group");
            }

            // Execute the join transaction
            toast.loading("Sending transaction...");
            const tx = await program.methods
                .joinGroup()
                .accounts({
                    group: groupPda,
                    joiner: publicKey,
                    creator: groupAccount.creator // Add the creator account
                })
                .rpc();

            setTxSignature(tx);
            toast.success("Successfully joined the group!");

            // Reset the form after a short delay
            setTimeout(() => {
                setGroupPdaStr("");
                setTxSignature(null);
            }, 3000);

        } catch (err) {
            console.error("❌ joinGroup RPC error:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to join group";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            toast.dismiss();
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setGroupPdaStr(text.trim());
        } catch (err) {
            console.error("Failed to read from clipboard:", err);
            setError("Failed to read from clipboard");
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Join a Group</h2>

            <div className="mb-6">
                <WalletMultiButton className="w-full justify-center" />
            </div>

            <div className="mb-6">
                <label htmlFor="group-pda" className="block text-sm font-medium text-gray-700 mb-2">
                    Group Address
                </label>
                <div className="flex space-x-2">
                    <input
                        id="group-pda"
                        type="text"
                        placeholder="Enter group PDA address"
                        value={groupPdaStr}
                        onChange={(e) => {
                            setGroupPdaStr(e.target.value);
                            setError(null);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                    />
                    <button
                        onClick={handlePasteFromClipboard}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                        type="button"
                    >
                        Paste
                    </button>
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
            </div>

            <button
                onClick={handleJoin}
                disabled={loading || !groupPdaStr || !publicKey}
                className={`w-full py-3 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading || !groupPdaStr || !publicKey
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
            >
                {loading ? 'Joining...' : 'Join Group'}
            </button>

            {txSignature && (
                <div className="mt-6 p-4 bg-green-50 rounded-md">
                    <p className="text-green-800 font-medium">✅ Successfully joined the group!</p>
                    <a
                        href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                        View transaction on Solana Explorer
                    </a>
                </div>
            )}
        </div>
    );
};

export default JoinGroup;
