#!/bin/bash

# Auto-deployment service for Smart Caller
# Watches for changes and automatically rebuilds/deploys

FRONTEND_DIR="/root/Smart-Caller"
DEPLOY_DIR="/var/www/salescallagent"
LOG_FILE="/var/log/smart-caller-deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

deploy_frontend() {
    log "🔨 Building frontend..."
    cd "$FRONTEND_DIR"
    
    # Clean old build
    rm -rf dist
    
    # Build with timestamp for cache busting
    npm run build 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "✅ Build successful"
        
        # Add cache-busting timestamp to index.html
        TIMESTAMP=$(date +%s)
        find dist -name "index-*.js" | while read file; do
            filename=$(basename "$file")
            sed -i "s|src=\"/assets/$filename\"|src=\"/assets/$filename?v=$TIMESTAMP\"|g" dist/index.html
        done
        
        # Clear old deployment
        log "🗑️  Clearing old deployment..."
        rm -rf "$DEPLOY_DIR"/*
        
        # Deploy new build
        log "📦 Deploying to $DEPLOY_DIR..."
        cp -r dist/* "$DEPLOY_DIR/"
        
        # Set proper permissions
        chown -R www-data:www-data "$DEPLOY_DIR"
        
        # Reload nginx
        log "🔄 Reloading nginx..."
        systemctl reload nginx
        
        log "✅ Deployment completed successfully!"
        log "🌐 Live at: https://salescallagent.my?nocache=$TIMESTAMP"
        
        return 0
    else
        log "❌ Build failed!"
        return 1
    fi
}

restart_backend() {
    log "🔄 Restarting backend..."
    cd "$FRONTEND_DIR/orum-backend"
    docker compose restart app
    log "✅ Backend restarted"
}

# Initial deployment
log "========================================="
log "🚀 Smart Caller Auto-Deploy Service Started"
log "========================================="

deploy_frontend
restart_backend

log "========================================="
log "📝 Watching for changes..."
log "   Frontend: $FRONTEND_DIR/components"
log "   Frontend: $FRONTEND_DIR/services"
log "   Backend:  $FRONTEND_DIR/orum-backend/src"
log "========================================="

# Watch for changes and auto-deploy
while true; do
    # Watch frontend changes
    inotifywait -r -e modify,create,delete \
        "$FRONTEND_DIR/components" \
        "$FRONTEND_DIR/services" \
        "$FRONTEND_DIR/App.tsx" \
        "$FRONTEND_DIR/index.tsx" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "📝 Frontend changes detected..."
        sleep 2  # Debounce
        deploy_frontend
    fi
done
