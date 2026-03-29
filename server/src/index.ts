import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import crypto from 'crypto';
import { authService } from './services/auth';
import { ServerConfig } from './types';
import authRoutes from './routes/auth';
import capabilityRoutes from './routes/capabilities';
import adminRoutes from './routes/admin';

const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  host: '0.0.0.0',
  dataDir: path.join(os.homedir(), '.semi-nexus', 'server'),
  jwtSecret: '',
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

function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

function validateJwtSecret(secret: string): void {
  if (!secret) {
    console.error(chalk.red('\n✗ FATAL: JWT_SECRET environment variable is required in production!'));
    console.error(chalk.yellow('  Set it with: export JWT_SECRET="your-secure-secret"'));
    console.error(chalk.yellow('  Or generate one: openssl rand -hex 32\n'));
    process.exit(1);
  }
  if (secret.length < 32) {
    console.error(chalk.red('\n✗ FATAL: JWT_SECRET must be at least 32 characters long!'));
    process.exit(1);
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    validateJwtSecret(secret || '');
    return secret!;
  }
  if (!secret) {
    const devSecret = crypto.randomBytes(32).toString('hex');
    console.log(chalk.yellow('\n⚠ WARNING: Using auto-generated JWT secret for development.'));
    console.log(chalk.yellow('  Set JWT_SECRET environment variable for production.\n'));
    return devSecret;
  }
  return secret;
}

class Server {
  private app: express.Application;
  private config: ServerConfig;
  private dataDir: string;
  private jwtSecret: string;

  constructor(config: Partial<ServerConfig> = {}) {
    this.jwtSecret = getJwtSecret();
    this.config = { ...DEFAULT_CONFIG, ...config, jwtSecret: this.jwtSecret };
    this.dataDir = this.config.dataDir;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.ensureDataDir();
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
        const adminPassword = process.env.ADMIN_PASSWORD || generateSecurePassword(16);
        
        await authService.createUser('admin', adminPassword, 'admin', 'local');
        
        console.log(chalk.green('\n✓ Default admin user created:'));
        console.log(chalk.cyan('  Username: ') + 'admin');
        console.log(chalk.cyan('  Password: ') + adminPassword);
        
        if (!process.env.ADMIN_PASSWORD) {
          console.log(chalk.yellow('\n  ⚠ IMPORTANT: This is a randomly generated password.'));
          console.log(chalk.yellow('  Please save it securely or set ADMIN_PASSWORD environment variable.'));
        }
        console.log(chalk.red('\n  Please change the password after first login!\n'));
      }
    } catch (error) {
      console.error('Failed to create default admin:', error);
    }
  }

  async start(): Promise<void> {
    await this.createDefaultAdmin();
    
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
