# Technical Plan: Cross-Team Test Strategy

**Created**: February 19, 2026  
**Spec**: [spec.md](./spec.md)  
**Status**: Draft

---

## Architecture Overview

This feature extends the existing Test Strategy Tool with cross-team capabilities. The architecture follows the existing patterns (React frontend + FastAPI backend + SQLite).

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CrossTeam    │  │ Participants │  │ Breakdown    │      │
│  │ ProjectForm  │  │ Manager      │  │ Editor       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Progress     │  │ Assignment   │                        │
│  │ Dashboard    │  │ View         │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend API                           │
│  /api/projects/{id}/participants                            │
│  /api/strategies/{id}/breakdowns                            │
│  /api/breakdowns/{id}/items                                 │
│  /api/strategies/{id}/progress                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Database                              │
│  participants | breakdown_categories | breakdown_items      │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### New Tables

```sql
-- Participants table
CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    team VARCHAR(100) NOT NULL,
    role VARCHAR(100),
    email VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Breakdown categories table
CREATE TABLE breakdown_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'team', 'feature', 'environment'
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (strategy_id) REFERENCES test_strategies(id) ON DELETE CASCADE
);

-- Breakdown items table
CREATE TABLE breakdown_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    assignee_id INTEGER,
    status VARCHAR(20) DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed', 'blocked'
    priority VARCHAR(10) DEFAULT 'medium',  -- 'low', 'medium', 'high'
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES breakdown_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES participants(id) ON DELETE SET NULL
);
```

### Modify Existing Tables

```sql
-- Add is_cross_team to projects table
ALTER TABLE projects ADD COLUMN is_cross_team BOOLEAN DEFAULT FALSE;
```

## API Endpoints

### Participants API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/participants` | List all participants |
| POST | `/api/projects/{id}/participants` | Add participant |
| PUT | `/api/participants/{id}` | Update participant |
| DELETE | `/api/participants/{id}` | Remove participant |

### Breakdown API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies/{id}/breakdowns` | Get all categories with items |
| POST | `/api/strategies/{id}/breakdowns` | Create category |
| PUT | `/api/breakdowns/{id}` | Update category |
| DELETE | `/api/breakdowns/{id}` | Delete category |
| POST | `/api/breakdowns/{id}/items` | Add item to category |
| PUT | `/api/breakdown-items/{id}` | Update item |
| PATCH | `/api/breakdown-items/{id}/status` | Quick status update |
| DELETE | `/api/breakdown-items/{id}` | Delete item |

### Progress API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies/{id}/progress` | Get progress summary |
| GET | `/api/strategies/{id}/progress/by-participant` | Progress by person |
| GET | `/api/strategies/{id}/progress/by-category` | Progress by category |

## Frontend Components

### New Components

```
src/components/
├── CrossTeamBadge.jsx          # Visual indicator for cross-team projects
├── ParticipantsManager.jsx     # Add/edit/remove participants
├── ParticipantCard.jsx         # Single participant display
├── BreakdownEditor.jsx         # Main breakdown management
├── BreakdownCategory.jsx       # Category with items
├── BreakdownItem.jsx           # Single item with status
├── ProgressDashboard.jsx       # Overall progress view
├── ProgressBar.jsx             # Reusable progress bar
├── StatusBadge.jsx             # Status indicator (✅🔄⬜🚫)
└── AssigneeSelect.jsx          # Dropdown to assign participant
```

### Modified Components

```
src/pages/
├── ProjectDetail.jsx           # Add participants section for cross-team
├── StrategyView.jsx            # Add breakdown & progress tabs
├── StrategyEditor.jsx          # Add breakdown editor option
└── Projects.jsx                # Show cross-team badge
```

## UI/UX Design

### Project Detail - Cross-Team View

```
┌─────────────────────────────────────────────────────────────┐
│ 📁 Project: Payment Gateway Migration    [Cross-Team] 🏷️   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Documents] [Strategies] [👥 Participants] [Test Plans]    │
│                                                             │
│ 👥 Participants (4)                        [+ Add Member]  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 👤 Sarah Cohen      │ Team Alpha │ QA Lead    │ ✏️ 🗑️ ││
│ │ 👤 John Smith       │ Team Beta  │ QA Engineer│ ✏️ 🗑️ ││
│ │ 👤 Lisa Johnson     │ Team Gamma │ QA Engineer│ ✏️ 🗑️ ││
│ │ 👤 Mike Brown       │ Team Delta │ QA Lead    │ ✏️ 🗑️ ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Strategy View - Breakdown Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Strategy: Test Strategy v1.0                                │
├─────────────────────────────────────────────────────────────┤
│ [📄 Document] [📋 Breakdown] [📊 Progress] [💬 Review]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Breakdown Type: [By Team ▼] [By Feature] [By Environment]  │
│                                                             │
│ ┌─ Team Alpha ─────────────────────────────────────────┐   │
│ │ [+ Add Item]                                          │   │
│ │ ┌──────────────────────────────────────────────────┐ │   │
│ │ │ ✅ API Integration Tests                         │ │   │
│ │ │    Sarah Cohen │ High │ Completed                │ │   │
│ │ └──────────────────────────────────────────────────┘ │   │
│ │ ┌──────────────────────────────────────────────────┐ │   │
│ │ │ 🔄 Payment Flow E2E                              │ │   │
│ │ │    Sarah Cohen │ High │ In Progress              │ │   │
│ │ └──────────────────────────────────────────────────┘ │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Team Beta ──────────────────────────────────────────┐   │
│ │ [+ Add Item]                                          │   │
│ │ ┌──────────────────────────────────────────────────┐ │   │
│ │ │ ⬜ UI Regression Suite                           │ │   │
│ │ │    John Smith │ Medium │ Not Started             │ │   │
│ │ └──────────────────────────────────────────────────┘ │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add Category]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Progress Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Progress Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │    12    │ │    5     │ │    4     │ │    1     │       │
│ │  Total   │ │Completed │ │In Progress│ │ Blocked  │       │
│ │  Items   │ │   ✅     │ │    🔄    │ │   🚫     │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│ Overall Progress                                            │
│ ████████████████░░░░░░░░░░░░░░ 42%                         │
│                                                             │
│ By Participant                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Sarah (Alpha)  ████████████████████░░░░ 80% (4/5)      ││
│ │ John (Beta)    ████████░░░░░░░░░░░░░░░░ 33% (1/3)      ││
│ │ Lisa (Gamma)   ████░░░░░░░░░░░░░░░░░░░░ 25% (1/4)      ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Database & API (Backend)
1. Add database models and migrations
2. Create participants CRUD API
3. Create breakdown categories/items CRUD API
4. Create progress calculation API

### Phase 2: Participants Management (Frontend)
1. Add is_cross_team toggle to project form
2. Create ParticipantsManager component
3. Integrate into ProjectDetail page

### Phase 3: Breakdown Editor (Frontend)
1. Create BreakdownEditor component
2. Create category and item components
3. Add assignment functionality
4. Add status update (quick click)

### Phase 4: Progress Dashboard (Frontend)
1. Create ProgressDashboard component
2. Add progress calculations
3. Create visual charts/bars
4. Integrate into StrategyView

### Phase 5: Polish & Testing
1. Add loading states and error handling
2. Add empty states with helpful messages
3. Responsive design adjustments
4. End-to-end testing

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Status updates | PATCH endpoint | Quick single-field updates |
| Progress calculation | Backend | Consistent across clients |
| Breakdown ordering | order_index field | Drag-drop support later |
| Cascade deletes | ON DELETE CASCADE | Clean data removal |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Complex UI for breakdown | Start simple, iterate based on feedback |
| Performance with many items | Pagination + lazy loading |
| Data loss on delete | Confirmation dialogs + soft delete option |

---

## Next Steps

1. ✅ Spec approved
2. ✅ Plan created
3. ⏳ Run `/speckit.tasks` to create task breakdown
4. ⏳ Implement Phase 1 (Backend)




