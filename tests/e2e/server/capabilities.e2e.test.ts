import axios from 'axios';
import { testServer, TestUser } from '../setup/test-server';
import { testCapabilities, generateTestCapability } from '../setup/fixtures';

describe('Capabilities E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    server = testServer.getServer();
    adminUser = await testServer.loginAdmin();
    regularUser = await testServer.createTestUser('user');
  });

  describe('GET /api/v1/capabilities', () => {
    it('should list capabilities', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('capabilities');
      expect(Array.isArray(response.data.capabilities)).toBe(true);
    });

    it('should search capabilities by query', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities`, {
        params: { query: 'rtl' },
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should filter capabilities by type', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities`, {
        params: { type: 'skill' },
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
      const skills = response.data.capabilities.filter((c: any) => c.type !== 'skill');
      expect(skills.length).toBe(0);
    });

    it('should filter capabilities by tag', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities`, {
        params: { tag: 'rtl' },
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/admin/capabilities (Create)', () => {
    it('should create a new capability as admin', async () => {
      const capability = generateTestCapability();

      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(capability.name);
    });

    it('should fail to create capability as regular user', async () => {
      const capability = generateTestCapability();

      try {
        await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
          headers: { Authorization: `Bearer ${regularUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
      }
    });

    it('should fail with invalid capability data', async () => {
      try {
        await axios.post(`${server.url}/api/v1/admin/capabilities`, {
          name: 'test'
        }, {
          headers: { Authorization: `Bearer ${adminUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('GET /api/v1/capabilities/:id', () => {
    let testCapabilityId: string;

    beforeAll(async () => {
      const capability = generateTestCapability();
      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });
      testCapabilityId = response.data.id;
    });

    it('should get capability by ID', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities/${testCapabilityId}`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', testCapabilityId);
    });

    it('should get capability by name', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities/${testCapabilityId}`, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent capability', async () => {
      try {
        await axios.get(`${server.url}/api/v1/capabilities/cap_nonexistent`, {
          headers: { Authorization: `Bearer ${adminUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('POST /api/v1/capabilities/:id/subscribe', () => {
    let testCapabilityId: string;

    beforeAll(async () => {
      const capability = generateTestCapability();
      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });
      testCapabilityId = response.data.id;
    });

    it('should subscribe to a capability', async () => {
      const response = await axios.post(`${server.url}/api/v1/capabilities/${testCapabilityId}/subscribe`, {}, {
        headers: { Authorization: `Bearer ${regularUser.token}` }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('status', 'active');
    });

    it('should fail to subscribe to non-existent capability', async () => {
      try {
        await axios.post(`${server.url}/api/v1/capabilities/cap_nonexistent/subscribe`, {}, {
          headers: { Authorization: `Bearer ${regularUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /api/v1/capabilities/subscriptions', () => {
    it('should list user subscriptions', async () => {
      const response = await axios.get(`${server.url}/api/v1/capabilities/subscriptions`, {
        headers: { Authorization: `Bearer ${regularUser.token}` }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('DELETE /api/v1/capabilities/:id/subscribe', () => {
    let testCapabilityId: string;

    beforeAll(async () => {
      const capability = generateTestCapability();
      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });
      testCapabilityId = response.data.id;

      await axios.post(`${server.url}/api/v1/capabilities/${testCapabilityId}/subscribe`, {}, {
        headers: { Authorization: `Bearer ${regularUser.token}` }
      });
    });

    it('should unsubscribe from a capability', async () => {
      const response = await axios.delete(`${server.url}/api/v1/capabilities/${testCapabilityId}/subscribe`, {
        headers: { Authorization: `Bearer ${regularUser.token}` }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/capabilities/:id/rate', () => {
    let testCapabilityId: string;

    beforeAll(async () => {
      const capability = generateTestCapability();
      const response = await axios.post(`${server.url}/api/v1/admin/capabilities`, capability, {
        headers: { Authorization: `Bearer ${adminUser.token}` }
      });
      testCapabilityId = response.data.id;
    });

    it('should rate a capability', async () => {
      const response = await axios.post(`${server.url}/api/v1/capabilities/${testCapabilityId}/rate`, {
        rating: 5
      }, {
        headers: { Authorization: `Bearer ${regularUser.token}` }
      });

      expect(response.status).toBe(200);
    });

    it('should fail with invalid rating', async () => {
      try {
        await axios.post(`${server.url}/api/v1/capabilities/${testCapabilityId}/rate`, {
          rating: 6
        }, {
          headers: { Authorization: `Bearer ${regularUser.token}` }
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
