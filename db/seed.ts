import { runSeed } from "../prisma/seed";

runSeed().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exit(1);
});

