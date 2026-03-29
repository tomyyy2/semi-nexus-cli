import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { authService } from './services/auth';
import { ServerConfig } from './types';
import authRoutes from './routes/auth';
import capabilityRoutes from './routes/capabilities';
import adminRoutes from './routes/admin';

const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  host: '0.0.0.0',
  dataDir: path.join(os.homedir(), '.semi-nexus', 'server'),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: 3600,
  refreshTokenExpiresIn: 604800,
  ldap: {
    url: '',
    baseDn: '',
    userSearchBase: '',
    userSearchFilter: '(uid={{username}})',
    syncInterval: 3600,
    enabled: false
  },
  registry: {
    maxPackageSize: 100 * 1024 * 1024,
    allowedTypes: ['skill', 'mcp', 'agent']
  }
};

class Server {
  private app: express.Application;
  private config: ServerConfig;
  private dataDir: string;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataDir = this.config.dataDir;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.ensureDataDir();
    this.createDefaultAdmin();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  private setupRoutes(): void {
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/capabilities', capabilityRoutes);
    this.app.use('/api/v1/admin', adminRoutes);

    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.get('/', (req, res) => {
      res.json({
        name: 'SemiNexus Server',
        version: '0.1.0',
        status: 'running'
      });
    });
  }

  private ensureDataDir(): void {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'users'),
      path.join(this.dataDir, 'registry'),
      path.join(this.dataDir, 'registry', 'packages'),
      path.join(this.dataDir, 'audit'),
      path.join(this.dataDir, 'scanner', 'cache')
    ];

    dirs.forEach(dir => fs.ensureDirSync(dir));
  }

  private async createDefaultAdmin(): Promise<void> {
    try {
      const adminExists = Array.from((authService as any).users.values())
        .some((u: any) => u.role === 'admin');

      if (!adminExists) {
        await authService.createUser('admin', 'admin123', 'admin', 'local');
        console.log(chalk.green('✓ Default admin user created:'));
        console.log(chalk.cyan('  Username: admin'));
        console.log(chalk.cyan('  Password: admin123'));
        console.log(chalk.yellow('  Please change the password after first login!'));
      }
    } catch (error) {
      console.error('Failed to create default admin:', error);
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, this.config.host, () => {
        console.log(chalk.bold('\n╔════════════════════════════════════════════╗'));
        console.log(chalk.bold('║         SemiNexus Server                  ║'));
        console.log(chalk.bold('╠════════════════════════════════════════════╣'));
        console.log(chalk.green(`║  Server: http://${this.config.host}:${this.config.port}`));
        console.log(chalk.green(`║  Data:   ${this.dataDir}`));
        console.log(chalk.bold('╚════════════════════════════════════════════╝\n'));
        resolve();
      });
    });
  }
}

async function main(): Promise<void> {
  const server = new Server();
  await server.start();
}

main().catch(console.error);

export { Server };