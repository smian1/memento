import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, userConfigs } from '../db/schema.js';
import { getServerSecret } from './systemService.js';
import type { AuthTokenPayload } from '../types/index.js';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: AuthTokenPayload, expiresIn: string): Promise<string> {
  const secret = await getServerSecret();
  try {
    const token = jwt.sign(payload as object, secret as string, { expiresIn } as jwt.SignOptions);
    return token as string;
  } catch (error) {
    throw error;
  }
}

export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  const secret = await getServerSecret();
  try {
    const decoded = jwt.verify(token, secret) as AuthTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function hasAnyUsers(): Promise<boolean> {
  const result = await db.select({ count: users.id }).from(users).limit(1);
  if (result.length === 0) {
    return false;
  }
  return Boolean(result[0].count);
}

export async function findUserByUsername(username: string) {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0] ?? null;
}

export async function getUserConfig(userId: number) {
  const result = await db.select().from(userConfigs).where(eq(userConfigs.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function createUser({
  username,
  password,
  isAdmin = false,
}: {
  username: string;
  password: string;
  isAdmin?: boolean;
}) {
  const passwordHash = await hashPassword(password);
  const inserted = await db.insert(users).values({ username, passwordHash, isAdmin }).returning({ id: users.id, username: users.username, isAdmin: users.isAdmin });
  return inserted[0];
}

export async function upsertUserConfig({
  userId,
  timezone,
  limitlessApiKey,
}: {
  userId: number;
  timezone: string;
  limitlessApiKey: string;
}) {
  await db
    .insert(userConfigs)
    .values({ userId, timezone, limitlessApiKey })
    .onConflictDoUpdate({
      target: userConfigs.userId,
      set: { timezone, limitlessApiKey }
    });
  const config = await getUserConfig(userId);
  return config;
}
