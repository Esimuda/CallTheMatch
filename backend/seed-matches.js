import "dotenv/config";
import { syncFixturesFromFeed } from "./lib/fixture-sync.js";

async function main() {
  await syncFixturesFromFeed();
  console.log("Done seeding matches.");
}

main().catch((err) => {
  console.error("Seed failed:", err.response?.data || err.message);
  process.exit(1);
});
