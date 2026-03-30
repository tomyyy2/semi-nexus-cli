import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('Completion E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;

  beforeAll(async () => {
    server = testServer.getServer();
    await testCli.setup(server.url);
  });

  afterAll(async () => {
    await testCli.cleanup();
  });

  describe('completion command', () => {
    it('should show help for completion command', async () => {
      const result = await testCli.run(['completion', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/completion|Completion/i);
    });

    it('should generate bash completion', async () => {
      const result = await testCli.run(['completion', 'bash']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('semi-nexus');
      expect(result.stdout).toContain('complete');
    });

    it('should generate zsh completion', async () => {
      const result = await testCli.run(['completion', 'zsh']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('semi-nexus');
      expect(result.stdout).toContain('_semi_nexus');
    });

    it('should generate fish completion', async () => {
      const result = await testCli.run(['completion', 'fish']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('semi-nexus');
      expect(result.stdout).toContain('complete');
    });

    it('should generate csh completion', async () => {
      const result = await testCli.run(['completion', 'csh']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('semi-nexus');
      expect(result.stdout).toContain('complete');
    });
  });
});
