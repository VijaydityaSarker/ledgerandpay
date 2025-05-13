import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Ledgerandpay } from "../target/types/ledgerandpay";
import { assert } from "chai";
import {
    PublicKey,
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Connection,
} from "@solana/web3.js";
import { randomBytes } from "crypto";
import fs from "fs";

describe("Group CRUD operations", () => {
    // 1) Anchor spins up a local test validator
    const connection = new Connection(process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8900", "confirmed");
const wallet = new anchor.Wallet(
  anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.ANCHOR_WALLET!, "utf-8")))
  )
);
const provider = new anchor.AnchorProvider(connection, wallet, {});
anchor.setProvider(provider);

    // 2) Our deployed program
    const program = anchor.workspace
        .Ledgerandpay as Program<Ledgerandpay>;

    // 3) CLI wallet = group creator
    const creator = provider.wallet.payer as Keypair;

    // 4) 16-byte seed → number[]
    const uniqueSeed = Array.from(randomBytes(16));
    let groupPda: PublicKey;

    const groupName = "TestGroup";
    const groupDesc = "Description for TestGroup";

    it("creates a new group", async () => {
        [groupPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("group"), creator.publicKey.toBuffer(), Buffer.from(uniqueSeed)],
            program.programId
        );

        await program.methods
            .createGroup(uniqueSeed, groupName, groupDesc)
            .accounts({ group: groupPda, creator: creator.publicKey, systemProgram: SystemProgram.programId })
            .rpc();

        const acct = await program.account.groupAccount.fetch(groupPda);
        assert.equal(acct.creator.toBase58(), creator.publicKey.toBase58());
        assert.equal(acct.groupName, groupName);
        assert.equal(acct.description, groupDesc);
        assert.equal(acct.participants.length, 1);
        assert.equal(acct.participants[0].toBase58(), creator.publicKey.toBase58());
    });

    it("lets another user join the group", async () => {
        const joiner = Keypair.generate();
        const sig = await provider.connection.requestAirdrop(joiner.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig);

        const joinProv = new anchor.AnchorProvider(
            provider.connection,
            new anchor.Wallet(joiner),
            provider.opts
        );
        anchor.setProvider(joinProv);

        // include joiner as signer
        await program.methods
            .joinGroup()
            .accounts({ group: groupPda, joiner: joiner.publicKey })
            .signers([joiner])
            .rpc();

        anchor.setProvider(provider);
        const updated = await program.account.groupAccount.fetch(groupPda);
        assert.isTrue(
            updated.participants.some(pk => pk.toBase58() === joiner.publicKey.toBase58())
        );
    });

    it("allows the creator to rename the group", async () => {
        const newName = "RenamedGroup";
        await program.methods
            .renameGroup(newName)
            .accounts({ group: groupPda, creator: creator.publicKey })
            .rpc();

        const acct = await program.account.groupAccount.fetch(groupPda);
        assert.equal(acct.groupName, newName);
    });

    it("prevents non-creator from renaming the group", async () => {
        const nonCreator = Keypair.generate();
        const sig = await provider.connection.requestAirdrop(nonCreator.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig);

        const nonProv = new anchor.AnchorProvider(
            provider.connection,
            new anchor.Wallet(nonCreator),
            provider.opts
        );
        anchor.setProvider(nonProv);

        try {
            await program.methods
                .renameGroup("HackerName")
                .accounts({ group: groupPda, creator: nonCreator.publicKey })
                // **must sign with nonCreator**
                .signers([nonCreator])
                .rpc();
            assert.fail("rename by non-creator should fail");
        } catch (err: any) {
            // look for the built-in ConstraintHasOne code
            const text = err.toString();
            assert.ok(
                text.includes("ConstraintHasOne") || text.includes("has one constraint"),
                `Wrong error, got: ${text}`
            );
        }

        anchor.setProvider(provider);
    });

    it("removes a member from the group (creator only)", async () => {
        const before = await program.account.groupAccount.fetch(groupPda);
        const toRemove = before.participants.find(
            pk => pk.toBase58() !== creator.publicKey.toBase58()
        )!;

        await program.methods
            .removeMember(toRemove)
            .accounts({ group: groupPda, creator: creator.publicKey })
            .rpc();

        const after = await program.account.groupAccount.fetch(groupPda);
        assert.isFalse(
            after.participants.some(pk => pk.toBase58() === toRemove.toBase58())
        );
    });

    it("prevents non-creator from removing a member", async () => {
        const nonCreator = Keypair.generate();
        const sig = await provider.connection.requestAirdrop(nonCreator.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig);

        const nonProv = new anchor.AnchorProvider(
            provider.connection,
            new anchor.Wallet(nonCreator),
            provider.opts
        );
        anchor.setProvider(nonProv);

        try {
            await program.methods
                .removeMember(creator.publicKey)
                .accounts({ group: groupPda, creator: nonCreator.publicKey })
                // **must sign with nonCreator**
                .signers([nonCreator])
                .rpc();
            assert.fail("removeMember by non-creator should fail");
        } catch (err: any) {
            const text = err.toString();
            assert.ok(
                text.includes("ConstraintHasOne") || text.includes("has one constraint"),
                `Wrong error, got: ${text}`
            );
        }

        anchor.setProvider(provider);
    });
});
