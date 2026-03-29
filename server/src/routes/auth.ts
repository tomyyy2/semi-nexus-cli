import { Router, Request, Response } from 'express';
import { authService } from '../services/auth';
import { authenticate, requireAdmin } from '../middleware/auth';
import { auditService } from '../services/audit';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, authType } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const tokens = await authService.login(username, password, authType || 'local');
    auditService.log('system', 'login', 'auth', undefined, { username, authType }, req.ip);

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const payload = authService.verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      res.status(400).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = authService.getUser(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const tokens = authService.generateTokensForUser(user.id);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', authenticate, (req: Request, res: Response) => {
  auditService.log(req.user!.id, 'logout', 'auth', undefined, undefined, req.ip);
  res.json({ message: 'Logged out successfully' });
});

router.post('/api-keys', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, expiresIn } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const { apiKey, keyId } = await authService.createApiKey(
      req.user!.id,
      name,
      expiresIn
    );

    auditService.log(req.user!.id, 'create_apikey', 'apikey', keyId, { name }, req.ip);

    res.status(201).json({ apiKey, keyId, name, createdAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/api-keys', authenticate, (req: Request, res: Response) => {
  const keys = authService.listApiKeys(req.user!.id);
  res.json(keys.map(k => ({
    id: k.id,
    name: k.name,
    prefix: k.keyPrefix,
    createdAt: k.createdAt,
    lastUsed: k.lastUsed,
    expiresAt: k.expiresAt
  })));
});

router.delete('/api-keys/:id', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  authService.revokeApiKey(req.user!.id, id);
  auditService.log(req.user!.id, 'revoke_apikey', 'apikey', id, undefined, req.ip);
  res.json({ message: 'API key revoked' });
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({
    id: req.user!.id,
    username: req.user!.username,
    email: req.user!.email,
    role: req.user!.role,
    createdAt: req.user!.createdAt,
    lastLogin: req.user!.lastLogin
  });
});

export default router;