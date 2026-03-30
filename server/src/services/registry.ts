import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import {
  Capability, CapabilityVersion, Subscription, SecurityScan, Compliance
} from '../types';
import { DatabaseAdapter } from '../database';

export class RegistryService {
  private db: DatabaseAdapter;
  private dataDir: string;

  constructor(
    db: DatabaseAdapter,
    dataDir: string
  ) {
    this.db = db;
    this.dataDir = dataDir;
    fs.ensureDirSync(path.join(dataDir, 'packages'));
  }

  async getCapabilities(options: {
    query?: string;
    type?: string;
    tag?: string;
    status?: string;
  } = {}): Promise<Capability[]> {
    return this.db.getCapabilities({
      query: options.query,
      type: options.type,
      tag: options.tag,
      status: options.status
    });
  }

  async getCapability(id: string): Promise<Capability | undefined> {
    const capability = await this.db.getCapability(id);
    return capability || undefined;
  }

  async getCapabilityByName(name: string): Promise<Capability | undefined> {
    const capability = await this.db.getCapabilityByName(name);
    return capability || undefined;
  }

  async createCapability(data: {
    name: string;
    displayName: string;
    description: string;
    type: 'skill' | 'mcp' | 'agent';
    version: string;
    tags: string[];
    category: { primary: string; secondary: string };
    author: { name: string; email?: string };
    repository?: string;
    snpContent?: string;
    changelog?: string;
  }): Promise<Capability> {
    const id = `cap_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    const version: CapabilityVersion = {
      version: data.version,
      snpFile: path.join(this.dataDir, 'packages', id, `${data.version}.snp`),
      changelog: data.changelog || '',
      releasedAt: new Date().toISOString()
    };

    if (data.snpContent) {
      const pkgDir = path.join(this.dataDir, 'packages', id);
      fs.ensureDirSync(pkgDir);
      fs.writeFileSync(version.snpFile, data.snpContent, 'utf-8');
    }

    const capability: Capability = {
      id,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      type: data.type,
      version: data.version,
      tags: data.tags,
      category: data.category,
      author: data.author,
      repository: data.repository,
      statistics: {
        downloads: 0,
        subscribers: 0,
        rating: 0,
        ratingCount: 0
      },
      status: 'draft',
      versions: [version],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.createCapability(capability);
    await this.db.addCapabilityVersion({ ...version, capabilityId: id } as CapabilityVersion & { capabilityId: string });
    
    return capability;
  }

  async updateCapability(id: string, updates: Partial<Capability>): Promise<Capability | undefined> {
    const capability = await this.db.updateCapability(id, updates);
    return capability || undefined;
  }

  async addVersion(id: string, version: string, snpContent?: string, changelog?: string): Promise<Capability | undefined> {
    const capability = await this.db.getCapability(id);
    if (!capability) return undefined;

    const newVersion: CapabilityVersion = {
      version,
      snpFile: path.join(this.dataDir, 'packages', id, `${version}.snp`),
      changelog: changelog || '',
      releasedAt: new Date().toISOString()
    };

    if (snpContent) {
      const pkgDir = path.join(this.dataDir, 'packages', id);
      fs.ensureDirSync(pkgDir);
      fs.writeFileSync(newVersion.snpFile, snpContent, 'utf-8');
    }

    await this.db.addCapabilityVersion({ ...newVersion, capabilityId: id } as CapabilityVersion & { capabilityId: string });
    
    await this.db.updateCapability(id, {
      version,
      updatedAt: new Date().toISOString()
    });

    const result = await this.db.getCapability(id);
    return result ?? undefined;
  }

  async updateSecurityScan(id: string, scan: SecurityScan): Promise<void> {
    const capability = await this.db.getCapability(id);
    if (!capability) return;

    let status = capability.status;
    if (scan.status === 'passed' || scan.status === 'failed') {
      status = scan.status === 'passed' ? 'pending' : 'rejected';
    }

    await this.db.updateCapability(id, {
      securityScan: scan,
      status,
      updatedAt: new Date().toISOString()
    });
  }

  async updateCompliance(id: string, compliance: Compliance): Promise<void> {
    const capability = await this.db.getCapability(id);
    if (!capability) return;

    let status = capability.status;
    if (compliance.status === 'approved') {
      status = 'approved';
    } else if (compliance.status === 'rejected') {
      status = 'rejected';
    }

    await this.db.updateCapability(id, {
      compliance,
      status,
      updatedAt: new Date().toISOString()
    });
  }

  async subscribe(userId: string, capabilityId: string, version?: string): Promise<Subscription> {
    const capability = await this.db.getCapability(capabilityId);
    if (!capability) throw new Error('Capability not found');

    const existing = await this.db.getSubscription(userId, capabilityId);

    if (existing) {
      const updated = await this.db.updateSubscription(existing.id, {
        version: version || capability.version
      });
      return updated || existing;
    }

    const subscription: Subscription = {
      id: `sub_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      userId,
      capabilityId,
      version: version || capability.version,
      subscribedAt: new Date().toISOString(),
      status: 'active'
    };

    await this.db.createSubscription(subscription);

    capability.statistics.subscribers++;
    await this.db.updateCapability(capabilityId, {
      statistics: capability.statistics
    });

    return subscription;
  }

  async unsubscribe(userId: string, capabilityId: string): Promise<void> {
    const subscription = await this.db.getSubscription(userId, capabilityId);

    if (subscription) {
      await this.db.updateSubscription(subscription.id, { status: 'expired' });
    }
  }

  async getUserSubscriptions(userId: string): Promise<(Subscription & { capability?: Capability })[]> {
    return this.db.getUserSubscriptions(userId);
  }

  async incrementDownloads(id: string): Promise<void> {
    const capability = await this.db.getCapability(id);
    if (capability) {
      capability.statistics.downloads++;
      await this.db.updateCapability(id, {
        statistics: capability.statistics
      });
    }
  }

  async rateCapability(id: string, rating: number): Promise<void> {
    const capability = await this.db.getCapability(id);
    if (!capability) return;

    const { ratingCount, rating: currentRating } = capability.statistics;
    const newRatingCount = ratingCount + 1;
    const newRating = ((currentRating * ratingCount) + rating) / newRatingCount;

    capability.statistics = {
      ...capability.statistics,
      rating: Math.round(newRating * 10) / 10,
      ratingCount: newRatingCount
    };

    await this.db.updateCapability(id, {
      statistics: capability.statistics
    });
  }

  getPackagePath(id: string, version?: string): string | undefined {
    if (version) {
      return path.join(this.dataDir, 'packages', id, `${version}.snp`);
    }
    return path.join(this.dataDir, 'packages', id, 'latest.snp');
  }
}
