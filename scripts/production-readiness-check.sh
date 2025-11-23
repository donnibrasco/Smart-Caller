#!/bin/bash

# Production Readiness Check Script
# Validates all components before deployment

set -e

echo "🚀 Smart Caller - Production Readiness Check"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo "📋 1. Environment Configuration Check"
echo "--------------------------------------"

cd /root/Smart-Caller/orum-backend

# Check required environment variables
REQUIRED_VARS=(
    "SIGNALWIRE_SPACE_URL"
    "SIGNALWIRE_PROJECT_ID"
    "SIGNALWIRE_API_TOKEN"
    "SIGNALWIRE_PHONE_NUMBER"
    "JWT_SECRET"
    "DB_HOST"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env && ! grep -q "^${var}=YOUR_" .env; then
        check_pass "$var is configured"
    else
        check_fail "$var is missing or not configured"
    fi
done

echo ""
echo "📦 2. Dependencies Check"
echo "------------------------"

if [ -f "package.json" ]; then
    check_pass "Backend package.json exists"
else
    check_fail "Backend package.json missing"
fi

if [ -d "node_modules" ]; then
    check_pass "Backend dependencies installed"
else
    check_warn "Backend node_modules missing - run: npm install"
fi

cd /root/Smart-Caller

if [ -f "package.json" ]; then
    check_pass "Frontend package.json exists"
else
    check_fail "Frontend package.json missing"
fi

if [ -d "node_modules" ]; then
    check_pass "Frontend dependencies installed"
else
    check_warn "Frontend node_modules missing - run: npm install"
fi

echo ""
echo "🗄️  3. Database Models Check"
echo "----------------------------"

cd /root/Smart-Caller/orum-backend

if [ -f "src/models/User.js" ]; then
    check_pass "User model exists"
fi

if [ -f "src/models/Call.js" ]; then
    check_pass "Call model exists"
fi

if [ -f "src/models/PowerDialerQueue.js" ]; then
    check_pass "PowerDialerQueue model exists"
fi

echo ""
echo "🔌 4. Services & Controllers Check"
echo "-----------------------------------"

SERVICES=(
    "src/services/signalwireService.js"
    "src/services/recordingService.js"
    "src/services/voicemailDetectionService.js"
    "src/services/powerDialerService.js"
)

for service in "${SERVICES[@]}"; do
    if [ -f "$service" ]; then
        check_pass "$(basename $service) exists"
    else
        check_fail "$(basename $service) missing"
    fi
done

CONTROLLERS=(
    "src/controllers/recordingController.js"
    "src/controllers/voicemailController.js"
    "src/controllers/powerDialerController.js"
)

for controller in "${CONTROLLERS[@]}"; do
    if [ -f "$controller" ]; then
        check_pass "$(basename $controller) exists"
    else
        check_fail "$(basename $controller) missing"
    fi
done

echo ""
echo "🎨 5. Frontend Components Check"
echo "--------------------------------"

cd /root/Smart-Caller

COMPONENTS=(
    "components/PowerDialer.tsx"
    "components/CallHistory.tsx"
    "services/callRecording.ts"
    "services/voicemailDetection.ts"
    "services/powerDialer.ts"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        check_pass "$(basename $component) exists"
    else
        check_fail "$(basename $component) missing"
    fi
done

echo ""
echo "🔐 6. Security Check"
echo "--------------------"

cd /root/Smart-Caller/orum-backend

if [ -f "src/middleware/auth.js" ]; then
    check_pass "Authentication middleware exists"
fi

if [ -f "src/middleware/webhookValidation.js" ]; then
    check_pass "Webhook validation middleware exists"
fi

if grep -q "validateSignalWireSignature" src/routes/api.js; then
    check_pass "Webhook signature validation enabled"
else
    check_warn "Webhook signature validation not applied to routes"
fi

echo ""
echo "🐳 7. Docker Configuration Check"
echo "---------------------------------"

if [ -f "docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_fail "docker-compose.yml missing"
fi

if [ -f "Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_warn "Dockerfile missing"
fi

echo ""
echo "📊 Results Summary"
echo "=================="
echo -e "${GREEN}✓ Passed: ${PASS}${NC}"
echo -e "${YELLOW}⚠ Warnings: ${WARN}${NC}"
echo -e "${RED}✗ Failed: ${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ System is ready for production!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Run database migration: node orum-backend/scripts/migrate-database.js"
    echo "  2. Build Docker images: cd orum-backend && docker compose build app"
    echo "  3. Start services: docker compose up -d app"
    echo "  4. Monitor logs: docker logs -f orum-backend-app-1"
    echo "  5. Test endpoints: curl http://localhost:4000/api/health"
    exit 0
else
    echo -e "${RED}❌ System is NOT ready for production${NC}"
    echo "Please fix the failed checks above before deploying."
    exit 1
fi
