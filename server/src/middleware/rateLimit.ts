import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

class MemoryStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const key of Object.keys(this.store)) {
        if (this.store[key].resetAt < now) {
          delete this.store[key];
        }
      }
    }, 60000);
  }

  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    
    if (!this.store[key] || this.store[key].resetAt < now) {
      this.store[key] = {
        count: 1,
        resetAt: now + windowMs
      };
    } else {
      this.store[key].count++;
    }

    return this.store[key];
  }

  reset(key: string): void {
    delete this.store[key];
  }

  stop(): void {
    clearInterval(this.cleanupInterval);
  }
}

const store = new MemoryStore();

export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || 'unknown',
    skip = () => false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const { count, resetAt } = store.increment(key, windowMs);

    const remaining = Math.max(0, max - count);
    const resetTime = new Date(resetAt);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

    if (count > max) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      
      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfter
      });
      return;
    }

    next();
  };
};

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again in 15 minutes',
  keyGenerator: (req) => {
    const body = req.body as { username?: string };
    return `login:${req.ip}:${body?.username || 'unknown'}`;
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many API requests, please slow down'
});

export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many admin requests, please slow down'
});

export const downloadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many download requests, please slow down'
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many search requests, please slow down'
});
