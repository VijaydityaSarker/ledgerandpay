import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import idlJson from "../ledgerandpay.json";

export type GroupAccount = {
    pubkey: PublicKey,
    account: {
        creator: PublicKey,
        unique_seed: number[],
        bump: number,
        group_name: string,
        description: string,
        participants: PublicKey[],
        created_at: number,
    }
}

export class GroupService {
    private connection: Connection;
    private program: any;

    constructor(connection: Connection, wallet: any) {
        this.connection = connection;
        const provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: "processed",
        });
        // Cast the IDL to any to avoid TypeScript errors with the full program type
        this.program = new Program(idlJson as Idl, provider) as any;
    }

    async getGroup(groupPda: PublicKey): Promise<GroupAccount | null> {
        try {
            // Fetch the group account
            const account = await this.program.account.groupAccount.fetch(groupPda);
            return {
                pubkey: groupPda,
                account
            };
        } catch (err) {
            console.error("Error fetching group:", err);
            return null;
        }
    }

    async isParticipantInGroup(groupPda: PublicKey, participant: PublicKey): Promise<boolean> {
        try {
            const group = await this.getGroup(groupPda);
            if (!group) return false;

            // Check if the participant is in the group
            return group.account.participants.some(p => p.equals(participant));
        } catch (err) {
            console.error("Error checking participant membership:", err);
            return false;
        }
    }

    async getAllGroupMembers(groupPda: PublicKey): Promise<PublicKey[]> {
        try {
            const group = await this.getGroup(groupPda);
            if (!group) return [];

            return group.account.participants;
        } catch (err) {
            console.error("Error fetching group members:", err);
            return [];
        }
    }
}

// Helper function to create a GroupService instance
export function createGroupService(connection: Connection, wallet: any): GroupService {
    return new GroupService(connection, wallet);
}

// Utility function to validate if a string is a valid Solana public key
export function isValidPublicKey(keyString: string): boolean {
    try {
        new PublicKey(keyString);
        return true;
    } catch (err) {
        return false;
    }
} 