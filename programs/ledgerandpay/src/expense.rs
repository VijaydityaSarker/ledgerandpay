// programs/ledgerandpay/src/expense.rs

use anchor_lang::prelude::*;
use crate::group::GroupAccount;
use crate::GroupError;

#[account]
pub struct Expense {
    pub group: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub participants: Vec<Pubkey>,
    pub description: String,
    pub timestamp: i64,
    pub settled: bool,
}

impl Expense {
    pub const MAX_PARTICIPANTS: usize = 5;
    /// capped at 32 bytes so we can use description.as_bytes() in PDA seeds
    pub const MAX_DESCRIPTION: usize = 32;

    pub const LEN: usize =
        8                         // discriminator
      + 32 + 32                   // group + payer
      + 8                         // amount
      + 4 + (32 * Self::MAX_PARTICIPANTS) // participants vec
      + 4 + Self::MAX_DESCRIPTION         // description
      + 8 + 1                     // timestamp + settled
    ;
}

#[derive(Accounts)]
#[instruction(amount: u64, participants: Vec<Pubkey>, description: String)]
pub struct LogExpense<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"group", group.creator.as_ref()],
        bump
    )]
    pub group: Account<'info, GroupAccount>,

    #[account(
        init, payer = payer,
        space = 8 + Expense::LEN,
        seeds = [
            b"expense",
            group.key().as_ref(),
            payer.key().as_ref(),
            description.as_bytes()  // guaranteed ≤ 32 bytes
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
    // enforce our PDA‐seed cap
    require!(
        description.as_bytes().len() <= Expense::MAX_DESCRIPTION,
        GroupError::DescriptionTooLong
    );

    let grp = &ctx.accounts.group;
    let who = ctx.accounts.payer.key();

    // payer must be in group
    require!(
        grp.participants.contains(&who),
        GroupError::NotGroupMember
    );

    // participants count + membership
    require!(
        participants.len() <= Expense::MAX_PARTICIPANTS,
        GroupError::InvalidParticipant
    );
    for p in &participants {
        require!(
            grp.participants.contains(p),
            GroupError::InvalidParticipant
        );
    }

    let exp = &mut ctx.accounts.expense;
    exp.group = grp.key();
    exp.payer = who;
    exp.amount = amount;
    exp.participants = participants;
    exp.description = description;
    exp.timestamp = Clock::get()?.unix_timestamp;
    exp.settled = false;

    Ok(())
}
