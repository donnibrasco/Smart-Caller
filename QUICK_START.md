# Quick Start Guide - Smart Caller Power Dialer

## 🚀 Starting the Application

### Backend (Already Running)
```bash
cd /root/Smart-Caller/orum-backend
docker compose up -d
docker logs -f orum-backend-app-1  # View logs
```

### Frontend
```bash
cd /root/Smart-Caller
npm install  # If not already done
npm run dev  # Development mode
# OR
npm run build  # Production build
npm run preview  # Preview production build
```

---

## 📋 Using the Power Dialer

### 1. Access Power Dialer
- Navigate to **Auto Dialer** in the sidebar
- The dashboard shows real-time statistics

### 2. Add Phone Numbers
**Option A: Manual Entry**
```
Enter phone numbers in the textarea (one per line):
+15878421728
+15551234567
+15559876543
```

**Option B: CSV Import**
```csv
phoneNumber,contactName
+15878421728,John Doe
+15551234567,Jane Smith
```

### 3. Start Dialing
1. (Optional) Enter Campaign ID
2. Click **Start Dialing**
3. Monitor stats in real-time
4. Use Pause/Resume as needed
5. Skip current call if needed
6. Stop session when complete

### 4. View Call History
- Navigate to **Call History**
- Click ▶️ to play recordings
- Click 📥 to download
- See voicemail indicators

---

## 🔧 Configuration

### Environment Variables
```env
# Required
SIGNALWIRE_SPACE_URL=adoptify.signalwire.com
SIGNALWIRE_PROJECT_ID=your-project-id
SIGNALWIRE_API_TOKEN=your-api-token
SIGNALWIRE_PHONE_NUMBER=+15878421728

# Optional (with defaults)
VOICEMAIL_DETECTION_ENABLED=true
POWER_DIALER_MAX_CALLS_PER_MIN=10
POWER_DIALER_MAX_CALLS_PER_HOUR=200
```

### Feature Toggles
Edit `/root/Smart-Caller/orum-backend/.env`:
- `VOICEMAIL_DETECTION_ENABLED=true` - Enable/disable voicemail detection
- `POWER_DIALER_MAX_CALLS_PER_MIN=10` - Calls per minute limit
- `POWER_DIALER_MAX_CALLS_PER_HOUR=200` - Calls per hour limit

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker logs orum-backend-app-1

# Restart services
cd /root/Smart-Caller/orum-backend
docker compose restart

# Rebuild if needed
docker compose build app
docker compose up -d app
```

### Database issues
```bash
# Access database
docker compose exec postgres psql -U postgres -d orum_backend

# Check tables
\dt

# Check Calls table
SELECT COUNT(*) FROM "Calls";

# Check Queue table
SELECT COUNT(*) FROM "PowerDialerQueues";
```

### Voicemail detection not working
1. Check `VOICEMAIL_DETECTION_ENABLED=true` in .env
2. Verify SignalWire AMD is enabled in your account
3. Check webhook URL is accessible: `${BACKEND_URL}/api/webhooks/amd-status`

### Recordings not available
1. Verify recording started: Check `recordingSid` in database
2. Check SignalWire recording status in dashboard
3. Verify webhook received: `${BACKEND_URL}/api/webhooks/recording-status`

### Rate limit hit
- Wait 1 minute for calls/minute limit
- Wait 1 hour for calls/hour limit
- Adjust limits in .env file
- Restart backend after changes

---

## 📊 Monitoring

### Check System Health
```bash
curl http://localhost:4000/api/health
```

### View Active Sessions
```bash
# Via API (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/power-dialer/status
```

### View Queue
```bash
# Via API (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/power-dialer/queue?status=pending"
```

### Database Queries
```sql
-- View recent calls
SELECT * FROM "Calls" ORDER BY "createdAt" DESC LIMIT 10;

-- View voicemail detection stats
SELECT 
  outcome, 
  COUNT(*) as count,
  AVG("voicemailConfidence") as avg_confidence
FROM "Calls" 
WHERE "voicemailDetected" = true
GROUP BY outcome;

-- View queue status
SELECT 
  status,
  COUNT(*) as count
FROM "PowerDialerQueues"
GROUP BY status;
```

---

## 🎯 Best Practices

### Power Dialer
1. **Start Small:** Test with 5-10 numbers first
2. **Monitor Stats:** Watch connect rate and adjust
3. **Use Campaigns:** Organize numbers by campaign ID
4. **Set Priorities:** Higher priority numbers dial first
5. **Regular Cleanup:** Clear completed queue items

### Voicemail Detection
1. **Trust the Confidence:** >0.85 = high confidence
2. **Review False Positives:** Check calls marked as voicemail
3. **Adjust Thresholds:** Tune in `voicemailDetectionService.js`
4. **Use Both Layers:** SignalWire AMD + Web Audio API

### Call Recording
1. **Check Storage:** Monitor SignalWire recording storage
2. **Download Important Calls:** Save critical recordings locally
3. **Compliance:** Follow local laws regarding call recording
4. **Retention:** Implement automatic deletion after X days

---

## 📞 API Examples

### Start Power Dialer
```javascript
const response = await fetch('http://localhost:4000/api/power-dialer/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    campaignId: 'my-campaign',
    callerId: '+15878421728'
  })
});
```

### Add to Queue
```javascript
const response = await fetch('http://localhost:4000/api/power-dialer/queue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    phoneNumbers: [
      { phoneNumber: '+15551234567', contactName: 'John Doe' },
      { phoneNumber: '+15559876543', contactName: 'Jane Smith' }
    ],
    campaignId: 'my-campaign',
    priority: 1
  })
});
```

### Get Call Recording
```javascript
const response = await fetch(`http://localhost:4000/api/calls/${callId}/recording`, {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
const data = await response.json();
console.log('Recording URL:', data.url);
```

---

## 🔒 Security Notes

1. **Authentication Required:** All API endpoints require JWT token
2. **Webhook Validation:** SignalWire webhooks validated via signature
3. **Rate Limiting:** 100 webhook requests per minute per IP
4. **Input Validation:** Phone numbers validated against E.164 format
5. **SQL Injection:** Protected by Sequelize ORM
6. **CORS:** Configured for https://salescallagent.my

---

## 📝 Support

For issues or questions:
1. Check logs: `docker logs orum-backend-app-1`
2. Review PRODUCTION_DEPLOYMENT.md
3. Check SignalWire dashboard for account status
4. Verify database connectivity

**System Status:** ✅ Operational
**Backend:** http://localhost:4000
**Frontend:** http://localhost:5173 (dev) or https://salescallagent.my
