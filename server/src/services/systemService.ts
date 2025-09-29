import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { systemSettings } from '../db/schema.js';

const SERVER_SECRET_KEY = 'server_secret';

export async function getServerSecret(): Promise<string> {
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, SERVER_SECRET_KEY)).limit(1);
  if (existing.length > 0) {
    return existing[0].value;
  }

  const secret = crypto.randomBytes(32).toString('hex');
  await db.insert(systemSettings).values({ key: SERVER_SECRET_KEY, value: secret }).onConflictDoUpdate({
    target: systemSettings.key,
    set: { value: secret }
  });
  return secret;
}

export async function setSystemSetting(key: string, value: string) {
  await db.insert(systemSettings).values({ key, value }).onConflictDoUpdate({
    target: systemSettings.key,
    set: { value }
  });
}

export async function getSystemSetting(key: string): Promise<string | null> {
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (existing.length === 0) {
    return null;
  }
  return existing[0].value;
}
