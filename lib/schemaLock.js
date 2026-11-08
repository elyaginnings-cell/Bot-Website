export const SCHEMA_LOCK_SQL = "SELECT pg_advisory_lock(681243, 1)";
export const SCHEMA_UNLOCK_SQL = "SELECT pg_advisory_unlock(681243, 1)";

export async function withSchemaLock(client, work) {
  await client.query(SCHEMA_LOCK_SQL);
  try {
    return await work();
  } finally {
    await client.query(SCHEMA_UNLOCK_SQL);
  }
}
