import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import { getRegistryService } from '../container';
import { authenticate } from '../middleware/auth';
import { auditService } from '../services/audit';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { query, type, tag, status } = req.query;
    const registryService = getRegistryService();

    const capabilities = await registryService.getCapabilities({
      query: query as string,
      type: type as string,
      tag: tag as string,
      status: status as string
    });

    res.json({
      capabilities,
      total: capabilities.length
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/subscriptions', authenticate, async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    const subscriptions = await registryService.getUserSubscriptions(req.user!.id);
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    let capability = await registryService.getCapability(req.params.id);
    
    if (!capability) {
      capability = await registryService.getCapabilityByName(req.params.id);
    }

    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }

    res.json(capability);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const { version } = req.query;
    const registryService = getRegistryService();
    const packagePath = registryService.getPackagePath(
      req.params.id,
      version as string
    );

    if (!packagePath) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    await registryService.incrementDownloads(req.params.id);
    auditService.log(
      req.user!.id,
      'download',
      'capability',
      req.params.id,
      { version },
      req.ip
    );

    if (await fs.pathExists(packagePath)) {
      res.download(packagePath);
    } else {
      res.json({ message: 'Package placeholder - actual file not yet uploaded' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/:id/subscribe', authenticate, async (req: Request, res: Response) => {
  try {
    const { version } = req.body;
    const registryService = getRegistryService();
    
    let capability = await registryService.getCapability(req.params.id);
    if (!capability) {
      capability = await registryService.getCapabilityByName(req.params.id);
    }
    
    if (!capability) {
      res.status(404).json({ error: 'Capability not found' });
      return;
    }
    
    const subscription = await registryService.subscribe(
      req.user!.id,
      capability.id,
      version
    );

    auditService.log(
      req.user!.id,
      'subscribe',
      'capability',
      capability.id,
      { version },
      req.ip
    );

    res.json(subscription);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/:id/subscribe', authenticate, async (req: Request, res: Response) => {
  try {
    const registryService = getRegistryService();
    await registryService.unsubscribe(req.user!.id, req.params.id);

    auditService.log(
      req.user!.id,
      'unsubscribe',
      'capability',
      req.params.id,
      undefined,
      req.ip
    );

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/:id/rate', authenticate, async (req: Request, res: Response) => {
  try {
    const { rating } = req.body;
    const registryService = getRegistryService();

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    await registryService.rateCapability(req.params.id, rating);

    auditService.log(
      req.user!.id,
      'rate',
      'capability',
      req.params.id,
      { rating },
      req.ip
    );

    res.json({ message: 'Rating submitted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
