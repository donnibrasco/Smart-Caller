#!/bin/bash

# Deployment script for Orum Backend
# This script automates the deployment process on an Ubuntu server

set -e

echo "======================================"
echo "Orum Backend Deployment Script"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt install -y nginx
else
    echo "Nginx already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.example to .env and configure it with your settings"
    exit 1
fi

# Build and start Docker containers
echo "Building and starting Docker containers..."
docker-compose down
docker-compose up -d --build

# Copy Nginx configuration
echo "Setting up Nginx configuration..."
cp deployment/nginx/orum.conf /etc/nginx/sites-available/orum
ln -sf /etc/nginx/sites-available/orum /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "======================================"
echo "Deployment completed successfully!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update your domain DNS to point to this server's IP"
echo "2. Run SSL setup: sudo bash deployment/scripts/setup-ssl.sh"
echo "3. Check logs: docker-compose logs -f app"
echo ""
