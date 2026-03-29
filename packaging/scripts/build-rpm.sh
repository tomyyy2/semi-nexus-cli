#!/bin/bash
set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BUILD_DIR="$PROJECT_ROOT/packaging/rpm-build"
OUTPUT_DIR="$PROJECT_ROOT/packaging/rpm"

echo "=== Building Rocky Linux 8.10 RPM Packages v${VERSION} ==="
echo "Project root: $PROJECT_ROOT"

mkdir -p "$BUILD_DIR"/{BUILD,RPMS,SRPMS,SPECS,SOURCES}
mkdir -p "$OUTPUT_DIR"/cli
mkdir -p "$OUTPUT_DIR"/server

echo ""
echo ">>> Preparing CLI source..."
mkdir -p "$BUILD_DIR/SOURCES/semi-nexus-cli-${VERSION}"
cp -r "$PROJECT_ROOT/dist" "$BUILD_DIR/SOURCES/semi-nexus-cli-${VERSION}/"
cp -r "$PROJECT_ROOT/package.json" "$BUILD_DIR/SOURCES/semi-nexus-cli-${VERSION}/"
cp -r "$PROJECT_ROOT/package-lock.json" "$BUILD_DIR/SOURCES/semi-nexus-cli-${VERSION}/" 2>/dev/null || true
cp -r "$PROJECT_ROOT/node_modules" "$BUILD_DIR/SOURCES/semi-nexus-cli-${VERSION}/" 2>/dev/null || true

cd "$BUILD_DIR/SOURCES"
tar -czf "semi-nexus-cli-${VERSION}.tar.gz" "semi-nexus-cli-${VERSION}"

echo ">>> Building CLI RPM..."
rpmbuild --define "_topdir $BUILD_DIR" \
         --define "version $VERSION" \
         --define "dist .el8" \
         -bb "$PROJECT_ROOT/packaging/rpm/cli/semi-nexus-cli.spec" 2>&1 || {
    echo "RPM build requires rpmbuild. On Rocky Linux: dnf install rpm-build"
    exit 1
}

cp "$BUILD_DIR/RPMS/x86_64/"*.rpm "$OUTPUT_DIR/cli/" 2>/dev/null || true

echo ""
echo ">>> Preparing Server source..."
mkdir -p "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}"
cp -r "$PROJECT_ROOT/server/dist" "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}/"
cp -r "$PROJECT_ROOT/server/package.json" "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}/"
cp -r "$PROJECT_ROOT/server/package-lock.json" "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}/" 2>/dev/null || true
cp -r "$PROJECT_ROOT/server/node_modules" "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}/" 2>/dev/null || true

cp "$PROJECT_ROOT/packaging/systemd/semi-nexus-server.service" "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}/" 2>/dev/null || true
cp "$PROJECT_ROOT/packaging/config/server-default.yaml" "$BUILD_DIR/SOURCES/semi-nexus-server-${VERSION}/" 2>/dev/null || true

cd "$BUILD_DIR/SOURCES"
tar -czf "semi-nexus-server-${VERSION}.tar.gz" "semi-nexus-server-${VERSION}"

echo ">>> Building Server RPM..."
rpmbuild --define "_topdir $BUILD_DIR" \
         --define "version $VERSION" \
         --define "dist .el8" \
         -bb "$PROJECT_ROOT/packaging/rpm/server/semi-nexus-server.spec" 2>&1 || {
    echo "RPM build requires rpmbuild. On Rocky Linux: dnf install rpm-build"
    exit 1
}

cp "$BUILD_DIR/RPMS/x86_64/"*.rpm "$OUTPUT_DIR/server/" 2>/dev/null || true

echo ""
echo "=== RPM Build Complete ==="
echo "CLI RPM: $OUTPUT_DIR/cli/"
echo "Server RPM: $OUTPUT_DIR/server/"
ls -la "$OUTPUT_DIR/cli/" 2>/dev/null || true
ls -la "$OUTPUT_DIR/server/" 2>/dev/null || true
