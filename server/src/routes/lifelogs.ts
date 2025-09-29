import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createLifeLog, deleteLifeLog, getLifeLogById, listLifeLogDates, listLifeLogs, updateLifeLog } from '../services/dataService.js';
import { getUserConfig } from '../services/authService.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const skip = Number(req.query.skip ?? 0);
  const limit = Number(req.query.limit ?? 100);
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const logs = await listLifeLogs(req.user!.userId, { skip, limit, date });
  res.json(logs);
});

router.get('/:id(\\d+)', async (req, res) => {
  const log = await getLifeLogById(req.user!.userId, Number(req.params.id));
  if (!log) {
    return res.status(404).json({ message: 'Life log not found' });
  }
  res.json(log);
});

// Helper function to stream audio from Limitless API
const streamAudioFromLimitless = async (config: any, startMs: number, endMs: number, res: express.Response, filename: string, forceDownload = false) => {
  const response = await axios.get('https://api.limitless.ai/v1/download-audio', {
    headers: { 
      'X-API-Key': config.limitlessApiKey 
    },
    params: { 
      startMs, 
      endMs, 
      audioSource: 'pendant' 
    },
    responseType: 'stream'
  });
  
  // Set appropriate headers for audio streaming
  res.setHeader('Content-Type', 'audio/ogg');
  res.setHeader('Content-Disposition', `${forceDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  // Pipe the audio stream to the response
  response.data.pipe(res);
};

// Stream audio for a specific lifelog
router.get('/:id(\\d+)/audio', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const lifelogId = Number(req.params.id);
    
    // Get the lifelog
    const log = await getLifeLogById(userId, lifelogId);
    if (!log) {
      return res.status(404).json({ message: 'Life log not found' });
    }
    
    // Check if we have time information
    if (!log.startTime || !log.endTime) {
      return res.status(400).json({ message: 'Life log missing time information' });
    }
    
    // Convert to Unix milliseconds
    const startMs = log.startTime.getTime();
    const endMs = log.endTime.getTime();
    
    // Check 2-hour limit (7,200,000 ms)
    const durationMs = endMs - startMs;
    if (durationMs > 7200000) {
      return res.status(400).json({ message: 'Audio segment too long (max 2 hours)' });
    }
    
    // Get user's API key
    const config = await getUserConfig(userId);
    if (!config?.limitlessApiKey) {
      return res.status(400).json({ message: 'Missing Limitless API key' });
    }
    
    await streamAudioFromLimitless(config, startMs, endMs, res, `lifelog-${lifelogId}.ogg`);
    
  } catch (error: any) {
    console.error('Error streaming audio:', error);
    if (error.response?.status === 429) {
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }
    if (error.response?.status === 400) {
      return res.status(400).json({ message: error.response.data?.error || 'Bad request to Limitless API' });
    }
    res.status(500).json({ message: 'Failed to stream audio' });
  }
});

// Stream audio for a specific segment within a lifelog
router.get('/:id(\\d+)/audio/segment', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const lifelogId = Number(req.params.id);
    const { startMs, endMs, segmentName } = req.query;
    
    // Validate query parameters
    if (!startMs || !endMs) {
      return res.status(400).json({ message: 'Missing startMs or endMs query parameters' });
    }
    
    const startTime = Number(startMs);
    const endTime = Number(endMs);
    
    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
      return res.status(400).json({ message: 'Invalid time range' });
    }
    
    // Get the lifelog to verify it exists and user has access
    const log = await getLifeLogById(userId, lifelogId);
    if (!log) {
      return res.status(404).json({ message: 'Life log not found' });
    }
    
    // Check 2-hour limit (7,200,000 ms)
    const durationMs = endTime - startTime;
    if (durationMs > 7200000) {
      return res.status(400).json({ message: 'Audio segment too long (max 2 hours)' });
    }
    
    // Get user's API key
    const config = await getUserConfig(userId);
    if (!config?.limitlessApiKey) {
      return res.status(400).json({ message: 'Missing Limitless API key' });
    }
    
    // Create filename with segment name if provided
    const segmentSuffix = segmentName ? `-${String(segmentName).replace(/[^a-zA-Z0-9-_]/g, '-')}` : '-segment';
    const filename = `lifelog-${lifelogId}${segmentSuffix}.ogg`;
    
    await streamAudioFromLimitless(config, startTime, endTime, res, filename);
    
  } catch (error: any) {
    console.error('Error streaming segment audio:', error);
    if (error.response?.status === 429) {
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }
    if (error.response?.status === 400) {
      return res.status(400).json({ message: error.response.data?.error || 'Bad request to Limitless API' });
    }
    res.status(500).json({ message: 'Failed to stream segment audio' });
  }
});

// Download full lifelog audio
router.get('/:id(\\d+)/download', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const lifelogId = Number(req.params.id);
    
    // Get the lifelog
    const log = await getLifeLogById(userId, lifelogId);
    if (!log) {
      return res.status(404).json({ message: 'Life log not found' });
    }
    
    // Check if we have time information
    if (!log.startTime || !log.endTime) {
      return res.status(400).json({ message: 'Life log missing time information' });
    }
    
    // Convert to Unix milliseconds
    const startMs = log.startTime.getTime();
    const endMs = log.endTime.getTime();
    
    // Check 2-hour limit (7,200,000 ms)
    const durationMs = endMs - startMs;
    if (durationMs > 7200000) {
      return res.status(400).json({ message: 'Audio segment too long (max 2 hours)' });
    }
    
    // Get user's API key
    const config = await getUserConfig(userId);
    if (!config?.limitlessApiKey) {
      return res.status(400).json({ message: 'Missing Limitless API key' });
    }
    
    await streamAudioFromLimitless(config, startMs, endMs, res, `lifelog-${lifelogId}-full.ogg`, true);
    
  } catch (error: any) {
    console.error('Error downloading audio:', error);
    if (error.response?.status === 429) {
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }
    if (error.response?.status === 400) {
      return res.status(400).json({ message: error.response.data?.error || 'Bad request to Limitless API' });
    }
    res.status(500).json({ message: 'Failed to download audio' });
  }
});

// Download segment audio
router.get('/:id(\\d+)/download/segment', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const lifelogId = Number(req.params.id);
    const { startMs, endMs, segmentName } = req.query;
    
    // Validate query parameters
    if (!startMs || !endMs) {
      return res.status(400).json({ message: 'Missing startMs or endMs query parameters' });
    }
    
    const startTime = Number(startMs);
    const endTime = Number(endMs);
    
    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
      return res.status(400).json({ message: 'Invalid time range' });
    }
    
    // Get the lifelog to verify it exists and user has access
    const log = await getLifeLogById(userId, lifelogId);
    if (!log) {
      return res.status(404).json({ message: 'Life log not found' });
    }
    
    // Check 2-hour limit (7,200,000 ms)
    const durationMs = endTime - startTime;
    if (durationMs > 7200000) {
      return res.status(400).json({ message: 'Audio segment too long (max 2 hours)' });
    }
    
    // Get user's API key
    const config = await getUserConfig(userId);
    if (!config?.limitlessApiKey) {
      return res.status(400).json({ message: 'Missing Limitless API key' });
    }
    
    // Create filename with segment name if provided
    const segmentSuffix = segmentName ? `-${String(segmentName).replace(/[^a-zA-Z0-9-_]/g, '-')}` : '-segment';
    const filename = `lifelog-${lifelogId}${segmentSuffix}.ogg`;
    
    await streamAudioFromLimitless(config, startTime, endTime, res, filename, true);
    
  } catch (error: any) {
    console.error('Error downloading segment audio:', error);
    if (error.response?.status === 429) {
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }
    if (error.response?.status === 400) {
      return res.status(400).json({ message: error.response.data?.error || 'Bad request to Limitless API' });
    }
    res.status(500).json({ message: 'Failed to download segment audio' });
  }
});

router.get('/date/:date', async (req, res) => {
  const logs = await listLifeLogs(req.user!.userId, { date: req.params.date, limit: 500 });
  res.json(logs);
});

router.get('/dates/all', async (req, res) => {
  const dates = await listLifeLogDates(req.user!.userId);
  res.json(dates);
});

const createSchema = z.object({
  limitlessId: z.string().min(1),
  date: z.string().min(1),
  title: z.string().optional(),
  summary: z.string().optional(),
  markdownContent: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  segmentType: z.string().optional()
});

router.post('/', async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const log = await createLifeLog(req.user!.userId, parse.data);
  res.status(201).json(log);
});

const updateSchema = createSchema.partial();
router.put('/:id(\\d+)', async (req, res) => {
  const parse = updateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parse.error.flatten() });
  }
  const log = await updateLifeLog(req.user!.userId, Number(req.params.id), parse.data);
  if (!log) {
    return res.status(404).json({ message: 'Life log not found' });
  }
  res.json(log);
});

router.delete('/:id(\\d+)', async (req, res) => {
  const deleted = await deleteLifeLog(req.user!.userId, Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ message: 'Life log not found' });
  }
  res.status(204).send();
});

export default router;
