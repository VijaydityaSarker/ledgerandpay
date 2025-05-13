// tests/ledgerandpay.ts

import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import type { Ledgerandpay } from "../target/types/ledgerandpay";

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

const { Program, web3 } = anchor;
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.Ledgerandpay as Program<Ledgerandpay>;

describe("ledgerandpay (group + expense + settlement)", () => {
  // ---- GROUP MANAGEMENT TESTS ----
  describe("Group management", () => {
    const creator = Keypair.generate();
    const joiner = Keypair.generate();
    const groupName = "Test Group";
    const groupDesc = "This is a test group";

    let groupPda: PublicKey;

    it("✅ create_group()", async () => {
      // fund creator
      const sig = await provider.connection.requestAirdrop(
        creator.publicKey,
        2 * web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");

      // derive PDA
      [groupPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("group"), creator.publicKey.toBuffer()],
        program.programId
      );

      // invoke create_group
      await program.methods
        .createGroup(groupName, groupDesc)
        .accounts({
          group: groupPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // fetch and assert
      const acct = await program.account.groupAccount.fetch(groupPda);
      assert.strictEqual(
        acct.creator.toBase58(),
        creator.publicKey.toBase58()
      );
      assert.strictEqual(acct.groupName, groupName);
      assert.strictEqual(acct.description, groupDesc);
      assert.strictEqual(acct.participants.length, 1);
      assert.strictEqual(
        acct.participants[0].toBase58(),
        creator.publicKey.toBase58()
      );
    });

    it("✅ join_group()", async () => {
      // fund joiner
      const sig = await provider.connection.requestAirdrop(
        joiner.publicKey,
        web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");

      // invoke join_group
      await program.methods
        .joinGroup()
        .accounts({
          group: groupPda,
          joiner: joiner.publicKey,
        })
        .signers([joiner])
        .rpc();

      // fetch and assert
      const acct = await program.account.groupAccount.fetch(groupPda);
      assert.strictEqual(acct.participants.length, 2);
      assert.strictEqual(
        acct.participants[1].toBase58(),
        joiner.publicKey.toBase58()
      );
    });

    it("❌ duplicate join_group() fails", async () => {
      try {
        await program.methods
          .joinGroup()
          .accounts({
            group: groupPda,
            joiner: joiner.publicKey,
          })
          .signers([joiner])
          .rpc();
        assert.fail("Expected AlreadyParticipant error");
      } catch (err: any) {
        assert.ok(
          err.toString().includes("AlreadyParticipant"),
          `Wrong error: ${err}`
        );
      }
    });
  });

  // ---- EXPENSE LOGGING TESTS ----
  describe("Expense logging", () => {
    const payerPubkey = provider.wallet.publicKey;
    let expenseGroupPda: PublicKey;
    let expensePda: PublicKey;

    before(async () => {
      // derive & create a fresh group for expenses
      [expenseGroupPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("group"), payerPubkey.toBuffer()],
        program.programId
      );

      await program.methods
        .createGroup("Expense Group", "Group for expense tests")
        .accounts({
          group: expenseGroupPda,
          creator: payerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("✅ log_expense()", async () => {
      const desc = "Dinner";
      const participants = [payerPubkey];
      const amount = new BN(5000);

      // derive expense PDA
      [expensePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("expense"),
          expenseGroupPda.toBuffer(),
          payerPubkey.toBuffer(),
          Buffer.from(desc),
        ],
        program.programId
      );

      // call log_expense
      await program.methods
        .logExpense(amount, participants, desc)
        .accounts({
          payer: payerPubkey,
          group: expenseGroupPda,
          expense: expensePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // fetch & assert
      const acct = await program.account.expense.fetch(expensePda);
      assert.strictEqual(acct.payer.toBase58(), payerPubkey.toBase58());
      assert.strictEqual(acct.group.toBase58(), expenseGroupPda.toBase58());
      assert.strictEqual(acct.amount.toNumber(), amount.toNumber());
      assert.strictEqual(acct.description, desc);
      assert.strictEqual(acct.participants.length, 1);
      assert.strictEqual(
        acct.participants[0].toBase58(),
        payerPubkey.toBase58()
      );
      assert.strictEqual(acct.settled, false);
    });
  });

  // ---- EXPENSE SETTLEMENT TESTS ----
  describe("Expense settlement", () => {
    const payerPubkey = provider.wallet.publicKey;
    let bob: Keypair;
    let usdcMint: PublicKey;
    let payerUsdc: PublicKey;
    let bobUsdc: PublicKey;
    let groupPda: PublicKey;
    let expensePda: PublicKey;

    const USDC_DECIMALS = 6;
    const EXPENSE_AMOUNT = new BN(100 * 10 ** USDC_DECIMALS);
    const desc = "Settle Dinner";

    before(async () => {
      bob = Keypair.generate();

      // 1) Create USDC mint (fee‐payer = your local wallet)
      usdcMint = await createMint(
        provider.connection,
        provider.wallet.payer,  // <-- a Keypair
        payerPubkey,            // mint authority (PublicKey)
        null,
        USDC_DECIMALS
      );

      // 2) Create ATAs
      const aliceAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,  // fee‐payer
        usdcMint,
        payerPubkey
      );
      payerUsdc = aliceAta.address;

      const bobAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,  // fee‐payer
        usdcMint,
        bob.publicKey
      );
      bobUsdc = bobAta.address;

      // 3) Mint Bob 100 USDC **using the Keypair as authority**  
      await mintTo(
        provider.connection,
        provider.wallet.payer,  // fee‐payer
        usdcMint,
        bobUsdc,
        provider.wallet.payer,  // <–– must be the Keypair, not just the PublicKey
        EXPENSE_AMOUNT.toNumber()
      );

      // 4) Derive & join group, then log an expense owed by Bob (identical to before)
      groupPda = PublicKey.findProgramAddressSync(
        [Buffer.from("group"), payerPubkey.toBuffer()],
        program.programId
      )[0];
      await program.methods
        .joinGroup()
        .accounts({ group: groupPda, joiner: bob.publicKey })
        .signers([bob])
        .rpc();

      [expensePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("expense"),
          groupPda.toBuffer(),
          payerPubkey.toBuffer(),
          Buffer.from(desc),
        ],
        program.programId
      );
      await program.methods
        .logExpense(EXPENSE_AMOUNT, [bob.publicKey], desc)
        .accounts({
          payer: payerPubkey,
          group: groupPda,
          expense: expensePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("Bob settles the expense and balances update", async () => {
      const beforeBob = await getAccount(provider.connection, bobUsdc);
      const beforeAlice = await getAccount(provider.connection, payerUsdc);

      await program.methods
        .settleExpense()
        .accounts({
          group: groupPda,
          expense: expensePda,
          payer: bob.publicKey,
          payerUsdc: bobUsdc,
          payee: payerPubkey,
          payeeUsdc: payerUsdc,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([bob])
        .rpc();

      const afterBob = await getAccount(provider.connection, bobUsdc);
      const afterAlice = await getAccount(provider.connection, payerUsdc);

      assert.strictEqual(
        Number(beforeBob.amount) - Number(afterBob.amount),
        EXPENSE_AMOUNT.toNumber()
      );
      assert.strictEqual(
        Number(afterAlice.amount) - Number(beforeAlice.amount),
        EXPENSE_AMOUNT.toNumber()
      );

      const exp = await program.account.expense.fetch(expensePda);
      assert.strictEqual(exp.settled, true);
    });

    it("Cannot settle the same expense twice", async () => {
      try {
        await program.methods
          .settleExpense()
          .accounts({
            group: groupPda,
            expense: expensePda,
            payer: bob.publicKey,
            payerUsdc: bobUsdc,
            payee: payerPubkey,
            payeeUsdc: payerUsdc,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([bob])
          .rpc();
        assert.fail("Expected AlreadySettled error");
      } catch (err: any) {
        assert.ok(
          err.toString().includes("This expense has already been settled"),
          `Unexpected error: ${err}`
        );
      }
    });
  });
});

