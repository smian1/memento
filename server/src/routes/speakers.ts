import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import {
  getSpeakerProfiles,
  getSpeakerProfile,
  createSpeakerProfile,
  updateSpeakerProfile,
  deleteSpeakerProfile,
  autoDiscoverSpeakers,
  type CreateSpeakerProfileData,
  type UpdateSpeakerProfileData
} from '../services/speakerService.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/speakers - Get all speaker profiles for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const profiles = await getSpeakerProfiles(userId);
    res.json({ data: profiles });
  } catch (error) {
    console.error('Error fetching speaker profiles:', error);
    res.status(500).json({ message: 'Failed to fetch speaker profiles' });
  }
});

// GET /api/speakers/:speakerName - Get specific speaker profile
router.get('/:speakerName', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { speakerName } = req.params;
    
    const profile = await getSpeakerProfile(userId, decodeURIComponent(speakerName));
    
    if (!profile) {
      return res.status(404).json({ message: 'Speaker profile not found' });
    }
    
    res.json({ data: profile });
  } catch (error) {
    console.error('Error fetching speaker profile:', error);
    res.status(500).json({ message: 'Failed to fetch speaker profile' });
  }
});

// POST /api/speakers - Create new speaker profile
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const data: CreateSpeakerProfileData = req.body;
    
    // Validate required fields
    if (!data.speakerName || data.speakerName.trim().length === 0) {
      return res.status(400).json({ message: 'Speaker name is required' });
    }
    
    // Check if speaker already exists
    const existing = await getSpeakerProfile(userId, data.speakerName);
    if (existing) {
      return res.status(409).json({ message: 'Speaker profile already exists' });
    }
    
    // Validate color hex format if provided
    if (data.colorHex && !/^#[0-9A-Fa-f]{6}$/.test(data.colorHex)) {
      return res.status(400).json({ message: 'Invalid color hex format' });
    }
    
    // Validate avatar URL if provided
    if (data.avatarUrl && data.avatarUrl.length > 500) {
      return res.status(400).json({ message: 'Avatar URL too long' });
    }
    
    const profile = await createSpeakerProfile(userId, data);
    res.status(201).json({ data: profile });
  } catch (error) {
    console.error('Error creating speaker profile:', error);
    res.status(500).json({ message: 'Failed to create speaker profile' });
  }
});

// PUT /api/speakers/:speakerName - Update speaker profile
router.put('/:speakerName', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { speakerName } = req.params;
    const data: UpdateSpeakerProfileData = req.body;
    
    // Validate color hex format if provided
    if (data.colorHex && !/^#[0-9A-Fa-f]{6}$/.test(data.colorHex)) {
      return res.status(400).json({ message: 'Invalid color hex format' });
    }
    
    // Validate avatar URL if provided
    if (data.avatarUrl && data.avatarUrl.length > 500) {
      return res.status(400).json({ message: 'Avatar URL too long' });
    }
    
    const profile = await updateSpeakerProfile(userId, decodeURIComponent(speakerName), data);
    
    if (!profile) {
      return res.status(404).json({ message: 'Speaker profile not found' });
    }
    
    res.json({ data: profile });
  } catch (error) {
    console.error('Error updating speaker profile:', error);
    res.status(500).json({ message: 'Failed to update speaker profile' });
  }
});

// DELETE /api/speakers/:speakerName - Delete speaker profile
router.delete('/:speakerName', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { speakerName } = req.params;
    
    const deleted = await deleteSpeakerProfile(userId, decodeURIComponent(speakerName));
    
    if (!deleted) {
      return res.status(404).json({ message: 'Speaker profile not found' });
    }
    
    res.json({ message: 'Speaker profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting speaker profile:', error);
    res.status(500).json({ message: 'Failed to delete speaker profile' });
  }
});

// POST /api/speakers/auto-discover - Auto-discover speakers from recent lifelogs
router.post('/auto-discover', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const result = await autoDiscoverSpeakers(userId);
    res.json({ 
      message: `Discovered ${result.discovered.length} speakers, created ${result.created.length} new profiles`,
      data: result 
    });
  } catch (error) {
    console.error('Error auto-discovering speakers:', error);
    res.status(500).json({ message: 'Failed to auto-discover speakers' });
  }
});

export default router;
