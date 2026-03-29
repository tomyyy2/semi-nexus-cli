import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface TestServer {
  url: string;
  port: number;
  process: ChildProcess | null;
  dataDir: string;
  jwtSecret: string;
  adminPassword: string;
}

export interface TestUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  token: string;
  refreshToken: string;
}

export class TestServerManager {
  private server: TestServer | null = null;
  private serverPath: string;

  constructor() {
    this.serverPath = path.join(__dirname, '../../../server');
  }

  async start(): Promise<TestServer> {
    if (this.server) {
      return this.server;
    }

    const port = 3000 + Math.floor(Math.random() * 1000);
    const dataDir = path.join(os.tmpdir(), `semi-nexus-test-${uuidv4()}`);
    const jwtSecret = `test-jwt-secret-${uuidv4()}`;
    const adminPassword = `Admin@${uuidv4().substring(0, 8)}`;

    await fs.ensureDir(dataDir);

    const env = {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      JWT_SECRET: jwtSecret,
      ADMIN_PASSWORD: adminPassword,
      SEMI_NEXUS_DATA_DIR: dataDir
    };

    const serverProcess = spawn('node', ['dist/index.js'], {
      cwd: this.serverPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.server = {
      url: `http://localhost:${port}`,
      port,
      process: serverProcess,
      dataDir,
      jwtSecret,
      adminPassword
    };

    await this.waitForReady();

    return this.server;
  }

  private async waitForReady(): Promise<void> {
    if (!this.server) throw new Error('Server not started');

    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`${this.server.url}/health`);
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Server failed to start within timeout');
  }

  async stop(): Promise<void> {
    if (!this.server) return;

    if (this.server.process) {
      this.server.process.kill('SIGTERM');
      await new Promise(resolve => {
        this.server!.process!.on('exit', resolve);
        setTimeout(resolve, 5000);
      });
    }

    if (this.server.dataDir) {
      await fs.remove(this.server.dataDir);
    }

    this.server = null;
  }

  getServer(): TestServer {
    if (!this.server) throw new Error('Server not started');
    return this.server;
  }

  async createTestUser(role: 'admin' | 'user' = 'user'): Promise<TestUser> {
    const server = this.getServer();
    const username = `test_${role}_${uuidv4().substring(0, 8)}`;
    const password = `Test@${uuidv4().substring(0, 8)}Pass`;

    await axios.post(`${server.url}/api/v1/admin/users`, {
      username,
      password,
      role
    }, {
      headers: { 'X-Admin-Password': server.adminPassword }
    });

    const loginResponse = await axios.post(`${server.url}/api/v1/auth/login`, {
      username,
      password,
      authType: 'local'
    });

    return {
      id: loginResponse.data.user.id,
      username,
      password,
      role,
      token: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken
    };
  }

  async loginAdmin(): Promise<TestUser> {
    const server = this.getServer();
    
    const loginResponse = await axios.post(`${server.url}/api/v1/auth/login`, {
      username: 'admin',
      password: server.adminPassword,
      authType: 'local'
    });

    return {
      id: 'admin',
      username: 'admin',
      password: server.adminPassword,
      role: 'admin',
      token: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken
    };
  }
}

export const testServer = new TestServerManager();
