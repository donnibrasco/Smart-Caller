# Orum Backend Deployment Guide

## Prerequisites

- Ubuntu 22.04 LTS VPS (recommended) or similar Linux distribution
- Root or sudo access
- A domain name pointed to your server's IP address
- Twilio account with:
  - Account SID
  - Auth Token
  - Verified phone number (for Caller ID)
  - TwiML App configured

## Quick Deployment

### 1. Server Setup

Clone the repository on your server:

```bash
git clone https://github.com/yourusername/Smart-Caller.git
cd Smart-Caller/orum-backend
```

### 2. Configure Environment

Copy the example environment file and edit it with your settings:

```bash
cp .env.example .env
nano .env
```

**Critical configurations:**

- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_CALLER_ID`: Your verified Twilio phone number (E.164 format: +1234567890)
- `TWILIO_APP_SID`: Your TwiML App SID (see TwiML App Setup below)
- `JWT_SECRET`: Generate a strong random secret
- `DB_PASSWORD`: Set a strong database password

### 3. TwiML App Setup

1. Go to [Twilio Console > Voice > TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
2. Create a new TwiML App
3. Set **Voice Request URL** to: `https://api.yourdomain.com/api/webhooks/voice`
4. Set **Voice Method** to: `POST`
5. Copy the App SID and add it to your `.env` file as `TWILIO_APP_SID`

### 4. Run Deployment Script

Make the deployment script executable and run it:

```bash
chmod +x deployment/scripts/deploy.sh
sudo bash deployment/scripts/deploy.sh
```

This script will:
- Install Docker and Docker Compose
- Install Nginx
- Build and start the application containers
- Configure Nginx as a reverse proxy

### 5. Setup SSL Certificate

After your domain DNS is configured and propagated:

```bash
chmod +x deployment/scripts/setup-ssl.sh
sudo bash deployment/scripts/setup-ssl.sh
```

Enter your domain name when prompted (e.g., `api.yourdomain.com`).

## Manual Deployment Steps

If you prefer to deploy manually:

### Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### Build and Start Containers

```bash
docker-compose up -d --build
```

### Configure Nginx

```bash
sudo cp deployment/nginx/orum.conf /etc/nginx/sites-available/orum
sudo ln -s /etc/nginx/sites-available/orum /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Setup SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Verify Deployment

### Check Container Status

```bash
docker-compose ps
```

All services (app, postgres, redis) should be "Up".

### View Application Logs

```bash
docker-compose logs -f app
```

### Test API Endpoint

```bash
curl https://api.yourdomain.com/api/health
```

Should return a health check response.

## Common Operations

### Restart Services

```bash
docker-compose restart
```

### Stop Services

```bash
docker-compose down
```

### Update Application

```bash
git pull
docker-compose up -d --build
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Database Backup

```bash
docker-compose exec postgres pg_dump -U postgres orum_backend > backup.sql
```

### Database Restore

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres orum_backend
```

## Environment Variables Reference

See `.env.example` for a complete list of required environment variables.

### Essential Variables

- `PORT`: Application port (default: 4000)
- `NODE_ENV`: Environment (production/development)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token generation
- `TWILIO_ACCOUNT_SID`: Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token
- `TWILIO_CALLER_ID`: Your verified Twilio number
- `TWILIO_APP_SID`: TwiML App SID

## Troubleshooting

### Containers won't start

Check logs:
```bash
docker-compose logs
```

### Database connection errors

Verify PostgreSQL is running:
```bash
docker-compose ps postgres
```

Check database credentials in `.env`.

### Twilio webhook errors

- Ensure `TWILIO_APP_SID` is correctly configured
- Verify the Voice Request URL in TwiML App matches your domain
- Check that SSL is properly configured (Twilio requires HTTPS)

### SSL certificate issues

Ensure:
- Domain DNS is pointing to server IP
- Ports 80 and 443 are open in firewall
- Nginx is running: `sudo systemctl status nginx`

## Security Recommendations

1. **Change default passwords** in `.env` and `docker-compose.yml`
2. **Restrict database access** - don't expose port 5432 publicly
3. **Use strong JWT_SECRET** - generate with: `openssl rand -base64 32`
4. **Enable firewall** - only allow ports 80, 443, and SSH
5. **Regular updates** - keep system and Docker images updated
6. **Monitor logs** - setup log monitoring and alerting

## Support

For issues or questions:
- Check application logs: `docker-compose logs -f app`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Consult Twilio documentation for webhook issues

## Next Steps

After deployment:
1. Create admin user account
2. Test dialing functionality from the web interface
3. Configure team settings
4. Setup monitoring and alerting
5. Configure backup automation
