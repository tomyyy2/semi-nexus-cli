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

export class TestServerManager {
  private serverUrl: string;
  private adminPassword: string;

  constructor() {
    this.serverUrl = SERVER_URL;
    this.adminPassword = ADMIN_PASSWORD;
  }

  async start(): Promise<{ url: string; port: number; dataDir: string; jwtSecret: string; adminPassword: string }> {
    try {
      const response = await axios.get(`${this.serverUrl}/health`);
      if (response.data.status !== 'ok') {
        throw new Error('Server health check failed');
      }
    } catch (error) {
      throw new Error(`Server not available at ${this.serverUrl}. Please start the server first.`);
    }

    return {
      url: this.serverUrl,
      port: 3000,
      dataDir: '/tmp/test',
      jwtSecret: 'test',
      adminPassword: this.adminPassword
    };
  }

  async stop(): Promise<void> {
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

    await axios.post(`${this.serverUrl}/api/v1/admin/users`, {
      username,
      password,
      role
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      username,
      password,
      authType: 'local'
    });

    return {
      id: loginResponse.data.user?.id || `user_${username}`,
      username,
      password,
      role,
      token: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken
    };
  }

  private async getAdminToken(): Promise<string> {
    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      username: 'admin',
      password: this.adminPassword,
      authType: 'local'
    });
    return loginResponse.data.accessToken;
  }

  async loginAdmin(): Promise<TestUser> {
    const loginResponse = await axios.post(`${this.serverUrl}/api/v1/auth/login`, {
      username: 'admin',
      password: this.adminPassword,
      authType: 'local'
    });

    return {
      id: 'admin',
      username: 'admin',
      password: this.adminPassword,
      role: 'admin',
      token: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken
    };
  }
}

export const testServer = new TestServerManager();
