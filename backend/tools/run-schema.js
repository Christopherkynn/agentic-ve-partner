import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Running from 'cd backend'; schema.sql is in backend/
const sqlPath = path.join(__dirname, "..", "schema.sql");

async function main(){
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("Schema applied from", sqlPath);
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
