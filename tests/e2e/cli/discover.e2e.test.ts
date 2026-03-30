import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('Discover E2E Tests', () => {
  let server: ReturnType<typeof testServer.getServer>;

  beforeAll(async () => {
    server = testServer.getServer();
    await testCli.setup(server.url);
  });

  afterAll(async () => {
    await testCli.cleanup();
  });

  describe('discover command', () => {
    it('should show help for discover command', async () => {
      const result = await testCli.run(['discover', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/discover|Discover/i);
    });
  });
});
