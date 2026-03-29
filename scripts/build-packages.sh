#!/bin/bash
set -e

VERSION=${1:-0.1.0}
BUILD_DIR="packaging"
PKG_DIR="${BUILD_DIR}/pkg"

mkdir -p ${PKG_DIR}/{rpm,deb}

echo "Building SemiNexus Server ${VERSION}"

echo "=== Building Server ==="
cd server
npm install
npm run build
cd ..

echo "=== Creating RPM Package ==="
mkdir -p ${PKG_DIR}/rpm/{BUILD,RPMS,SRPMS,SPECS,SOURCES}

SOURCES_DIR="${PKG_DIR}/rpm/SOURCES"
mkdir -p ${SOURCES_DIR}
mkdir -p ${BUILD_DIR}/semi-nexus-server-${VERSION}
cp -r server/dist ${BUILD_DIR}/semi-nexus-server-${VERSION}/
cp -r server/package*.json ${BUILD_DIR}/semi-nexus-server-${VERSION}/
cp packaging/semi-nexus-server.service ${BUILD_DIR}/semi-nexus-server-${VERSION}/

tar -czf ${SOURCES_DIR}/semi-nexus-server-${VERSION}.tar.gz \
  -C ${BUILD_DIR} semi-nexus-server-${VERSION}/

cat > ${PKG_DIR}/rpm/SPECS/semi-nexus-server.spec << 'EOF'
Name: semi-nexus-server
Version: %{version}
Release: 1%{?dist}
Summary: SemiNexus Server - Agent Capability Hub
License: MIT
URL: https://github.com/tomyyy2/semi-nexus-cli
BuildArch: x86_64

%description
SemiNexus Server provides capability registry, authentication, security scanning and audit logging.

%prep
%setup -q

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/opt/semi-nexus-server
mkdir -p %{buildroot}/usr/local/bin
mkdir -p %{buildroot}/etc/systemd/system

cp -r . %{buildroot}/opt/semi-nexus-server/
ln -s %{buildroot}/opt/semi-nexus-server/bin/semi-nexus-server %{buildroot}/usr/local/bin/semi-nexus-server
cp %{_builddir}/semi-nexus-server-%{version}/packaging/semi-nexus-server.service %{buildroot}/etc/systemd/system/

%post
systemctl daemon-reload 2>/dev/null || true

%preun
systemctl stop semi-nexus-server 2>/dev/null || true

%files
%defattr(-,root,root,-)
/opt/semi-nexus-server/*
/usr/local/bin/semi-nexus-server
/etc/systemd/system/semi-nexus-server.service

%changelog
* Mon Mar 29 2026 SemiNexus Team <team@seminexus.com> - %{version}
- Initial package
EOF

rpmbuild --define "_topdir ${PKG_DIR}/rpm" \
         --define "version ${VERSION}" \
         -ba ${PKG_DIR}/rpm/SPECS/semi-nexus-server.spec

echo "RPM package created: ${PKG_DIR}/rpm/RPMS/x86_64/"

echo "=== Creating DEB Package ==="
DEB_DIR="${PKG_DIR}/deb/semi-nexus-server_${VERSION}"
mkdir -p ${DEB_DIR}/{DEBIAN,opt/semi-nexus-server,usr/local/bin,etc/systemd/system}

cp -r server/dist ${DEB_DIR}/opt/semi-nexus-server/
cp -r server/package*.json ${DEB_DIR}/opt/semi-nexus-server/
cp packaging/semi-nexus-server.service ${DEB_DIR}/etc/systemd/system/

cat > ${DEB_DIR}/DEBIAN/control << 'EOF'
Package: semi-nexus-server
Version: %{version}
Section: admin
Priority: optional
Architecture: amd64
Maintainer: SemiNexus Team <team@seminexus.com>
Description: SemiNexus Server - Agent Capability Hub
 SemiNexus Server provides capability registry, authentication,
 security scanning and audit logging for enterprise AI agents.
EOF

cat > ${DEB_DIR}/DEBIAN/postinst << 'EOF'
#!/bin/bash
systemctl daemon-reload 2>/dev/null || true
ln -sf /opt/semi-nexus-server/bin/semi-nexus-server /usr/local/bin/semi-nexus-server 2>/dev/null || true
EOF
chmod +x ${DEB_DIR}/DEBIAN/postinst

cat > ${DEB_DIR}/DEBIAN/prerm << 'EOF'
#!/bin/bash
systemctl stop semi-nexus-server 2>/dev/null || true
rm -f /usr/local/bin/semi-nexus-server 2>/dev/null || true
EOF
chmod +x ${DEB_DIR}/DEBIAN/prerm

dpkg-deb --build ${DEB_DIR} ${PKG_DIR}/deb/semi-nexus-server_${VERSION}_amd64.deb

echo "DEB package created: ${PKG_DIR}/deb/semi-nexus-server_${VERSION}_amd64.deb"

echo "=== Package Build Complete ==="
echo "RPM: ${PKG_DIR}/rpm/RPMS/x86_64/"
echo "DEB: ${PKG_DIR}/deb/semi-nexus-server_${VERSION}_amd64.deb"