# Deployment Files

This directory contains all deployment-related configurations and scripts for the Orum Backend.

## Structure

```
deployment/
├── nginx/
│   └── orum.conf          # Nginx reverse proxy configuration
├── scripts/
│   ├── deploy.sh          # Main deployment script
│   └── setup-ssl.sh       # SSL certificate setup script
└── DEPLOYMENT.md          # Comprehensive deployment guide
```

## Quick Start

1. Configure your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

2. Run the deployment script:
   ```bash
   sudo bash deployment/scripts/deploy.sh
   ```

3. Setup SSL:
   ```bash
   sudo bash deployment/scripts/setup-ssl.sh
   ```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
