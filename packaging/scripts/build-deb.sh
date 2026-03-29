#!/bin/bash
set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BUILD_DIR="$PROJECT_ROOT/packaging/deb-build"
OUTPUT_DIR="$PROJECT_ROOT/packaging/deb"

echo "=== Building DEB Packages v${VERSION} ==="
echo "Project root: $PROJECT_ROOT"

mkdir -p "$OUTPUT_DIR"/cli
mkdir -p "$OUTPUT_DIR"/server

build_deb() {
    local NAME=$1
    local SOURCE_DIR=$2
    local OUTPUT_SUBDIR=$3
    
    local PKG_DIR="$BUILD_DIR/${NAME}_${VERSION}_amd64"
    mkdir -p "$PKG_DIR/DEBIAN"
    mkdir -p "$PKG_DIR/usr/lib/${NAME}"
    mkdir -p "$PKG_DIR/usr/bin"
    mkdir -p "$PKG_DIR/etc/${NAME}"
    
    cat > "$PKG_DIR/DEBIAN/control" << EOF
Package: ${NAME}
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: amd64
Maintainer: SemiNexus Team <team@seminexus.com>
Description: SemiNexus ${NAME##*-} - Agent Capability Hub Tool
 SemiNexus is a pure command-line tool for managing AI Agent capabilities.
 It supports offline users through Server-Client architecture.
EOF
    
    cp -r "$SOURCE_DIR/dist"/* "$PKG_DIR/usr/lib/${NAME}/" 2>/dev/null || true
    cp -r "$SOURCE_DIR/node_modules" "$PKG_DIR/usr/lib/${NAME}/" 2>/dev/null || true
    cp "$SOURCE_DIR/package.json" "$PKG_DIR/usr/lib/${NAME}/" 2>/dev/null || true
    
    ln -sf "/usr/lib/${NAME}/index.js" "$PKG_DIR/usr/bin/${NAME}"
    
    dpkg-deb --build "$PKG_DIR" "$OUTPUT_DIR/$OUTPUT_SUBDIR/${NAME}_${VERSION}_amd64.deb"
    
    echo "Built: $OUTPUT_DIR/$OUTPUT_SUBDIR/${NAME}_${VERSION}_amd64.deb"
}

echo ""
echo ">>> Building CLI DEB..."
build_deb "semi-nexus-cli" "$PROJECT_ROOT" "cli"

echo ""
echo ">>> Building Server DEB..."
mkdir -p "$BUILD_DIR/semi-nexus-server_${VERSION}_amd64/var/lib/semi-nexus"
mkdir -p "$BUILD_DIR/semi-nexus-server_${VERSION}_amd64/var/log/semi-nexus"
mkdir -p "$BUILD_DIR/semi-nexus-server_${VERSION}_amd64/usr/lib/systemd/system"

build_deb "semi-nexus-server" "$PROJECT_ROOT/server" "server"

if [ -f "$PROJECT_ROOT/packaging/systemd/semi-nexus-server.service" ]; then
    cp "$PROJECT_ROOT/packaging/systemd/semi-nexus-server.service" \
       "$BUILD_DIR/semi-nexus-server_${VERSION}_amd64/usr/lib/systemd/system/"
fi

echo ""
echo "=== DEB Build Complete ==="
ls -la "$OUTPUT_DIR/cli/" 2>/dev/null || true
ls -la "$OUTPUT_DIR/server/" 2>/dev/null || true
