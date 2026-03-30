import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import ldap from 'ldapjs';
import {
  User, ApiKey, TokenPayload, AuthToken, LdapConfig
} from '../types';
import { DatabaseAdapter } from '../database';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIRE_UPPERCASE = true;
const PASSWORD_REQUIRE_LOWERCASE = true;
const PASSWORD_REQUIRE_NUMBER = true;
const PASSWORD_REQUIRE_SPECIAL = true;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  private db: DatabaseAdapter;
  private ldapConfig: LdapConfig | null = null;
  private jwtSecret: string;
  private jwtExpiresIn: number;
  private refreshTokenExpiresIn: number;

  constructor(
    db: DatabaseAdapter,
    jwtSecret: string = process.env.JWT_SECRET || '',
    jwtExpiresIn: number = 3600,
    refreshTokenExpiresIn: number = 604800
  ) {
    this.db = db;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
    this.refreshTokenExpiresIn = refreshTokenExpiresIn;
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

  private async checkLoginAttempts(username: string): Promise<boolean> {
    const failedAttempts = await this.db.getRecentFailedAttempts(username, LOCKOUT_DURATION_MINUTES);
    return failedAttempts < MAX_LOGIN_ATTEMPTS;
  }

  private async recordLoginAttempt(username: string, ip: string, success: boolean): Promise<void> {
    await this.db.recordLoginAttempt(username, ip, success);
  }

  async login(
    username: string,
    password: string,
    authType: 'local' | 'ldap' | 'ad' = 'local',
    ip?: string
  ): Promise<AuthToken> {
    if (!(await this.checkLoginAttempts(username))) {
      throw new Error('Account temporarily locked due to too many failed attempts. Please try again later.');
    }

    let user: User | null;

    if (authType === 'local') {
      user = await this.db.getUserByUsername(username);
      if (!user || user.authType !== 'local' || !user.passwordHash) {
        await this.recordLoginAttempt(username, ip || '', false);
        throw new Error('Invalid credentials');
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        await this.recordLoginAttempt(username, ip || '', false);
        throw new Error('Invalid credentials');
      }
      await this.recordLoginAttempt(username, ip || '', true);
    } else {
      user = await this.db.getUserByUsername(username);
      if (!user || user.authType !== authType) {
        user = await this.ldapAuth(username, password, authType);
        await this.db.createUser(user);
      } else {
        await this.ldapAuth(username, password, authType);
      }
    }

    user.lastLogin = new Date().toISOString();
    await this.db.updateUser(user.id, { lastLogin: user.lastLogin });

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

  async generateTokensForUser(userId: string): Promise<AuthToken> {
    const user = await this.db.getUser(userId);
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
    const existing = await this.db.getUserByUsername(username);
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

    await this.db.createUser(user);
    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.db.getUser(userId);
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
    await this.db.updateUser(userId, { 
      passwordHash: user.passwordHash, 
      updatedAt: user.updatedAt 
    });
  }

  async createApiKey(
    userId: string,
    name: string,
    expiresIn?: number
  ): Promise<{ apiKey: string; keyId: string }> {
    const user = await this.db.getUser(userId);
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

    await this.db.createApiKey(apiKey);

    return { apiKey: rawKey, keyId };
  }

  async verifyApiKey(rawKey: string): Promise<User | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const result = await this.db.getApiKey(keyHash);

    if (!result) return null;

    const { user, ...apiKey } = result;

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return null;
    }

    await this.db.updateApiKey(apiKey.id, { lastUsed: new Date().toISOString() });
    
    const fullUser = await this.db.getUser(user.id);
    return fullUser;
  }

  async listApiKeys(userId: string): Promise<ApiKey[]> {
    const keys = await this.db.getApiKeysByUser(userId);
    return keys.filter(k => k.status === 'active');
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    await this.db.updateApiKey(keyId, { status: 'revoked' });
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = await this.db.getUser(userId);
    if (!user) return undefined;
    const { passwordHash, ...safeUser } = user;
    return safeUser as User;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.db.getAllUsers();
    return users.map(({ passwordHash, ...user }) => user) as User[];
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.db.getUser(userId);
    return user?.role === 'admin';
  }

  async updateUserStatus(userId: string, status: 'active' | 'inactive' | 'locked'): Promise<void> {
    await this.db.updateUser(userId, { 
      status, 
      updatedAt: new Date().toISOString() 
    });
  }
}
