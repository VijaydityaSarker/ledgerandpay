// src/services/programService.ts
import { AnchorProvider, Program, web3, BN, Idl } from "@coral-xyz/anchor";
import { PublicKey, Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import idlJson from "../ledgerandpay.json";

// Create a custom wallet adapter that satisfies the AnchorProvider requirements
interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
}

// Program ID from the IDL
const PROGRAM_ID = new PublicKey((idlJson as any).address);
const { SystemProgram } = web3;

export type Seed16 = Uint8Array & { readonly length: 16 };

export type GroupAccount = {
  pubkey: PublicKey;
  account: {
    creator: PublicKey;
    uniqueSeed: number[];
    bump: number;
    groupName: string;
    description: string;
    participants: PublicKey[];
    createdAt: number;
  };
};

export type ExpenseAccount = {
  pubkey: PublicKey;
  account: {
    group: PublicKey;
    payer: PublicKey;
    amount: BN;
    participants: PublicKey[];
    shares: BN[];
    description: string;
    timestamp: BN;
    settled: boolean;
    bump: number;
  };
};

// Create a singleton instance of the program service
class ProgramService {
  private static instance: ProgramService;
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;

  private constructor() {}

  public static getInstance(): ProgramService {
    if (!ProgramService.instance) {
      ProgramService.instance = new ProgramService();
    }
    return ProgramService.instance;
  }

  public initializeProgram(wallet: WalletContextState, connection: Connection): Program {
    if (!wallet || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    try {
      console.log("Creating anchor wallet adapter...");
      // Create an adapter that satisfies the AnchorWallet interface
      const anchorWallet: AnchorWallet = {
        publicKey: wallet.publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
          if (!wallet.signTransaction) {
            throw new Error("Wallet does not support signing transactions");
          }
          return wallet.signTransaction(transaction);
        },
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
          if (!wallet.signAllTransactions) {
            throw new Error("Wallet does not support signing multiple transactions");
          }
          return wallet.signAllTransactions(transactions);
        },
      };

      console.log("Creating AnchorProvider...");
      // Create the provider
      this.provider = new AnchorProvider(
        connection,
        anchorWallet,
        { preflightCommitment: "confirmed" }
      );

      console.log("Creating Program with ID:", PROGRAM_ID.toString());
      
      // Create the program with proper type casting
      // @ts-ignore - Ignoring type error as we know the provider is correctly initialized
      this.program = new Program(idlJson as any, PROGRAM_ID, this.provider);
      
      console.log("Program initialized successfully with ID:", this.program.programId.toString());
      return this.program;
    } catch (error) {
      console.error("Failed to initialize program:", error);
      throw new Error(`Failed to initialize program: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getProgram(): Program {
    if (!this.program) {
      console.error("Program not initialized when getProgram was called");
      throw new Error(
        "Program not initialized. This usually happens when your wallet connection hasn't been established properly. " +
        "Please ensure your wallet is connected and try refreshing the page."
      );
    }
    return this.program;
  }
  
  public isProgramInitialized(): boolean {
    return this.program !== null;
  }

  public getProvider(): AnchorProvider {
    if (!this.provider) {
      throw new Error("Provider not initialized. Call initializeProgram first.");
    }
    return this.provider;
  }

  /**
   * Fetch all groups the user is part of
   */
  public async fetchGroups(userPublicKey: PublicKey): Promise<GroupAccount[]> {
    const program = this.getProgram();
    
    try {
      // Fetch all group accounts
      // @ts-ignore - Using the account name from IDL
      const allGroups = await program.account.groupAccount.all();
      
      // Filter for groups where the user is a participant
      const userGroups = allGroups.filter((group: any) => {
        const participants = group.account.participants as PublicKey[];
        return participants.some((participant: PublicKey) => participant.equals(userPublicKey));
      });
      
      return userGroups as GroupAccount[];
    } catch (error) {
      console.error("Error fetching groups:", error);
      throw error;
    }
  }

  /**
   * Create a new group
   */
  public async createGroup(
    creator: PublicKey,
    groupName: string,
    description: string = ""
  ): Promise<{ txSignature: string; groupPda: string }> {
    const program = this.getProgram();
    
    try {
      // Generate a random seed for the group PDA using browser crypto
      const uniqueSeed = new Uint8Array(16);
      window.crypto.getRandomValues(uniqueSeed);
      
      // Find the group PDA address
      const [groupPda, bump] = await PublicKey.findProgramAddressSync(
        [Buffer.from("group"), creator.toBuffer(), Buffer.from(uniqueSeed)],
        program.programId
      );
      
      console.log("Creating group with PDA:", groupPda.toString());
      
      // Call the createGroup instruction
      const tx = await program.methods
        .createGroup(
          Array.from(uniqueSeed),
          groupName,
          description
        )
        .accounts({
          group: groupPda,
          creator: creator,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Group created successfully with tx:", tx);
      
      return {
        txSignature: tx,
        groupPda: groupPda.toString(),
      };
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  }

  /**
   * Join an existing group
   */
  public async joinGroup(
    joiner: PublicKey,
    groupPdaStr: string
  ): Promise<string> {
    const program = this.getProgram();
    
    try {
      const groupPda = new PublicKey(groupPdaStr);
      
      console.log("Joining group with PDA:", groupPda.toString());
      
      // Call the joinGroup instruction
      const tx = await program.methods
        .joinGroup()
        .accounts({
          group: groupPda,
          joiner: joiner,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Successfully joined group with tx:", tx);
      
      return tx;
    } catch (error) {
      console.error("Error joining group:", error);
      throw error;
    }
  }

  /**
   * Fetch expenses for a group
   */
  public async fetchExpenses(groupPda: PublicKey): Promise<ExpenseAccount[]> {
    const program = this.getProgram();
    
    try {
      // Fetch all expense accounts for the group
      // @ts-ignore - Using the account name from IDL
      const expenseAccounts = await program.account.expenseAccount.all([
        {
          memcmp: {
            offset: 8, // After the discriminator
            bytes: groupPda.toBase58(),
          },
        },
      ]);
      
      return expenseAccounts as ExpenseAccount[];
    } catch (error) {
      console.error("Error fetching expenses:", error);
      throw error;
    }
  }

  /**
   * Log a new expense
   */
  public async logExpense(
    payer: PublicKey,
    groupPda: PublicKey,
    amount: number | BN,
    participants: PublicKey[],
    description: string = ""
  ): Promise<string> {
    const program = this.getProgram();
    
    try {
      // Convert amount to BN if it's a number
      const amountBN = typeof amount === 'number' ? new BN(amount) : amount;
      
      // Calculate equal shares for all participants
      const shareAmount = amountBN.div(new BN(participants.length));
      const shares = participants.map(() => shareAmount);
      
      // Generate a unique seed for the expense PDA using browser crypto
      const uniqueSeed = new Uint8Array(16);
      window.crypto.getRandomValues(uniqueSeed);
      
      // Find the expense PDA address
      const [expensePda, bump] = await PublicKey.findProgramAddressSync(
        [Buffer.from("expense"), groupPda.toBuffer(), Buffer.from(uniqueSeed)],
        program.programId
      );
      
      console.log("Creating expense with PDA:", expensePda.toString());
      
      // Call the logExpense instruction
      const tx = await program.methods
        .logExpense(
          Array.from(uniqueSeed),
          amountBN,
          participants,
          shares,
          description
        )
        .accounts({
          expense: expensePda,
          group: groupPda,
          payer: payer,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Expense logged successfully with tx:", tx);
      
      return tx;
    } catch (error) {
      console.error("Error logging expense:", error);
      throw error;
    }
  }

  /**
   * Settle an expense
   */
  public async settleExpense(
    settler: PublicKey,
    groupPda: PublicKey,
    expensePda: PublicKey,
    payerPublicKey?: PublicKey // Optional parameter, not used in the actual instruction
  ): Promise<string> {
    const program = this.getProgram();
    
    try {
      console.log("Settling expense with PDA:", expensePda.toString());
      
      // Call the settleExpense instruction
      const tx = await program.methods
        .settleExpense()
        .accounts({
          expense: expensePda,
          group: groupPda,
          settler: settler,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("Expense settled successfully with tx:", tx);
      
      return tx;
    } catch (error) {
      console.error("Error settling expense:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export default ProgramService.getInstance();
