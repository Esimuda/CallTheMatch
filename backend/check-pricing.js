import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import txoracleIdl from "./idl/txoracle.json" with { type: "json" };

const rpcUrl = "https://api.devnet.solana.com";
const programId = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

const secretKeyString = fs.readFileSync("./wallet-keypair.json", "utf8");
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const walletKeypair = Keypair.fromSecretKey(secretKey);
const wallet = new anchor.Wallet(walletKeypair);

const connection = new Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new anchor.Program(txoracleIdl, provider);

async function main() {
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId
  );

  console.log("Pricing matrix PDA:", pricingMatrixPda.toBase58());

  const pricingMatrix = await program.account.pricingMatrix.fetch(pricingMatrixPda);

  console.log("Admin:", pricingMatrix.admin.toBase58());
  console.log("Available service levels (rows):");
  pricingMatrix.rows.forEach((row) => {
    console.log({
      rowId: row.rowId,
      pricePerWeekToken: row.pricePerWeekToken.toString(),
      samplingIntervalSec: row.samplingIntervalSec,
      leagueBundleId: row.leagueBundleId,
      marketBundleId: row.marketBundleId,
    });
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
