import axios, { AxiosInstance, AxiosError } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import os from 'os';

export interface Config {
  server: { url: string; timeout: number };
  auth: { token: string; refreshToken: string; username: string; expiresAt: string };
  install: { baseDir: string; skillsDir: string; mcpDir: string; agentsDir: string; cacheDir: string };
  agents: { [key: string]: { enabled: boolean; installPath: string; syncMode: 'symlink' | 'copy' } };
  logging: { level: string; file: string };
}

export interface Capability {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: string;
  version: string;
  tags: string[];
  category: { primary: string; secondary: string };
  statistics: { downloads: number; subscribers: number; rating: number; ratingCount: number };
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface InstalledCapability {
  id: string;
  name: string;
  version: string;
  installedAt: string;
  installPath: string;
  syncedAgents: string[];
}

export class SemiNexusClient {
  private api: AxiosInstance;
  private configPath: string;
  private config: Config | null = null;

  constructor() {
    this.configPath = path.join(os.homedir(), '.semi-nexus', 'config.yaml');
    this.api = axios.create({
      baseURL: 'http://localhost:3000/api/v1',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use((config) => {
      if (this.config?.auth?.token) {
        config.headers.Authorization = `Bearer ${this.config.auth.token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as { _retry?: boolean } & Record<string, unknown>;
        if (error.response?.status === 401 && !originalRequest._retry && this.config?.auth?.refreshToken) {
          originalRequest._retry = true;
          try {
            const tokens = await this.refreshToken(this.config.auth.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.clearAuth();
            throw new Error('Session expired. Please login again.');
          }
        }
        throw error;
      }
    );
  }

  public getConfig(): Config {
    if (!this.config) this.loadConfig();
    return this.config!;
  }

  loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        this.config = yaml.parse(content);
        if (this.config?.server?.url) {
          this.api.defaults.baseURL = `${this.config.server.url}/api/v1`;
        }
      }
    } catch (error) {
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): Config {
    const baseDir = path.join(os.homedir(), '.semi-nexus');
    return {
      server: { url: 'http://localhost:3000', timeout: 30000 },
      auth: { token: '', refreshToken: '', username: '', expiresAt: '' },
      install: {
        baseDir,
        skillsDir: path.join(baseDir, 'skills'),
        mcpDir: path.join(baseDir, 'mcp'),
        agentsDir: path.join(baseDir, 'agents'),
        cacheDir: path.join(baseDir, 'cache')
      },
      agents: {},
      logging: { level: 'info', file: path.join(baseDir, 'logs', 'cli.log') }
    };
  }

  saveConfig(config: Config): void {
    const dir = path.dirname(this.configPath);
    fs.ensureDirSync(dir);
    fs.writeFileSync(this.configPath, yaml.stringify(config), 'utf-8');
    this.config = config;
    if (config.server?.url) {
      this.api.defaults.baseURL = `${config.server.url}/api/v1`;
    }
  }

  setServerUrl(url: string): void {
    const config = this.getConfig();
    config.server.url = url;
    this.saveConfig(config);
    this.api.defaults.baseURL = `${url}/api/v1`;
  }

  setAuth(tokens: AuthToken, username: string): void {
    const config = this.getConfig();
    config.auth = {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      username,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    };
    this.saveConfig(config);
  }

  clearAuth(): void {
    const config = this.getConfig();
    config.auth = { token: '', refreshToken: '', username: '', expiresAt: '' };
    this.saveConfig(config);
  }

  isAuthenticated(): boolean {
    const config = this.getConfig();
    if (!config.auth?.token || !config.auth?.expiresAt) return false;
    return new Date(config.auth.expiresAt) > new Date();
  }

  getInstallDir(): string {
    return this.getConfig().install?.baseDir || path.join(os.homedir(), '.semi-nexus');
  }

  getSkillsDir(): string {
    return this.getConfig().install?.skillsDir || path.join(os.homedir(), '.semi-nexus', 'skills');
  }

  getCacheDir(): string {
    return this.getConfig().install?.cacheDir || path.join(os.homedir(), '.semi-nexus', 'cache');
  }

  async login(username: string, password: string, authType: string = 'local'): Promise<AuthToken> {
    const response = await this.api.post('/auth/login', { username, password, authType });
    const tokens: AuthToken = response.data;
    this.setAuth(tokens, username);
    return tokens;
  }

  async loginWithApiKey(apiKey: string): Promise<void> {
    const response = await this.api.get('/auth/me', {
      headers: { 'X-API-Key': apiKey }
    });
    const user = response.data;
    const config = this.getConfig();
    config.auth = {
      token: apiKey,
      refreshToken: '',
      username: user.username,
      expiresAt: ''
    };
    this.saveConfig(config);
  }

  async refreshToken(refreshToken: string): Promise<AuthToken> {
    const response = await this.api.post('/auth/refresh', { refreshToken });
    const tokens: AuthToken = response.data;
    const config = this.getConfig();
    config.auth.token = tokens.accessToken;
    config.auth.refreshToken = tokens.refreshToken;
    config.auth.expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    this.saveConfig(config);
    return tokens;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch {
      // Ignore logout errors - client-side cleanup is sufficient
    }
    this.clearAuth();
  }

  async searchCapabilities(query: string, options: { type?: string; tag?: string } = {}): Promise<Capability[]> {
    const params: Record<string, string> = { query };
    if (options.type) params.type = options.type;
    if (options.tag) params.tag = options.tag;
    
    const response = await this.api.get('/capabilities', { params });
    return response.data.capabilities || [];
  }

  async getCapability(idOrName: string): Promise<Capability | null> {
    try {
      const response = await this.api.get(`/capabilities/${idOrName}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async subscribeCapability(capabilityId: string, version?: string): Promise<{ id: string; capabilityId: string; version: string; status: string; subscribedAt: string; expiresAt?: string }> {
    const response = await this.api.post(`/capabilities/${capabilityId}/subscribe`, { version });
    return response.data;
  }

  async unsubscribeCapability(capabilityId: string): Promise<void> {
    await this.api.delete(`/capabilities/${capabilityId}/subscribe`);
  }

  async downloadCapability(capabilityId: string, version?: string): Promise<Buffer> {
    const params = version ? { version } : {};
    const response = await this.api.get(`/capabilities/${capabilityId}/download`, { 
      params,
      responseType: 'arraybuffer'
    });
    return response.data as Buffer;
  }

  async getSubscriptions(): Promise<Array<{ id: string; capabilityId: string; version: string; status: string; subscribedAt: string; expiresAt?: string; capability?: Capability }>> {
    const response = await this.api.get('/capabilities/subscriptions');
    return response.data;
  }

  async getStatus(): Promise<{ server: string; connected: boolean; user?: string }> {
    const config = this.getConfig();
    try {
      await this.api.get('/health');
      return {
        server: config.server.url,
        connected: true,
        user: config.auth.username || undefined
      };
    } catch (error) {
      return {
        server: config.server.url,
        connected: false,
        user: config.auth.username || undefined
      };
    }
  }

  async getCurrentUser(): Promise<{ id: string; username: string; email?: string; role: string }> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }
}

export const client = new SemiNexusClient();
