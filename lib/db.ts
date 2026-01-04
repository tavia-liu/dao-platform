import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // source: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, 
});

export const query = async (text: string, params?: any[]) => { // source: https://node-postgres.com/features/queries
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error); // source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch
    throw error;
  }
};

export default pool;
