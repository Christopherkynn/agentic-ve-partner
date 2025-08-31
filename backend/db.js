import pg from "pg";

const makePool = () => {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  }
  return new pg.Pool({
    host: process.env.PGHOST || "localhost",
    user: process.env.PGUSER || "veuser",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "ve"
  });
};

export const pool = makePool();
