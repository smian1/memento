import express from 'express';
import { hasAnyUsers, getUserConfig } from '../services/authService.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  const hasUsers = await hasAnyUsers();
  const user = req.user ?? null;
  const status: any = {
    hasUsers,
    needsSetup: !hasUsers,
    authenticated: Boolean(user),
    user,
    needsConfig: false
  };

  if (user) {
    const config = await getUserConfig(user.userId);
    status.config = config
      ? {
          timezone: config.timezone,
          hasApiKey: Boolean(config.limitlessApiKey)
        }
      : null;
    status.needsConfig = !config || !config.limitlessApiKey || !config.timezone;
  } else {
    status.needsConfig = false;
  }

  return res.json(status);
});

export default router;
