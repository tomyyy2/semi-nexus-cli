import axios from 'axios';
import { testServer, TestUser } from '../setup/test-server';
import { generateTestCapability, generateTestUsername, generateTestPassword } from '../setup/fixtures';

describe('Admin E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    server = testServer.getServer();
    adminUser = await testServer.loginAdmin();
    regularUser = await testServer.createTestUser('user');
  });

  describe('User Management', () => {
    it('should list all users as admin', async () => {
      const response = await axios.get(`${server.url}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should fail to list users as regular user', async () => {
      try {
        await axios.get(`${server.url}/api/v1/admin/users`, {
          headers: { Authorization: `Bearer ${regularUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });

    it('should create a new user', async () => {
      const username = generateTestUsername();
      const password = generateTestPassword();

      const response = await axios.post(`${server.url}/api/v1/admin/users`, {
        username,
        password,
        role: 'user'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.username).toBe(username);
    });

    it('should update user role', async () => {
      const username = generateTestUsername();
      const password = generateTestPassword();

      const createResponse = await axios.post(`${server.url}/api/v1/admin/users`, {
        username,
        password,
        role: 'user'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      const userId = createResponse.data.id;

      const response = await axios.put(`${server.url}/api/v1/admin/users/${userId}`, {
        role: 'admin'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should disable a user', async () => {
      const username = generateTestUsername();
      const password = generateTestPassword();

      const createResponse = await axios.post(`${server.url}/api/v1/admin/users`, {
        username,
        password,
        role: 'user'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      const userId = createResponse.data.id;

      const response = await axios.put(`${server.url}/api/v1/admin/users/${userId}/status`, {
        status: 'inactive'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Capability Management', () => {
    it('should create capability', async () => {
      const capability = generateTestCapability();

      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(201);
    });

    it('should update capability', async () => {
      const capability = generateTestCapability();

      const createResponse = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      const capabilityId = createResponse.data.id;

      const response = await axios.put(`${server.url}/api/v1/admin/capabilities/${capabilityId}`, {
        description: 'Updated description for the capability that meets minimum length requirement.'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should delete capability', async () => {
      const capability = generateTestCapability();

      const createResponse = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      const capabilityId = createResponse.data.id;

      const response = await axios.delete(`${server.url}/api/v1/admin/capabilities/${capabilityId}`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Security Scanning', () => {
    let testCapabilityId: string;

    beforeAll(async () => {
      const capability = generateTestCapability();
      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });
      testCapabilityId = response.data.id;
    });

    it('should initiate security scan', async () => {
      const response = await axios.post(`${server.url}/api/v1/admin/scan/${testCapabilityId}`, {}, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should get scan results', async () => {
      const response = await axios.get(`${server.url}/api/v1/admin/scan/${testCapabilityId}`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Audit Logs', () => {
    it('should get audit logs', async () => {
      const response = await axios.get(`${server.url}/api/v1/admin/audit`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should filter audit logs by user', async () => {
      const response = await axios.get(`${server.url}/api/v1/admin/audit`, {
        params: { userId: adminUser.id },
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should filter audit logs by action', async () => {
      const response = await axios.get(`${server.url}/api/v1/admin/audit`, {
        params: { action: 'login' },
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should filter audit logs by date range', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const response = await axios.get(`${server.url}/api/v1/admin/audit`, {
        params: {
          startDate: start,
          endDate: now.toISOString()
        },
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('API Key Management', () => {
    it('should create API key for another user', async () => {
      const response = await axios.post(`${server.url}/api/v1/admin/users/${regularUser.id}/api-keys`, {
        name: 'Admin Created Key'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('apiKey');
    });

    it('should list API keys for user', async () => {
      const response = await axios.get(`${server.url}/api/v1/admin/users/${regularUser.id}/api-keys`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should revoke API key', async () => {
      const createResponse = await axios.post(`${server.url}/api/v1/admin/users/${regularUser.id}/api-keys`, {
        name: 'Key to Revoke'
      }, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      const keyId = createResponse.data.keyId;

      const response = await axios.delete(`${server.url}/api/v1/admin/users/${regularUser.id}/api-keys/${keyId}`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });
});
