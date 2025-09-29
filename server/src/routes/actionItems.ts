import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import {
  createActionItem,
  deleteActionItem,
  getActionItemById,
  listActionItems,
  removeActionItemTag,
  setActionItemTags,
  updateActionItem
} from '../services/dataService.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const completed = req.query.completed !== undefined ? req.query.completed === 'true' : undefined;
  const source = typeof req.query.source === 'string' ? req.query.source : undefined;
  const tagIds = typeof req.query.tag_ids === 'string' ? req.query.tag_ids.split(',').map((id) => Number(id)) : undefined;

  const items = await listActionItems(req.user!.userId, { skip, limit, completed, source, tagIds });
  res.json(items);
});

router.get('/:id(\\d+)', async (req, res) => {
  const item = await getActionItemById(req.user!.userId, Number(req.params.id));
  if (!item) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  res.json(item);
});

const createSchema = z.object({
  content: z.string().min(1),
  date: z.string().min(1),
  source: z.string().optional(),
  tag_ids: z.array(z.number()).optional(),
  insight_id: z.number().optional()
});

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }

  const item = await createActionItem(req.user!.userId, {
    content: parse.data.content,
    date: parse.data.date,
    source: parse.data.source,
    tagIds: parse.data.tag_ids,
    insightId: parse.data.insight_id
  });
  res.status(201).json(item);
});

const updateSchema = z.object({
  content: z.string().optional(),
  completed: z.boolean().optional()
});

router.put('/:id(\\d+)', async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }

  const item = await updateActionItem(req.user!.userId, Number(req.params.id), parse.data);
  if (!item) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  res.json(item);
});

router.delete('/:id(\\d+)', async (req, res) => {
  const deleted = await deleteActionItem(req.user!.userId, Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  res.status(204).send();
});

const tagsSchema = z.object({
  tag_ids: z.array(z.number()).nonempty()
});

router.get('/:id(\\d+)/tags', async (req, res) => {
  const item = await getActionItemById(req.user!.userId, Number(req.params.id));
  if (!item) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  res.json(item.tags ?? []);
});

router.post('/:id(\\d+)/tags', async (req, res) => {
  const parse = tagsSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const item = await setActionItemTags(req.user!.userId, Number(req.params.id), parse.data.tag_ids);
  if (!item) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  res.json(item);
});

router.delete('/:id(\\d+)/tags/:tagId(\\d+)', async (req, res) => {
  const item = await removeActionItemTag(req.user!.userId, Number(req.params.id), Number(req.params.tagId));
  if (!item) {
    return res.status(404).json({ message: 'Action item not found' });
  }
  res.json(item);
});

export default router;
