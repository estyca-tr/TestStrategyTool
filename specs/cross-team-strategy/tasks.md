# Implementation Tasks: Cross-Team Test Strategy

**Created**: February 19, 2026  
**Plan**: [plan.md](./plan.md)  
**Status**: Ready for Implementation

---

## Task Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Backend | 8 tasks | ~2 hours |
| Phase 2: Participants UI | 5 tasks | ~1.5 hours |
| Phase 3: Breakdown Editor | 7 tasks | ~2 hours |
| Phase 4: Progress Dashboard | 5 tasks | ~1.5 hours |
| Phase 5: Polish | 4 tasks | ~1 hour |
| **Total** | **29 tasks** | **~8 hours** |

---

## Phase 1: Database & Backend API

### Task 1.1: Database Models
- [ ] Add `is_cross_team` field to Project model
- [ ] Create Participant model
- [ ] Create BreakdownCategory model
- [ ] Create BreakdownItem model
- [ ] Update relationships in existing models

### Task 1.2: Database Migration
- [ ] Create migration script for new tables
- [ ] Test migration on existing database

### Task 1.3: Pydantic Schemas
- [ ] Create ParticipantCreate, ParticipantResponse schemas
- [ ] Create BreakdownCategoryCreate, BreakdownCategoryResponse schemas
- [ ] Create BreakdownItemCreate, BreakdownItemResponse schemas
- [ ] Create ProgressSummary schema

### Task 1.4: Participants Router
- [ ] GET /projects/{id}/participants - list participants
- [ ] POST /projects/{id}/participants - add participant
- [ ] PUT /participants/{id} - update participant
- [ ] DELETE /participants/{id} - remove participant

### Task 1.5: Breakdown Categories Router
- [ ] GET /strategies/{id}/breakdowns - get all with items
- [ ] POST /strategies/{id}/breakdowns - create category
- [ ] PUT /breakdowns/{id} - update category
- [ ] DELETE /breakdowns/{id} - delete category (cascade items)

### Task 1.6: Breakdown Items Router
- [ ] POST /breakdowns/{id}/items - add item
- [ ] PUT /breakdown-items/{id} - update item
- [ ] PATCH /breakdown-items/{id}/status - quick status update
- [ ] DELETE /breakdown-items/{id} - delete item

### Task 1.7: Progress Router
- [ ] GET /strategies/{id}/progress - overall summary
- [ ] GET /strategies/{id}/progress/by-participant
- [ ] GET /strategies/{id}/progress/by-category

### Task 1.8: Update Project Router
- [ ] Add is_cross_team to project create/update
- [ ] Include participants count in project response

---

## Phase 2: Participants Management (Frontend)

### Task 2.1: API Functions
- [ ] Add participantsAPI to api.js (getAll, create, update, delete)

### Task 2.2: ParticipantsManager Component
- [ ] Create component with add/edit/delete functionality
- [ ] Table view with participant details
- [ ] Add participant modal/form
- [ ] Edit inline or modal

### Task 2.3: Update ProjectDetail
- [ ] Add "Participants" tab for cross-team projects
- [ ] Show participant count badge
- [ ] Integrate ParticipantsManager

### Task 2.4: Update Project Form
- [ ] Add "Cross-Team Project" toggle
- [ ] Visual indicator when enabled

### Task 2.5: CrossTeamBadge Component
- [ ] Create badge component
- [ ] Add to Projects list
- [ ] Add to ProjectDetail header

---

## Phase 3: Breakdown Editor (Frontend)

### Task 3.1: API Functions
- [ ] Add breakdownAPI to api.js (categories CRUD, items CRUD)
- [ ] Add status update function

### Task 3.2: BreakdownEditor Component
- [ ] Main container component
- [ ] Breakdown type selector (team/feature/environment)
- [ ] Add category button
- [ ] Category list

### Task 3.3: BreakdownCategory Component
- [ ] Category header with name and actions
- [ ] Items list
- [ ] Add item button
- [ ] Collapse/expand functionality

### Task 3.4: BreakdownItem Component
- [ ] Item display with title, assignee, status, priority
- [ ] Status quick-toggle (click to change)
- [ ] Edit mode
- [ ] Delete with confirmation

### Task 3.5: AssigneeSelect Component
- [ ] Dropdown with project participants
- [ ] Show team name with participant
- [ ] Unassigned option

### Task 3.6: StatusBadge Component
- [ ] Visual status indicators (✅🔄⬜🚫)
- [ ] Click to cycle through statuses
- [ ] Color coding

### Task 3.7: Integrate into StrategyView
- [ ] Add "Breakdown" tab
- [ ] Show only for cross-team strategies
- [ ] Link to progress dashboard

---

## Phase 4: Progress Dashboard (Frontend)

### Task 4.1: API Functions
- [ ] Add progressAPI to api.js
- [ ] Fetch summary, by-participant, by-category

### Task 4.2: ProgressDashboard Component
- [ ] Summary cards (total, completed, in-progress, blocked)
- [ ] Overall progress bar
- [ ] Container layout

### Task 4.3: ProgressBar Component
- [ ] Reusable progress bar
- [ ] Color based on percentage
- [ ] Show percentage label

### Task 4.4: ParticipantProgress Component
- [ ] List of participants with progress
- [ ] Progress bar per participant
- [ ] Items count (completed/total)

### Task 4.5: Integrate into StrategyView
- [ ] Add "Progress" tab
- [ ] Auto-refresh on status changes
- [ ] Link items to breakdown editor

---

## Phase 5: Polish & Testing

### Task 5.1: Loading States
- [ ] Add loading spinners to all async operations
- [ ] Skeleton loaders for lists

### Task 5.2: Empty States
- [ ] No participants message with CTA
- [ ] No breakdown items message
- [ ] First-time user guidance

### Task 5.3: Error Handling
- [ ] API error messages
- [ ] Validation errors in forms
- [ ] Retry options

### Task 5.4: Responsive Design
- [ ] Mobile-friendly breakdown view
- [ ] Collapsible categories on mobile
- [ ] Touch-friendly status toggles

---

## Definition of Done

- [ ] All API endpoints working and tested
- [ ] UI components render correctly
- [ ] Status updates reflect immediately
- [ ] Progress calculations are accurate
- [ ] No console errors
- [ ] Works on mobile viewport

---

## Ready to Start?

Type **"התחל"** and I'll begin implementing Phase 1 (Backend).




