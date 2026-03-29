Name:           semi-nexus-server
Version:        %{version}
Release:        1%{?dist}
Summary:        SemiNexus Server - Agent Capability Hub Backend

License:        MIT
URL:            https://github.com/tomyyy2/semi-nexus-cli
BuildArch:      noarch
Requires:       nodejs >= 18
Requires(post): systemd
Requires(preun): systemd
Requires(postun): systemd

%description
SemiNexus Server provides the backend services for the Agent Capability Hub:
- Capability registry and management
- User authentication (Local, LDAP, AD)
- Security scanning
- Audit logging
- Admin management

%prep
%setup -q -n semi-nexus-server-%{version}

%build
# Already built

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/opt/semi-nexus-server
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/etc/sysconfig
mkdir -p %{buildroot}/etc/semi-nexus
mkdir -p %{buildroot}/var/lib/semi-nexus
mkdir -p %{buildroot}/var/log/semi-nexus
mkdir -p %{buildroot}/usr/lib/systemd/system

cp -r dist %{buildroot}/opt/semi-nexus-server/
cp package.json %{buildroot}/opt/semi-nexus-server/

ln -sf /opt/semi-nexus-server/dist/index.js %{buildroot}/usr/bin/semi-nexus-server

cat > %{buildroot}/etc/sysconfig/semi-nexus-server << 'EOF'
# SemiNexus Server Configuration
# Set these environment variables before starting the server

# JWT Secret (REQUIRED in production)
# Generate with: openssl rand -hex 32
JWT_SECRET=""

# Admin Password (optional, auto-generated if not set)
# ADMIN_PASSWORD=""

# Server Port
PORT=3000

# Node Environment
NODE_ENV=production
EOF

cat > %{buildroot}/etc/semi-nexus/config.yaml << 'EOF'
server:
  port: 3000
  host: "0.0.0.0"

auth:
  jwtExpiresIn: 3600
  refreshTokenExpiresIn: 604800

ldap:
  enabled: false
  url: ""
  baseDn: ""

registry:
  maxPackageSize: 104857600
  allowedTypes:
    - skill
    - mcp
    - agent
EOF

cat > %{buildroot}/usr/lib/systemd/system/semi-nexus-server.service << 'EOF'
[Unit]
Description=SemiNexus Server - Agent Capability Hub
Documentation=https://github.com/tomyyy2/semi-nexus-cli
After=network.target

[Service]
Type=simple
User=semi-nexus
Group=semi-nexus
EnvironmentFile=/etc/sysconfig/semi-nexus-server
WorkingDirectory=/opt/semi-nexus-server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/semi-nexus /var/log/semi-nexus

[Install]
WantedBy=multi-user.target
EOF

%pre
getent group semi-nexus >/dev/null || groupadd -r semi-nexus
getent passwd semi-nexus >/dev/null || \
    useradd -r -g semi-nexus -d /var/lib/semi-nexus -s /sbin/nologin \
    -c "SemiNexus Server" semi-nexus
exit 0

%post
%systemd_post semi-nexus-server.service
chown -R semi-nexus:semi-nexus /var/lib/semi-nexus /var/log/semi-nexus 2>/dev/null || true
chmod 750 /var/lib/semi-nexus /var/log/semi-nexus 2>/dev/null || true

echo ""
echo "=========================================="
echo "SemiNexus Server installed successfully!"
echo "=========================================="
echo ""
echo "Configuration: /etc/semi-nexus/config.yaml"
echo "Environment:   /etc/sysconfig/semi-nexus-server"
echo "Data directory: /var/lib/semi-nexus"
echo "Log directory: /var/log/semi-nexus"
echo ""
echo "IMPORTANT: Set JWT_SECRET before starting!"
echo "  Edit /etc/sysconfig/semi-nexus-server"
echo "  Or: export JWT_SECRET='your-secure-secret'"
echo ""
echo "To start the server:"
echo "  systemctl enable semi-nexus-server"
echo "  systemctl start semi-nexus-server"
echo ""

%preun
%systemd_preun semi-nexus-server.service

%postun
%systemd_postun semi-nexus-server.service
if [ $1 -eq 0 ]; then
    userdel semi-nexus 2>/dev/null || true
    groupdel semi-nexus 2>/dev/null || true
fi

%files
%defattr(-,root,root,-)
%dir %attr(0750,semi-nexus,semi-nexus) /var/lib/semi-nexus
%dir %attr(0750,semi-nexus,semi-nexus) /var/log/semi-nexus
%dir /etc/semi-nexus
%config(noreplace) /etc/semi-nexus/config.yaml
%config /etc/sysconfig/semi-nexus-server
/usr/bin/semi-nexus-server
/opt/semi-nexus-server
/usr/lib/systemd/system/semi-nexus-server.service

%changelog
* Sat Mar 29 2025 SemiNexus Team <team@seminexus.com> - %{version}
- Initial package
