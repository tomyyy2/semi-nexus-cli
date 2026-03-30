import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import crypto from 'crypto';

export interface TestCli {
  configDir: string;
  serverUrl: string;
}

export class TestCliManager {
  private cli: TestCli | null = null;
  private cliPath: string;

  constructor() {
    this.cliPath = path.join(__dirname, '../../../dist/index.js');
  }

  async setup(serverUrl: string): Promise<TestCli> {
    if (this.cli) {
      return this.cli;
    }

    const configDir = path.join(os.tmpdir(), `semi-nexus-cli-test-${crypto.randomUUID()}`);
    await fs.ensureDir(configDir);

    this.cli = {
      configDir,
      serverUrl
    };

    await this.run(['init', '--server', serverUrl, '--force']);

    return this.cli;
  }

  async cleanup(): Promise<void> {
    if (this.cli) {
      await fs.remove(this.cli.configDir);
      this.cli = null;
    }
  }

  private getEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      HOME: this.cli?.configDir || os.homedir(),
      SEMI_NEXUS_CONFIG_DIR: this.cli?.configDir || ''
    };
  }

  async run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const process = spawn('node', [this.cliPath, ...args], {
        env: this.getEnv(),
        cwd: this.cli?.configDir || os.tmpdir()
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async login(username: string, password: string): Promise<boolean> {
    const result = await this.run(['login', '--server', this.cli!.serverUrl]);
    
    if (result.exitCode === 0) {
      return true;
    }
    return false;
  }

  async loginWithApiKey(apiKey: string): Promise<boolean> {
    const result = await this.run(['login', '--apikey', apiKey]);
    return result.exitCode === 0;
  }

  async logout(): Promise<void> {
    await this.run(['logout']);
  }

  async search(query: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['search', query]);
  }

  async subscribe(name: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['subscribe', name]);
  }

  async install(name: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['install', name]);
  }

  async sync(): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['sync']);
  }

  async status(): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['status']);
  }

  async list(): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['list']);
  }

  async uninstall(name: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['uninstall', name, '--yes']);
  }

  async info(name: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['info', name]);
  }

  async verify(name: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['verify', name]);
  }

  async discover(): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['discover']);
  }

  async completion(shell: string): Promise<{ stdout: string; exitCode: number }> {
    return this.run(['completion', shell]);
  }

  getConfigDir(): string {
    return this.cli?.configDir || '';
  }
}

export const testCli = new TestCliManager();
