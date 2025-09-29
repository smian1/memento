import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { upsertUserConfig } from '../services/authService.js';

const router = express.Router();

const updateSchema = z.object({
  timezone: z.string().min(1),
  apiKey: z.string().min(10)
});

router.put('/', requireAuth, async (req, res) => {
  const parseResult = updateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parseResult.error.flatten() });
  }

  const { timezone, apiKey } = parseResult.data;
  const config = await upsertUserConfig({ userId: req.user!.userId, timezone, limitlessApiKey: apiKey });
  return res.json({ config });
});

export default router;
