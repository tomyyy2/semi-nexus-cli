import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('Verify E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;

  beforeAll(async () => {
    server = testServer.getServer();
    await testCli.setup(server.url);
  });

  afterAll(async () => {
    await testCli.cleanup();
  });

  describe('verify command', () => {
    it('should show help for verify command', async () => {
      const result = await testCli.run(['verify', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/verify|Verify/i);
    });

    it('should report not installed for unknown capability', async () => {
      const result = await testCli.run(['verify', 'non-existent-capability']);
      expect(result.stdout).toMatch(/not installed|未安装/);
    });
  });
});
