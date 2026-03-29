import { Router, Request, Response } from 'express';
import { authService } from '../services/auth';
import { registryService } from '../services/registry';
import { scannerService } from '../services/scanner';
import { authenticate, requireAdmin } from '../middleware/auth';
import { auditService } from '../services/audit';

const router = Router();

router.use(authenticate, requireAdmin);

router.post('/capabilities', async (req: Request, res: Response) => {
  try {
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

router.post('/capabilities/:id/scan', async (req: Request, res: Response) => {
  try {
    const capability = registryService.getCapability(req.params.id);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    registryService.updateSecurityScan(req.params.id, {
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

    scannerService.scan(req.params.id).then(scan => {
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

router.get('/capabilities/:id/scan', async (req: Request, res: Response) => {
  try {
    const scan = scannerService.getScanStatus(req.params.id);
    const capability = registryService.getCapability(req.params.id);

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

router.post('/capabilities/:id/approve', async (req: Request, res: Response) => {
  try {
    const capability = registryService.getCapability(req.params.id);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    const { comment } = req.body;

    registryService.updateCompliance(req.params.id, {
      status: 'approved',
      reviewedBy: req.user!.id,
      reviewedAt: new Date().toISOString(),
      comment
    });

    auditService.log(
      req.user!.id,
      'approve',
      'capability',
      req.params.id,
      { comment },
      req.ip
    );

    res.json({ message: 'Capability approved', status: 'approved' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/capabilities/:id/reject', async (req: Request, res: Response) => {
  try {
    const capability = registryService.getCapability(req.params.id);

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    const { comment } = req.body;

    registryService.updateCompliance(req.params.id, {
      status: 'rejected',
      reviewedBy: req.user!.id,
      reviewedAt: new Date().toISOString(),
      comment
    });

    auditService.log(
      req.user!.id,
      'reject',
      'capability',
      req.params.id,
      { comment },
      req.ip
    );

    res.json({ message: 'Capability rejected', status: 'rejected' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const capabilities = registryService.getCapabilities({
      status: status as string
    });

    res.json({ capabilities, total: capabilities.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/users', (req: Request, res: Response) => {
  const users = authService.getAllUsers();
  res.json(users);
});

router.post('/users', async (req: Request, res: Response) => {
  try {
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

router.post('/users/:id/apikey', async (req: Request, res: Response) => {
  try {
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

    res.json({ apiKey, keyId, name, createdAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

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

export default router;