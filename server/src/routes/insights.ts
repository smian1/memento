import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createInsight, getInsightByDate, getInsightById, listInsights, updateInsight, reprocessAllInsights, reprocessInsightByDate, reprocessInsightsByDateRange } from '../services/dataService.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const insights = await listInsights(req.user!.userId, { skip, limit });
  res.json(insights);
});

router.get('/:id(\\d+)', async (req, res) => {
  const insight = await getInsightById(req.user!.userId, Number(req.params.id));
  if (!insight) {
    return res.status(404).json({ message: 'Insight not found' });
  }
  res.json(insight);
});

router.get('/date/:date', async (req, res) => {
  const insight = await getInsightByDate(req.user!.userId, req.params.date);
  if (!insight) {
    return res.status(404).json({ message: 'Insight not found' });
  }
  res.json(insight);
});

const createSchema = z.object({
  date: z.string(),
  content: z.string()
});

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const insight = await createInsight(req.user!.userId, parse.data);
  res.status(201).json(insight);
});

const updateSchema = z.object({
  content: z.string().optional()
});

router.put('/:id(\\d+)', async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }

  const updated = await updateInsight(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Insight not found' });
  }
  res.json(updated);
});

router.post('/reprocess', async (req, res) => {
  const result = await reprocessAllInsights(req.user!.userId);
  res.json({
    success: true,
    message: `Reprocessed ${result.processed} of ${result.total} insights`,
    ...result
  });
});

const reprocessDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

router.post('/reprocess/date', async (req, res) => {
  const parse = reprocessDateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }

  const result = await reprocessInsightByDate(req.user!.userId, parse.data.date);
  if (!result) {
    return res.status(404).json({ message: 'No insight found for this date' });
  }

  res.json({
    success: true,
    message: `Reprocessed insight for ${parse.data.date}`,
    ...result
  });
});

const reprocessRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
});

router.post('/reprocess/range', async (req, res) => {
  const parse = reprocessRangeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }

  const result = await reprocessInsightsByDateRange(req.user!.userId, parse.data.startDate, parse.data.endDate);
  res.json({
    success: true,
    message: `Reprocessed ${result.processed} insights from ${parse.data.startDate} to ${parse.data.endDate}`,
    ...result
  });
});

export default router;
