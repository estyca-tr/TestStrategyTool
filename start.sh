#!/bin/bash

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     📋 Test Strategy Tool              ║"
echo "╚════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not installed. Please install from: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python3 found"

# Confluence & Jira configuration (set these as environment variables)
# export CONFLUENCE_BASE_URL="https://your-company.atlassian.net/wiki"
# export CONFLUENCE_USER_EMAIL="your-email@company.com"
# export CONFLUENCE_API_TOKEN="your-token-here"
# export JIRA_BASE_URL="https://your-company.atlassian.net"
# export JIRA_USER_EMAIL="your-email@company.com"
# export JIRA_API_TOKEN="your-token-here"

# Setup Backend
echo "📦 Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
pip install -r requirements.txt -q

echo "🔧 Starting Backend on port 8000..."
./venv/bin/uvicorn main:app --port 8000 &
BACKEND_PID=$!
sleep 2
cd ..

# Setup Frontend  
echo "📦 Setting up Frontend..."
cd frontend

# Check for Node.js
if command -v npm &> /dev/null; then
    npm install --silent 2>/dev/null
    echo "✅ Frontend ready"
    
    echo ""
    echo "════════════════════════════════════════"
    echo "🌐 Opening application..."
    echo ""
    echo "   Frontend: http://localhost:5173"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📌 Press Ctrl+C to stop"
    echo "════════════════════════════════════════"
    echo ""
    
    sleep 1
    open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null
    
    npm run dev
else
    echo ""
    echo "════════════════════════════════════════"
    echo "⚠️  Node.js not found"
    echo ""
    echo "Backend is running at: http://localhost:8000/docs"
    echo ""
    echo "To start frontend, install Node.js from:"
    echo "https://nodejs.org"
    echo ""
    echo "Then run: cd frontend && npm install && npm run dev"
    echo "════════════════════════════════════════"
    
    open http://localhost:8000/docs 2>/dev/null
    
    # Keep backend running
    wait $BACKEND_PID
fi

# Cleanup
kill $BACKEND_PID 2>/dev/null
