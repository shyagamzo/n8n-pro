#!/bin/bash

# Script to rebuild and notify to reload extension
# Chrome extensions need to be reloaded after code changes

set -e

echo "🔨 Building extension..."
cd extension
yarn build

echo ""
echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open chrome://extensions/"
echo "2. Find 'n8n Pro Extension'"
echo "3. Click the reload button (🔄)"
echo "4. Refresh the n8n page (F5)"
echo ""

