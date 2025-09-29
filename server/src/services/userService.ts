import { eq, isNotNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, userConfigs } from '../db/schema.js';

export async function getUsersWithCredentials() {
  const records = await db
    .select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      timezone: userConfigs.timezone,
      apiKey: userConfigs.limitlessApiKey
    })
    .from(users)
    .leftJoin(userConfigs, eq(userConfigs.userId, users.id))
    .where(isNotNull(userConfigs.limitlessApiKey));

  return records.filter((record) => Boolean(record.apiKey));
}

export async function getUserById(userId: number) {
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}
