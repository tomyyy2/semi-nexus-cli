import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  User, ApiKey, TokenPayload, AuthToken, LdapConfig
} from '../types';

export class AuthService {
  private users: Map<string, User> = new Map();
  private ldapConfig: LdapConfig | null = null;
  private configPath: string;
  private jwtSecret: string;
  private jwtExpiresIn: number;
  private refreshTokenExpiresIn: number;

  constructor(
    dataDir: string = path.join(os.homedir(), '.semi-nexus', 'server'),
    jwtSecret: string = process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: number = 3600,
    refreshTokenExpiresIn: number = 604800
  ) {
    this.configPath = path.join(dataDir, 'users.json');
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.refreshTokenExpiresIn = refreshTokenExpiresIn;
    this.loadUsers();
  }

  private loadUsers(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const users: User[] = JSON.parse(data);
        users.forEach(u => this.users.set(u.id, u));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  private saveUsers(): void {
    const users = Array.from(this.users.values());
    fs.ensureDirSync(path.dirname(this.configPath));
    fs.writeFileSync(this.configPath, JSON.stringify(users, null, 2), 'utf-8');
  }

  configureLdap(config: LdapConfig): void {
    this.ldapConfig = config;
  }

  async login(
    username: string,
    password: string,
    authType: 'local' | 'ldap' | 'ad' = 'local'
  ): Promise<AuthToken> {
    let user: User | undefined;

    if (authType === 'local') {
      user = Array.from(this.users.values()).find(
        u => u.username === username && u.authType === 'local'
      );
      if (!user || !user.passwordHash) {
        throw new Error('Invalid credentials');
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new Error('Invalid credentials');
      }
    } else {
      user = Array.from(this.users.values()).find(
        u => u.username === username && u.authType === authType
      );
      if (!user) {
        user = await this.ldapAuth(username, password, authType);
        this.users.set(user.id, user);
        this.saveUsers();
      }
    }

    user.lastLogin = new Date().toISOString();
    this.users.set(user.id, user);
    this.saveUsers();

    return this.generateTokens(user);
  }

  private async ldapAuth(
    username: string,
    password: string,
    authType: 'ldap' | 'ad'
  ): Promise<User> {
    if (!this.ldapConfig || !this.ldapConfig.enabled) {
      throw new Error('LDAP/AD is not configured');
    }

    try {
      return {
        id: `user_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
        username,
        email: `${username}@${authType}.local`,
        role: 'user',
        authType,
        createdAt: new Date().toISOString(),
        apiKeys: [],
        status: 'active'
      };
    } catch (error) {
      throw new Error('LDAP/AD authentication failed');
    }
  }

  private generateTokens(user: User): AuthToken {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      type: 'access'
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });

    const refreshPayload: TokenPayload = {
      ...payload,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(refreshPayload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiresIn
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtExpiresIn
    };
  }

  verifyToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return payload;
    } catch {
      throw new Error('Invalid or expired token');
    }
  }

  async createUser(
    username: string,
    password: string,
    role: 'admin' | 'user' = 'user',
    authType: 'local' | 'ldap' | 'ad' = 'local'
  ): Promise<User> {
    const existing = Array.from(this.users.values()).find(
      u => u.username === username
    );
    if (existing) {
      throw new Error('Username already exists');
    }

    const user: User = {
      id: `user_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      username,
      role,
      authType,
      createdAt: new Date().toISOString(),
      apiKeys: [],
      status: 'active'
    };

    if (authType === 'local' && password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    this.users.set(user.id, user);
    this.saveUsers();
    return user;
  }

  async createApiKey(
    userId: string,
    name: string,
    expiresIn?: number
  ): Promise<{ apiKey: string; keyId: string }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const keyId = `key_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const rawKey = `snx_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey: ApiKey = {
      id: keyId,
      keyPrefix,
      keyHash,
      name,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : undefined,
      status: 'active'
    };

    user.apiKeys.push(apiKey);
    this.users.set(user.id, user);
    this.saveUsers();

    return { apiKey: rawKey, keyId };
  }

  verifyApiKey(rawKey: string): User | null {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    for (const user of this.users.values()) {
      const apiKey = user.apiKeys.find(
        k => k.keyHash === keyHash && k.status === 'active'
      );
      if (apiKey) {
        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
          return null;
        }
        apiKey.lastUsed = new Date().toISOString();
        this.saveUsers();
        return user;
      }
    }
    return null;
  }

  listApiKeys(userId: string): ApiKey[] {
    const user = this.users.get(userId);
    if (!user) return [];
    return user.apiKeys.filter(k => k.status === 'active');
  }

  revokeApiKey(userId: string, keyId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    const apiKey = user.apiKeys.find(k => k.id === keyId);
    if (apiKey) {
      apiKey.status = 'revoked';
      this.saveUsers();
    }
  }

  getUser(userId: string): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const { passwordHash, ...safeUser } = user;
    return safeUser as User;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values()).map(({ passwordHash, ...user }) => user) as User[];
  }

  isAdmin(userId: string): boolean {
    const user = this.users.get(userId);
    return user?.role === 'admin';
  }
}

export const authService = new AuthService();