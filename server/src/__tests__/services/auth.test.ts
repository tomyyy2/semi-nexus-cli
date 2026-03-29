import { AuthService } from '../../services/auth';
import path from 'path';
import fs from 'fs-extra';

describe('AuthService', () => {
  const testDir = path.join(__dirname, '../../../__testdata__/auth');
  let authService: AuthService;

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.emptyDir(testDir);
  });

  beforeEach(() => {
    authService = new AuthService(testDir, 'test-secret', 3600, 604800);
  });

  afterEach(async () => {
    await fs.emptyDir(testDir);
  });

  describe('User Management', () => {
    it('should create a new user', async () => {
      const user = await authService.createUser('testuser', 'password123', 'user', 'local');
      expect(user.username).toBe('testuser');
      expect(user.role).toBe('user');
      expect(user.authType).toBe('local');
    });

    it('should create admin user', async () => {
      const user = await authService.createUser('admin', 'adminpass', 'admin', 'local');
      expect(user.role).toBe('admin');
    });

    it('should throw error for duplicate username', async () => {
      await authService.createUser('testuser', 'password123', 'user', 'local');
      await expect(authService.createUser('testuser', 'password456', 'user', 'local'))
        .rejects.toThrow('Username already exists');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      await authService.createUser('testuser', 'password123', 'user', 'local');
      const tokens = await authService.login('testuser', 'password123', 'local');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
    });

    it('should reject invalid password', async () => {
      await authService.createUser('testuser', 'password123', 'user', 'local');
      await expect(authService.login('testuser', 'wrongpassword', 'local'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      await expect(authService.login('nonexistent', 'password', 'local'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      await authService.createUser('testuser', 'password123', 'user', 'local');
      const tokens = await authService.login('testuser', 'password123', 'local');
      const payload = authService.verifyToken(tokens.accessToken);
      expect(payload.username).toBe('testuser');
      expect(payload.role).toBe('user');
    });

    it('should reject invalid token', () => {
      expect(() => authService.verifyToken('invalid-token'))
        .toThrow('Invalid or expired token');
    });
  });

  describe('API Key Management', () => {
    it('should create API key', async () => {
      const user = await authService.createUser('testuser', 'password123', 'user', 'local');
      const { apiKey, keyId } = await authService.createApiKey(user.id, 'My Workstation');
      expect(apiKey).toMatch(/^snx_/);
      expect(keyId).toMatch(/^key_/);
    });

    it('should list API keys', async () => {
      const user = await authService.createUser('testuser', 'password123', 'user', 'local');
      await authService.createApiKey(user.id, 'Key 1');
      await authService.createApiKey(user.id, 'Key 2');
      const keys = authService.listApiKeys(user.id);
      expect(keys).toHaveLength(2);
    });

    it('should revoke API key', async () => {
      const user = await authService.createUser('testuser', 'password123', 'user', 'local');
      const { keyId } = await authService.createApiKey(user.id, 'My Key');
      authService.revokeApiKey(user.id, keyId);
      const keys = authService.listApiKeys(user.id);
      expect(keys).toHaveLength(0);
    });

    it('should verify valid API key', async () => {
      const user = await authService.createUser('testuser', 'password123', 'user', 'local');
      const { apiKey } = await authService.createApiKey(user.id, 'My Key');
      const verifiedUser = authService.verifyApiKey(apiKey);
      expect(verifiedUser).toBeDefined();
      expect(verifiedUser!.username).toBe('testuser');
    });

    it('should return null for invalid API key', () => {
      const result = authService.verifyApiKey('snx_invalid_key');
      expect(result).toBeNull();
    });
  });
});