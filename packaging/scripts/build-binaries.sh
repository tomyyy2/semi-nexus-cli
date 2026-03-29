#!/bin/bash
set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/packaging/bin"

echo "=== Building SemiNexus Binaries v${VERSION} ==="
echo "Project root: $PROJECT_ROOT"
echo "Output directory: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

cd "$PROJECT_ROOT"

echo ""
echo ">>> Building CLI..."
npm install --silent
npm run build

if command -v pkg &> /dev/null; then
    echo "Using pkg to create standalone binaries..."
    pkg . \
        --targets node18-linux-x64,node18-win-x64,node18-macos-x64 \
        --output-path "$OUTPUT_DIR" \
        --compress GZip 2>/dev/null || true
else
    echo "pkg not found, creating node-based packages..."
fi

cp -r dist "$OUTPUT_DIR/semi-nexus-dist" 2>/dev/null || true

if [ -f "$OUTPUT_DIR/semi-nexus-linux-x64" ]; then
    mv "$OUTPUT_DIR/semi-nexus-linux-x64" "$OUTPUT_DIR/semi-nexus-linux"
fi
if [ -f "$OUTPUT_DIR/semi-nexus-win-x64.exe" ]; then
    mv "$OUTPUT_DIR/semi-nexus-win-x64.exe" "$OUTPUT_DIR/semi-nexus-win.exe"
fi
if [ -f "$OUTPUT_DIR/semi-nexus-macos-x64" ]; then
    mv "$OUTPUT_DIR/semi-nexus-macos-x64" "$OUTPUT_DIR/semi-nexus-macos"
fi

chmod +x "$OUTPUT_DIR"/semi-nexus-linux 2>/dev/null || true
chmod +x "$OUTPUT_DIR"/semi-nexus-macos 2>/dev/null || true

echo ""
echo ">>> Building Server..."
cd "$PROJECT_ROOT/server"
npm install --silent
npm run build

if command -v pkg &> /dev/null; then
    pkg . \
        --targets node18-linux-x64,node18-win-x64,node18-macos-x64 \
        --output-path "$OUTPUT_DIR" \
        --compress GZip 2>/dev/null || true
fi

cp -r dist "$OUTPUT_DIR/semi-nexus-server-dist" 2>/dev/null || true

if [ -f "$OUTPUT_DIR/semi-nexus-server-linux-x64" ]; then
    mv "$OUTPUT_DIR/semi-nexus-server-linux-x64" "$OUTPUT_DIR/semi-nexus-server-linux"
fi
if [ -f "$OUTPUT_DIR/semi-nexus-server-win-x64.exe" ]; then
    mv "$OUTPUT_DIR/semi-nexus-server-win-x64.exe" "$OUTPUT_DIR/semi-nexus-server-win.exe"
fi
if [ -f "$OUTPUT_DIR/semi-nexus-server-macos-x64" ]; then
    mv "$OUTPUT_DIR/semi-nexus-server-macos-x64" "$OUTPUT_DIR/semi-nexus-server-macos"
fi

chmod +x "$OUTPUT_DIR"/semi-nexus-server-linux 2>/dev/null || true
chmod +x "$OUTPUT_DIR"/semi-nexus-server-macos 2>/dev/null || true

echo ""
echo "=== Build Complete ==="
echo "Binaries:"
ls -la "$OUTPUT_DIR"/ 2>/dev/null || echo "No binaries found"
