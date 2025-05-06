use anchor_lang::prelude::*;

declare_id!("4UUkEZrwe8PoseD6Ph7WuUHJJ1ob5P4WevNcpFZt2LTC");

#[program]
pub mod ledgerandpay {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
