import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import CryptoJS from 'crypto-js';
import yaml from 'yaml';
import os from 'os';

export interface Config {
  server: { url: string; timeout: number };
  auth: { token: string; username: string; expiresAt: string };
  install: { baseDir: string; skillsDir: string; mcpDir: string; agentsDir: string; cacheDir: string };
  agents: { [key: string]: { enabled: boolean; installPath: string; syncMode: 'symlink' | 'copy' } };
  logging: { level: string; file: string };
}

export interface Capability {
  id: string; name: string; displayName: string; description: string;
  type: string; version: string; tags: string[];
  category: { primary: string; secondary: string };
  statistics: { downloads: number; subscribers: number; rating: number; ratingCount: number };
}

export class SemiNexusClient {
  private api: AxiosInstance;
  private configPath: string;
  private config: Config | null = null;

  constructor() {
    this.configPath = path.join(os.homedir(), '.semi-nexus', 'config.yaml');
    this.api = axios.create({ baseURL: 'http://localhost:3000/api/v1', timeout: 30000 });
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
      }
    } catch (error) {
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): Config {
    const baseDir = path.join(os.homedir(), '.semi-nexus');
    return {
      server: { url: 'http://localhost:3000', timeout: 30000 },
      auth: { token: '', username: '', expiresAt: '' },
      install: {
        baseDir, skillsDir: path.join(baseDir, 'skills'),
        mcpDir: path.join(baseDir, 'mcp'), agentsDir: path.join(baseDir, 'agents'),
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

  isAuthenticated(): boolean {
    const config = this.getConfig();
    if (!config.auth?.token || !config.auth?.expiresAt) return false;
    return new Date(config.auth.expiresAt) > new Date();
  }
}

export const client = new SemiNexusClient();