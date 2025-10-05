#!/bin/bash

# n8n AI Assistant - Watch & Rebuild Script
# This script watches for file changes and automatically rebuilds the extension

set -e

echo "👀 Starting extension watch mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_watch() {
    echo -e "${PURPLE}[WATCH]${NC} $1"
}

print_build() {
    echo -e "${CYAN}[BUILD]${NC} $1"
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

# Initial build
print_status "Performing initial build..."
yarn build
print_success "Initial build completed"

echo ""
print_watch "🚀 Watch mode started! The extension will rebuild automatically on file changes."
print_watch "📁 Watching: src/, manifest.json, package.json, tsconfig.json, vite.config.ts"
print_watch "🔄 To stop watching, press Ctrl+C"
print_watch "💡 Vite handles TypeScript compilation automatically"
echo ""

# Start the watch process with better formatting
yarn watch
