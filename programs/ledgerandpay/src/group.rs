// programs/ledgerandpay/src/group.rs

use anchor_lang::prelude::*;
use crate::GroupError;

#[account]
pub struct GroupAccount {
    pub creator: Pubkey,
    pub group_name: String,
    pub description: String,
    pub participants: Vec<Pubkey>,
    pub created_at: i64,
}

impl GroupAccount {
    pub const LEN: usize =
        8                           // discriminator
      + 32                          // creator
      + 4 + 32                      // group_name (max 32)
      + 4 + 200                     // description (max 200)
      + 4 + (32 * 5)                // participants vec (max 5 pubkeys)
      + 8;                          // created_at
}

#[derive(Accounts)]
pub struct CreateGroup<'info> {
    #[account(
        init, payer = creator,
        space = 8 + GroupAccount::LEN,
        seeds = [b"group", creator.key().as_ref()],
        bump
    )]
    pub group: Account<'info, GroupAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(
        mut,
        seeds = [b"group", group.creator.as_ref()],
        bump
    )]
    pub group: Account<'info, GroupAccount>,

    #[account(mut)]
    pub joiner: Signer<'info>,
}

pub fn create_group_handler(
    ctx: Context<CreateGroup>,
    name: String,
    description: String,
) -> Result<()> {
    require!(name.len() <= 32, GroupError::NameTooLong);
    require!(description.len() <= 200, GroupError::DescriptionTooLong);

    let grp = &mut ctx.accounts.group;
    let clock = Clock::get()?;

    grp.creator = ctx.accounts.creator.key();
    grp.group_name = name;
    grp.description = description;
    grp.participants = vec![ctx.accounts.creator.key()];
    grp.created_at = clock.unix_timestamp;

    Ok(())
}

pub fn join_group_handler(ctx: Context<JoinGroup>) -> Result<()> {
    let grp = &mut ctx.accounts.group;
    let who = ctx.accounts.joiner.key();

    if grp.participants.contains(&who) {
        return Err(GroupError::AlreadyParticipant.into());
    }
    if grp.participants.len() >= 5 {
        return Err(GroupError::MaxParticipantsReached.into());
    }

    grp.participants.push(who);
    Ok(())
}
