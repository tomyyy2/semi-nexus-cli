import { AuthService } from './services/auth';
import { RegistryService } from './services/registry';
import { DatabaseAdapter } from './database';

interface ServiceContainer {
  db: DatabaseAdapter;
  authService: AuthService;
  registryService: RegistryService;
}

let container: ServiceContainer | null = null;

export function setServices(services: ServiceContainer): void {
  container = services;
}

export function getServices(): ServiceContainer {
  if (!container) {
    throw new Error('Services not initialized. Server must be started first.');
  }
  return container;
}

export function getAuthService(): AuthService {
  return getServices().authService;
}

export function getRegistryService(): RegistryService {
  return getServices().registryService;
}

export function getDatabase(): DatabaseAdapter {
  return getServices().db;
}
