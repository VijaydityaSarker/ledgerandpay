// tests/settlement.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Ledgerandpay } from "../target/types/ledgerandpay";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import assert from "assert";
import fs from "fs";

// Load the payer keypair from your anchor wallet
const payer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(process.env.ANCHOR_WALLET!, "utf-8")
    )
  )
);

// Configure the provider to talk to your local validator
// Use devnet by default unless overridden by ANCHOR_PROVIDER_URL
const rpcUrl = process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";
const connection = new anchor.web3.Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(payer),
  anchor.AnchorProvider.defaultOptions()
);
anchor.setProvider(provider);

const program = anchor.workspace.Ledgerandpay as Program<Ledgerandpay>;

/**
 * Helper to fund a new account with SOL from payer (devnet-compatible)
 */
async function fundSol(to: PublicKey, amountSol: number) {
  const tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: to,
      lamports: amountSol * anchor.web3.LAMPORTS_PER_SOL,
    })
  );
  await provider.sendAndConfirm(tx, [payer]);
}

/**
 * Sets up a fresh group, expense, and associated token accounts.
 * Returns all the key data needed for settlement tests.
 */
async function setupTestEnv(desc: string, friend: Keypair) {
  // 1) Fund friend so they can pay fees (payer already funded)
  await fundSol(friend.publicKey, 0.1);

  // 2) Create a USDC-like mint (6 decimals)
  const usdcMint = await createMint(
    provider.connection,
    payer,
    payer.publicKey,
    null,
    6
  );

  // 3) Creator's ATA for USDC
  const creatorAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    usdcMint,
    payer.publicKey
  );
  const creatorUsdcAta = creatorAta.address;

  // 4) Derive & create the group PDA
  const uniqueSeed = anchor.utils.bytes.utf8
    .encode(Math.random().toString().slice(2, 18))
    .slice(0, 16);
  const [groupPda] = await PublicKey.findProgramAddress(
    [Buffer.from("group"), payer.publicKey.toBuffer(), uniqueSeed],
    program.programId
  );
  await program.methods
    .createGroup([...uniqueSeed], "TestGroup", "Test Desc")
    .accounts({
      group: groupPda,
      creator: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // 5) Friend joins the group
  await program.methods
    .joinGroup()
    .accounts({ group: groupPda, joiner: friend.publicKey })
    .signers([friend])
    .rpc();

  // 6) Derive & log an expense of 100 units split in two
  const [expensePda] = await PublicKey.findProgramAddress(
    [
      Buffer.from("expense"),
      groupPda.toBuffer(),
      payer.publicKey.toBuffer(),
      Buffer.from(desc),
    ],
    program.programId
  );
  await program.methods
    .logExpense(new BN(100), [payer.publicKey, friend.publicKey], desc)
    .accounts({
      payer: payer.publicKey,
      group: groupPda,
      expense: expensePda,
      systemProgram: SystemProgram.programId,
    })
    .signers([payer])
    .rpc();

  // 7) Friend's ATA and mint them 50 USDC (their share)
  const friendAta = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    usdcMint,
    friend.publicKey
  );
  await mintTo(
    provider.connection,
    payer,
    usdcMint,
    friendAta.address,
    payer,
    50 * 10 ** 6
  );

  return {
    usdcMint,
    creatorUsdcAta,
    friendUsdcAta: friendAta.address,
    groupPda,
    expensePda,
  };
}

describe("SettleExpense", () => {
  it("successfully settles an expense", async () => {
    const friend = Keypair.generate();
    const {
      usdcMint,
      creatorUsdcAta,
      friendUsdcAta,
      groupPda,
      expensePda,
    } = await setupTestEnv("Dinner", friend);

    // Invoke settleExpense: friend pays their share back to creator
    const txSig = await program.methods
      .settleExpense()
      .accounts({
        group: groupPda,
        expense: expensePda,
        payer: friend.publicKey,
        payerUsdc: friendUsdcAta,
        payee: payer.publicKey,
        payeeUsdc: creatorUsdcAta,
        usdcMint,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([friend])
      .rpc();

    // Fetch logs to verify the CPI ran
    const tx = await provider.connection.getTransaction(txSig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    console.log(tx?.meta?.logMessages);

    // Finally, verify the 'settled' flag flipped
    const acct = await program.account.expense.fetch(expensePda);
    assert.ok(acct.settled, "expense.settled should be true");
  });

  it("fails when already settled", async () => {
    const friend = Keypair.generate();
    const {
      usdcMint,
      creatorUsdcAta,
      friendUsdcAta,
      groupPda,
      expensePda,
    } = await setupTestEnv("Lunch", friend);

    // First settlement succeeds
    await program.methods
      .settleExpense()
      .accounts({
        group: groupPda,
        expense: expensePda,
        payer: friend.publicKey,
        payerUsdc: friendUsdcAta,
        payee: payer.publicKey,
        payeeUsdc: creatorUsdcAta,
        usdcMint,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([friend])
      .rpc();

    // Second attempt should fail with AlreadySettled
    await assert.rejects(
      program.methods
        .settleExpense()
        .accounts({
          group: groupPda,
          expense: expensePda,
          payer: friend.publicKey,
          payerUsdc: friendUsdcAta,
          payee: payer.publicKey,
          payeeUsdc: creatorUsdcAta,
          usdcMint,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([friend])
        .rpc(),
      /already been settled/i
    );
  });

  it("fails when called by a non-participant", async () => {
    const friend = Keypair.generate();
    const {
      usdcMint,
      creatorUsdcAta,
      groupPda,
      expensePda,
    } = await setupTestEnv("Coffee", friend);

    // Set up an outsider with some USDC
    const outsider = Keypair.generate();
    await fundSol(outsider.publicKey, 0.1);
    const outsiderAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      usdcMint,
      outsider.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      usdcMint,
      outsiderAta.address,
      payer,
      50 * 10 ** 6
    );

    // Outsider tries to settle — should get NotParticipant
    await assert.rejects(
      program.methods
        .settleExpense()
        .accounts({
          group: groupPda,
          expense: expensePda,
          payer: outsider.publicKey,
          payerUsdc: outsiderAta.address,
          payee: payer.publicKey,
          payeeUsdc: creatorUsdcAta,
          usdcMint,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([outsider])
        .rpc(),
      /not a participant/i
    );
  });
});
