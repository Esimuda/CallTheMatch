import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";
import fs from "fs";
import txoracleIdl from "./idl/txoracle.json" with { type: "json" };

// ---- Devnet config (locked, per TxLINE quickstart warning) ----
const rpcUrl = "https://api.devnet.solana.com";
const apiOrigin = "https://txline-dev.txodds.com";
const programId = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const txlTokenMint = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const apiBaseUrl = `${apiOrigin}/api`;

// ---- Load your throwaway wallet keypair ----
const secretKeyString = fs.readFileSync("./wallet-keypair.json", "utf8");
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const walletKeypair = Keypair.fromSecretKey(secretKey);
const wallet = new anchor.Wallet(walletKeypair);

console.log("Using wallet:", wallet.publicKey.toBase58());

// ---- Set up connection + provider + program ----
const connection = new Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new anchor.Program(txoracleIdl, provider);

if (!program.programId.equals(programId)) {
  throw new Error(
    `Loaded IDL program ${program.programId.toBase58()} does not match devnet program ${programId.toBase58()}`
  );
}

async function main() {
  // ---- Derive shared accounts ----
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    provider.wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // ---- Subscribe on-chain: Service Level 12 (World Cup free tier) ----
  const SERVICE_LEVEL_ID = 12;
  const DURATION_WEEKS = 4;
  const SELECTED_LEAGUES = [];

  console.log("Sending subscribe() transaction...");

  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: provider.wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Subscribed! Transaction signature:", txSig);

  // ---- Get guest JWT ----
  const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
  const jwt = authResponse.data.token;

  // ---- Sign activation message ----
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, walletKeypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  // ---- Activate API token ----
  const activationResponse = await axios.post(
    `${apiBaseUrl}/token/activate`,
    {
      txSig,
      walletSignature,
      leagues: SELECTED_LEAGUES,
    },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );

  const apiToken = activationResponse.data.token || activationResponse.data;

  console.log("API Token activated!");
  console.log(apiToken);

  // ---- Save credentials locally for later use ----
  const credentials = {
    jwt,
    apiToken,
    walletAddress: wallet.publicKey.toBase58(),
    txSig,
    activatedAt: new Date().toISOString(),
  };

  fs.writeFileSync("./txline-credentials.json", JSON.stringify(credentials, null, 2));
  console.log("Saved credentials to txline-credentials.json");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});