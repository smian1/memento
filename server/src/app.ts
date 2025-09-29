import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { attachUser } from './middlewares/authMiddleware.js';
import authRouter from './routes/auth.js';
import configRouter from './routes/config.js';
import systemRouter from './routes/system.js';
import insightsRouter from './routes/insights.js';
import actionItemsRouter from './routes/actionItems.js';
import contentRouter from './routes/content.js';
import tagsRouter from './routes/tags.js';
import lifelogsRouter from './routes/lifelogs.js';
import generalRouter from './routes/general.js';
import syncRouter from './routes/sync.js';
import speakersRouter from './routes/speakers.js';
import discoveryRouter from './routes/discovery.js';
import databaseRouter from './routes/database.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);

app.use('/api/auth', authRouter);
app.use('/api/config', configRouter);
app.use('/api/system', systemRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/action-items', actionItemsRouter);
app.use('/api', contentRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/lifelogs', lifelogsRouter);
app.use('/api', generalRouter);
app.use('/api/sync', syncRouter);
app.use('/api/speakers', speakersRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/database', databaseRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
