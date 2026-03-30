import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface Capability {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'skill' | 'mcp' | 'agent';
  version: string;
  tags: string[];
  category: { primary: string; secondary: string };
  statistics: { downloads: number; subscribers: number; rating: number; ratingCount: number };
  repository?: string;
  author?: string;
  homepage?: string;
}

export interface Subscription {
  id: string;
  capabilityId: string;
  version: string;
  subscribedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface InstalledCapability {
  id: string;
  name: string;
  version: string;
  installedAt: string;
  installPath: string;
  syncedAgents: string[];
}

export interface AgentConfig {
  id: string;
  name: string;
  installPath: string;
  skillPath: string;
  supported: boolean;
  syncMode: 'symlink' | 'copy';
  detected: boolean;
}

export class LocalRegistry {
  private baseDir: string;
  private registryFile: string;
  private subscriptionsFile: string;
  private installedFile: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.semi-nexus');
    this.registryFile = path.join(this.baseDir, 'registry.json');
    this.subscriptionsFile = path.join(this.baseDir, 'subscriptions.json');
    this.installedFile = path.join(this.baseDir, 'installed.json');
  }

  async ensureDir(): Promise<void> {
    await fs.ensureDir(this.baseDir);
  }

  async getCapabilities(): Promise<Capability[]> {
    try {
      if (await fs.pathExists(this.registryFile)) {
        const data = await fs.readFile(this.registryFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read registry:', error);
    }
    return this.getDefaultCapabilities();
  }

  async searchCapabilities(query: string, options: { type?: string; tag?: string } = {}): Promise<Capability[]> {
    const capabilities = await this.getCapabilities();

    return capabilities.filter(cap => {
      const matchQuery = !query ||
        cap.name.toLowerCase().includes(query.toLowerCase()) ||
        cap.description.toLowerCase().includes(query.toLowerCase()) ||
        cap.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));

      const matchType = !options.type || cap.type === options.type;
      const matchTag = !options.tag || cap.tags.includes(options.tag);

      return matchQuery && matchType && matchTag;
    });
  }

  async getCapability(name: string): Promise<Capability | undefined> {
    const capabilities = await this.getCapabilities();
    return capabilities.find(c => c.name === name);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    try {
      if (await fs.pathExists(this.subscriptionsFile)) {
        const data = await fs.readFile(this.subscriptionsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read subscriptions:', error);
    }
    return [];
  }

  async subscribe(capabilityId: string, version: string = 'latest'): Promise<Subscription> {
    await this.ensureDir();

    const subscriptions = await this.getSubscriptions();
    const existing = subscriptions.find(s => s.capabilityId === capabilityId);

    if (existing) {
      existing.version = version;
      existing.status = 'active';
      existing.subscribedAt = new Date().toISOString();
      await this.saveSubscriptions(subscriptions);
      return existing;
    }

    const subscription: Subscription = {
      id: `sub-${Date.now()}`,
      capabilityId,
      version,
      subscribedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    };

    subscriptions.push(subscription);
    await this.saveSubscriptions(subscriptions);
    return subscription;
  }

  async unsubscribe(capabilityId: string): Promise<void> {
    const subscriptions = await this.getSubscriptions();
    const filtered = subscriptions.filter(s => s.capabilityId !== capabilityId);
    await this.saveSubscriptions(filtered);
  }

  async isSubscribed(capabilityId: string): Promise<boolean> {
    const subscriptions = await this.getSubscriptions();
    const sub = subscriptions.find(s => s.capabilityId === capabilityId);
    return sub?.status === 'active';
  }

  async markSubscribed(sub: { capabilityId: string; capabilityName: string; version: string; subscribedAt: string; status: string }): Promise<void> {
    await this.ensureDir();

    const subscriptions = await this.getSubscriptions();
    const existing = subscriptions.findIndex(s => s.capabilityId === sub.capabilityId);

    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      capabilityId: sub.capabilityId,
      version: sub.version,
      subscribedAt: sub.subscribedAt,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    };

    if (existing >= 0) {
      subscriptions[existing] = subscription;
    } else {
      subscriptions.push(subscription);
    }

    await this.saveSubscriptions(subscriptions);
  }

  async getInstalled(): Promise<InstalledCapability[]> {
    try {
      if (await fs.pathExists(this.installedFile)) {
        const data = await fs.readFile(this.installedFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read installed:', error);
    }
    return [];
  }

  async markInstalled(cap: InstalledCapability): Promise<void> {
    await this.ensureDir();

    const installed = await this.getInstalled();
    const existing = installed.findIndex(i => i.id === cap.id);

    if (existing >= 0) {
      installed[existing] = cap;
    } else {
      installed.push(cap);
    }

    await fs.writeFile(this.installedFile, JSON.stringify(installed, null, 2), 'utf-8');
  }

  async unmarkInstalled(capabilityId: string): Promise<void> {
    const installed = await this.getInstalled();
    const filtered = installed.filter(i => i.id !== capabilityId);
    await fs.writeFile(this.installedFile, JSON.stringify(filtered, null, 2), 'utf-8');
  }

  async updateSyncStatus(capabilityId: string, agents: string[]): Promise<void> {
    const installed = await this.getInstalled();
    const cap = installed.find(i => i.id === capabilityId);

    if (cap) {
      cap.syncedAgents = agents;
      await fs.writeFile(this.installedFile, JSON.stringify(installed, null, 2), 'utf-8');
    }
  }

  private async saveSubscriptions(subscriptions: Subscription[]): Promise<void> {
    await fs.writeFile(this.subscriptionsFile, JSON.stringify(subscriptions, null, 2), 'utf-8');
  }

  private getDefaultCapabilities(): Capability[] {
    return [
      {
        id: 'cap-rtl-review',
        name: 'rtl-review-copilot',
        displayName: 'RTL Review Copilot',
        description: 'AI-powered RTL code review for semiconductor design. Analyzes RTL code changes and provides insights on potential issues.',
        type: 'skill',
        version: 'v1.4.2',
        tags: ['rtl', 'review', 'semiconductor', 'eda'],
        category: { primary: 'EDA', secondary: 'RTL Review' },
        statistics: { downloads: 256, subscribers: 128, rating: 4.5, ratingCount: 64 },
        repository: 'https://github.com/example/rtl-review-copilot',
        author: 'SemiNexus Team'
      },
      {
        id: 'cap-spec-diff',
        name: 'spec-diff-explainer',
        displayName: 'Spec Diff Explainer',
        description: 'Automatically analyzes and explains specification changes. Helps understand what changed and why.',
        type: 'skill',
        version: 'v0.9.6',
        tags: ['spec', 'diff', 'analysis', 'documentation'],
        category: { primary: 'Design', secondary: 'Documentation' },
        statistics: { downloads: 189, subscribers: 89, rating: 4.8, ratingCount: 42 },
        repository: 'https://github.com/example/spec-diff-explainer',
        author: 'SemiNexus Team'
      },
      {
        id: 'cap-mcp-server',
        name: 'design-verification-mcp',
        displayName: 'Design Verification MCP',
        description: 'Model Context Protocol server for design verification workflows.',
        type: 'mcp',
        version: 'v1.0.0',
        tags: ['mcp', 'verification', 'design'],
        category: { primary: 'MCP', secondary: 'Verification' },
        statistics: { downloads: 156, subscribers: 78, rating: 4.2, ratingCount: 35 }
      },
      {
        id: 'cap-chip-agent',
        name: 'chip-design-agent',
        displayName: 'Chip Design Agent',
        description: 'AI agent specialized in chip design tasks. Assists with RTL generation and optimization.',
        type: 'agent',
        version: 'v0.5.0',
        tags: ['agent', 'chip', 'design', 'ai'],
        category: { primary: 'Agent', secondary: 'Design' },
        statistics: { downloads: 98, subscribers: 45, rating: 4.6, ratingCount: 22 }
      }
    ];
  }
}

export const registry = new LocalRegistry();