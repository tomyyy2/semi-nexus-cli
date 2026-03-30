import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '../types';
import { getDatabase } from '../container';

class AuditService {
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

    try {
      const db = getDatabase();
      db.createAuditLog(entry).catch(err => {
        console.error('Failed to save audit log:', err);
      });
    } catch {
      console.error('Database not initialized for audit logging');
    }
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
    const db = getDatabase();
    const logs = await db.getAuditLogs({
      userId: options.userId,
      limit: options.limit || 100,
      offset: options.offset || 0
    });

    let results = logs;

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

    return results;
  }

  async getUserActivity(userId: string, days: number = 30): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const logs = await this.query({
      userId,
      startDate: startDate.toISOString()
    });

    return logs;
  }
}

export const auditService = new AuditService();
