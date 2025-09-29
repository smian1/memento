import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import {
  listDecisions,
  updateDecision,
  listIdeas,
  updateIdea,
  listQuestions,
  updateQuestion,
  listThemes,
  updateTheme,
  listQuotes,
  updateQuote,
  listHighlights,
  updateHighlight
} from '../services/dataService.js';

const router = express.Router();
router.use(requireAuth);

router.get('/decisions', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const data = await listDecisions(req.user!.userId, { skip, limit });
  res.json(data);
});

const decisionSchema = z.object({ content: z.string().min(1).optional() });
router.put('/decisions/:id(\\d+)', async (req, res) => {
  const parse = decisionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const updated = await updateDecision(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Decision not found' });
  }
  res.json(updated);
});

router.get('/ideas', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const data = await listIdeas(req.user!.userId, { skip, limit });
  res.json(data);
});

const ideaSchema = z.object({ content: z.string().min(1).optional() });
router.put('/ideas/:id(\\d+)', async (req, res) => {
  const parse = ideaSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const updated = await updateIdea(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Idea not found' });
  }
  res.json(updated);
});

router.get('/questions', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const resolved = req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined;
  const data = await listQuestions(req.user!.userId, { skip, limit, resolved });
  res.json(data);
});

const questionSchema = z.object({ content: z.string().optional(), resolved: z.boolean().optional() });
router.put('/questions/:id(\\d+)', async (req, res) => {
  const parse = questionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const updated = await updateQuestion(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Question not found' });
  }
  res.json(updated);
});

router.get('/themes', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const data = await listThemes(req.user!.userId, { skip, limit });
  res.json(data);
});

const themeSchema = z.object({ title: z.string().optional(), description: z.string().optional() });
router.put('/themes/:id(\\d+)', async (req, res) => {
  const parse = themeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const updated = await updateTheme(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Theme not found' });
  }
  res.json(updated);
});

router.get('/quotes', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const data = await listQuotes(req.user!.userId, { skip, limit });
  res.json(data);
});

const quoteSchema = z.object({ text: z.string().optional(), speaker: z.string().optional() });
router.put('/quotes/:id(\\d+)', async (req, res) => {
  const parse = quoteSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const updated = await updateQuote(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Quote not found' });
  }
  res.json(updated);
});

router.get('/highlights', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const data = await listHighlights(req.user!.userId, { skip, limit });
  res.json(data);
});

const highlightSchema = z.object({ content: z.string().optional() });
router.put('/highlights/:id(\\d+)', async (req, res) => {
  const parse = highlightSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const updated = await updateHighlight(req.user!.userId, Number(req.params.id), parse.data);
  if (!updated) {
    return res.status(404).json({ message: 'Highlight not found' });
  }
  res.json(updated);
});

export default router;
