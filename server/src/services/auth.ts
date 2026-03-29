import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import ldap from 'ldapjs';
import {
  User, ApiKey, TokenPayload, AuthToken, LdapConfig
} from '../types';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIRE_UPPERCASE = true;
const PASSWORD_REQUIRE_LOWERCASE = true;
const PASSWORD_REQUIRE_NUMBER = true;
const PASSWORD_REQUIRE_SPECIAL = true;

export class AuthService {
  private users: Map<string, User> = new Map();
  private ldapConfig: LdapConfig | null = null;
  private configPath: string;
  private jwtSecret: string;
  private jwtExpiresIn: number;
  private refreshTokenExpiresIn: number;
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000;

  constructor(
    dataDir: string = path.join(os.homedir(), '.semi-nexus', 'server'),
    jwtSecret: string = process.env.JWT_SECRET || '',
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

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }
    if (PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private checkLoginAttempts(username: string): boolean {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) return true;

    const now = new Date();
    if (now.getTime() - attempts.lastAttempt.getTime() > this.LOCKOUT_DURATION_MS) {
      this.loginAttempts.delete(username);
      return true;
    }

    return attempts.count < this.MAX_LOGIN_ATTEMPTS;
  }

  private recordLoginAttempt(username: string, success: boolean): void {
    if (success) {
      this.loginAttempts.delete(username);
      return;
    }

    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(username, attempts);
  }

  async login(
    username: string,
    password: string,
    authType: 'local' | 'ldap' | 'ad' = 'local'
  ): Promise<AuthToken> {
    if (!this.checkLoginAttempts(username)) {
      throw new Error('Account temporarily locked due to too many failed attempts. Please try again later.');
    }

    let user: User | undefined;

    if (authType === 'local') {
      user = Array.from(this.users.values()).find(
        u => u.username === username && u.authType === 'local'
      );
      if (!user || !user.passwordHash) {
        this.recordLoginAttempt(username, false);
        throw new Error('Invalid credentials');
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        this.recordLoginAttempt(username, false);
        throw new Error('Invalid credentials');
      }
      this.recordLoginAttempt(username, true);
    } else {
      user = Array.from(this.users.values()).find(
        u => u.username === username && u.authType === authType
      );
      if (!user) {
        user = await this.ldapAuth(username, password, authType);
        this.users.set(user.id, user);
        this.saveUsers();
      } else {
        await this.ldapAuth(username, password, authType);
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

    if (!this.ldapConfig.url) {
      throw new Error('LDAP server URL is not configured');
    }

    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.ldapConfig!.url,
        timeout: 10000,
        connectTimeout: 10000,
      });

      client.on('error', (err) => {
        reject(new Error(`LDAP connection error: ${err.message}`));
      });

      let userDn: string;
      if (this.ldapConfig!.userSearchFilter) {
        userDn = this.ldapConfig!.userSearchFilter.replace('{{username}}', username);
      } else {
        userDn = `uid=${username},${this.ldapConfig!.userSearchBase || this.ldapConfig!.baseDn}`;
      }

      const bindDn = this.ldapConfig!.bindDn || userDn;
      const bindPassword = this.ldapConfig!.bindPassword || password;

      client.bind(bindDn, bindPassword, (err) => {
        if (err) {
          client.destroy();
          if (this.ldapConfig!.bindDn) {
            const actualUserDn = userDn;
            client.bind(actualUserDn, password, (err2) => {
              if (err2) {
                client.destroy();
                reject(new Error('LDAP/AD authentication failed: Invalid credentials'));
                return;
              }
              this.searchAndCreateUser(client, username, authType, resolve, reject);
            });
          } else {
            reject(new Error('LDAP/AD authentication failed: Invalid credentials'));
          }
          return;
        }

        if (this.ldapConfig!.bindDn) {
          this.searchAndCreateUser(client, username, authType, resolve, reject);
        } else {
          this.createUserFromLdap(username, authType, resolve);
          client.destroy();
        }
      });
    });
  }

  private searchAndCreateUser(
    client: ldap.Client,
    username: string,
    authType: 'ldap' | 'ad',
    resolve: (user: User) => void,
    reject: (error: Error) => void
  ): void {
    const searchBase = this.ldapConfig!.userSearchBase || this.ldapConfig!.baseDn;
    const searchFilter = this.ldapConfig!.userSearchFilter?.replace('{{username}}', username) 
      || `(uid=${username})`;

    client.search(searchBase, { filter: searchFilter, scope: 'sub' }, (err, res) => {
      if (err) {
        client.destroy();
        reject(new Error(`LDAP search error: ${err.message}`));
        return;
      }

      let found = false;
      res.on('searchEntry', (entry) => {
        found = true;
        const email = entry.pojo.attributes.find(a => a.type === 'mail')?.values[0];
        const displayName = entry.pojo.attributes.find(a => a.type === 'cn')?.values[0] || username;
        
        const user: User = {
          id: `user_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
          username,
          email: email || `${username}@${authType}.local`,
          role: 'user',
          authType,
          createdAt: new Date().toISOString(),
          apiKeys: [],
          status: 'active'
        };
        
        client.destroy();
        resolve(user);
      });

      res.on('error', (err) => {
        client.destroy();
        reject(new Error(`LDAP search error: ${err.message}`));
      });

      res.on('end', () => {
        if (!found) {
          client.destroy();
          this.createUserFromLdap(username, authType, resolve);
        }
      });
    });
  }

  private createUserFromLdap(
    username: string,
    authType: 'ldap' | 'ad',
    resolve: (user: User) => void
  ): void {
    const user: User = {
      id: `user_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
      username,
      email: `${username}@${authType}.local`,
      role: 'user',
      authType,
      createdAt: new Date().toISOString(),
      apiKeys: [],
      status: 'active'
    };
    resolve(user);
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

  generateTokensForUser(userId: string): AuthToken {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.generateTokens(user);
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

    if (authType === 'local') {
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }
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

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user || user.authType !== 'local') {
      throw new Error('User not found or not a local user');
    }

    if (!user.passwordHash || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
      throw new Error('Invalid old password');
    }

    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    this.users.set(user.id, user);
    this.saveUsers();
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

  updateUserStatus(userId: string, status: 'active' | 'inactive' | 'locked'): void {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      user.updatedAt = new Date().toISOString();
      this.users.set(user.id, user);
      this.saveUsers();
    }
  }
}

export const authService = new AuthService();
