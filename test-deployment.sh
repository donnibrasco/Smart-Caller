#!/bin/bash

echo "🧪 Smart Caller Deployment Test"
echo "================================"
echo ""

# Test 1: Health Endpoint
echo "1️⃣  Testing Health Endpoint..."
HEALTH=$(curl -s http://localhost:4000/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "   ✅ Health endpoint: PASS"
else
  echo "   ❌ Health endpoint: FAIL"
fi

# Test 2: Database Connection
echo ""
echo "2️⃣  Testing Database Connection..."
DB_TEST=$(docker compose -f orum-backend/docker-compose.yml exec -T postgres psql -U postgres -d orum_backend -c "SELECT 1" 2>&1)
if echo "$DB_TEST" | grep -q "1 row"; then
  echo "   ✅ Database connection: PASS"
else
  echo "   ❌ Database connection: FAIL"
fi

# Test 3: Tables Exist
echo ""
echo "3️⃣  Testing Database Tables..."
TABLES=$(docker compose -f orum-backend/docker-compose.yml exec -T postgres psql -U postgres -d orum_backend -c "\dt" 2>&1)
if echo "$TABLES" | grep -q "Calls" && echo "$TABLES" | grep -q "PowerDialerQueues"; then
  echo "   ✅ Database tables: PASS"
else
  echo "   ❌ Database tables: FAIL"
fi

# Test 4: SignalWire Config
echo ""
echo "4️⃣  Testing SignalWire Configuration..."
if grep -q "adoptify.signalwire.com" orum-backend/.env; then
  echo "   ✅ SignalWire configured: PASS"
else
  echo "   ❌ SignalWire configured: FAIL"
fi

# Test 5: Container Status
echo ""
echo "5️⃣  Testing Container Status..."
CONTAINERS=$(docker ps --filter "name=orum-backend-app" --format "{{.Status}}")
if echo "$CONTAINERS" | grep -q "Up"; then
  echo "   ✅ Backend container: PASS"
else
  echo "   ❌ Backend container: FAIL"
fi

echo ""
echo "================================"
echo "🎉 Deployment Test Complete!"
echo ""
