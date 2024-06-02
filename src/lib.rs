// This is just a memo for using in Solana Playground.

// Here is the original program.
// https://beta.solpg.io/66572b62cffcf4b13384d117

// The changes made are:
// 1. Modified to handle multiple amounts, allowing each amount to be specified individually.
// 2. Added error handling to return an error if the number of accounts and amounts do not match.

use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, TransferChecked};
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

// Program ID created by the playground
declare_id!("GgdnfN8T6aNLweCjzZiPoc5jtrgm23Pt5MsXa6N46a5f");

#[program]
pub mod splitter {
    use super::*;

    /// Distributes tokens from the `from` account to multiple recipient accounts with specified amounts.
    /// Each recipient must have an initialized and valid TokenAccount.
    ///
    /// # Arguments
    /// * `ctx` - The context containing all accounts needed for the transaction.
    /// * `amounts` - The vector of amounts to be sent to each recipient in the same order as the recipient accounts.
    ///
    /// # Errors
    /// Returns `InvalidTokenAccount` if any recipient account cannot be deserialized properly.
    pub fn send_to_all<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SendTokens<'info>>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        let from_account = ctx.accounts.from.to_account_info();
        let token_program = ctx.accounts.token_program.to_account_info();
        let authority_info = ctx.accounts.authority.to_account_info();
        let mint = ctx.accounts.mint.to_account_info();

        // Ensure the number of amounts matches the number of recipient accounts.
        require!(
            amounts.len() == ctx.remaining_accounts.len(),
            ErrorCode::MismatchedRecipientAmounts
        );

        for (recipient, &amount) in ctx.remaining_accounts.iter().zip(amounts.iter()) {
            // Attempt to borrow and deserialize the recipient's data to validate initialization.
            let recipient_data = recipient.try_borrow_data()?;
            let mut slice_ref: &[u8] = &recipient_data;
            TokenAccount::try_deserialize(&mut slice_ref)
                .map_err(|_| error!(ErrorCode::InvalidTokenAccount))?;
            drop(recipient_data);

            // Setup the accounts for the transfer checked operation.
            let transfer_cpi_accounts = TransferChecked {
                from: from_account.clone(),
                to: recipient.clone(),
                authority: authority_info.clone(),
                mint: mint.clone(),
            };

            // Create a context for the transfer and execute the transfer_checked instruction.
            let cpi_ctx = CpiContext::new(token_program.clone(), transfer_cpi_accounts);
            token_2022::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;
        }

        Ok(())
    }
}

// Define the data structure for the accounts involved in the send_to_all function.
#[derive(Accounts)]
pub struct SendTokens<'info> {
    #[account(mut)]
    pub from: Box<InterfaceAccount<'info, TokenAccount>>,
    pub authority: Signer<'info>,
    #[account()]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Program<'info, Token2022>,
}

// Custom errors returned from this program.
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Token Account. Please ensure the account is correctly initialized.")]
    InvalidTokenAccount,
    #[msg("The number of recipient accounts does not match the number of amounts provided.")]
    MismatchedRecipientAmounts,
}
