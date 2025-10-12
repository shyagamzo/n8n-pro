#!/bin/bash
# Clone n8n and extract node types in one command

set -e

echo "🔄 Cloning n8n repository..."
if [ -d "/tmp/n8n" ]; then
  echo "📁 /tmp/n8n already exists, pulling latest..."
  cd /tmp/n8n && git pull origin master
else
  git clone --depth 1 https://github.com/n8n-io/n8n.git /tmp/n8n
fi

echo ""
echo "🔍 Extracting node types..."
cd /workspaces/n8n-pro
node scripts/extract-from-n8n-repo.js /tmp/n8n

echo ""
echo "✅ Done! Node types updated."
echo ""
echo "🔨 Building extension..."
cd extension && yarn build

echo ""
echo "🎉 All done! Reload the extension in Chrome."

