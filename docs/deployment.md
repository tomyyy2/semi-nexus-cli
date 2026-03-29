# SemiNexus 部署架构

## 1. 整体架构

### 1.1 单机部署

```
┌─────────────────────────────────────────────────────────────┐
│                     Linux Server                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              SemiNexus Server (Node.js)                │ │
│  │  Port: 3000                                            │ │
│  │  Data: /data/semi-nexus/                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Nginx (Reverse Proxy)                     │ │
│  │  Port: 80/443                                         │ │
│  │  SSL Termination                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Systemd Service                          │ │
│  │  semi-nexus-server.service                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 企业部署 (推荐)

```
                           ┌─────────────────┐
                           │   负载均衡器     │
                           │   (LB/Nginx)    │
                           └────────┬────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Server 1      │      │   Server 2      │      │   Server N      │
│  semi-nexus    │      │  semi-nexus    │      │  semi-nexus    │
│  (Node.js)     │      │  (Node.js)     │      │  (Node.js)     │
│  Port: 3000    │      │  Port: 3000    │      │  Port: 3000    │
└────────┬───────┘      └────────┬───────┘      └────────┬───────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │   共享存储       │
                         │ /data/semi-nexus│
                         │ (NFS/CIFS)      │
                         └─────────────────┘
```

## 2. 系统要求

### 2.1 最低要求

| 组件 | 要求 |
|------|------|
| CPU | 2 核心 |
| 内存 | 4 GB |
| 磁盘 | 20 GB |
| 系统 | Ubuntu 20.04+ / CentOS 8+ / Debian 11+ |

### 2.2 推荐配置

| 组件 | 要求 |
|------|------|
| CPU | 4+ 核心 |
| 内存 | 8+ GB |
| 磁盘 | 100+ GB (取决于能力包数量) |
| 系统 | Ubuntu 22.04 LTS |

## 3. 安装方式

### 3.1 RPM 包 (RedHat/CentOS/Rocky)

```bash
# 安装
sudo rpm -ivh semi-nexus-server-0.1.0-1.el8.x86_64.rpm

# 配置
sudo systemctl edit semi-nexus-server

# 启动
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server

# 查看状态
sudo systemctl status semi-nexus-server
```

### 3.2 DEB 包 (Debian/Ubuntu)

```bash
# 安装
sudo dpkg -i semi-nexus-server_0.1.0_amd64.deb
sudo apt-get install -f  # 修复依赖

# 配置
sudo systemctl edit semi-nexus-server

# 启动
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server

# 查看状态
sudo systemctl status semi-nexus-server
```

### 3.3 Docker 部署

```bash
# 使用 Docker Compose
curl -fsSL https://raw.githubusercontent.com/tomyyy2/semi-nexus-cli/main/docker-compose.yml -o docker-compose.yml
docker-compose up -d

# 或手动
docker run -d \
  --name semi-nexus-server \
  -p 3000:3000 \
  -v /data/semi-nexus:/data/semi-nexus \
  -e JWT_SECRET=your-secret-key \
  semi-nexus-server
```

### 3.4 手动安装

```bash
# 下载
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest -o semi-nexus-server.tar.gz
tar -xzf semi-nexus-server.tar.gz
cd semi-nexus-server

# 安装
sudo cp -r . /opt/semi-nexus-server
sudo ln -s /opt/semi-nexus-server/bin/semi-nexus-server /usr/local/bin/

# 创建服务
sudo cp semi-nexus-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server
```

## 4. 配置

### 4.1 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `HOST` | 0.0.0.0 | 绑定地址 |
| `DATA_DIR` | ~/.semi-nexus/server | 数据目录 |
| `JWT_SECRET` | (必需) | JWT 密钥 |
| `JWT_EXPIRES_IN` | 3600 | Token 过期时间(秒) |
| `LDAP_URL` | - | LDAP 服务器地址 |
| `LDAP_BASE_DN` | - | LDAP Base DN |

### 4.2 Systemd 服务配置

```ini
# /etc/systemd/system/semi-nexus-server.service
[Unit]
Description=SemiNexus Server
After=network.target

[Service]
Type=simple
User=semi-nexus
Group=semi-nexus
WorkingDirectory=/opt/semi-nexus-server
ExecStart=/opt/semi-nexus-server/bin/semi-nexus-server
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=JWT_SECRET=your-production-secret

[Install]
WantedBy=multi-user.target
```

## 5. Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 6. 数据备份

### 6.1 备份策略

```bash
#!/bin/bash
# backup.sh

DATA_DIR="/data/semi-nexus"
BACKUP_DIR="/backup/semi-nexus"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
tar -czf ${BACKUP_DIR}/backup_${DATE}.tar.gz ${DATA_DIR}

# 保留最近 30 天
find ${BACKUP_DIR} -name "backup_*.tar.gz" -mtime +30 -delete

# 推送远程 (可选)
# rclone copy ${BACKUP_DIR}/backup_${DATE}.tar.gz remote:backup/
```

### 6.2 Crontab 配置

```cron
# 每天凌晨 2 点备份
0 2 * * * /opt/semi-nexus-server/scripts/backup.sh
```

## 7. 监控

### 7.1 健康检查

```bash
# 本地检查
curl http://localhost:3000/health

# 远程检查
curl https://your-domain.com/health
```

### 7.2 Prometheus 指标 (未来)

```
GET /metrics
```

## 8. 故障排查

```bash
# 查看日志
journalctl -u semi-nexus-server -f

# 检查端口
ss -tlnp | grep 3000

# 检查进程
ps aux | grep semi-nexus-server

# 检查数据目录权限
ls -la /data/semi-nexus/
```

## 9. 卸载

### RPM

```bash
sudo systemctl stop semi-nexus-server
sudo systemctl disable semi-nexus-server
sudo rpm -e semi-nexus-server
sudo rm -rf /data/semi-nexus
```

### DEB

```bash
sudo systemctl stop semi-nexus-server
sudo systemctl disable semi-nexus-server
sudo dpkg -r semi-nexus-server
sudo rm -rf /data/semi-nexus
```

### Docker

```bash
docker stop semi-nexus-server
docker rm semi-nexus-server
docker rmi semi-nexus-server
```