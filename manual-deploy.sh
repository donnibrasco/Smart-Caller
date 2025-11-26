#!/bin/bash

# Manual deployment script - Force rebuild and deploy everything

FRONTEND_DIR="/root/Smart-Caller"
DEPLOY_DIR="/var/www/salescallagent"

echo "========================================="
echo "🚀 Smart Caller Manual Deployment"
echo "========================================="

# Build frontend
echo "🔨 Building frontend..."
cd "$FRONTEND_DIR"
rm -rf dist
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Add cache-busting
TIMESTAMP=$(date +%s)
find dist -name "index-*.js" | while read file; do
    filename=$(basename "$file")
    sed -i "s|src=\"/assets/$filename\"|src=\"/assets/$filename?v=$TIMESTAMP\"|g" dist/index.html
done

# Deploy
echo "📦 Deploying..."
rm -rf "$DEPLOY_DIR"/*
cp -r dist/* "$DEPLOY_DIR/"
chown -R www-data:www-data "$DEPLOY_DIR"

# Restart services
echo "🔄 Rebuilding backend image..."
cd "$FRONTEND_DIR/orum-backend"
docker compose build app

echo "🔄 Restarting backend..."
docker compose up -d --force-recreate app

echo "🔄 Reloading nginx..."
systemctl reload nginx

echo "========================================="
echo "✅ Deployment completed!"
echo "🌐 https://salescallagent.my?v=$TIMESTAMP"
echo "========================================="
