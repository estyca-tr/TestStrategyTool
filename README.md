# Test Strategy Tool

A beautiful, intuitive tool for creating and managing test strategy documents.

## Features

- **Project Management** - Organize documents and strategies by project
- **Document Upload** - Upload HLD, PRD, and other documents (PDF, Word, Markdown)
- **Strategy Editor** - Create comprehensive test strategies with guided sections
- **Test Plan Generation** - Create test plans based on your strategies
- **Modern UI** - Clean, professional interface with dark theme

## Quick Start

### Option 1: One-click start (Mac/Linux)

```bash
./start.sh
```

### Option 2: Manual start

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Open:** http://localhost:5173

## Project Structure

```
TestStrategyTool/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── database.py          # SQLite setup
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/
│   │   ├── projects.py      # Projects API
│   │   ├── documents.py     # Document upload API
│   │   ├── strategies.py    # Test strategies API
│   │   └── test_plans.py    # Test plans API
│   └── services/
│       └── file_parser.py   # PDF/Word text extraction
├── frontend/
│   └── src/
│       ├── components/      # React components
│       ├── pages/           # Page components
│       └── services/        # API client
└── README.md
```

## Test Strategy Sections

The tool guides you through creating a comprehensive test strategy:

1. **Introduction** - Overview of the system under test
2. **In Scope** - Features to be tested
3. **Out of Scope** - Features excluded and why
4. **Test Approach** - Testing methodology
5. **Test Types** - Types of testing to perform
6. **Test Environment** - Environment requirements
7. **Entry Criteria** - Conditions to start testing
8. **Exit Criteria** - Conditions to complete testing
9. **Risks & Mitigations** - Risk assessment
10. **Resources** - Team and tools
11. **Schedule** - Timeline
12. **Deliverables** - Expected outputs

## API Documentation

Once the backend is running, visit: http://localhost:8000/docs

## License

MIT






