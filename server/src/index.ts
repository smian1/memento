import ViteExpress from 'vite-express';
import cron from 'node-cron';
import app from './app.js';
import { APP_PORT, SYNC_INTERVAL_MINUTES } from './config.js';
import { runScheduledSync } from './jobs/syncJob.js';

const isProduction = process.env.NODE_ENV === 'production';

ViteExpress.config({
  mode: isProduction ? 'production' : 'development',
  viteConfigFile: 'frontend/vite.config.ts',
  inlineViteConfig: {
    root: 'frontend'
  }
});

cron.schedule(`*/${SYNC_INTERVAL_MINUTES} * * * *`, () => {
  void runScheduledSync();
});

ViteExpress.listen(app, APP_PORT, () => {
  console.log(`🚀 Memento server listening on http://localhost:${APP_PORT}`);
});
