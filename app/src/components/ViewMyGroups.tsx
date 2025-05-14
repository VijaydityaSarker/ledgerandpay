// src/components/ViewMyGroups.tsx
import React, { useEffect, useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useAnchorWallet, useWallet, useAnchorWallet as useAnchorWalletHook } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl, BN } from "@coral-xyz/anchor";
import type { Ledgerandpay } from "../ledgerandpay";
import idlJson from "../ledgerandpay.json";

type GroupAccount = {
    pubkey: PublicKey,
    account: {
        creator: PublicKey,
        unique_seed: number[],    // stable, random or timestamp‐based seed
        bump: number,                 // PDA bump
        group_name: string,       // human‐readable name
        description: string,      // description (max 200)
        participants: PublicKey[],// member list
        created_at: number,          // timestamp
    }
}

interface ViewMyGroupsProps {
    onNewGroupTx?: string | null;
    onGroupSelect: (publicKey: PublicKey) => void;
}

export const ViewMyGroups: React.FC<ViewMyGroupsProps> = ({ onNewGroupTx, onGroupSelect }) => {
    const { publicKey, connected } = useWallet();
    const wallet = useAnchorWalletHook();
    const { connection } = useConnection();
    const [groups, setGroups] = useState<GroupAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    console.log('Wallet connected:', connected, 'Public key:', publicKey?.toBase58());

    const fetchGroups = useCallback(async () => {
        if (!wallet?.publicKey) {
            console.log('No wallet public key available');
            setGroups([]);
            setError('Wallet not connected');
            setLoading(false);
            return;
        }
        
        console.log('Fetching groups for wallet:', wallet.publicKey.toBase58());
        setLoading(true);
        setError(null);

        try {
            const provider = new AnchorProvider(connection, wallet, {
                preflightCommitment: "processed",
            });
            const program = new Program<Ledgerandpay>(idlJson as Idl, provider);
            console.log('Program ID:', program.programId.toBase58());

            // Fetch all groups
            console.log('Fetching groups...');
            const rawAccounts = await connection.getProgramAccounts(program.programId);
            console.log('Found ' + rawAccounts.length + ' accounts');

            const validGroups = [];
            for (const [index, acc] of Object.entries(rawAccounts)) {
                console.log('Decoding account ' + index + ' of ' + rawAccounts.length);
                const VALID_SIZE = 477;
                if (VALID_SIZE !== acc.account.data.length) continue;
                try {
                    const decoded = program.account.groupAccount.coder.accounts.decode(
                        "groupAccount",
                        acc.account.data
                    );
                    validGroups.push({
                        pubkey: acc.pubkey,
                        account: decoded,
                    } as unknown as GroupAccount);
                } catch (e) {
                    // Skip accounts that fail to decode
                    console.warn(`Skipping account ${acc.pubkey.toBase58()}:`, e);
                }
            }
            
            const mine = [];
            for (const group of validGroups) {
                if (group.account.participants.some(p => p.equals(wallet.publicKey))) {
                    mine.push(group);
                }
            }
            
            setGroups(mine.map(account => ({
                pubkey: account.pubkey,
                account: {
                    creator: account.account.creator,
                    unique_seed: account.account.unique_seed,
                    bump: account.account.bump,
                    group_name: account.account.group_name,
                    description: account.account.description,
                    participants: account.account.participants,
                    created_at: account.account.created_at,
                }
            })));
        } catch (err) {
            console.error("Error fetching groups:", err);
            setError("Failed to load groups. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [wallet, connection]);

    // Initial fetch and refetch when dependencies change
    useEffect(() => {
        if (connected) {
            console.log('Wallet connected, fetching groups...');
            fetchGroups();
        } else {
            console.log('Wallet not connected, clearing groups');
            setGroups([]);
            setError('Connect your wallet to view groups');
        }
    }, [connected, fetchGroups, onNewGroupTx]);

    const handleGroupClick = (pubkey: PublicKey, e: React.MouseEvent) => {
        e.preventDefault();
        onGroupSelect(pubkey);
    };

    if (!connected) {
        return (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-500 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700">Wallet not connected</h3>
                <p className="mt-1 text-sm text-gray-500">Please connect your wallet to view your groups</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="mt-3 text-gray-500">Loading your groups...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                <div className="text-red-500 mb-3">
                    <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-red-700">Error loading groups</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <button 
                    onClick={fetchGroups}
                    className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400 mb-3">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700">No groups found</h3>
                <p className="mt-1 text-sm text-gray-500">You're not a member of any groups yet.</p>
                <div className="mt-4">
                    <p className="text-xs text-gray-400">Create a new group or ask to join an existing one</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">My Groups</h2>
                    <p className="text-sm text-gray-500">Groups you're a member of</p>
                </div>
                <button 
                    onClick={fetchGroups}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={loading}
                >
                    <svg className={`-ml-0.5 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                    <div
                        key={group.pubkey.toBase58()}
                        className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        onClick={(e) => handleGroupClick(group.pubkey, e)}
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {group.account.group_name}
                                    </h3>
                                    {group.account.description && (
                                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                            {group.account.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {group.account.participants.slice(0, 3).map((participant, idx) => (
                                        <div key={idx} className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                            <span className="text-xs text-gray-500">
                                                {participant.toString().charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                    {group.account.participants.length > 3 && (
                                        <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                            <span className="text-xs text-gray-500">
                                                +{group.account.participants.length - 3}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(Number(group.account.created_at) * 1000).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs font-medium text-gray-500">
                                        {group.account.participants.length} {group.account.participants.length === 1 ? 'member' : 'members'}
                                    </span>
                                </div>
                                <div className="text-xs font-mono text-indigo-600 truncate max-w-[100px]" title={group.pubkey.toBase58()}>
                                    {group.pubkey.toBase58().slice(0, 6)}...{group.pubkey.toBase58().slice(-4)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ViewMyGroups;
