# Smart Caller - SignalWire Voice Dialer

A modern sales dialing application with real-time voice calling powered by SignalWire.

## Features

- 📞 **Real Voice Calls**: Browser-based calling using SignalWire Voice SDK
- 📊 **Call Analytics**: Track call history, duration, and outcomes
- 👥 **Team Management**: Organize your sales team
- 📝 **Call Scripts**: Manage and use sales scripts during calls
- 🎯 **Manual Dialer**: Phone keypad interface for quick calls
- 💰 **Cost Effective**: 65% cheaper than other providers ($0.0049/min)

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite 6
- TailwindCSS
- SignalWire Voice SDK (browser)

**Backend:**
- Node.js + Express
- PostgreSQL
- Redis
- SignalWire (Twilio SDK compatible)
- Docker + Nginx

## Deployment

The app is deployed at: https://salescallagent.my

**Test Account:**
- Email: final@test.com
- Password: Final123!

## Quick Start

### Backend Setup

1. Install dependencies:
```bash
cd orum-backend
npm install
```

2. Configure SignalWire (see [SIGNALWIRE_SETUP.md](orum-backend/SIGNALWIRE_SETUP.md)):
```bash
cp .env.example .env
# Edit .env with your SignalWire credentials
```

3. Run with Docker:
```bash
docker compose up -d
```

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Run dev server:
```bash
npm run dev
```

## SignalWire Setup

Complete setup guide: [SIGNALWIRE_SETUP.md](orum-backend/SIGNALWIRE_SETUP.md)

Required credentials:
- Space URL
- Project ID
- API Token
- Phone Number
- TwiML App SID
- API Key & Secret

## Cost Comparison

| Provider   | Price/min | 1000 min | Annual (10k min) |
|-----------|-----------|----------|------------------|
| SignalWire| $0.0049   | $4.90    | $490             |
| Others    | $0.0140   | $14.00   | $1,400           |

**Save ~$910/year on 10,000 minutes**

## Architecture

```
Frontend (React) → Nginx (SSL) → Backend API (Express)
                                      ↓
                              SignalWire Voice API
                                      ↓
                              PostgreSQL + Redis
```

## License

ISC
