import { createClient } from 'redis';
import { config } from './env';
import logger from '../utils/logger';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    connectTimeout: 3000,
    reconnectStrategy: () => false,
  },
  password: config.redis.password,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
  }
};

export default redisClient;
