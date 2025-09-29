import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import {
  getPendingDiscoveries,
  approveDiscovery,
  dismissDiscovery,
  checkForNewDiscoveries
} from '../services/discoveryService.js';
import { db } from '../db/client.js';
import { knowledgeNuggets, memorableExchanges } from '../db/schema.js';
import { eq, desc, count } from 'drizzle-orm';

const router = express.Router();

router.use(requireAuth);

// Get pending discoveries
router.get('/pending', async (req, res) => {
  try {
    const discoveries = await getPendingDiscoveries();
    res.json(discoveries);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch discoveries', error: error.message });
  }
});

// Approve a discovery
router.post('/approve/:id', async (req, res) => {
  try {
    const discoveryId = Number(req.params.id);
    await approveDiscovery(discoveryId);
    res.json({ success: true, message: 'Discovery approved' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to approve discovery', error: error.message });
  }
});

// Dismiss a discovery
router.post('/dismiss/:id', async (req, res) => {
  try {
    const discoveryId = Number(req.params.id);
    await dismissDiscovery(discoveryId);
    res.json({ success: true, message: 'Discovery dismissed' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to dismiss discovery', error: error.message });
  }
});

// Trigger discovery check
router.post('/check', async (req, res) => {
  try {
    await checkForNewDiscoveries(req.user!.userId);
    res.json({ success: true, message: 'Discovery check completed' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to run discovery check', error: error.message });
  }
});

// Get knowledge nuggets
router.get('/knowledge-nuggets', async (req, res) => {
  try {
    const skip = Number(req.query.skip ?? 0);
    const limit = Number(req.query.limit ?? 50);

    const nuggets = await db
      .select()
      .from(knowledgeNuggets)
      .where(eq(knowledgeNuggets.userId, req.user!.userId))
      .orderBy(desc(knowledgeNuggets.date))
      .offset(skip)
      .limit(limit);

    res.json(nuggets);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch knowledge nuggets', error: error.message });
  }
});

// Get memorable exchanges
router.get('/memorable-exchanges', async (req, res) => {
  try {
    const skip = Number(req.query.skip ?? 0);
    const limit = Number(req.query.limit ?? 50);

    const exchanges = await db
      .select()
      .from(memorableExchanges)
      .where(eq(memorableExchanges.userId, req.user!.userId))
      .orderBy(desc(memorableExchanges.date))
      .offset(skip)
      .limit(limit);

    // Parse dialogue JSON for frontend
    const parsedExchanges = exchanges.map(exchange => ({
      ...exchange,
      dialogue: typeof exchange.dialogue === 'string' ? JSON.parse(exchange.dialogue) : exchange.dialogue
    }));

    res.json(parsedExchanges);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch memorable exchanges', error: error.message });
  }
});

// Get discovery stats for dashboard
router.get('/stats', async (req, res) => {
  try {
    const [nuggetCount] = await db
      .select({ count: count() })
      .from(knowledgeNuggets)
      .where(eq(knowledgeNuggets.userId, req.user!.userId));

    const [exchangeCount] = await db
      .select({ count: count() })
      .from(memorableExchanges)
      .where(eq(memorableExchanges.userId, req.user!.userId));

    const pending = await getPendingDiscoveries();

    res.json({
      total_knowledge_nuggets: nuggetCount?.count || 0,
      total_memorable_exchanges: exchangeCount?.count || 0,
      pending_discoveries: pending.length
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch discovery stats', error: error.message });
  }
});

export default router;