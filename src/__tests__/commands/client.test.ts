import { SemiNexusClient, Config } from '../../api/client';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('Client', () => {
  const testBaseDir = path.join(os.tmpdir(), 'semi-nexus-cli-test');
  let client: SemiNexusClient;

  const defaultConfig: Config = {
    server: { url: 'http://localhost:3000', timeout: 30000 },
    auth: { token: '', username: '', expiresAt: '' },
    install: {
      baseDir: path.join(testBaseDir, '.semi-nexus'),
      skillsDir: path.join(testBaseDir, '.semi-nexus', 'skills'),
      mcpDir: path.join(testBaseDir, '.semi-nexus', 'mcp'),
      agentsDir: path.join(testBaseDir, '.semi-nexus', 'agents'),
      cacheDir: path.join(testBaseDir, '.semi-nexus', 'cache'),
    },
    agents: {},
    logging: { level: 'info', file: path.join(testBaseDir, '.semi-nexus', 'logs', 'cli.log') },
  };

  beforeEach(async () => {
    await fs.ensureDir(testBaseDir);
    client = new SemiNexusClient();
    client.saveConfig(defaultConfig);
  });

  afterEach(async () => {
    await fs.remove(testBaseDir);
  });

  describe('Configuration', () => {
    it('should have default config values', () => {
      const config = client.getConfig();
      expect(config.server.url).toBe('http://localhost:3000');
    });

    it('should get install directory', () => {
      const installDir = client.getInstallDir();
      expect(installDir).toContain('.semi-nexus');
    });

    it('should get skills directory', () => {
      const skillsDir = client.getSkillsDir();
      expect(skillsDir).toContain('skills');
    });

    it('should get cache directory', () => {
      const cacheDir = client.getCacheDir();
      expect(cacheDir).toContain('cache');
    });
  });

  describe('Authentication', () => {
    it('should report not authenticated initially', () => {
      expect(client.isAuthenticated()).toBe(false);
    });
  });
});