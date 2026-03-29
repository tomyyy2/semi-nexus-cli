import axios from 'axios';
import { testServer, TestUser } from '../setup/test-server';

describe('Authentication E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;
  let adminUser: TestUser;

  beforeAll(async () => {
    server = testServer.getServer();
    adminUser = await testServer.loginAdmin();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid admin credentials', async () => {
      const response = await axios.post(`${server.url}/api/v1/auth/login`, {
        username: 'admin',
        password: server.adminPassword,
        authType: 'local'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('tokenType', 'Bearer');
      expect(response.data).toHaveProperty('expiresIn');
    });

    it('should fail with invalid password', async () => {
      try {
        await axios.post(`${server.url}/api/v1/auth/login`, {
          username: 'admin',
          password: 'WrongPassword123!',
          authType: 'local'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    it('should fail with non-existent user', async () => {
      try {
        await axios.post(`${server.url}/api/v1/auth/login`, {
          username: 'nonexistent_user',
          password: 'SomePassword123!',
          authType: 'local'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should fail with missing fields', async () => {
      try {
        await axios.post(`${server.url}/api/v1/auth/login`, {
          username: 'admin'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const loginResponse = await axios.post(`${server.url}/api/v1/auth/login`, {
        username: 'admin',
        password: server.adminPassword,
        authType: 'local'
      });

      const response = await axios.post(`${server.url}/api/v1/auth/refresh`, {
        refreshToken: loginResponse.data.refreshToken
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      try {
        await axios.post(`${server.url}/api/v1/auth/refresh`, {
          refreshToken: 'invalid-refresh-token'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const response = await axios.get(`${server.url}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('username', 'admin');
      expect(response.data).toHaveProperty('role', 'admin');
    });

    it('should fail without token', async () => {
      try {
        await axios.get(`${server.url}/api/v1/auth/me`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it('should fail with invalid token', async () => {
      try {
        await axios.get(`${server.url}/api/v1/auth/me`, {
          headers: { Authorization: 'Bearer invalid-token' }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('User Registration (Admin)', () => {
    it('should create a new user with valid data', async () => {
      const crypto = await import('crypto');
      const username = `testuser_${crypto.randomUUID().substring(0, 8)}`;
      const password = 'Test@Pass123';

      const response = await axios.post(`${server.url}/api/v1/admin/users`, {
        username,
        password,
        role: 'user'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('username', username);
      expect(response.data).toHaveProperty('role', 'user');
    });

    it('should fail with weak password', async () => {
      const crypto = await import('crypto');
      const username = `testuser_${crypto.randomUUID().substring(0, 8)}`;

      try {
        await axios.post(`${server.url}/api/v1/admin/users`, {
          username,
          password: 'weak',
          role: 'user'
        }, {
          headers: { Authorization: `Bearer ${adminUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('API Key Authentication', () => {
    it('should create API key for user', async () => {
      const response = await axios.post(`${server.url}/api/v1/auth/api-keys`, {
        name: 'Test API Key'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('apiKey');
      expect(response.data).toHaveProperty('keyId');
      expect(response.data.apiKey).toMatch(/^snx_/);
    });

    it('should authenticate with valid API key', async () => {
      const createResponse = await axios.post(`${server.url}/api/v1/auth/api-keys`, {
        name: 'Test API Key for Auth'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      const apiKey = createResponse.data.apiKey;

      const response = await axios.get(`${server.url}/api/v1/auth/me`, {
        headers: { 'X-API-Key': apiKey }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('username', 'admin');
    });

    it('should fail with invalid API key', async () => {
      try {
        await axios.get(`${server.url}/api/v1/auth/me`, {
          headers: { 'X-API-Key': 'snx_invalid_key' }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });
  });
});
