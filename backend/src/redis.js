import Redis from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true
});

export async function connectRedis() {
  try {
    await redis.connect();
    console.log('Redis connected');
  } catch (error) {
    console.warn('Redis unavailable, continuing without cache:', error.message);
  }
}
