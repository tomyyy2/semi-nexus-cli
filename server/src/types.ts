export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  email?: string;
  role: 'admin' | 'user';
  authType: 'local' | 'ldap' | 'ad';
  createdAt: string;
  lastLogin?: string;
  apiKeys: ApiKey[];
  status: 'active' | 'inactive' | 'locked';
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  keyHash: string;
  name: string;
  userId: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  status: 'active' | 'revoked';
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  type: 'access' | 'refresh';
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface Capability {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'skill' | 'mcp' | 'agent';
  version: string;
  tags: string[];
  category: { primary: string; secondary: string };
  author: {
    name: string;
    email?: string;
  };
  repository?: string;
  statistics: {
    downloads: number;
    subscribers: number;
    rating: number;
    ratingCount: number;
  };
  securityScan?: SecurityScan;
  compliance?: Compliance;
  status: 'draft' | 'scanning' | 'pending' | 'approved' | 'rejected';
  versions: CapabilityVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityVersion {
  version: string;
  snpFile: string;
  changelog: string;
  releasedAt: string;
}

export interface SecurityScan {
  status: 'pending' | 'scanning' | 'passed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  issues: SecurityIssue[];
  scannerVersion: string;
}

export interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'vulnerability' | 'sensitive_info' | 'compliance' | 'dependency';
  title: string;
  description: string;
  file?: string;
  line?: number;
  fix?: string;
}

export interface Compliance {
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  comment?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  capabilityId: string;
  version: string;
  subscribedAt: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  timestamp: string;
}

export interface LdapConfig {
  url: string;
  baseDn: string;
  bindDn?: string;
  bindPassword?: string;
  userSearchBase: string;
  userSearchFilter: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  syncInterval: number;
  enabled: boolean;
}

export interface ServerConfig {
  port: number;
  host: string;
  dataDir: string;
  jwtSecret: string;
  jwtExpiresIn: number;
  refreshTokenExpiresIn: number;
  ldap: LdapConfig;
  registry: {
    maxPackageSize: number;
    allowedTypes: string[];
  };
}