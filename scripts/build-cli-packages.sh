#!/bin/bash
set -e

VERSION=${1:-0.1.0}
BUILD_DIR="packaging"
PKG_DIR="${BUILD_DIR}/pkg"

mkdir -p ${PKG_DIR}/{rpm,deb}

echo "Building SemiNexus CLI ${VERSION}"

echo "=== Building CLI ==="
npm install
npm run build

echo "=== Creating RPM Package ==="
SOURCES_DIR="${PKG_DIR}/rpm/SOURCES"
mkdir -p ${SOURCES_DIR}
mkdir -p ${BUILD_DIR}/semi-nexus-cli-${VERSION}

cp -r dist ${BUILD_DIR}/semi-nexus-cli-${VERSION}/
cp -r package*.json ${BUILD_DIR}/semi-nexus-cli-${VERSION}/
mkdir -p ${BUILD_DIR}/semi-nexus-cli-${VERSION}/bin
echo '#!/bin/bash' > ${BUILD_DIR}/semi-nexus-cli-${VERSION}/bin/semi-nexus
echo 'node "$(dirname "$0")/../dist/index.js "$@"' >> ${BUILD_DIR}/semi-nexus-cli-${VERSION}/bin/semi-nexus
chmod +x ${BUILD_DIR}/semi-nexus-cli-${VERSION}/bin/semi-nexus

tar -czf ${SOURCES_DIR}/semi-nexus-cli-${VERSION}.tar.gz \
  -C ${BUILD_DIR} semi-nexus-cli-${VERSION}/

cat > ${PKG_DIR}/rpm/SPECS/semi-nexus-cli.spec << EOF
Name: semi-nexus-cli
Version: ${VERSION}
Release: 1%{?dist}
Summary: SemiNexus CLI - Agent Capability Hub CLI
License: MIT
URL: https://github.com/tomyyy2/semi-nexus-cli
BuildArch: x86_64

%description
SemiNexus CLI is a pure command-line tool for managing AI Agent capabilities.

%prep
%setup -q

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/local/bin
mkdir -p %{buildroot}/usr/local/lib/semi-nexus-cli

cp -r . %{buildroot}/usr/local/lib/semi-nexus-cli/
ln -s %{buildroot}/usr/local/lib/semi-nexus-cli/bin/semi-nexus %{buildroot}/usr/local/bin/semi-nexus
ln -s %{buildroot}/usr/local/lib/semi-nexus-cli/bin/semi-nexus %{buildroot}/usr/local/bin/snx

%files
%defattr(-,root,root,-)
/usr/local/lib/semi-nexus-cli/*
/usr/local/bin/semi-nexus
/usr/local/bin/snx

%changelog
* Mon Mar 29 2026 SemiNexus Team <team@seminexus.com> - ${VERSION}
- Initial package
EOF

mkdir -p ${PKG_DIR}/rpm/{BUILD,RPMS,SRPMS,SPECS}

rpmbuild --define "_topdir ${PKG_DIR}/rpm" \
         -ba ${PKG_DIR}/rpm/SPECS/semi-nexus-cli.spec

echo "RPM package created: ${PKG_DIR}/rpm/RPMS/x86_64/"

echo "=== Creating DEB Package ==="
DEB_DIR="${PKG_DIR}/deb/semi-nexus-cli_${VERSION}"
mkdir -p ${DEB_DIR}/{DEBIAN,usr/local/bin,usr/local/lib/semi-nexus-cli}

cp -r dist ${DEB_DIR}/usr/local/lib/semi-nexus-cli/
cp -r package*.json ${DEB_DIR}/usr/local/lib/semi-nexus-cli/
mkdir -p ${DEB_DIR}/usr/local/bin
cp packaging/semi-nexus-cli.sh ${DEB_DIR}/usr/local/bin/semi-nexus 2>/dev/null || {
  echo '#!/bin/bash' > ${DEB_DIR}/usr/local/bin/semi-nexus
  echo 'node "$(dirname "$0")/../lib/semi-nexus-cli/dist/index.js" "$@"' >> ${DEB_DIR}/usr/local/bin/semi-nexus
  chmod +x ${DEB_DIR}/usr/local/bin/semi-nexus
}
ln -sf ../lib/semi-nexus-cli/bin/semi-nexus ${DEB_DIR}/usr/local/bin/snx

cat > ${DEB_DIR}/DEBIAN/control << 'EOF'
Package: semi-nexus-cli
Version: VERSION_PLACEHOLDER
Section: admin
Priority: optional
Architecture: amd64
Maintainer: SemiNexus Team <team@seminexus.com>
Description: SemiNexus CLI - Agent Capability Hub CLI
 SemiNexus CLI is a pure command-line tool for managing AI Agent
 capabilities. It supports offline users through Server-Client architecture.
EOF

sed -i "s/VERSION_PLACEHOLDER/${VERSION}/" ${DEB_DIR}/DEBIAN/control

dpkg-deb --build ${DEB_DIR} ${PKG_DIR}/deb/semi-nexus-cli_${VERSION}_amd64.deb

echo "DEB package created: ${PKG_DIR}/deb/semi-nexus-cli_${VERSION}_amd64.deb"

echo "=== Package Build Complete ==="