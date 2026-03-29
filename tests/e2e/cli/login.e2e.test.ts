import { testCli } from '../setup/test-cli';
import { testServer } from '../setup/test-server';
import axios from 'axios';

describe('CLI Login E2E Tests', () => {
  beforeEach(async () => {
    const server = testServer.getServer();
    await testCli.setup(server.url);
  });

  it('should login with valid credentials', async () => {
    const server = testServer.getServer();
    
    const loginResponse = await axios.post(`${server.url}/api/v1/auth/login`, {
      username: 'admin',
      password: server.adminPassword,
      authType: 'local'
    });
    
    const token = loginResponse.data.accessToken;
    
    const apiKeyResponse = await axios.post(`${server.url}/api/v1/auth/api-keys`, {
      name: 'E2E Test Key'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const apiKey = apiKeyResponse.data.apiKey;

    const result = await testCli.run([
      'login',
      '--server', server.url,
      '--apikey', apiKey
    ]);

    expect(result.exitCode).toBe(0);
  });

  it('should fail with invalid credentials', async () => {
    const result = await testCli.run([
      'login',
      '--apikey', 'invalid-key'
    ]);

    expect(result.exitCode).not.toBe(0);
  });

  it('should logout successfully', async () => {
    const server = testServer.getServer();
    
    const loginResponse = await axios.post(`${server.url}/api/v1/auth/login`, {
      username: 'admin',
      password: server.adminPassword,
      authType: 'local'
    });
    
    const token = loginResponse.data.accessToken;
    
    const apiKeyResponse = await axios.post(`${server.url}/api/v1/auth/api-keys`, {
      name: 'E2E Test Key for Logout'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const apiKey = apiKeyResponse.data.apiKey;

    await testCli.run([
      'login',
      '--server', server.url,
      '--apikey', apiKey
    ]);

    const result = await testCli.run(['logout']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Logged out');
  });
});
