import { Router, Request, Response } from 'express';
import { getAuthService, getRegistryService, getDatabase } from '../container';
import { scannerService } from '../services/scanner';
import { authenticate, requireAdmin } from '../middleware/auth';
import { auditService } from '../services/audit';

const router = Router();

router.use(authenticate, requireAdmin);

// Scan routes (more specific, must come before /capabilities/:id)
router.post('/scan/:id', async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    const capability = await registryService.getCapability(req.params.id);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    await registryService.updateSecurityScan(req.params.id, {
      status: 'scanning',
      startedAt: new Date().toISOString(),
      issues: [],
      scannerVersion: '1.0.0'
    });

    auditService.log(
      req.user!.id,
      'scan_start',
      'capability',
      req.params.id,
      undefined,
      req.ip
    );

    scannerService.scan(req.params.id).then(async (scan) => {
      await registryService.updateSecurityScan(req.params.id, scan);
      auditService.log(
        req.user!.id,
        'scan_complete',
        'capability',
        req.params.id,
        { status: scan.status, issues: scan.issues.length },
        req.ip
      );
    });

    res.json({ message: 'Scan started', status: 'scanning' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/scan/:id', async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    const scan = scannerService.getScanStatus(req.params.id);
    const capability = await registryService.getCapability(req.params.id);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    res.json({
      scan,
      capabilityScan: capability.securityScan
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Capability routes
router.post('/capabilities', async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    const capability = await registryService.createCapability(req.body);

    auditService.log(
      req.user!.id,
      'create',
      'capability',
      capability.id,
      { name: capability.name },
      req.ip
    );

    res.status(201).json(capability);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    const { status } = req.query;
    const capabilities = await registryService.getCapabilities({
      status: status as string
    });

    res.json({ capabilities, total: capabilities.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/capabilities/:id', async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    const capability = await registryService.updateCapability(req.params.id, req.body);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    auditService.log(
      req.user!.id,
      'update',
      'capability',
      req.params.id,
      { updates: req.body },
      req.ip
    );

    res.json(capability);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/capabilities/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const registryService = getRegistryService();
    const capability = await registryService.getCapability(req.params.id);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    await db.deleteCapability(req.params.id);

    auditService.log(
      req.user!.id,
      'delete',
      'capability',
      req.params.id,
      { name: capability.name },
      req.ip
    );

    res.json({ message: 'Capability deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// User routes
router.get('/users', async (req: Request, res: Response) => {
  const authService = getAuthService();
  const users = await authService.getAllUsers();
  res.json(users);
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const authService = getAuthService();
    const { username, password, role, authType } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const user = await authService.createUser(
      username,
      password,
      role || 'user',
      authType || 'local'
    );

    auditService.log(
      req.user!.id,
      'create_user',
      'user',
      user.id,
      { username, role },
      req.ip
    );

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const authService = getAuthService();
    const db = getDatabase();
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'locked'].includes(status)) {
      res.status(400).json({ error: 'Valid status required (active, inactive, locked)' });
      return;
    }

    const user = await db.getUser(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await authService.updateUserStatus(req.params.id, status as 'active' | 'inactive' | 'locked');

    const updatedUser = await db.getUser(req.params.id);

    auditService.log(
      req.user!.id,
      'update_user_status',
      'user',
      req.params.id,
      { status },
      req.ip
    );

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { role } = req.body;

    const user = await db.getUser(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (role) {
      await db.updateUser(req.params.id, { role });
    }

    const updatedUser = await db.getUser(req.params.id);

    auditService.log(
      req.user!.id,
      'update_user',
      'user',
      req.params.id,
      { role },
      req.ip
    );

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// API Key routes (more specific patterns first)
router.get('/users/:id/api-keys', async (req: Request, res: Response) => {
  try {
    const authService = getAuthService();
    const keys = await authService.listApiKeys(req.params.id);
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/users/:id/api-keys', async (req: Request, res: Response) => {
  try {
    const authService = getAuthService();
    const { name, expiresIn } = req.body;

    const { apiKey, keyId } = await authService.createApiKey(
      req.params.id,
      name || 'CLI Key',
      expiresIn
    );

    auditService.log(
      req.user!.id,
      'create_apikey_for_user',
      'user',
      req.params.id,
      { name },
      req.ip
    );

    res.status(201).json({ apiKey, keyId, name, createdAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/users/:userId/api-keys/:keyId', async (req: Request, res: Response) => {
  try {
    const authService = getAuthService();
    await authService.revokeApiKey(req.params.userId, req.params.keyId);

    auditService.log(
      req.user!.id,
      'revoke_apikey',
      'apikey',
      req.params.keyId,
      { userId: req.params.userId },
      req.ip
    );

    res.json({ message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Audit routes
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const { userId, action, resource, startDate, endDate, limit, offset } = req.query;

    const logs = await auditService.query({
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test-only route for resetting test state
router.post('/reset-test-state', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Not available in production' });
    return;
  }
  
  try {
    const db = getDatabase();
    await db.clearTestData();
    res.json({ message: 'Test state reset successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
