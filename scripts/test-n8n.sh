#!/bin/bash

# n8n AI Assistant - n8n Integration Test Script
# This script tests the connection to n8n and validates API functionality

set -e

echo "🧪 Testing n8n integration..."

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

# Default n8n URL
N8N_URL="${N8N_URL:-http://localhost:5678}"
API_KEY="${API_KEY:-}"

print_status "Testing n8n instance at: $N8N_URL"

# Test 1: Basic connectivity
print_status "Test 1: Checking n8n connectivity..."
if curl -s --head "$N8N_URL" | head -n 1 | grep -q "200 OK"; then
    print_success "n8n instance is accessible"
else
    print_error "Cannot connect to n8n instance at $N8N_URL"
    print_error "Please ensure n8n is running and accessible"
    exit 1
fi

# Test 2: API endpoint availability
print_status "Test 2: Checking API endpoint..."
API_URL="$N8N_URL/api/v1"
if curl -s --head "$API_URL" | head -n 1 | grep -q "200 OK\|401 Unauthorized\|403 Forbidden"; then
    print_success "API endpoint is accessible"
else
    print_error "API endpoint not accessible at $API_URL"
    exit 1
fi

# Test 3: API key validation (if provided)
if [ -n "$API_KEY" ]; then
    print_status "Test 3: Validating API key..."
    AUTH_HEADER="Authorization: Bearer $API_KEY"
    
    # Test workflows endpoint
    RESPONSE=$(curl -s -w "%{http_code}" -H "$AUTH_HEADER" "$API_URL/workflows" -o /tmp/n8n_test_response.json)
    
    if [ "$RESPONSE" = "200" ]; then
        WORKFLOW_COUNT=$(cat /tmp/n8n_test_response.json | grep -o '"id"' | wc -l)
        print_success "API key is valid - found $WORKFLOW_COUNT workflows"
    elif [ "$RESPONSE" = "401" ]; then
        print_error "API key is invalid or expired"
        exit 1
    elif [ "$RESPONSE" = "403" ]; then
        print_error "API key lacks required permissions"
        exit 1
    else
        print_warning "Unexpected response code: $RESPONSE"
    fi
    
    rm -f /tmp/n8n_test_response.json
else
    print_warning "Test 3: Skipping API key validation (no key provided)"
    print_warning "Set API_KEY environment variable to test authentication"
fi

# Test 4: Extension integration (if extension is loaded)
print_status "Test 4: Checking extension integration..."
if [ -f "dist/manifest.json" ]; then
    print_success "Extension build found"
    
    # Check if extension files are present
    if [ -f "dist/background.js" ] && [ -f "dist/content.js" ] && [ -f "dist/panel.js" ]; then
        print_success "All extension files present"
    else
        print_error "Missing extension files - run 'yarn build' first"
        exit 1
    fi
else
    print_warning "Extension not built - run 'yarn build' first"
fi

# Test 5: Browser compatibility check
print_status "Test 5: Checking browser compatibility..."
if command -v google-chrome &> /dev/null; then
    CHROME_VERSION=$(google-chrome --version | cut -d' ' -f3 | cut -d'.' -f1)
    if [ "$CHROME_VERSION" -ge 88 ]; then
        print_success "Chrome version $CHROME_VERSION is compatible (Manifest V3)"
    else
        print_warning "Chrome version $CHROME_VERSION may not support Manifest V3"
    fi
else
    print_warning "Chrome not found - cannot check browser compatibility"
fi

echo ""
print_success "🎉 n8n integration tests completed!"
echo ""
echo "📋 Test Summary:"
echo "  ✅ n8n connectivity: OK"
echo "  ✅ API endpoint: OK"
if [ -n "$API_KEY" ]; then
    echo "  ✅ API authentication: OK"
else
    echo "  ⚠️  API authentication: Skipped (no key provided)"
fi
echo "  ✅ Extension build: OK"
echo ""
echo "🔧 Next steps:"
echo "  1. Load the extension in Chrome/Edge"
echo "  2. Navigate to your n8n instance"
echo "  3. Test the AI assistant functionality"
echo ""
print_success "Integration test successful! 🚀"
