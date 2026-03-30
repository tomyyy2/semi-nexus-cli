import axios from 'axios';

const SERVER_URL = process.env.E2E_SERVER_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Test@Admin123';

export interface TestUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  token: string;
  refreshToken: string;
}

export interface TestServer {
  url: string;
  adminPassword: string;
}

class TestServerManagerImpl {
  private serverUrl: string;
  private adminPassword: string;
  private adminToken: string | null = null;
  private initialized = false;

  constructor() {
    this.serverUrl = SERVER_URL;
    this.adminPassword = ADMIN_PASSWORD;
  }

  async start(): Promise<{ url: string; port: number; dataDir: string; jwtSecret: string; adminPassword: string }> {
    if (this.initialized) {
      return this.getServerInfo();
    }

    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });
      if (response.data.status !== 'ok') {
        throw new Error('Server health check failed');
      }
      this.initialized = true;
    } catch (error) {
      throw new Error(`Server not available at ${this.serverUrl}. Please start the server first.`);
    }

    return this.getServerInfo();
  }

  private getServerInfo() {
    return {
      url: this.serverUrl,
      port: 3000,
      dataDir: '/tmp/test',
      jwtSecret: 'test',
      adminPassword: this.adminPassword
    };
  }

  async stop(): Promise<void> {
    this.adminToken = null;
    this.initialized = false;
  }

  async resetState(): Promise<void> {
    try {
      const token = await this.getAdminToken();
      await axios.post(`${this.serverUrl}/api/v1/admin/reset-test-state`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
    } catch {
      // Ignore reset errors - endpoint may not exist
    }
  }

  getServer(): { url: string; adminPassword: string } {
    return {
      url: this.serverUrl,
      adminPassword: this.adminPassword
    };
  }

  async createTestUser(role: 'admin' | 'user' = 'user'): Promise<TestUser> {
    const crypto = await import('crypto');
    const username = `test_${role}_${crypto.randomUUID().substring(0, 8)}`;
    const password = `Test@${crypto.randomUUID().substring(0, 8)}Pass`;

    const adminToken = await this.getAdminToken();

    const createResponse = await axios.post(`${this.serverUrl}/api/v1/admin/users`, {
      username,
      password,
      role
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
      timeout: 10000
    });

    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      username,
      password,
      authType: 'local'
    }, { timeout: 10000 });

    return {
      id: createResponse.data.id || `user_${username}`,
      username,
      password,
      role,
      token: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken
    };
  }

  private async getAdminToken(): Promise<string> {
    if (this.adminToken) {
      return this.adminToken;
    }
    
    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      username: 'admin',
      password: this.adminPassword,
      authType: 'local'
    }, { timeout: 10000 });
    
    this.adminToken = loginResponse.data.accessToken;
    return this.adminToken!;
  }

  async loginAdmin(): Promise<TestUser> {
    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      username: 'admin',
      password: this.adminPassword,
      authType: 'local'
    }, { timeout: 10000 });

    return {
      id: loginResponse.data.user?.id || 'admin',
      username: 'admin',
      password: this.adminPassword,
      role: 'admin',
      token: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken
    };
  }
}

export const testServer = new TestServerManagerImpl();
