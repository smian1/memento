import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getConsolidatedData, getDashboardStats, searchData } from '../services/dataService.js';
import { getSyncStatusForUser } from '../services/syncService.js';

const router = express.Router();
router.use(requireAuth);

router.get('/stats', async (req, res) => {
  const stats = await getDashboardStats(req.user!.userId);
  res.json(stats);
});

router.get('/consolidated', async (req, res) => {
  const data = await getConsolidatedData(req.user!.userId);
  res.json(data);
});

const searchSchema = z.object({ q: z.string().min(1), limit: z.coerce.number().optional() });
router.get('/search', async (req, res) => {
  const parse = searchSchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid query', issues: parse.error.flatten() });
  }
  const limit = parse.data.limit ?? 100;
  const results = await searchData(req.user!.userId, parse.data.q, limit);
  res.json(results);
});

router.get('/sync/status', async (req, res) => {
  const status = await getSyncStatusForUser(req.user!.userId);
  res.json(status);
});

export default router;
