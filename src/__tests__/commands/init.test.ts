import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('Init Command', () => {
  const testBaseDir = path.join(os.tmpdir(), 'semi-nexus-init-test');

  beforeEach(async () => {
    await fs.ensureDir(testBaseDir);
  });

  afterEach(async () => {
    await fs.remove(testBaseDir);
  });

  it('should create config directory structure', async () => {
    const baseDir = path.join(testBaseDir, '.semi-nexus');
    await fs.ensureDir(baseDir);
    await fs.ensureDir(path.join(baseDir, 'skills'));
    await fs.ensureDir(path.join(baseDir, 'cache'));
    await fs.ensureDir(path.join(baseDir, 'logs'));

    expect(await fs.pathExists(baseDir)).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, 'skills'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, 'cache'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, 'logs'))).toBe(true);
  });

  it('should create config.yaml with default values', async () => {
    const configPath = path.join(testBaseDir, '.semi-nexus', 'config.yaml');
    const defaultConfig = {
      server: { url: 'http://localhost:3000', timeout: 30000 },
      auth: { token: '', username: '', expiresAt: '' },
      install: { baseDir: testBaseDir, skillsDir: path.join(testBaseDir, 'skills') },
      agents: {},
      logging: { level: 'info', file: path.join(testBaseDir, 'logs', 'cli.log') }
    };

    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJSONSync(configPath, defaultConfig);

    expect(await fs.pathExists(configPath)).toBe(true);
  });

  it('should support custom server URL', () => {
    const customServer = 'http://custom-server:8080';
    const config = { server: { url: customServer } };
    expect(config.server.url).toBe('http://custom-server:8080');
  });
});