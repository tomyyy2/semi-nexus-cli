import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { SQLiteDatabase } from './database/sqlite';
import { User, Capability, Subscription } from './types';

interface LegacyUser {
  id: string;
  username: string;
  passwordHash?: string;
  email?: string;
  role: 'admin' | 'user';
  authType: 'local' | 'ldap' | 'ad';
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  apiKeys: Array<{
    id: string;
    keyPrefix: string;
    keyHash: string;
    name: string;
    userId: string;
    createdAt: string;
    lastUsed?: string;
    expiresAt?: string;
    status: 'active' | 'revoked';
  }>;
}

interface LegacyCapability {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'skill' | 'mcp' | 'agent';
  version: string;
  tags: string[];
  category: { primary: string; secondary: string };
  author: { name: string; email?: string };
  repository?: string;
  statistics: {
    downloads: number;
    subscribers: number;
    rating: number;
    ratingCount: number;
  };
  securityScan?: any;
  compliance?: any;
  status: 'draft' | 'scanning' | 'pending' | 'approved' | 'rejected';
  versions: Array<{
    version: string;
    snpFile: string;
    changelog: string;
    releasedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface LegacySubscription {
  id: string;
  userId: string;
  capabilityId: string;
  version: string;
  subscribedAt: string;
  status: 'active' | 'expired' | 'cancelled';
}

export async function migrateFromJson(dataDir?: string): Promise<void> {
  const baseDir = dataDir || path.join(os.homedir(), '.semi-nexus', 'server');
  
  console.log('🔄 Starting data migration from JSON to SQLite...');
  console.log(`📁 Data directory: ${baseDir}`);
  
  const db = new SQLiteDatabase(baseDir);
  await db.initialize();
  
  let migratedUsers = 0;
  let migratedCapabilities = 0;
  let migratedSubscriptions = 0;
  
  const usersFile = path.join(baseDir, 'users.json');
  if (await fs.pathExists(usersFile)) {
    console.log('\n📋 Migrating users...');
    const users: LegacyUser[] = await fs.readJson(usersFile);
    
    for (const user of users) {
      await db.createUser({
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        email: user.email,
        role: user.role,
        authType: user.authType,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        apiKeys: []
      });
      
      for (const apiKey of user.apiKeys || []) {
        await db.createApiKey({
          id: apiKey.id,
          userId: user.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          keyHash: apiKey.keyHash,
          status: apiKey.status,
          createdAt: apiKey.createdAt,
          lastUsed: apiKey.lastUsed,
          expiresAt: apiKey.expiresAt
        });
      }
      
      migratedUsers++;
      console.log(`  ✓ User: ${user.username}`);
    }
  }
  
  const registryDir = path.join(baseDir, 'registry');
  const capabilitiesFile = path.join(registryDir, 'capabilities.json');
  if (await fs.pathExists(capabilitiesFile)) {
    console.log('\n📋 Migrating capabilities...');
    const capabilities: LegacyCapability[] = await fs.readJson(capabilitiesFile);
    
    for (const cap of capabilities) {
      await db.createCapability({
        id: cap.id,
        name: cap.name,
        displayName: cap.displayName,
        description: cap.description,
        type: cap.type,
        version: cap.version,
        tags: cap.tags,
        category: cap.category,
        author: cap.author,
        repository: cap.repository,
        statistics: cap.statistics,
        securityScan: cap.securityScan,
        compliance: cap.compliance,
        status: cap.status,
        versions: cap.versions || [],
        createdAt: cap.createdAt,
        updatedAt: cap.updatedAt
      });
      
      for (const ver of cap.versions || []) {
        await db.addCapabilityVersion({
          version: ver.version,
          snpFile: ver.snpFile,
          changelog: ver.changelog,
          releasedAt: ver.releasedAt,
          capabilityId: cap.id
        } as any);
      }
      
      migratedCapabilities++;
      console.log(`  ✓ Capability: ${cap.name}`);
    }
  }
  
  const subscriptionsFile = path.join(registryDir, 'subscriptions.json');
  if (await fs.pathExists(subscriptionsFile)) {
    console.log('\n📋 Migrating subscriptions...');
    const subscriptions: LegacySubscription[] = await fs.readJson(subscriptionsFile);
    
    for (const sub of subscriptions) {
      await db.createSubscription({
        id: sub.id,
        userId: sub.userId,
        capabilityId: sub.capabilityId,
        version: sub.version,
        status: sub.status,
        subscribedAt: sub.subscribedAt
      });
      
      migratedSubscriptions++;
      console.log(`  ✓ Subscription: ${sub.id}`);
    }
  }
  
  db.close();
  
  console.log('\n✅ Migration completed!');
  console.log(`   Users migrated: ${migratedUsers}`);
  console.log(`   Capabilities migrated: ${migratedCapabilities}`);
  console.log(`   Subscriptions migrated: ${migratedSubscriptions}`);
  console.log(`\n💾 Database: ${path.join(baseDir, 'semi-nexus.db')}`);
}

if (require.main === module) {
  migrateFromJson(process.argv[2]).catch(console.error);
}
