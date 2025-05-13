// programs/ledgerandpay/src/settlement.rs
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::group::GroupAccount;
use crate::expense::Expense;

#[derive(Accounts)]
pub struct SettleExpense<'info> {
    #[account(
        mut,
        seeds = [
            b"group",
            group.creator.as_ref(),
            &group.unique_seed,
        ],
        bump = group.bump,
    )]
    pub group: Account<'info, GroupAccount>,

    #[account(
        mut,
        seeds = [
            b"expense",
            group.key().as_ref(),
            expense.payer.as_ref(),
            expense.description.as_bytes(),
        ],
        bump = expense.bump,
        has_one = group,
        constraint = !expense.settled @ SettlementError::AlreadySettled,
    )]
    pub expense: Account<'info, Expense>,

    #[account(
        mut,
        constraint = expense.participants.contains(&payer.key()) @ SettlementError::NotParticipant,
    )]
    pub payer: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = payer,
    )]
    pub payer_usdc: Account<'info, TokenAccount>,

    #[account(address = expense.payer @ SettlementError::InvalidPayee)]
    /// CHECK: This is safe because we check that payee.key() == expense.payer in the account constraints.
    pub payee: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = payee,
    )]
    pub payee_usdc: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(address = anchor_spl::associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
}

pub fn settle_expense_handler(ctx: Context<SettleExpense>) -> Result<()> {
    msg!("[settle_expense_handler] Handler entered");
    let exp = &mut ctx.accounts.expense;
    let count = exp.participants.len() as u64;
    let share = exp.amount.checked_div(count).ok_or(SettlementError::MathError)?;

    msg!("[settle_expense_handler] Participants: {}", count);
    msg!("[settle_expense_handler] Share per participant: {}", share);
    msg!("[settle_expense_handler] Expense settled before: {}", exp.settled);
    msg!("[settle_expense_handler] Transferring {} tokens from payer_usdc {} to payee_usdc {}", share, ctx.accounts.payer_usdc.key(), ctx.accounts.payee_usdc.key());

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_usdc.to_account_info(),
        to: ctx.accounts.payee_usdc.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, share)?;

    exp.settled = true;
    msg!("[settle_expense_handler] Expense settled after: {}", exp.settled);
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
