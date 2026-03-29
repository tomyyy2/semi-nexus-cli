import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { TokenPayload, User } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      auth?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  try {
    if (apiKey) {
      const user = authService.verifyApiKey(apiKey);
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired API key' });
        return;
      }
      req.user = user;
      next();
      return;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authentication provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);
    const user = authService.getUser(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  try {
    if (apiKey) {
      const user = authService.verifyApiKey(apiKey);
      if (user) {
        req.user = user;
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      const user = authService.getUser(payload.userId);
      if (user) {
        req.user = user;
        req.auth = payload;
      }
    }
  } catch {
  }
  next();
}