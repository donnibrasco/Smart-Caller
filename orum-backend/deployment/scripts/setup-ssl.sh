#!/bin/bash

# SSL Setup Script using Certbot
# Run this after deploy.sh and DNS is configured

set -e

echo "======================================"
echo "SSL Certificate Setup"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Prompt for domain name
read -p "Enter your domain name (e.g., api.yourdomain.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "ERROR: Domain name is required"
    exit 1
fi

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
else
    echo "Certbot already installed"
fi

# Obtain SSL certificate
echo "Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d $DOMAIN

# Setup auto-renewal (Certbot usually does this automatically, but let's verify)
echo "Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
echo "Testing certificate renewal..."
certbot renew --dry-run

echo "======================================"
echo "SSL Setup completed successfully!"
echo "======================================"
echo ""
echo "Your API is now accessible at: https://$DOMAIN"
echo "Certificate will auto-renew before expiration"
echo ""
