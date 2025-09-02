import pg from 'pg';

/**
 * Create a connection pool to Postgres. If a DATABASE_URL environment
 * variable is provided the pool will use that connection string. Otherwise
 * individual PGHOST/PGUSER/PGPASSWORD/PGDATABASE variables may be supplied.
 */
const makePool = () => {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  }
  return new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'veuser',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 've'
  });
};

export const pool = makePool();