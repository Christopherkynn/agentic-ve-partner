import fs from "fs";
import path from "path";
import { pool } from "../db.js";

async function main(){
  const sql = fs.readFileSync(path.join(process.cwd(), "backend", "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Schema applied.");
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
