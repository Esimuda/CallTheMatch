import "dotenv/config";
import { supabase } from "./lib/supabase.js";

async function main() {
  console.log("Testing Supabase connection...\n");

  // Try inserting a test match row
  const { data: insertData, error: insertError } = await supabase
    .from("matches")
    .upsert({
      id: "test-fixture-001",
      home_team: "Test Home",
      away_team: "Test Away",
      home_code: "TST",
      away_code: "TS2",
      kickoff_time: new Date().toISOString(),
      competition: "Test Competition",
      game_phase: "NS",
    })
    .select();

  if (insertError) {
    console.error("INSERT FAILED:", insertError);
    return;
  }
  console.log("Insert succeeded:", insertData);

  // Try reading it back
  const { data: readData, error: readError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", "test-fixture-001");

  if (readError) {
    console.error("READ FAILED:", readError);
    return;
  }
  console.log("\nRead succeeded:", readData);

  // Clean up the test row
  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .eq("id", "test-fixture-001");

  if (deleteError) {
    console.error("CLEANUP FAILED:", deleteError);
    return;
  }
  console.log("\nCleanup succeeded. Supabase connection is fully working.");
}

main();
