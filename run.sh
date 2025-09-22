#!/bin/bash

# Memento - Startup Script
# This script starts both the FastAPI backend and React frontend servers
# with proper dependency installation and error handling.

set -e  # Exit on any error

echo "🚀 Starting Memento"
echo "============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check prerequisites
echo ""
echo "🔍 Checking prerequisites..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]); then
    print_error "Python $PYTHON_VERSION detected. Please install Python 3.9 or higher."
    exit 1
fi
print_status "Python $PYTHON_VERSION found"

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 16 ]; then
    print_error "Node.js $NODE_VERSION detected. Please install Node.js 16 or higher."
    exit 1
fi
print_status "Node.js $NODE_VERSION found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_status "npm $(npm --version) found"

# Function to prompt for API key
prompt_for_api_key() {
    echo ""
    echo "🔑 Let's set up your Limitless API key!"
    echo "════════════════════════════════════════"
    echo ""
    echo "📍 First, get your API key from: ${BLUE}https://www.limitless.ai/developers${NC}"
    echo ""
    echo "💡 Your API key should look like: 12345678-1234-1234-1234-123456789abc"
    echo "   (It's a UUID format with dashes and random characters)"
    echo ""
    
    while true; do
        echo -n "🔐 Please paste your Limitless API key: "
        read -s API_KEY_INPUT
        echo ""
        
        # Basic format validation
        if [ -z "$API_KEY_INPUT" ]; then
            print_error "API key cannot be empty. Please try again."
            continue
        fi
        
        # Check if it looks like a UUID (basic validation)
        if [[ ! "$API_KEY_INPUT" =~ ^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$ ]]; then
            print_warning "That doesn't look like a valid API key format."
            echo "Expected format: 12345678-1234-1234-1234-123456789abc"
            echo ""
            echo -n "Continue anyway? (y/N): "
            read -n 1 CONTINUE
            echo ""
            if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
                continue
            fi
        fi
        
        # Test the API key
        print_info "Testing your API key..."
        if command -v curl &> /dev/null; then
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $API_KEY_INPUT" "https://api.limitless.ai/v1/chats?limit=1" --connect-timeout 10 --max-time 15)
            
            if [ "$HTTP_STATUS" = "200" ]; then
                print_status "✨ Perfect! Your API key works!"
                break
            elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
                print_error "❌ API key authentication failed"
                echo ""
                echo "This could mean:"
                echo "   • The API key was copied incorrectly"
                echo "   • The API key has expired or been revoked"
                echo "   • There are extra spaces or characters"
                echo ""
                echo -n "Would you like to try again? (Y/n): "
                read -n 1 RETRY
                echo ""
                if [[ "$RETRY" =~ ^[Nn]$ ]]; then
                    exit 1
                fi
                continue
            else
                print_warning "Got unexpected response (HTTP $HTTP_STATUS)"
                echo "We'll proceed anyway - this might be a temporary server issue."
                break
            fi
        else
            print_warning "curl not available - skipping validation"
            break
        fi
    done
    
    # Save to .env file
    echo "LIMITLESS_API_KEY=$API_KEY_INPUT" > .env
    print_status "API key saved to .env file"
    API_KEY="$API_KEY_INPUT"
}

# Check for .env file and API key
print_info "Checking API key configuration..."

API_KEY=""
NEED_SETUP=false

if [ ! -f .env ]; then
    print_info ".env file not found - let's create it!"
    NEED_SETUP=true
else
    # Check if API key exists in .env
    if grep -q "LIMITLESS_API_KEY=" .env; then
        # Extract API key value (handle both quoted and unquoted)
        API_KEY=$(grep "LIMITLESS_API_KEY=" .env | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")
        
        # Check if API key is still the placeholder or empty
        if [ "$API_KEY" = "your_limitless_api_key_here" ] || [ "$API_KEY" = "your_actual_api_key_here" ] || [ -z "$API_KEY" ]; then
            print_warning "Found placeholder API key in .env file"
            NEED_SETUP=true
        fi
    else
        print_warning "No API key found in .env file"
        NEED_SETUP=true
    fi
fi

# If we need setup, prompt for API key
if [ "$NEED_SETUP" = true ]; then
    prompt_for_api_key
fi

# Final API key validation (if we didn't just set it up)
HTTP_STATUS="200"  # Default to success
if [ "$NEED_SETUP" = false ] && command -v curl &> /dev/null; then
    print_info "Validating existing API key..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $API_KEY" "https://api.limitless.ai/v1/chats?limit=1" --connect-timeout 10 --max-time 15)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "API key is valid and working"
    elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
        print_error "Existing API key is no longer valid"
        echo "Please run the script again to enter a new API key."
        exit 1
    fi
fi

# Check for Daily Insights (if API key works)
print_info "Checking for Daily Insights in your Limitless account..."
if command -v curl &> /dev/null && [ "$HTTP_STATUS" = "200" ]; then
    # Look for daily insights chats
    DAILY_INSIGHTS_COUNT=$(curl -s -H "X-API-Key: $API_KEY" "https://api.limitless.ai/v1/chats?q=Daily%20insights&limit=10" --connect-timeout 10 --max-time 15 | grep -o '"id"' | wc -l | tr -d ' ')
    
    if [ "$DAILY_INSIGHTS_COUNT" -gt 0 ]; then
        print_status "Found $DAILY_INSIGHTS_COUNT Daily Insights in your account"
    else
        print_warning "⚠️  No Daily Insights found in your Limitless account!"
        echo ""
        echo "🧠 IMPORTANT: Memento depends on Daily Insights from Limitless AI"
        echo "════════════════════════════════════════════════════════════════"
        echo ""
        echo "📱 Before using Memento, you need to:"
        echo "   1. Open your Limitless AI app"
        echo "   2. Go to: Settings → Notification → Daily Insights (toggle ON)"
        echo "   3. Wait for Limitless to generate at least one daily insight"
        echo "   4. Check that you can see daily insights in your app chat history"
        echo ""
        echo "⏰ Daily Insights are typically generated around 7:00 AM Pacific Time"
        echo ""
        echo "🔍 If you don't see Daily Insights in Limitless, you won't see them here!"
        echo "   This is normal for new accounts or days when Limitless hasn't"
        echo "   processed enough data to generate insights."
        echo ""
        echo "🚀 Don't worry - we'll start the app anyway. You can:"
        echo "   • Sync later when you have daily insights"
        echo "   • Create custom action items in the meantime"
        echo ""
        echo -n "Continue anyway? (Y/n): "
        read -n 1 CONTINUE_ANYWAY
        echo ""
        if [[ "$CONTINUE_ANYWAY" =~ ^[Nn]$ ]]; then
            echo ""
            print_info "Come back when you have some Daily Insights! 🧠✨"
            exit 0
        fi
    fi
else
    print_info "Skipping Daily Insights check (API test didn't complete)"
fi

print_status "Environment configuration ready"

# Function to kill background processes on exit
cleanup() {
    echo ""
    print_info "Shutting down servers..."
    pkill -f "python3.*app.py" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    print_status "Servers stopped"
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

echo ""
echo "📦 Installing dependencies..."

# Install backend dependencies
print_info "Checking Python dependencies..."
cd backend
if [ ! -d "__pycache__" ] || [ ! -f "insights.db" ]; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt
    print_status "Python dependencies installed"
else
    print_status "Python dependencies up to date"
fi
cd ..

# Install frontend dependencies
print_info "Checking Node.js dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    print_status "Node.js dependencies installed"
else
    print_status "Node.js dependencies up to date"
fi
cd ..

echo ""
echo "🌐 Starting servers..."

# Check if ports are available
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 8000 is already in use. Please stop the existing process."
    echo "Run: lsof -ti:8000 | xargs kill -9"
    exit 1
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port 5173 is already in use. Please stop the existing process."
    echo "Run: lsof -ti:5173 | xargs kill -9"
    exit 1
fi

# Start backend server
print_info "Starting FastAPI backend server..."
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start and check if it's running
sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend server failed to start"
    exit 1
fi

# Test backend connectivity
if curl -s http://localhost:8000/stats > /dev/null 2>&1; then
    print_status "Backend server running on port 8000"
else
    print_warning "Backend server started but not responding yet"
fi

# Start frontend server
print_info "Starting React frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend server failed to start"
    exit 1
fi

print_status "Frontend server running on port 5173"

# Check if this is a first run (no database exists)
FIRST_RUN=false
if [ ! -f "backend/insights.db" ]; then
    FIRST_RUN=true
fi

echo ""
print_status "All servers started successfully!"
echo ""
echo "🔗 Access your application:"
echo "   ${GREEN}Frontend:${NC}    http://localhost:5173"
echo "   ${GREEN}Backend API:${NC} http://localhost:8000"
echo "   ${GREEN}API Docs:${NC}    http://localhost:8000/docs"
echo ""

if [ "$FIRST_RUN" = true ]; then
    echo "🎉 Welcome to Memento! This appears to be your first run."
    echo ""
    echo "📋 Next Steps:"
    echo "   1. ${BLUE}Open the app:${NC} http://localhost:5173"
    echo "   2. ${BLUE}Sync your data:${NC} Click the sync button in the app"
    echo "      (or run: cd backend && python3 sync.py)"
    echo "   3. ${BLUE}Explore your insights:${NC} Browse by date or view all content"
    echo ""
        echo "💡 ${YELLOW}Don't see any data after syncing?${NC}"
        echo "   • Enable in Limitless: Settings → Notification → Daily Insights (ON)"
        echo "   • Check that you can see daily insights in Limitless chat history first"
        echo "   • Remember: insights are generated around 7:00 AM Pacific"
        echo "   • You can still create custom action items in the app!"
    echo ""
else
    echo "📝 Quick commands:"
    echo "   ${BLUE}Test API:${NC}    curl http://localhost:8000/stats"
    echo "   ${BLUE}Sync data:${NC}   cd backend && python3 sync.py"
    echo "   ${BLUE}Stop servers:${NC} Press Ctrl+C"
    echo ""
fi

print_info "Press Ctrl+C to stop all servers"
echo "============================================="

# Wait for user interrupt
wait $BACKEND_PID $FRONTEND_PID