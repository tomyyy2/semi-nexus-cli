#!/bin/bash
set -e

VERSION=${1:-0.1.0}
PKG_DIR="packaging"

echo "Building SemiNexus CLI packages for ${VERSION}"

echo "=== Step 1: Build TypeScript ==="
npm install
npm run build

echo "=== Step 2: Install pkg ==="
npm install pkg --save-dev

echo "=== Step 3: Build Linux binary ==="
mkdir -p ${PKG_DIR}/bin
pkg . --targets node18-linux-x64 --output ${PKG_DIR}/bin/semi-nexus-linux
chmod +x ${PKG_DIR}/bin/semi-nexus-linux

echo "=== Step 4: Build Windows binary ==="
pkg . --targets node18-win-x64 --output ${PKG_DIR}/bin/semi-nexus-win.exe

echo "=== Step 5: Build macOS binary ==="
pkg . --targets node18-macos-x64 --output ${PKG_DIR}/bin/semi-nexus-macos
chmod +x ${PKG_DIR}/bin/semi-nexus-macos

echo ""
echo "=== Build Complete ==="
echo "Binaries created in ${PKG_DIR}/bin/:"
ls -la ${PKG_DIR}/bin/

echo ""
echo "Usage:"
echo "  Linux:   ./${PKG_DIR}/bin/semi-nexus-linux init"
echo "  Windows: ${PKG_DIR}\\bin\\semi-nexus-win.exe init"
echo "  macOS:   ./${PKG_DIR}/bin/semi-nexus-macos init"