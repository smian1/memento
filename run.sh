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

# Check .env file
if [ ! -f .env ]; then
    print_warning ".env file not found!"
    echo ""
    echo "To get started:"
    echo "1. Copy the template: cp .env.example .env"
    echo "2. Get your API key from: https://www.limitless.ai/developers"
    echo "3. Add your API key to .env file"
    echo "4. Run this script again"
    echo ""
    exit 1
fi

# Validate API key in .env
if ! grep -q "LIMITLESS_API_KEY=" .env || grep -q "LIMITLESS_API_KEY=your_limitless_api_key_here" .env; then
    print_warning "LIMITLESS_API_KEY not properly configured in .env file"
    echo ""
    echo "Please edit .env and add your actual Limitless API key:"
    echo "LIMITLESS_API_KEY=your_actual_api_key_here"
    echo ""
    echo "Get your API key from: https://www.limitless.ai/developers"
    exit 1
fi

print_status "Environment configuration found"

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

echo ""
print_status "All servers started successfully!"
echo ""
echo "🔗 Access your application:"
echo "   ${GREEN}Frontend:${NC}    http://localhost:5173"
echo "   ${GREEN}Backend API:${NC} http://localhost:8000"
echo "   ${GREEN}API Docs:${NC}    http://localhost:8000/docs"
echo ""
echo "📝 Quick commands:"
echo "   ${BLUE}Test API:${NC}    curl http://localhost:8000/stats"
echo "   ${BLUE}Sync data:${NC}   cd backend && python3 sync.py"
echo "   ${BLUE}Stop servers:${NC} Press Ctrl+C"
echo ""
print_info "Press Ctrl+C to stop all servers"
echo "============================================="

# Wait for user interrupt
wait $BACKEND_PID $FRONTEND_PID