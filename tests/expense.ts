// tests/expense.ts
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, NodeWallet, workspace } from "@coral-xyz/anchor";
import { Ledgerandpay } from "../target/types/ledgerandpay";
import * as assert from "assert";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Connection, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import crypto from 'crypto';

async function fundFromWallet(to: PublicKey, provider: AnchorProvider, minLamports = LAMPORTS_PER_SOL) {
    const bal = await provider.connection.getBalance(to);
    if (bal < 0.1 * LAMPORTS_PER_SOL) {
        const tx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: to,
                lamports: minLamports,
            })
        );
        // @ts-ignore
        await provider.sendAndConfirm(tx, []);
    }
}

describe("Expense Logging", () => {
    // Set up provider and program
    const connection = new Connection(process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8900", "confirmed");
    const wallet = new anchor.Wallet(
        anchor.web3.Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!, "utf-8")))
        )
    );
    const provider = new AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    const program = workspace.Ledgerandpay as Program<Ledgerandpay>;
    let groupPda: PublicKey;
    let uniqueSeed: Buffer;
    let creator: PublicKey;

    before(async () => {
        uniqueSeed = crypto.randomBytes(16); // always 16 bytes
        creator = (provider.wallet as NodeWallet).payer.publicKey;
        [groupPda] = PublicKey.findProgramAddressSync([
            Buffer.from("group"),
            creator.toBuffer(),
            uniqueSeed
        ], program.programId);
        await program.methods
            .createGroup([...uniqueSeed], "TestGroup", "On-chain testing group")
            .accounts({
                group: groupPda,
                creator,
                systemProgram: SystemProgram.programId
            })
            .rpc();
    });

    it("splits evenly with 2 participants (100/2)", async () => {
        // Join a friend
        const friend = Keypair.generate();
        // Fund from main wallet if needed
        await fundFromWallet(friend.publicKey, provider);

        await program.methods
            .joinGroup()
            .accounts({ group: groupPda, joiner: friend.publicKey })
            .signers([friend])
            .rpc();

        // Derive expense PDA
        const desc = "Dinner";
        const expensePda = PublicKey.findProgramAddressSync([
            Buffer.from("expense"),
            groupPda.toBuffer(),
            creator.toBuffer(),
            Buffer.from(desc)
        ], program.programId)[0];

        await program.methods
            .logExpense(new BN(100), [creator, friend.publicKey], desc)
            .accounts({
                payer: creator,
                group: groupPda,
                expense: expensePda,
                systemProgram: SystemProgram.programId
            })
            .rpc();

        const acct = await program.account.expense.fetch(expensePda);
        assert.ok(acct.amount.eq(new BN(100)));
        assert.deepEqual(
            acct.participants.map((pk: PublicKey) => pk.toBase58()).sort(),
            [creator.toBase58(), friend.publicKey.toBase58()].sort()
        );
        assert.deepEqual(
            acct.shares.map((bn: BN) => bn.toNumber()),
            [50, 50]
        );
    });

    it("splits with remainder (101/3)", async () => {
        // Join two more friends
        const extra1 = Keypair.generate();
        const extra2 = Keypair.generate();
        for (const kp of [extra1, extra2]) {
            await fundFromWallet(kp.publicKey, provider);
            await program.methods
                .joinGroup()
                .accounts({ group: groupPda, joiner: kp.publicKey })
                .signers([kp])
                .rpc();
        }

        const desc = "Lunch";
        const expensePda = PublicKey.findProgramAddressSync([
            Buffer.from("expense"),
            groupPda.toBuffer(),
            creator.toBuffer(),
            Buffer.from(desc)
        ], program.programId)[0];

        const members = [creator, extra1.publicKey, extra2.publicKey];
        await program.methods
            .logExpense(new BN(101), members, desc)
            .accounts({
                payer: creator,
                group: groupPda,
                expense: expensePda,
                systemProgram: SystemProgram.programId
            })
            .rpc();

        const acct = await program.account.expense.fetch(expensePda);
        assert.ok(acct.amount.eq(new BN(101)));
        assert.ok(acct.participants.length === 3);
        const totalShares = acct.shares.reduce((acc: BN, bn: BN) => acc.add(bn), new BN(0));
        assert.ok(totalShares.eq(new BN(101)));
        assert.ok(acct.shares.some((bn: BN) => bn.toNumber() !== 33));
    });

    it("errors when description is too long", async () => {
        const longDesc = "X".repeat(33);
        // PDA derivation will fail for >32 bytes
        assert.throws(() => {
            PublicKey.findProgramAddressSync([
                Buffer.from("expense"),
                groupPda.toBuffer(),
                creator.toBuffer(),
                Buffer.from(longDesc)
            ], program.programId);
        }, /Max seed length exceeded/);
    });

    it("errors when no participants provided", async () => {
        const desc = "Nobody";
        const expensePda = PublicKey.findProgramAddressSync([
            Buffer.from("expense"),
            groupPda.toBuffer(),
            creator.toBuffer(),
            Buffer.from(desc)
        ], program.programId)[0];
        await assert.rejects(
            program.methods
                .logExpense(new BN(10), [], desc)
                .accounts({
                    payer: creator,
                    group: groupPda,
                    expense: expensePda,
                    systemProgram: SystemProgram.programId
                })
                .rpc(),
            /No participants provided/
        );
    });

    it("errors when too many participants", async () => {
        const many = Array(6).fill(0).map(() => Keypair.generate().publicKey);
        const desc = "Crowd";
        const expensePda = PublicKey.findProgramAddressSync([
            Buffer.from("expense"),
            groupPda.toBuffer(),
            creator.toBuffer(),
            Buffer.from(desc)
        ], program.programId)[0];
        await assert.rejects(
            program.methods
                .logExpense(new BN(10), many, desc)
                .accounts({
                    payer: creator,
                    group: groupPda,
                    expense: expensePda,
                    systemProgram: SystemProgram.programId
                })
                .rpc(),
            /Too many participants/
        );
    });

    it("errors when payer is not in group", async () => {
        const outsider = Keypair.generate();
        await fundFromWallet(outsider.publicKey, provider, LAMPORTS_PER_SOL * 2);
        const desc = "Outsider";
        const expensePda = PublicKey.findProgramAddressSync([
            Buffer.from("expense"),
            groupPda.toBuffer(),
            outsider.publicKey.toBuffer(),
            Buffer.from(desc)
        ], program.programId)[0];
        await assert.rejects(
            program.methods
                .logExpense(new BN(10), [outsider.publicKey], desc)
                .accounts({
                    payer: outsider.publicKey,
                    group: groupPda,
                    expense: expensePda,
                    systemProgram: SystemProgram.programId
                })
                .signers([outsider])
                .rpc(),
            /Payer is not a member of the group/
        );
    });
});
