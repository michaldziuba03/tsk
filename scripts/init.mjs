import postgres from "postgres";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

async function initialize() {
  const sql = postgres(process.env.DATABASE_URL);
  const script = await fs.readFile(path.join(process.cwd(), "scripts/init.sql"), "utf8")
  await sql.unsafe(script);

  console.log("Database initialized");
  sql.end();
}

initialize();
