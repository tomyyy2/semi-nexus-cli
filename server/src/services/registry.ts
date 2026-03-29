import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  Capability, CapabilityVersion, Subscription, SecurityScan, Compliance
} from '../types';

export class RegistryService {
  private capabilities: Map<string, Capability> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private dataDir: string;
  private registryFile: string;
  private subscriptionsFile: string;

  constructor(
    dataDir: string = path.join(os.homedir(), '.semi-nexus', 'server', 'registry')
  ) {
    this.dataDir = dataDir;
    this.registryFile = path.join(dataDir, 'capabilities.json');
    this.subscriptionsFile = path.join(dataDir, 'subscriptions.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, 'utf-8');
        const capabilities: Capability[] = JSON.parse(data);
        capabilities.forEach(c => this.capabilities.set(c.id, c));
      }
      if (fs.existsSync(this.subscriptionsFile)) {
        const data = fs.readFileSync(this.subscriptionsFile, 'utf-8');
        const subscriptions: Subscription[] = JSON.parse(data);
        subscriptions.forEach(s => this.subscriptions.set(s.id, s));
      }
    } catch (error) {
      console.error('Failed to load registry:', error);
    }
  }

  private save(): void {
    fs.ensureDirSync(this.dataDir);
    fs.writeFileSync(
      this.registryFile,
      JSON.stringify(Array.from(this.capabilities.values()), null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      this.subscriptionsFile,
      JSON.stringify(Array.from(this.subscriptions.values()), null, 2),
      'utf-8'
    );
  }

  getCapabilities(options: {
    query?: string;
    type?: string;
    tag?: string;
    status?: string;
  } = {}): Capability[] {
    let results = Array.from(this.capabilities.values())
      .filter(c => c.status === 'approved');

    if (options.query) {
      const q = options.query.toLowerCase();
      results = results.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (options.type) {
      results = results.filter(c => c.type === options.type);
    }

    if (options.tag) {
      results = results.filter(c => c.tags.includes(options.tag!));
    }

    if (options.status) {
      results = results.filter(c => c.status === options.status);
    }

    return results;
  }

  getCapability(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  getCapabilityByName(name: string): Capability | undefined {
    return Array.from(this.capabilities.values()).find(c => c.name === name);
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

    this.capabilities.set(id, capability);
    this.save();
    return capability;
  }

  updateCapability(id: string, updates: Partial<Capability>): Capability | undefined {
    const capability = this.capabilities.get(id);
    if (!capability) return undefined;

    Object.assign(capability, updates, {
      updatedAt: new Date().toISOString()
    });

    this.capabilities.set(id, capability);
    this.save();
    return capability;
  }

  addVersion(id: string, version: string, snpContent?: string, changelog?: string): Capability | undefined {
    const capability = this.capabilities.get(id);
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

    capability.versions.push(newVersion);
    capability.version = version;
    capability.updatedAt = new Date().toISOString();

    this.capabilities.set(id, capability);
    this.save();
    return capability;
  }

  updateSecurityScan(id: string, scan: SecurityScan): void {
    const capability = this.capabilities.get(id);
    if (!capability) return;

    capability.securityScan = scan;
    capability.updatedAt = new Date().toISOString();

    if (scan.status === 'passed' || scan.status === 'failed') {
      capability.status = scan.status === 'passed' ? 'pending' : 'rejected';
    }

    this.capabilities.set(id, capability);
    this.save();
  }

  updateCompliance(id: string, compliance: Compliance): void {
    const capability = this.capabilities.get(id);
    if (!capability) return;

    capability.compliance = compliance;
    capability.updatedAt = new Date().toISOString();

    if (compliance.status === 'approved') {
      capability.status = 'approved';
    } else if (compliance.status === 'rejected') {
      capability.status = 'rejected';
    }

    this.capabilities.set(id, capability);
    this.save();
  }

  async subscribe(userId: string, capabilityId: string, version?: string): Promise<Subscription> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) throw new Error('Capability not found');

    const existing = Array.from(this.subscriptions.values()).find(
      s => s.userId === userId && s.capabilityId === capabilityId && s.status === 'active'
    );

    if (existing) {
      existing.version = version || capability.version;
      this.subscriptions.set(existing.id, existing);
      this.save();
      return existing;
    }

    const subscription: Subscription = {
      id: `sub_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      userId,
      capabilityId,
      version: version || capability.version,
      subscribedAt: new Date().toISOString(),
      status: 'active'
    };

    this.subscriptions.set(subscription.id, subscription);

    capability.statistics.subscribers++;
    this.capabilities.set(capabilityId, capability);

    this.save();
    return subscription;
  }

  unsubscribe(userId: string, capabilityId: string): void {
    const subscription = Array.from(this.subscriptions.values()).find(
      s => s.userId === userId && s.capabilityId === capabilityId && s.status === 'active'
    );

    if (subscription) {
      subscription.status = 'expired';
      this.subscriptions.set(subscription.id, subscription);
      this.save();
    }
  }

  getUserSubscriptions(userId: string): (Subscription & { capability?: Capability })[] {
    return Array.from(this.subscriptions.values())
      .filter(s => s.userId === userId && s.status === 'active')
      .map(s => ({
        ...s,
        capability: this.capabilities.get(s.capabilityId)
      }));
  }

  incrementDownloads(id: string): void {
    const capability = this.capabilities.get(id);
    if (capability) {
      capability.statistics.downloads++;
      this.capabilities.set(id, capability);
      this.save();
    }
  }

  rateCapability(id: string, rating: number): void {
    const capability = this.capabilities.get(id);
    if (!capability) return;

    const { ratingCount, rating: currentRating } = capability.statistics;
    const newRatingCount = ratingCount + 1;
    const newRating = ((currentRating * ratingCount) + rating) / newRatingCount;

    capability.statistics = {
      ...capability.statistics,
      rating: Math.round(newRating * 10) / 10,
      ratingCount: newRatingCount
    };

    this.capabilities.set(id, capability);
    this.save();
  }

  getPackagePath(id: string, version?: string): string | undefined {
    const capability = this.capabilities.get(id);
    if (!capability) return undefined;

    if (version) {
      const ver = capability.versions.find(v => v.version === version);
      return ver?.snpFile;
    }

    return capability.versions[capability.versions.length - 1]?.snpFile;
  }
}

export const registryService = new RegistryService();