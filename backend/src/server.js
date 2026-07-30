import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { migrate } from './db/schema.js';
import { connectRedis } from './redis.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import assessmentRoutes from './routes/assessments.js';
import applicationRoutes from './routes/applications.js';
import analyticsRoutes from './routes/analytics.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cloudhire-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  await migrate();
  await connectRedis();

  app.listen(config.port, () => {
    console.log(`CloudHire API listening on port ${config.port}`);
  });
}
