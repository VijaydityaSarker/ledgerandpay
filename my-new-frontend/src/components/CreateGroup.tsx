// app/src/components/CreateGroup.tsx
import React, { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import {
    useConnection,
    useAnchorWallet,
    useWallet,
} from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import idlJson from "./ledgerandpay.json";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";

type Seed16 = Uint8Array & { readonly length: 16 };

// Cast your imported JSON to Anchor's Idl type
const idl = idlJson as Idl;

// Pull the SystemProgram constant
const { SystemProgram } = web3;

interface CreateGroupProps {
    onSuccess: (tx: string, groupPda: string) => void;
}

const CreateGroup: React.FC<CreateGroupProps> = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        groupName: '',
        groupDesc: ''
    });
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdGroupPda, setCreatedGroupPda] = useState<string | null>(null);
    const [formValid, setFormValid] = useState(false);

    // Validate form whenever form data changes
    useEffect(() => {
        setFormValid(
            formData.groupName.trim().length > 0 &&
            formData.groupName.length <= 32 &&
            (!formData.groupDesc || formData.groupDesc.length <= 200)
        );
    }, [formData]);

    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!wallet || !publicKey) {
            setError("Please connect your wallet first");
            toast.error("Wallet not connected");
            return;
        }

        if (!formValid) {
            setError("Please fill in all required fields correctly");
            return;
        }

        setLoading(true);
        setError(null);

        // Clear any previous results
        setTxSignature(null);
        setCreatedGroupPda(null);

        try {
            // 1) Build an AnchorProvider from your connection + wallet
            const provider = new AnchorProvider(connection, wallet, {
                preflightCommitment: "confirmed",
            });

            // 2) Construct the Program
            const program = new Program(idl, provider) as any;

            // 3) Generate a cryptographically-random 16-byte seed
            const uniqueSeed = crypto.getRandomValues(new Uint8Array(16)) as Seed16;

            // 4) Derive the same PDA you declared on-chain
            const [groupPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("group"),
                    publicKey.toBuffer(),
                    uniqueSeed,
                ],
                program.programId
            );

            toast.loading("Creating group...");

            // 5) Fire off the RPC, passing seed + name + desc
            const tx = await program.methods
                .createGroup(
                    uniqueSeed,
                    formData.groupName.trim(),
                    formData.groupDesc.trim()
                )
                .accounts({
                    group: groupPda,
                    creator: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setTxSignature(tx);
            setCreatedGroupPda(groupPda.toBase58());

            // Notify parent component of success
            onSuccess(tx, groupPda.toBase58());

            // Show success message
            toast.success("Group created successfully!");

            // Reset form after a short delay
            setTimeout(() => {
                setFormData({
                    groupName: '',
                    groupDesc: ''
                });
                setTxSignature(null);
                setCreatedGroupPda(null);
            }, 5000);

        } catch (err) {
            console.error("❌ createGroup RPC error:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to create group";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            toast.dismiss();
        }
    };

    const handleCopyPDA = () => {
        if (createdGroupPda) {
            navigator.clipboard.writeText(createdGroupPda);
            toast.success("Group address copied to clipboard!");
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create a New Group</h2>
                <p className="mt-1 text-sm text-gray-500">Start a new group and invite others to join</p>
            </div>

            {!publicKey ? (
                <div className="text-center py-6">
                    <div className="mb-4 text-gray-400">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-gray-600 mb-4">Please connect your wallet to create a group</p>
                    <WalletMultiButton className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" />
                </div>
            ) : txSignature && createdGroupPda ? (
                <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Group Created Successfully!</h3>
                    <p className="mt-2 text-gray-600">Your group has been created on the Solana blockchain.</p>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Group PDA:</span>
                            <button
                                onClick={handleCopyPDA}
                                className="text-gray-400 hover:text-gray-500"
                                title="Copy to clipboard"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            </button>
                        </div>
                        <div className="mt-1 text-sm font-mono text-gray-700 break-all">
                            {createdGroupPda}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            View Transaction
                            <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <button
                            onClick={() => {
                                setTxSignature(null);
                                setCreatedGroupPda(null);
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Create Another Group
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleCreateGroup} className="space-y-6">
                    <div>
                        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                            Group Name <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                type="text"
                                id="groupName"
                                name="groupName"
                                value={formData.groupName}
                                onChange={handleInputChange}
                                maxLength={32}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="e.g., Solana Devs"
                                disabled={loading}
                                required
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-xs text-gray-500">{formData.groupName.length}/32</span>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Maximum 32 characters</p>
                    </div>

                    <div>
                        <label htmlFor="groupDesc" className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-gray-400">(Optional)</span>
                        </label>
                        <div className="mt-1 relative">
                            <textarea
                                id="groupDesc"
                                name="groupDesc"
                                value={formData.groupDesc}
                                onChange={handleInputChange}
                                maxLength={200}
                                rows={3}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Tell us about this group..."
                                disabled={loading}
                            />
                            <div className="absolute bottom-2 right-2 bg-white px-2 rounded">
                                <span className="text-xs text-gray-500">{formData.groupDesc.length}/200</span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Error creating group</h3>
                                    <div className="mt-1 text-sm text-red-700">
                                        <p>{error}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !formValid}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${loading || !formValid
                                ? 'bg-indigo-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Group...
                                </>
                            ) : (
                                'Create Group'
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Success state is already handled in the main conditional rendering */}
        </div>
    );
};

export default CreateGroup;
