import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
