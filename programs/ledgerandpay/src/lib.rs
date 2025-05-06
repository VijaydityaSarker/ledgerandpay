// programs/gpandep/src/lib.rs

use anchor_lang::prelude::*;

// 1) Declare your modules:
pub mod group;
pub mod expense;
pub mod settlement;

// 2) Re-export everything from those modules so that
//    Anchor’s #[program] macro can see the
//    generated __client_accounts_<ix> types:
pub use crate::group::*;
pub use crate::expense::*;
pub use crate::settlement::*;

// 3) Your single on‐chain program ID
declare_id!("4UUkEZrwe8PoseD6Ph7WuUHJJ1ob5P4WevNcpFZt2LTC");

#[program]
pub mod gpandep {
    use super::*;

    pub fn create_group(
        ctx: Context<CreateGroup>,
        name: String,
        description: String,
    ) -> Result<()> {
        create_group_handler(ctx, name, description)
    }

    pub fn join_group(
        ctx: Context<JoinGroup>,
    ) -> Result<()> {
        join_group_handler(ctx)
    }

    pub fn log_expense(
        ctx: Context<LogExpense>,
        amount: u64,
        participants: Vec<Pubkey>,
        description: String,
    ) -> Result<()> {
        log_expense_handler(ctx, amount, participants, description)
    }

    pub fn settle_expense(
        ctx: Context<SettleExpense>,
        ) -> Result<()> {
        settle_expense_handler(ctx)
     }
}

#[error_code]
pub enum GroupError {
    #[msg("User is already a participant in this group")]
    AlreadyParticipant,
    #[msg("Maximum number of participants reached")]
    MaxParticipantsReached,
    #[msg("Group name is too long")]
    NameTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("Payer is not in the group")]
    NotGroupMember,
    #[msg("One or more participants are not in the group")]
    InvalidParticipant,
}
