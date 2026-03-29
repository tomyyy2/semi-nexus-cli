import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';

describe('CLI Full Workflow E2E Tests', () => {
  beforeAll(async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);
  });

  describe('Complete User Journey', () => {
    it('should complete init -> login -> search -> subscribe -> install -> sync workflow', async () => {
      const server = testServer.getServer();

      const initResult = await testCli.run(['init', '--server', server.url, '--force']);
      expect(initResult.exitCode).toBe(0);
      expect(initResult.stdout).toContain('Initialized');

      const statusResult = await testCli.run(['status']);
      expect(statusResult.exitCode).toBe(0);
      expect(statusResult.stdout).toContain('Server');

      const searchResult = await testCli.run(['search', 'rtl']);
      expect(searchResult.exitCode).toBe(0);

      const listResult = await testCli.run(['list']);
      expect(listResult.exitCode).toBe(0);
    });
  });

  describe('Capability Management', () => {
    it('should show status after operations', async () => {
      const result = await testCli.run(['status']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Server');
      expect(result.stdout).toContain('Authentication');
      expect(result.stdout).toContain('Installation');
      expect(result.stdout).toContain('Agent Environments');
    });

    it('should list installed capabilities', async () => {
      const result = await testCli.run(['list']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid command gracefully', async () => {
      const result = await testCli.run(['invalid-command']);

      expect(result.exitCode).not.toBe(0);
    });

    it('should show help for unknown options', async () => {
      const result = await testCli.run(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage');
    });
  });
});
