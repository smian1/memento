import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { runSyncForUser, syncLifeLogsForUser, syncLifeLogsForDate } from '../services/syncService.js';

const router = express.Router();
router.use(requireAuth);

const runSchema = z.object({ force: z.coerce.boolean().optional() });

router.post('/run', async (req, res) => {
  const parse = runSchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid query', issues: parse.error.flatten() });
  }
  const result = await runSyncForUser(req.user!.userId, { force: parse.data.force ?? false });
  res.json(result);
});

const allSchema = z.object({
  force: z.coerce.boolean().optional(),
  days_back: z.coerce.number().min(1).max(60).optional(),
  incremental: z.coerce.boolean().optional().default(true)
});

router.post('/all', async (req, res) => {
  const parse = allSchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid query', issues: parse.error.flatten() });
  }

  const { force = false, days_back, incremental = true } = parse.data;

  // For incremental sync, ignore days_back unless force is true
  const effectiveForce = force || !incremental;
  const effectiveDaysBack = effectiveForce ? (days_back ?? 30) : undefined;

  const insightsResult = await runSyncForUser(req.user!.userId, { force: effectiveForce });
  const lifelogResult = await syncLifeLogsForUser(req.user!.userId, {
    force: effectiveForce,
    daysBack: effectiveDaysBack
  });

  res.json({
    success: Boolean(insightsResult.success && lifelogResult.success),
    insights: insightsResult,
    lifelogs: lifelogResult
  });
});

const lifelogSchema = z.object({
  force: z.coerce.boolean().optional(),
  days_back: z.coerce.number().min(1).max(60).optional()
});

router.post('/lifelogs', async (req, res) => {
  const parse = lifelogSchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid query', issues: parse.error.flatten() });
  }

  const { force = false, days_back } = parse.data;
  const result = await syncLifeLogsForUser(req.user!.userId, {
    force,
    daysBack: days_back ?? 30
  });
  res.json(result);
});

const refreshSchema = z.object({ date: z.string().min(8) });

router.post('/lifelogs/refresh/:date', async (req, res) => {
  const parse = refreshSchema.safeParse(req.params);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid date', issues: parse.error.flatten() });
  }

  const result = await syncLifeLogsForDate(req.user!.userId, parse.data.date);
  res.json(result);
});

export default router;
