import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  Keypair,
  Connection,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import IDL_pyusd from "./idl_pyusd.json";
import { Program } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";

const programId_pyusd = new PublicKey(
  "GgdnfN8T6aNLweCjzZiPoc5jtrgm23Pt5MsXa6N46a5f"
);

const MINT_ADDRESS = new PublicKey(
  "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM"
);

function createProvider(wallet: AnchorWallet, connection: Connection) {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return provider;
}

function createTransaction() {
  const transaction = new Transaction();
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000, // 必要なユニット数（必要に応じて調整）
    })
  );
  return transaction;
}

async function createAssociatedTokenAccounts(
  wallet: AnchorWallet,
  connection: Connection,
  recipientAddresses: string[]
) {
  const instructions = [];
  const recipientAtas = [];

  for (const addr of recipientAddresses) {
    const associatedToken = getAssociatedTokenAddressSync(
      MINT_ADDRESS,
      new PublicKey(addr),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const instruction = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      associatedToken,
      new PublicKey(addr),
      MINT_ADDRESS,
      TOKEN_2022_PROGRAM_ID
    );
    instructions.push(instruction);
    recipientAtas.push(associatedToken);
    console.log(`created token account for address ${addr}`);
  }

  return { instructions, recipientAtas };
}

export async function callSplit(
  wallet: AnchorWallet,
  connection: Connection,
  csvData: { address: string; amount: number }[]
) {
  const provider = createProvider(wallet, connection);
  const program = new Program(IDL_pyusd, programId_pyusd, provider);
  const transaction = createTransaction();
  console.log("transaction");

  const associatedToken = getAssociatedTokenAddressSync(
    MINT_ADDRESS,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  console.log("associatedToken", associatedToken.toString());

  const senderAtaInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      associatedToken,
      wallet.publicKey,
      MINT_ADDRESS,
      TOKEN_2022_PROGRAM_ID
    );
  transaction.add(senderAtaInstruction);

  const RECIPIENT_ADDRESSES = csvData.map((item) => item.address);
  const AMOUNTS = csvData.map((item) => item.amount);

  const { instructions: recipientAtaInstructions, recipientAtas } =
    await createAssociatedTokenAccounts(
      wallet,
      connection,
      RECIPIENT_ADDRESSES
    );

  recipientAtaInstructions.forEach((instruction) =>
    transaction.add(instruction)
  );

  const destinationAtas = recipientAtas.map((addr) => ({
    pubkey: new PublicKey(addr),
    isSigner: false,
    isWritable: true,
  }));

  const decimals = 6;
  const amounts = AMOUNTS.map(
    (amount) => new BN(amount * Math.pow(10, decimals))
  );

  transaction.add(
    await program.methods
      .sendToAll(amounts)
      .accounts({
        from: associatedToken,
        authority: wallet.publicKey,
        mint: MINT_ADDRESS,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .remainingAccounts(destinationAtas)
      .instruction()
  );

  return await provider.sendAndConfirm(transaction);
}
