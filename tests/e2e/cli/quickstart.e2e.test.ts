import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('Quickstart E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;

  beforeAll(async () => {
    server = testServer.getServer();
    await testCli.setup(server.url);
  });

  afterAll(async () => {
    await testCli.cleanup();
  });

  describe('quickstart command', () => {
    it('should show help for quickstart command', async () => {
      const result = await testCli.run(['quickstart', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/quick.?start/i);
    });
  });
});
