import express from 'express';
import { z } from 'zod';
import { createToken, findUserByUsername, hasAnyUsers, verifyPassword, createUser, upsertUserConfig, getUserConfig } from '../services/authService.js';
import { JWT_EXPIRES_IN, TOKEN_COOKIE_NAME } from '../config.js';
import { requireAdmin, requireAuth } from '../middlewares/authMiddleware.js';
import type { AuthTokenPayload } from '../types/index.js';

const router = express.Router();

const sanitizeConfig = (config: any) => {
  if (!config) return null;
  return {
    timezone: config.timezone,
    hasApiKey: Boolean(config.limitlessApiKey)
  };
};

const setupSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  timezone: z.string().min(1),
  apiKey: z.string().min(10)
});

router.post('/setup', async (req, res) => {
  const alreadyInitialized = await hasAnyUsers();
  if (alreadyInitialized) {
    return res.status(400).json({ message: 'Setup already completed' });
  }

  const parseResult = setupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parseResult.error.flatten() });
  }

  const { username, password, timezone, apiKey } = parseResult.data;
  const existing = await findUserByUsername(username);
  if (existing) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const user = await createUser({ username, password, isAdmin: true });
  const config = await upsertUserConfig({ userId: user.id, timezone, limitlessApiKey: apiKey });
  const payload: AuthTokenPayload = { userId: user.id, username: user.username, isAdmin: true };
  const token = await createToken(payload, JWT_EXPIRES_IN);

  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12
  });

  return res.status(201).json({ user: payload, config: sanitizeConfig(config) });
});

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

router.post('/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parseResult.error.flatten() });
  }

  const { username, password } = parseResult.data;
  const user = await findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const payload: AuthTokenPayload = { userId: user.id, username: user.username, isAdmin: Boolean(user.isAdmin) };
  const token = await createToken(payload, JWT_EXPIRES_IN);

  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12
  });

  const config = await getUserConfig(user.id);

  return res.json({ user: payload, config: sanitizeConfig(config) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(TOKEN_COOKIE_NAME, { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return res.status(204).send();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = req.user!;
  const config = await getUserConfig(user.userId);
  return res.json({ user, config: sanitizeConfig(config) });
});

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  isAdmin: z.boolean().optional()
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const parseResult = createUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parseResult.error.flatten() });
  }

  const { username, password, isAdmin = false } = parseResult.data;
  const existing = await findUserByUsername(username);
  if (existing) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const user = await createUser({ username, password, isAdmin });
  return res.status(201).json({ user });
});

export default router;
