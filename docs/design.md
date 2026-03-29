# SemiNexus CLI 设计文档

## 1. 核心定位

**SemiNexus CLI** 是一个纯命令行的 Agent 能力中转工具，不依赖 Web UI，直接通过命令行管理 AI Agent 的 Skills、MCP、Agents 等能力。

## 2. 架构设计

### 2.1 整体架构 (Server-Client 模式)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           企业内网环境                                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                        SemiNexus Server                          │ │
│  │                                                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │ │
│  │  │   Auth       │  │  Registry    │  │  Scanner     │            │ │
│  │  │   认证服务    │  │  能力注册表   │  │  安全扫描    │            │ │
│  │  │  (LDAP/AD)  │  │              │  │              │            │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │ │
│  │         │                  │                  │                   │ │
│  │         │                  │                  │                   │ │
│  │  ┌──────────────────────────────────────────────────┐            │ │
│  │  │              Storage (能力存储)                   │            │ │
│  │  │  • .snp 包               • 扫描结果              │            │ │
│  │  │  • 能力元数据            • 版本历史              │            │ │
│  │  └──────────────────────────────────────────────────┘            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                            │
│                              │ HTTP API (REST)                           │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
  │  用户 CLI   │        │  用户 CLI   │        │  管理员 CLI │
  │ (离线环境)  │        │ (在线环境)  │        │             │
  │             │        │             │        │ • 采集能力  │
  │ • search    │        │ • search    │        │ • 扫描能力  │
  │ • subscribe │        │ • subscribe │        │ • 发布能力  │
  │ • install   │        │ • install   │        │ • 用户管理  │
  │ • sync      │        │ • sync      │        │             │
  └─────────────┘        └─────────────┘        └─────────────┘
```

### 2.2 用户场景

| 场景 | 网络状态 | 说明 |
|------|---------|------|
| **离线用户** | ❌ 无法联网 | 通过本地缓存使用已下载的能力 |
| **在线用户** | ✅ 可联网 | 直接从 Server 下载能力 |
| **管理员** | ✅ 必须联网 | 采集、扫描、发布能力 |

### 2.3 管理员功能

| 功能 | 说明 |
|------|------|
| **能力采集** | 从 GitHub、Wolai 等来源采集能力 |
| **安全扫描** | 扫描代码安全漏洞、依赖风险 |
| **合规检查** | 检查能力是否符合企业规范 |
| **能力发布** | 审核后发布到内部 Registry |
| **用户管理** | 创建 API Key、管理用户权限 |

### 2.4 用户功能

| 功能 | 说明 |
|------|------|
| **搜索能力** | 搜索内部 Registry |
| **订阅能力** | 订阅需要的能力 |
| **安装能力** | 下载并安装到本地 |
| **同步能力** | 同步到 Agent 环境 |

## 3. 认证系统

### 3.1 认证方式

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| **本地用户** | 自建用户数据库 | 小规模团队 |
| **LDAP** | 连接企业 LDAP | 中大规模团队 |
| **AD 同步** | 与 Active Directory 同步 | 企业环境 |

### 3.2 API Key / Token 机制

```
┌─────────────────────────────────────────────────────────────────┐
│                        认证流程                                  │
└─────────────────────────────────────────────────────────────────┘

  用户                          Server
    │                             │
    │  1. 登录 (LDAP/本地)         │
    │ ──────────────────────────▶ │
    │                             │
    │  2. 获取 Access Token        │
    │ ◀────────────────────────── │
    │                             │
    │  3. 创建 API Key             │
    │ ──────────────────────────▶ │
    │                             │
    │  4. 返回 API Key             │
    │ ◀────────────────────────── │
    │                             │
    │  5. 使用 API Key 访问        │
    │ ──────────────────────────▶ │
    │                             │
    │  6. 返回能力数据              │
    │ ◀────────────────────────── │
```

### 3.3 Token 格式

```json
{
  "access_token": "snx_at_xxxxxxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "snx_rt_xxxxxxxxxxxx"
}
```

### 3.4 API Key 格式

```json
{
  "key_id": "key_xxxxxxxx",
  "key_prefix": "snx_k1_",
  "name": "我的工作站",
  "user_id": "user_xxxxxxxx",
  "created_at": "2026-03-29T00:00:00Z",
  "last_used": "2026-03-29T12:00:00Z"
}
```

## 4. 能力存储

### 4.1 能力包格式 (.snp)

```
能力名/
├── manifest.json      # 能力元数据
├── README.md          # 说明文档
├── src/               # 源代码
│   ├── index.ts
│   └── ...
├── tests/             # 测试
├── .semi-nexus/       # 配置
│   ├── manifest.json
│   └── capabilities.json
└── package.json
```

### 4.2 manifest.json 结构

```json
{
  "id": "cap_xxxxx",
  "name": "rtl-review-copilot",
  "displayName": "RTL Review Copilot",
  "version": "1.4.2",
  "type": "skill",
  "description": "AI-powered RTL code review",
  "author": {
    "name": "Team Name",
    "email": "team@example.com"
  },
  "repository": "https://github.com/xxx/rtl-review",
  "capabilities": ["rtl_review", "code_analysis"],
  "agent_compatibility": ["claude-code", "opencode"],
  "security_scan": {
    "status": "passed",
    "scanned_at": "2026-03-29T00:00:00Z",
    "issues": []
  },
  "compliance": {
    "status": "approved",
    "approved_by": "admin_xxxx"
  }
}
```

## 5. 数据存储

### 5.1 Server 端存储

```
/data/semi-nexus/
├── registry/              # 能力注册表
│   ├── index.json         # 能力索引
│   └── capabilities/      # 能力详情
│       ├── cap_xxxxx/
│       │   ├── manifest.json
│       │   └── versions/
│       │       └── 1.4.2.snp
│       └── ...
├── users/                 # 用户数据
│   ├── index.json
│   └── users/
│       ├── user_xxxxx/
│       │   ├── profile.json
│       │   ├── api_keys/
│       │   └── subscriptions/
├── audit/                  # 审计日志
│   └── yyyy-MM/
│       └── dd.json
└── scanner/               # 扫描结果缓存
    └── cache/
```

### 5.2 CLI 本地存储 (离线用户)

```
~/.semi-nexus/
├── config.yaml            # CLI 配置
├── auth.json              # 认证信息 (Token/API Key)
├── registry-cache.json    # 能力缓存 (离线可用)
├── subscriptions.json     # 订阅记录
├── installed.json         # 已安装能力
└── skills/               # 能力安装目录
    └── rtl-review-copilot/
        ├── manifest.json
        └── README.md
```

## 6. API 接口

### 6.1 认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 登录获取 Token |
| `/api/v1/auth/refresh` | POST | 刷新 Token |
| `/api/v1/auth/logout` | POST | 登出 |
| `/api/v1/auth/apikey` | POST | 创建 API Key |
| `/api/v1/auth/apikey` | GET | 列出 API Keys |
| `/api/v1/auth/apikey/:id` | DELETE | 删除 API Key |

### 6.2 能力接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/capabilities` | GET | 搜索能力 |
| `/api/v1/capabilities/:id` | GET | 能力详情 |
| `/api/v1/capabilities/:id/download` | GET | 下载能力包 |
| `/api/v1/capabilities/:id/subscribe` | POST | 订阅能力 |
| `/api/v1/capabilities/:id/rate` | POST | 评分 |

### 6.3 管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/admin/capabilities` | POST | 上传能力 |
| `/api/v1/admin/capabilities/:id/scan` | POST | 触发扫描 |
| `/api/v1/admin/capabilities/:id/approve` | POST | 审核发布 |
| `/api/v1/admin/users` | GET | 用户列表 |
| `/api/v1/admin/users` | POST | 创建用户 |
| `/api/v1/admin/ldap/sync` | POST | LDAP 同步 |

## 7. 安全考虑

### 7.1 网络隔离

- 用户终端无法直接访问互联网
- 所有能力必须通过 Server 中转
- Server 可访问互联网采集能力

### 7.2 安全扫描

| 扫描类型 | 说明 |
|---------|------|
| **代码安全** | 扫描代码中的安全漏洞 |
| **依赖检查** | 检查第三方依赖风险 |
| **敏感信息** | 检查是否泄露密钥/Token |
| **合规检查** | 检查是否符合企业规范 |

### 7.3 审计日志

- 所有操作记录审计日志
- 支持查询用户操作历史
- 合规报告生成

## 8. 待实现功能

### 高优先级

- [ ] Server 端 API 服务
- [ ] LDAP/AD 认证集成
- [ ] API Key 管理
- [ ] 能力下载 API
- [ ] 离线缓存机制

### 中优先级

- [ ] 安全扫描集成
- [ ] 审计日志
- [ ] 能力评分系统
- [ ] 用户权限管理

### 低优先级

- [ ] 能力推荐系统
- [ ] 使用分析
- [ ] 高可用部署