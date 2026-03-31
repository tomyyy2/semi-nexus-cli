import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import {
  User, ApiKey, Capability, CapabilityVersion, Subscription, AuditLog
} from '../types';
import { DatabaseAdapter, CapabilityQuery } from './adapter';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email TEXT,
  role TEXT CHECK(role IN ('admin', 'user')) NOT NULL,
  auth_type TEXT CHECK(auth_type IN ('local', 'ldap', 'ad')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'inactive', 'locked')) NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  status TEXT CHECK(status IN ('active', 'revoked')) NOT NULL,
  created_at TEXT NOT NULL,
  last_used TEXT,
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS capabilities (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT CHECK(type IN ('skill', 'mcp', 'agent')) NOT NULL,
  version TEXT NOT NULL,
  tags TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  repository TEXT,
  statistics TEXT NOT NULL,
  status TEXT CHECK(status IN ('draft', 'scanning', 'pending', 'approved', 'rejected')) NOT NULL,
  security_scan TEXT,
  compliance TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capability_versions (
  id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  version TEXT NOT NULL,
  snp_file TEXT NOT NULL,
  changelog TEXT,
  released_at TEXT NOT NULL,
  FOREIGN KEY (capability_id) REFERENCES capabilities(id) ON DELETE CASCADE,
  UNIQUE(capability_id, version)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'expired', 'cancelled')) NOT NULL,
  subscribed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (capability_id) REFERENCES capabilities(id) ON DELETE CASCADE,
  UNIQUE(user_id, capability_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  ip TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_capabilities_name ON capabilities(name);
CREATE INDEX IF NOT EXISTS idx_capabilities_status ON capabilities(status);
CREATE INDEX IF NOT EXISTS idx_capabilities_type ON capabilities(type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_capability ON subscriptions(capability_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp);
`;

export class SQLiteDatabase implements DatabaseAdapter {
  private db: Database.Database;
  private dbPath: string;

  constructor(dataDir: string) {
    this.dbPath = path.join(dataDir, 'semi-nexus.db');
    fs.ensureDirSync(dataDir);
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  initialize(): Promise<void> {
    this.db.exec(SCHEMA);
    return Promise.resolve();
  }

  close(): void {
    this.db.close();
  }

  private rowToUser(row: Record<string, any>): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      email: row.email,
      role: row.role,
      authType: row.auth_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
      apiKeys: []
    };
  }

  private rowToApiKey(row: Record<string, any>): ApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keyPrefix: row.key_prefix,
      keyHash: row.key_hash,
      status: row.status,
      createdAt: row.created_at,
      lastUsed: row.last_used,
      expiresAt: row.expires_at
    };
  }

  private rowToCapability(row: Record<string, any>): Capability {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      type: row.type,
      version: row.version,
      tags: JSON.parse(row.tags || '[]'),
      category: JSON.parse(row.category || '{}'),
      author: JSON.parse(row.author || '{}'),
      repository: row.repository,
      statistics: JSON.parse(row.statistics || '{}'),
      status: row.status,
      securityScan: row.security_scan ? JSON.parse(row.security_scan) : undefined,
      compliance: row.compliance ? JSON.parse(row.compliance) : undefined,
      versions: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private rowToSubscription(row: Record<string, any>): Subscription {
    return {
      id: row.id,
      userId: row.user_id,
      capabilityId: row.capability_id,
      version: row.version,
      status: row.status,
      subscribedAt: row.subscribed_at
    };
  }

  private rowToAuditLog(row: Record<string, any>): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details ? JSON.parse(row.details) : undefined,
      ip: row.ip,
      timestamp: row.timestamp
    };
  }

  async getUser(id: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!row) return null;
    
    const user = this.rowToUser(row);
    const apiKeys = this.db.prepare('SELECT * FROM api_keys WHERE user_id = ?').all(id);
    user.apiKeys = apiKeys.map(r => this.rowToApiKey(r));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row) return null;
    
    const user = this.rowToUser(row);
    const apiKeys = this.db.prepare('SELECT * FROM api_keys WHERE user_id = ?').all(user.id);
    user.apiKeys = apiKeys.map(r => this.rowToApiKey(r));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const rows = this.db.prepare('SELECT * FROM users').all();
    return rows.map(row => {
      const user = this.rowToUser(row);
      user.apiKeys = [];
      return user;
    });
  }

  async createUser(user: User): Promise<User> {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, password_hash, email, role, auth_type, status, created_at, updated_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.username,
      user.passwordHash || null,
      user.email || null,
      user.role,
      user.authType,
      user.status,
      user.createdAt,
      user.updatedAt || null,
      user.lastLogin || null
    );
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.passwordHash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updates.passwordHash);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.updatedAt !== undefined) {
      fields.push('updated_at = ?');
      values.push(updates.updatedAt);
    }
    if (updates.lastLogin !== undefined) {
      fields.push('last_login = ?');
      values.push(updates.lastLogin);
    }

    if (fields.length === 0) return this.getUser(id);

    values.push(id);
    this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getApiKey(keyHash: string): Promise<(ApiKey & { user: User }) | null> {
    const row = this.db.prepare(`
      SELECT ak.*, u.id as user_id, u.username, u.email, u.role, u.auth_type, u.status, u.created_at as user_created_at
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.key_hash = ?
    `).get(keyHash);
    
    if (!row) return null;
    
    const typedRow = row as {
      user_id: string;
      username: string;
      email: string | null;
      role: 'admin' | 'user';
      auth_type: 'local' | 'ldap' | 'ad';
      status: 'active' | 'inactive' | 'locked';
      user_created_at: string;
    };
    
    const apiKey = this.rowToApiKey(row);
    const user: User = {
      id: typedRow.user_id,
      username: typedRow.username,
      email: typedRow.email || undefined,
      role: typedRow.role,
      authType: typedRow.auth_type,
      status: typedRow.status,
      createdAt: typedRow.user_created_at,
      apiKeys: []
    };
    
    return { ...apiKey, user };
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    const rows = this.db.prepare('SELECT * FROM api_keys WHERE user_id = ?').all(userId);
    return rows.map(r => this.rowToApiKey(r));
  }

  async createApiKey(apiKey: ApiKey): Promise<ApiKey> {
    const stmt = this.db.prepare(`
      INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, status, created_at, last_used, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      apiKey.id,
      apiKey.userId,
      apiKey.name,
      apiKey.keyPrefix,
      apiKey.keyHash,
      apiKey.status,
      apiKey.createdAt,
      apiKey.lastUsed || null,
      apiKey.expiresAt || null
    );
    return apiKey;
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.lastUsed !== undefined) {
      fields.push('last_used = ?');
      values.push(updates.lastUsed);
    }

    if (fields.length === 0) {
      const row = this.db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id);
      return row ? this.rowToApiKey(row) : null;
    }

    values.push(id);
    this.db.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = this.db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id);
    return row ? this.rowToApiKey(row) : null;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getCapability(id: string): Promise<Capability | null> {
    const row = this.db.prepare('SELECT * FROM capabilities WHERE id = ?').get(id);
    if (!row) return null;
    
    const capability = this.rowToCapability(row);
    const versions = await this.getCapabilityVersions(id);
    capability.versions = versions;
    return capability;
  }

  async getCapabilityByName(name: string): Promise<Capability | null> {
    const row = this.db.prepare('SELECT * FROM capabilities WHERE name = ?').get(name);
    if (!row) return null;
    
    const capability = this.rowToCapability(row);
    const versions = await this.getCapabilityVersions(capability.id);
    capability.versions = versions;
    return capability;
  }

  async getCapabilities(query: CapabilityQuery): Promise<Capability[]> {
    let sql = 'SELECT * FROM capabilities WHERE 1=1';
    const params: unknown[] = [];

    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    } else {
      sql += " AND status = 'approved'";
    }

    if (query.query) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${query.query}%`;
      params.push(searchTerm, searchTerm);
    }

    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.tag) {
      sql += ' AND tags LIKE ?';
      params.push(`%"${query.tag}"%`);
    }

    sql += ' ORDER BY created_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => this.rowToCapability(r));
  }

  async getAllCapabilities(): Promise<Capability[]> {
    const rows = this.db.prepare('SELECT * FROM capabilities').all();
    return rows.map(r => this.rowToCapability(r));
  }

  async createCapability(capability: Capability): Promise<Capability> {
    const stmt = this.db.prepare(`
      INSERT INTO capabilities (id, name, display_name, description, type, version, tags, category, author, repository, statistics, status, security_scan, compliance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      capability.id,
      capability.name,
      capability.displayName,
      capability.description,
      capability.type,
      capability.version,
      JSON.stringify(capability.tags),
      JSON.stringify(capability.category),
      JSON.stringify(capability.author),
      capability.repository || null,
      JSON.stringify(capability.statistics),
      capability.status,
      capability.securityScan ? JSON.stringify(capability.securityScan) : null,
      capability.compliance ? JSON.stringify(capability.compliance) : null,
      capability.createdAt,
      capability.updatedAt
    );
    return capability;
  }

  async updateCapability(id: string, updates: Partial<Capability>): Promise<Capability | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMappings: Record<string, string> = {
      displayName: 'display_name',
      description: 'description',
      version: 'version',
      tags: 'tags',
      category: 'category',
      author: 'author',
      repository: 'repository',
      statistics: 'statistics',
      status: 'status',
      securityScan: 'security_scan',
      compliance: 'compliance',
      updatedAt: 'updated_at'
    };

    for (const [key, column] of Object.entries(fieldMappings)) {
      if (updates[key as keyof Capability] !== undefined) {
        fields.push(`${column} = ?`);
        const value = updates[key as keyof Capability];
        if (['tags', 'category', 'author', 'statistics', 'securityScan', 'compliance'].includes(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) return this.getCapability(id);

    values.push(id);
    this.db.prepare(`UPDATE capabilities SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getCapability(id);
  }

  async deleteCapability(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM capabilities WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getCapabilityVersions(capabilityId: string): Promise<CapabilityVersion[]> {
    const rows = this.db.prepare('SELECT * FROM capability_versions WHERE capability_id = ? ORDER BY released_at DESC').all(capabilityId);
    return rows.map((row: Record<string, unknown>) => ({
      version: row.version as string,
      snpFile: row.snp_file as string,
      changelog: row.changelog as string | undefined,
      releasedAt: row.released_at as string
    }));
  }

  async addCapabilityVersion(version: CapabilityVersion): Promise<CapabilityVersion> {
    const id = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO capability_versions (id, capability_id, version, snp_file, changelog, released_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, (version as { capabilityId?: string }).capabilityId, version.version, version.snpFile, version.changelog || null, version.releasedAt);
    return version;
  }

  async getSubscription(userId: string, capabilityId: string): Promise<Subscription | null> {
    const row = this.db.prepare(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND capability_id = ? AND status = 'active'
    `).get(userId, capabilityId);
    return row ? this.rowToSubscription(row) : null;
  }

  async getUserSubscriptions(userId: string): Promise<(Subscription & { capability?: Capability })[]> {
    const rows = this.db.prepare(`
      SELECT s.*, c.id as cap_id, c.name as cap_name, c.display_name, c.description, c.type
      FROM subscriptions s
      LEFT JOIN capabilities c ON s.capability_id = c.id
      WHERE s.user_id = ? AND s.status = 'active'
    `).all(userId);
    
    return rows.map((row: Record<string, unknown>) => {
      const sub = this.rowToSubscription(row as Record<string, any>);
      let capability: Capability | undefined;
      if (row.cap_id) {
        capability = {
          id: row.cap_id as string,
          name: row.cap_name as string,
          displayName: row.display_name as string,
          description: row.description as string,
          type: row.type as string,
          version: '',
          tags: [],
          category: { primary: '', secondary: '' },
          author: { name: '' },
          statistics: { downloads: 0, subscribers: 0, rating: 0, ratingCount: 0 },
          status: 'approved',
          versions: [],
          createdAt: '',
          updatedAt: ''
        };
      }
      return { ...sub, capability };
    });
  }

  async createSubscription(subscription: Subscription): Promise<Subscription> {
    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (id, user_id, capability_id, version, status, subscribed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      subscription.id,
      subscription.userId,
      subscription.capabilityId,
      subscription.version,
      subscription.status,
      subscription.subscribedAt
    );
    return subscription;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.version !== undefined) {
      fields.push('version = ?');
      values.push(updates.version);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (fields.length === 0) {
      const row = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
      return row ? this.rowToSubscription(row) : null;
    }

    values.push(id);
    this.db.prepare(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
    return row ? this.rowToSubscription(row) : null;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async createAuditLog(log: AuditLog): Promise<AuditLog> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, ip, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      log.id,
      log.userId || null,
      log.action,
      log.resource,
      log.resourceId || null,
      log.details ? JSON.stringify(log.details) : null,
      log.ip || null,
      log.timestamp
    );
    return log;
  }

  async getAuditLogs(options: { userId?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: unknown[] = [];

    if (options.userId) {
      sql += ' AND user_id = ?';
      params.push(options.userId);
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => this.rowToAuditLog(r));
  }

  async recordLoginAttempt(username: string, ip: string, success: boolean): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO login_attempts (username, ip, success, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(username, ip || null, success ? 1 : 0, new Date().toISOString());
  }

  async getRecentFailedAttempts(username: string, minutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE username = ? AND success = 0 AND timestamp > ?
    `).get(username, cutoff);
    return (row as { count?: number })?.count || 0;
  }

  async clearLoginAttempts(): Promise<void> {
    this.db.exec('DELETE FROM login_attempts');
  }

  async clearTestData(): Promise<void> {
    this.db.exec('DELETE FROM login_attempts');
    this.db.exec("DELETE FROM audit_logs WHERE user_id != (SELECT id FROM users WHERE username = 'admin')");
    this.db.exec("DELETE FROM subscriptions");
    this.db.exec("DELETE FROM capability_versions WHERE capability_id IN (SELECT id FROM capabilities WHERE name LIKE 'test-cap%')");
    this.db.exec("DELETE FROM capabilities WHERE name LIKE 'test-cap%'");
    this.db.exec("DELETE FROM api_keys WHERE name LIKE '%Test%' OR name LIKE '%Key%'");
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const begin = this.db.prepare('BEGIN TRANSACTION');
    const commit = this.db.prepare('COMMIT');
    const rollback = this.db.prepare('ROLLBACK');

    begin.run();
    try {
      const result = await fn();
      commit.run();
      return result;
    } catch (error) {
      rollback.run();
      throw error;
    }
  }
}
