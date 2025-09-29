import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createTag, deleteTag, getTagById, listActionItemsForTag, listTags, updateTag } from '../services/dataService.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const items = await listTags(req.user!.userId, { skip, limit });
  res.json(items);
});

const createSchema = z.object({ name: z.string().min(1), color: z.string().optional() });

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const tag = await createTag(req.user!.userId, parse.data);
  res.status(201).json(tag);
});

const updateSchema = z.object({ name: z.string().optional(), color: z.string().optional() });
router.put('/:id(\\d+)', async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const tag = await updateTag(req.user!.userId, Number(req.params.id), parse.data);
  if (!tag) {
    return res.status(404).json({ message: 'Tag not found' });
  }
  res.json(tag);
});

router.delete('/:id(\\d+)', async (req, res) => {
  const deleted = await deleteTag(req.user!.userId, Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ message: 'Tag not found' });
  }
  res.status(204).send();
});

router.get('/:id(\\d+)/action-items', async (req, res) => {
  const tagId = Number(req.params.id);
  const tag = await getTagById(req.user!.userId, tagId);
  if (!tag) {
    return res.status(404).json({ message: 'Tag not found' });
  }
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const items = await listActionItemsForTag(req.user!.userId, tagId, { skip, limit });
  res.json(items);
});

export default router;
