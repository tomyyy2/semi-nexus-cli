import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { AuditLog } from '../types';

export class AuditService {
  private logs: AuditLog[] = [];
  private auditDir: string;

  constructor(dataDir: string = path.join(os.homedir(), '.semi-nexus', 'server', 'audit')) {
    this.auditDir = dataDir;
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.auditDir, `${today}.json`);

      if (await fs.pathExists(logFile)) {
        const data = await fs.readFile(logFile, 'utf-8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }

  private async save(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.auditDir, `${today}.json`);

    await fs.ensureDir(this.auditDir);
    await fs.writeFile(logFile, JSON.stringify(this.logs, null, 2), 'utf-8');
  }

  log(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ip?: string
  ): void {
    const entry: AuditLog = {
      id: `audit_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      userId,
      action,
      resource,
      resourceId,
      details,
      ip,
      timestamp: new Date().toISOString()
    };

    this.logs.push(entry);
    this.save();
  }

  async query(options: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLog[]> {
    await this.load();

    let results = [...this.logs];

    if (options.userId) {
      results = results.filter(l => l.userId === options.userId);
    }
    if (options.action) {
      results = results.filter(l => l.action === options.action);
    }
    if (options.resource) {
      results = results.filter(l => l.resource === options.resource);
    }
    if (options.startDate) {
      results = results.filter(l => l.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      results = results.filter(l => l.timestamp <= options.endDate!);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return results.slice(offset, offset + limit);
  }

  getUserActivity(userId: string, days: number = 30): AuditLog[] {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.logs.filter(
      l => l.userId === userId && new Date(l.timestamp) >= startDate
    );
  }
}

export const auditService = new AuditService();