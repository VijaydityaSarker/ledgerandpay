// programs/ledgerandpay/src/settlement.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, TokenAccount, Token, Mint};

use crate::group::GroupAccount;
use crate::expense::Expense;
//use crate::GroupError;

#[derive(Accounts)]
pub struct SettleExpense<'info> {
    /// The group PDA (holds the participant list)
    #[account(
        mut,
        seeds = [b"group", group.creator.as_ref()],
        bump,
    )]
    pub group: Account<'info, GroupAccount>,

    /// The specific expense to settle
    #[account(
        mut,
        seeds = [
            b"expense",
            group.key().as_ref(),
            expense.payer.as_ref(),
            expense.description.as_bytes(), // ≤ 32 bytes
        ],
        bump,
        has_one = group,
    )]
    pub expense: Account<'info, Expense>,

    /// The signer who is paying their share
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Payer’s USDC token account
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = payer,
    )]
    pub payer_usdc: Account<'info, TokenAccount>,

    /// The original expense payer (will receive funds)
    /// CHECK: We know this is the original payer because
    /// it’s stored in the `expense.payer` field and verified via `has_one = group`
    pub payee: UncheckedAccount<'info>, 

    /// Payee’s USDC token account
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = payee,
    )]
    pub payee_usdc: Account<'info, TokenAccount>,

    /// The USDC mint
    pub usdc_mint: Account<'info, Mint>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,
}

/// The actual logic for settling one expense
pub fn settle_expense_handler(ctx: Context<SettleExpense>) -> Result<()> {
    let exp = &mut ctx.accounts.expense;

    // 1) Can only settle once
    require!(!exp.settled, SettlementError::AlreadySettled);

    // 2) Caller must be one of the participants
    let payer_key = ctx.accounts.payer.key();
    require!(
        exp.participants.contains(&payer_key),
        SettlementError::NotParticipant
    );

    // 3) Funds go back to the original payer
    require!(
        exp.payer == ctx.accounts.payee.key(),
        SettlementError::InvalidPayee
    );

    // 4) Compute per-person share
    let count = exp.participants.len() as u64;
    let share = exp
        .amount
        .checked_div(count)
        .ok_or(SettlementError::MathError)?;

    // 5) Transfer via CPI to SPL Token program
    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_usdc.to_account_info(),
        to: ctx.accounts.payee_usdc.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, share)?;

    // 6) Mark as settled
    exp.settled = true;
    Ok(())
}

#[error_code]
pub enum SettlementError {
    #[msg("This expense has already been settled.")]
    AlreadySettled,
    #[msg("You are not a participant in this expense.")]
    NotParticipant,
    #[msg("Can only pay back the original expense payer.")]
    InvalidPayee,
    #[msg("Error dividing amount across participants.")]
    MathError,
}
