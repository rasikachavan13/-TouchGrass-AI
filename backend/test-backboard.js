import "dotenv/config";
import { BackboardClient } from "backboard-sdk";

const client = new BackboardClient({
  apiKey: process.env.BACKBOARD_API_KEY,
});

const ASSISTANT_ID = "1102b628-5e19-4fc9-9f76-9be7b514224c";

async function main() {
  const memory = await client.addMemory(ASSISTANT_ID, {
    content: "The user enjoys outdoor activities and prefers screen-free experiences.",
    metadata: {
      source: "TouchGrass AI",
      type: "user_preference",
    },
  });

  console.log("Memory added successfully!");
  console.log("Memory:", memory);
}

main().catch(console.error);