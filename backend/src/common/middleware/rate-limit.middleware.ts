import { Request, Response, NextFunction } from 'express';
import redisClient from '../../config/redis';
import { AppError } from './error.middleware';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Terlalu banyak permintaan, silakan coba lagi nanti',
    keyGenerator = (req: Request) => req.ip || 'unknown',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate-limit:${keyGenerator(req)}`;
      const current = await redisClient.get(key);

      if (current && parseInt(current) >= maxRequests) {
        throw new AppError(message, 429);
      }

      const count = current ? parseInt(current) + 1 : 1;
      const ttl = current ? await redisClient.ttl(key) : Math.floor(windowMs / 1000);

      await redisClient.setEx(key, ttl, count.toString());

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        // If Redis fails, allow the request (fail open)
        next();
      }
    }
  };
};

// Predefined rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit',
  keyGenerator: (req) => `auth:${req.body.email || req.ip}`,
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Terlalu banyak permintaan API, silakan coba lagi nanti',
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Terlalu banyak permintaan, silakan coba lagi nanti',
});
