# SignalWire Setup Guide

This project uses SignalWire for voice calling with significant cost savings.

## Why SignalWire?

- **Cost Effective**: $0.0049/min vs other providers at $0.0140/min (65% cheaper)
- **API Compatible**: Uses Twilio SDK with SignalWire space URL
- **Full Features**: Same capabilities as premium providers

## Setup Steps

### 1. Create SignalWire Account

Go to https://signalwire.com and create an account.

### 2. Get Your Credentials

After logging in, you'll find these in your dashboard:

- **Space URL**: `yourspace.signalwire.com` (found in dashboard header)
- **Project ID**: In Project Settings
- **API Token**: In Project Settings (create one if needed)

### 3. Buy a Phone Number

1. Go to Phone Numbers → Buy a Number
2. Select a number with **Voice** capability
3. Note the number (e.g., +15551234567)

### 4. Create API Keys for Voice SDK

1. Go to API Keys
2. Click "Create New API Key"
3. Save the **API Key** and **API Secret** (shown only once!)

### 5. Create TwiML Application

1. Go to LaML Apps (TwiML Apps)
2. Create new application
3. Set these webhooks:
   - **Voice URL**: `https://salescallagent.my/api/webhooks/voice` (POST)
   - **Status Callback URL**: `https://salescallagent.my/api/webhooks/call-status` (POST)
4. Save and copy the **Application SID**

### 6. Update .env File

Edit `/root/Smart-Caller/orum-backend/.env` with your SignalWire credentials.

### 7. Rebuild & Restart Backend

```bash
cd /root/Smart-Caller/orum-backend
docker compose build app
docker compose up -d app
```

### 8. Test

1. Open https://salescallagent.my
2. Go to Manual Dialer
3. Enter a test phone number
4. Click "Call Now"
5. Check SignalWire dashboard for call logs

## Cost Comparison

| Provider   | Price/min | 1000 minutes | Savings   |
|-----------|-----------|--------------|-----------|
| SignalWire| $0.0049   | $4.90        | Baseline  |
| Others    | $0.0140   | $14.00       | -$9.10    |

**Annual savings for 10,000 minutes: ~$910**

## Troubleshooting

### "SignalWire credentials not configured"
- Check all SIGNALWIRE_* variables are set in .env
- Make sure SIGNALWIRE_SPACE_URL doesn't include https://
- Restart backend: `docker compose restart app`

### Calls not connecting
- Verify TwiML App webhooks point to your domain
- Check SignalWire dashboard for error logs
- Test your server is accessible: `curl https://salescallagent.my/api/health`

### No call logs in dashboard
- Run sync script: `node sync-calls.js`
- Check database connection
- Verify userId matches in calls table
