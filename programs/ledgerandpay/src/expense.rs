// programs/ledgerandpay/src/expense.rs

use anchor_lang::prelude::*;
use crate::group::GroupAccount;

#[error_code]
pub enum ExpenseError {
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("No participants provided")]
    NoParticipants,
    #[msg("Too many participants")]
    TooManyParticipants,
    #[msg("Payer is not a member of the group")]
    NotGroupMember,
    #[msg("One or more participants are not in the group")]
    InvalidParticipant,
}

/// On‐chain `Expense` structure
#[account]
pub struct Expense {
    pub group: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub participants: Vec<Pubkey>,
    pub shares: Vec<u64>,
    pub description: String,
    pub timestamp: i64,
    pub settled: bool,
    pub bump: u8,                // <— store the PDA bump
}

impl Expense {
    pub const MAX_PARTICIPANTS: usize = 5;
    pub const MAX_DESCRIPTION: usize = 32;

    pub const LEN: usize =
          8                              // discriminator
        + 32 + 32                        // group + payer
        + 8                              // amount
        + 4 + (32 * Self::MAX_PARTICIPANTS) // participants vec
        + 4 + (8  * Self::MAX_PARTICIPANTS) // shares vec
        + 4 + Self::MAX_DESCRIPTION      // description string
        + 8                              // timestamp
        + 1                              // settled flag
        + 1;                             // bump
}

#[derive(Accounts)]
#[instruction(
    amount: u64,
    participants: Vec<Pubkey>,
    description: String
)]
pub struct LogExpense<'info> {
    /// The signer who is paying
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Make sure this group PDA exists and matches
    #[account(
        seeds = [
            b"group",
            group.creator.as_ref(),
            &group.unique_seed
        ],
        bump = group.bump
    )]
    pub group: Account<'info, GroupAccount>,

    /// Create a new `Expense` PDA; ensure `expense.group == group.key()`
    #[account(
        init,
        payer = payer,
        space = 8 + Expense::LEN,
        seeds = [
            b"expense",
            group.key().as_ref(),
            payer.key().as_ref(),
            description.as_bytes()
        ],
        bump
    )]
    pub expense: Account<'info, Expense>,

    pub system_program: Program<'info, System>,
}

pub fn log_expense_handler(
    ctx: Context<LogExpense>,
    amount: u64,
    participants: Vec<Pubkey>,
    description: String,
) -> Result<()> {
    // 1) Enforce description length
    require!(
        description.as_bytes().len() <= Expense::MAX_DESCRIPTION,
        ExpenseError::DescriptionTooLong
    );

    // 2) Participant count guard
    let count = participants.len();
    require!(count > 0, ExpenseError::NoParticipants);
    require!(count <= Expense::MAX_PARTICIPANTS, ExpenseError::TooManyParticipants);

    let grp = &ctx.accounts.group;
    let who = ctx.accounts.payer.key();

    // 3) Payer must be in group
    require!(grp.participants.contains(&who), ExpenseError::NotGroupMember);

    // 4) All participants must also be group members
    for p in &participants {
        require!(grp.participants.contains(p), ExpenseError::InvalidParticipant);
    }

    // 5) Compute equal‐split shares
    let total = amount;
    let n = count as u64;
    let base = total / n;
    let rem = total % n;
    let mut shares = vec![base; count];
    for i in 0..(rem as usize) {
        shares[i] += 1;
    }

    // 6) Fill out the `expense` account fields
    let exp = &mut ctx.accounts.expense;
    exp.group        = grp.key();
    exp.payer        = who;
    exp.amount       = total;
    exp.participants = participants;
    exp.shares       = shares;
    exp.description  = description;
    exp.timestamp    = Clock::get()?.unix_timestamp;
    exp.settled      = false;
    exp.bump         = ctx.bumps.expense;  // ← read bump directly

    Ok(())
}
