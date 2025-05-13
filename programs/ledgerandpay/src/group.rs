use anchor_lang::prelude::*;
use crate::GroupError;

#[account]
pub struct GroupAccount {
    pub creator: Pubkey,
    pub unique_seed: [u8; 16],    // stable, random or timestamp‐based seed
    pub bump: u8,                 // PDA bump
    pub group_name: String,       // human‐readable name
    pub description: String,      // description (max 200)
    pub participants: Vec<Pubkey>,// member list
    pub created_at: i64,          // timestamp
}

impl GroupAccount {
    pub const LEN: usize =
          8                          // discriminator
        + 32                         // creator
        + 16                         // unique_seed
        + 1                          // bump
        + 4 + 32                     // group_name (max 32)
        + 4 + 200                    // description (max 200)
        + 4 + (32 * 5)               // participants vec (max 5)
        + 8;                         // created_at timestamp
}

// ----------------------------------------------------------------------------
// CreateGroup: uses a random or timestamp‐based seed for multi‐group support
// ----------------------------------------------------------------------------
#[derive(Accounts)]
#[instruction(unique_seed: [u8;16], group_name: String)]
pub struct CreateGroup<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + GroupAccount::LEN,
        seeds = [
            b"group",
            creator.key().as_ref(),
            &unique_seed
        ],
        bump
    )]
    pub group: Account<'info, GroupAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ----------------------------------------------------------------------------
// JoinGroup: same seed derivation.
// ----------------------------------------------------------------------------
#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(
        mut,
        seeds = [
            b"group",
            group.creator.as_ref(),
            &group.unique_seed
        ],
        bump = group.bump
    )]
    pub group: Account<'info, GroupAccount>,

    #[account(mut)]
    pub joiner: Signer<'info>,
}

// ----------------------------------------------------------------------------
// RenameGroup: only the creator may rename.
// ----------------------------------------------------------------------------
#[derive(Accounts)]
#[instruction(new_name: String)]
pub struct RenameGroup<'info> {
    #[account(
        mut,
        seeds = [
            b"group",
            group.creator.as_ref(),
            &group.unique_seed
        ],
        bump = group.bump,
        has_one = creator
    )]
    pub group: Account<'info, GroupAccount>,

    pub creator: Signer<'info>,
}

// ----------------------------------------------------------------------------
// RemoveMember: only the creator may remove someone.
// ----------------------------------------------------------------------------
#[derive(Accounts)]
#[instruction(member: Pubkey)]
pub struct RemoveMember<'info> {
    #[account(
        mut,
        seeds = [
            b"group",
            group.creator.as_ref(),
            &group.unique_seed
        ],
        bump = group.bump,
        has_one = creator
    )]
    pub group: Account<'info, GroupAccount>,

    pub creator: Signer<'info>,
}

// ----------------------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------------------

pub fn create_group_handler(
    ctx: Context<CreateGroup>,
    unique_seed: [u8;16],
    group_name: String,
    description: String,
) -> Result<()> {
    require!(group_name.as_bytes().len() <= 32, GroupError::NameTooLong);
    require!(description.len() <= 200, GroupError::DescriptionTooLong);

    let grp = &mut ctx.accounts.group;
    let clock = Clock::get()?;

    grp.creator      = ctx.accounts.creator.key();
    grp.unique_seed  = unique_seed;
    // read the bump out of the auto‐generated ctx.bumps struct:
    grp.bump         = ctx.bumps.group;
    grp.group_name   = group_name;
    grp.description  = description;
    grp.participants = vec![grp.creator];
    grp.created_at   = clock.unix_timestamp;
    Ok(())
}

pub fn join_group_handler(ctx: Context<JoinGroup>) -> Result<()> {
    let grp = &mut ctx.accounts.group;
    let who = ctx.accounts.joiner.key();

    require!(
        !grp.participants.contains(&who),
        GroupError::AlreadyParticipant
    );
    require!(
        grp.participants.len() < 5,
        GroupError::MaxParticipantsReached
    );

    grp.participants.push(who);
    Ok(())
}

pub fn rename_group_handler(
    ctx: Context<RenameGroup>,
    new_name: String,
) -> Result<()> {
    require!(new_name.as_bytes().len() <= 32, GroupError::NameTooLong);
    ctx.accounts.group.group_name = new_name;
    Ok(())
}

// **renamed** so we don’t collide with the #[program] fn
pub fn remove_member_handler(
    ctx: Context<RemoveMember>,
    member: Pubkey,
) -> Result<()> {
    let grp = &mut ctx.accounts.group;
    require!(
        grp.participants.contains(&member),
        GroupError::InvalidParticipant
    );
    grp.participants.retain(|x| *x != member);
    Ok(())
}

