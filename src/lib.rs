// これは、Solana Playgroundで使うために、メモとしてここに書いているだけです。

// Import anchor
use anchor_lang::prelude::*;

declare_id!("");

#[program]
mod hello_world {
    use super::*;

    pub fn hello(ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello {
    
}
