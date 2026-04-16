import pg from "pg";

const { Pool } = pg;

// Single shared pool for the whole process
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

db.on("error", (err) => {
  console.error("Unexpected DB error:", err.message);
});

export async function withDb<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}