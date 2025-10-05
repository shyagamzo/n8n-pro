#!/bin/bash

# n8n AI Assistant - Extension Build Script
# This script builds the extension for production

set -e

echo "🔨 Building n8n AI Assistant extension for production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Clean previous build
print_status "Cleaning previous build..."
rm -rf dist/
print_success "Previous build cleaned"

# Run type checking
print_status "Running TypeScript type checking..."
yarn type-check
print_success "Type checking passed"

# Run linting
print_status "Running ESLint..."
yarn lint || print_warning "ESLint found warnings (continuing build)"
print_success "Linting completed"

# Build the extension
print_status "Building extension..."
yarn build
print_success "Extension built successfully"

# Validate manifest
print_status "Validating manifest.json..."
if [ -f "dist/manifest.json" ]; then
    # Basic JSON validation
    if python3 -m json.tool dist/manifest.json > /dev/null 2>&1; then
        print_success "Manifest validation passed"
    else
        print_error "Manifest validation failed - invalid JSON"
        exit 1
    fi
else
    print_error "Manifest not found in dist folder"
    exit 1
fi

# Check bundle sizes
print_status "Checking bundle sizes..."
if [ -f "dist/background.js" ]; then
    BG_SIZE=$(du -h dist/background.js | cut -f1)
    print_success "Background script: $BG_SIZE"
fi

if [ -f "dist/content.js" ]; then
    CONTENT_SIZE=$(du -h dist/content.js | cut -f1)
    print_success "Content script: $CONTENT_SIZE"
fi

if [ -f "dist/panel.js" ]; then
    PANEL_SIZE=$(du -h dist/panel.js | cut -f1)
    print_success "Panel script: $PANEL_SIZE"
fi

# Create zip for store submission (optional)
if [ "$1" = "--zip" ]; then
    print_status "Creating zip file for store submission..."
    ZIP_NAME="n8n-ai-assistant-$(date +%Y%m%d-%H%M%S).zip"
    cd dist && zip -r "../$ZIP_NAME" . && cd ..
    print_success "Zip file created: $ZIP_NAME"
fi

echo ""
print_success "🎉 Extension build complete!"
echo ""
echo "📦 Build output:"
echo "  - dist/ folder contains the built extension"
echo "  - Load the dist/ folder as an unpacked extension for testing"
echo ""
echo "🚀 For production deployment:"
echo "  - Test thoroughly in Chrome/Edge"
echo "  - Create a zip file: ./scripts/build-extension.sh --zip"
echo "  - Submit to Chrome Web Store or Edge Add-ons"
echo ""
print_success "Build successful! 🚀"
