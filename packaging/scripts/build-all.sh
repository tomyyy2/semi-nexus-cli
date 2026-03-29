#!/bin/bash
set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Building All Packages v${VERSION} ==="
echo ""

cd "$PROJECT_ROOT"

echo ">>> Step 1: Building binaries..."
chmod +x "$SCRIPT_DIR/build-binaries.sh"
"$SCRIPT_DIR/build-binaries.sh" "$VERSION"

echo ""
echo ">>> Step 2: Building RPM packages (if rpmbuild available)..."
if command -v rpmbuild &> /dev/null; then
    chmod +x "$SCRIPT_DIR/build-rpm.sh"
    "$SCRIPT_DIR/build-rpm.sh" "$VERSION" || echo "RPM build skipped"
else
    echo "rpmbuild not found, skipping RPM packages"
fi

echo ""
echo ">>> Step 3: Building DEB packages (if dpkg-deb available)..."
if command -v dpkg-deb &> /dev/null; then
    chmod +x "$SCRIPT_DIR/build-deb.sh"
    "$SCRIPT_DIR/build-deb.sh" "$VERSION" || echo "DEB build skipped"
else
    echo "dpkg-deb not found, skipping DEB packages"
fi

echo ""
echo "=== All Builds Complete ==="
echo ""
echo "Output files:"
echo "  Binaries: $PROJECT_ROOT/packaging/bin/"
ls -la "$PROJECT_ROOT/packaging/bin/" 2>/dev/null || true
echo ""
echo "  RPM:      $PROJECT_ROOT/packaging/rpm/"
ls -la "$PROJECT_ROOT/packaging/rpm/cli/" 2>/dev/null || true
ls -la "$PROJECT_ROOT/packaging/rpm/server/" 2>/dev/null || true
echo ""
echo "  DEB:      $PROJECT_ROOT/packaging/deb/"
ls -la "$PROJECT_ROOT/packaging/deb/cli/" 2>/dev/null || true
ls -la "$PROJECT_ROOT/packaging/deb/server/" 2>/dev/null || true
