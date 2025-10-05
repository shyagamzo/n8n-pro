#!/bin/bash

# n8n AI Assistant - Development Setup Script
# This script sets up the development environment for the extension

set -e

echo "🚀 Setting up n8n AI Assistant development environment..."

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

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    print_error "Node.js 22+ is required. Current version: $(node --version)"
    exit 1
fi
print_success "Node.js version: $(node --version)"

# Check yarn
print_status "Checking yarn..."
if ! command -v yarn &> /dev/null; then
    print_error "yarn is not installed. Please install yarn first."
    exit 1
fi
print_success "yarn version: $(yarn --version)"

# Install dependencies
print_status "Installing dependencies..."
yarn install
print_success "Dependencies installed"

# Build the extension
print_status "Building extension..."
yarn build
print_success "Extension built successfully"

# Check n8n instance
print_status "Checking n8n instance..."
N8N_URL="http://localhost:5678"
if curl -s --head "$N8N_URL" | head -n 1 | grep -q "200 OK"; then
    print_success "n8n instance is running at $N8N_URL"
else
    print_warning "n8n instance not found at $N8N_URL"
    print_warning "Please start your n8n instance or update the URL in the script"
fi

# Create development manifest
print_status "Creating development manifest..."
cp manifest.json manifest.dev.json

# Add development-specific permissions if needed
print_success "Development manifest created"

# Instructions for loading extension
echo ""
print_success "🎉 Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open Chrome/Edge and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the 'dist' folder"
echo "4. Navigate to your n8n instance to test the extension"
echo ""
echo "🔧 Development commands:"
echo "  yarn dev     - Start development server with hot reload"
echo "  yarn build   - Build for production"
echo "  yarn lint    - Run ESLint"
echo "  yarn type-check - Run TypeScript type checking"
echo ""
echo "🐛 Debugging:"
echo "  - Use Chrome DevTools to debug the extension"
echo "  - Check the Console tab for background worker logs"
echo "  - Use the Extensions tab to inspect the extension"
echo ""
print_success "Happy coding! 🚀"
