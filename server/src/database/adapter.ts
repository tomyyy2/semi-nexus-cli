import {
  User, ApiKey, Capability, CapabilityVersion, Subscription, AuditLog
} from '../types';

export interface CapabilityQuery {
  query?: string;
  type?: string;
  tag?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface DatabaseAdapter {
  
  initialize(): Promise<void>;
  close(): void;
  
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  
  getApiKey(keyHash: string): Promise<(ApiKey & { user: User }) | null>;
  getApiKeysByUser(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: ApiKey): Promise<ApiKey>;
  updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null>;
  deleteApiKey(id: string): Promise<boolean>;
  
  getCapability(id: string): Promise<Capability | null>;
  getCapabilityByName(name: string): Promise<Capability | null>;
  getCapabilities(query: CapabilityQuery): Promise<Capability[]>;
  getAllCapabilities(): Promise<Capability[]>;
  createCapability(capability: Capability): Promise<Capability>;
  updateCapability(id: string, updates: Partial<Capability>): Promise<Capability | null>;
  deleteCapability(id: string): Promise<boolean>;
  
  getCapabilityVersions(capabilityId: string): Promise<CapabilityVersion[]>;
  addCapabilityVersion(version: CapabilityVersion): Promise<CapabilityVersion>;
  
  getSubscription(userId: string, capabilityId: string): Promise<Subscription | null>;
  getUserSubscriptions(userId: string): Promise<(Subscription & { capability?: Capability })[]>;
  createSubscription(subscription: Subscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null>;
  deleteSubscription(id: string): Promise<boolean>;
  
  createAuditLog(log: AuditLog): Promise<AuditLog>;
  getAuditLogs(options: { userId?: string; limit?: number; offset?: number }): Promise<AuditLog[]>;
  
  recordLoginAttempt(username: string, ip: string, success: boolean): Promise<void>;
  getRecentFailedAttempts(username: string, minutes: number): Promise<number>;
  clearLoginAttempts(): Promise<void>;
  
  clearTestData(): Promise<void>;
  
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
