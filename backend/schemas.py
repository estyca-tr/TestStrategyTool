from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ============== Project Schemas ==============

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    is_cross_team: bool = False


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_cross_team: Optional[bool] = None


class ProjectResponse(ProjectBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    document_count: Optional[int] = 0
    strategy_count: Optional[int] = 0
    participant_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ============== Document Schemas ==============

class DocumentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    doc_type: str  # hld, prd, other


class DocumentCreate(DocumentBase):
    project_id: int


class DocumentResponse(DocumentBase):
    id: int
    project_id: int
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    content_text: Optional[str] = None
    notes: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    project_id: int
    name: str = Field(..., min_length=1, max_length=200)
    content: str
    notes: Optional[str] = None


# ============== Test Strategy Schemas ==============

class RiskItem(BaseModel):
    risk: str
    impact: str  # high, medium, low
    mitigation: str


class TestStrategyBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    version: str = "1.0"
    is_cross_team: bool = False  # True = Cross-Team E2E, False = Regular Team Strategy
    introduction: Optional[str] = None
    scope_in: Optional[str] = None
    scope_out: Optional[str] = None
    test_approach: Optional[str] = None
    test_types: Optional[str] = None  # JSON string
    test_environment: Optional[str] = None
    entry_criteria: Optional[str] = None
    exit_criteria: Optional[str] = None
    risks_and_mitigations: Optional[str] = None  # JSON string
    open_points: Optional[str] = None  # Open questions/issues
    resources: Optional[str] = None
    schedule: Optional[str] = None
    deliverables: Optional[str] = None
    created_by: Optional[str] = None


class TestStrategyCreate(TestStrategyBase):
    project_id: int


class TestStrategyUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    version: Optional[str] = None
    status: Optional[str] = None
    is_cross_team: Optional[bool] = None  # Allow updating strategy type
    introduction: Optional[str] = None
    scope_in: Optional[str] = None
    scope_out: Optional[str] = None
    test_approach: Optional[str] = None
    test_types: Optional[str] = None
    test_environment: Optional[str] = None
    entry_criteria: Optional[str] = None
    exit_criteria: Optional[str] = None
    risks_and_mitigations: Optional[str] = None
    open_points: Optional[str] = None
    resources: Optional[str] = None
    schedule: Optional[str] = None
    deliverables: Optional[str] = None


class TestStrategyResponse(TestStrategyBase):
    id: int
    project_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None
    test_plan_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ============== Test Plan Schemas ==============

class TestPlanBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    objectives: Optional[str] = None
    features_to_test: Optional[str] = None
    features_not_to_test: Optional[str] = None
    test_cases_summary: Optional[str] = None
    environment_requirements: Optional[str] = None
    schedule: Optional[str] = None


class TestPlanCreate(TestPlanBase):
    strategy_id: int


class TestPlanUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None
    objectives: Optional[str] = None
    features_to_test: Optional[str] = None
    features_not_to_test: Optional[str] = None
    test_cases_summary: Optional[str] = None
    environment_requirements: Optional[str] = None
    schedule: Optional[str] = None


class TestPlanResponse(TestPlanBase):
    id: int
    strategy_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    strategy_title: Optional[str] = None

    class Config:
        from_attributes = True


# ============== Comment Schemas ==============

class CommentBase(BaseModel):
    section: Optional[str] = None  # Section name or null for general comment
    content: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1, max_length=100)


class CommentCreate(CommentBase):
    strategy_id: int


class CommentUpdate(BaseModel):
    content: Optional[str] = None
    is_resolved: Optional[bool] = None


class CommentResponse(CommentBase):
    id: int
    strategy_id: int
    is_resolved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Participant Schemas (Cross-Team) ==============

class ParticipantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    team: str = Field(..., min_length=1, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=200)


class ParticipantCreate(ParticipantBase):
    pass  # project_id comes from URL path parameter


class ParticipantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    team: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = None
    email: Optional[str] = None


class ParticipantResponse(ParticipantBase):
    id: int
    project_id: int
    created_at: datetime
    assigned_items_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ============== Breakdown Category Schemas (Cross-Team) ==============

class BreakdownCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., pattern="^(team|feature|environment|other)$")


class BreakdownCategoryCreate(BreakdownCategoryBase):
    # strategy_id comes from URL path parameter
    parent_id: Optional[int] = None  # For nested categories
    order_index: Optional[int] = 0
    eta: Optional[datetime] = None
    duration_days: Optional[int] = None


class BreakdownCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[str] = Field(None, pattern="^(team|feature|environment)$")
    order_index: Optional[int] = None
    eta: Optional[datetime] = None
    duration_days: Optional[int] = None


# ============== Breakdown Item Schemas (Cross-Team) ==============

class BreakdownItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    eta: Optional[datetime] = None  # Estimated completion date
    duration_days: Optional[int] = None  # Estimated duration in days


class BreakdownItemCreate(BreakdownItemBase):
    # category_id comes from URL path parameter
    parent_item_id: Optional[int] = None  # For nested sub-items (team responsibilities under a test)
    assignee_id: Optional[int] = None
    status: str = Field(default="not_started", pattern="^(not_started|in_progress|completed|blocked)$")
    order_index: Optional[int] = 0


class BreakdownItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(not_started|in_progress|completed|blocked)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    eta: Optional[datetime] = None
    duration_days: Optional[int] = None
    order_index: Optional[int] = None


class BreakdownItemResponse(BreakdownItemBase):
    id: int
    category_id: int
    parent_item_id: Optional[int] = None
    assignee_id: Optional[int] = None
    assignee_name: Optional[str] = None
    assignee_team: Optional[str] = None
    status: str
    priority: str
    eta: Optional[datetime] = None
    duration_days: Optional[int] = None
    order_index: int
    created_at: datetime
    updated_at: datetime
    sub_items: List['BreakdownItemResponse'] = []  # Nested team responsibilities

    class Config:
        from_attributes = True


# Enable forward references for recursive type
BreakdownItemResponse.model_rebuild()


class BreakdownCategoryResponse(BreakdownCategoryBase):
    id: int
    strategy_id: int
    parent_id: Optional[int] = None
    order_index: int
    eta: Optional[datetime] = None
    duration_days: Optional[int] = None
    created_at: datetime
    items: List[BreakdownItemResponse] = []
    children: List['BreakdownCategoryResponse'] = []  # Nested sub-categories
    items_count: Optional[int] = 0
    completed_count: Optional[int] = 0

    class Config:
        from_attributes = True


# Enable forward references for recursive type
BreakdownCategoryResponse.model_rebuild()


# ============== Progress Schemas (Cross-Team) ==============

class ProgressSummary(BaseModel):
    total_items: int
    completed: int
    in_progress: int
    blocked: int
    not_started: int
    completion_percentage: float


class ParticipantProgress(BaseModel):
    participant_id: int
    participant_name: str
    participant_team: str
    total_items: int
    completed: int
    completion_percentage: float


class CategoryProgress(BaseModel):
    category_id: int
    category_name: str
    category_type: str
    total_items: int
    completed: int
    completion_percentage: float


class StrategyProgress(BaseModel):
    strategy_id: int
    summary: ProgressSummary
    by_participant: List[ParticipantProgress]
    by_category: List[CategoryProgress]


# ============== User & Authentication Schemas ==============

class UserBase(BaseModel):
    email: Optional[str] = Field(None, max_length=255)  # Email is optional
    name: str = Field(..., min_length=1, max_length=200)  # Name is the username
    team: Optional[str] = None
    role: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = Field(None, min_length=6)


class UserLogin(BaseModel):
    username: str  # Can be username or email
    password: str


class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    team: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============== Sharing Schemas ==============

class ShareCreate(BaseModel):
    share_type: str = Field(..., pattern="^(project|strategy|breakdown)$")
    project_id: Optional[int] = None
    strategy_id: Optional[int] = None
    shared_with_email: Optional[str] = None  # Email to share with
    permission: str = Field(default="view", pattern="^(view|comment|edit|admin)$")
    is_public_link: bool = False
    expires_in_days: Optional[int] = None  # For link expiration


class ShareResponse(BaseModel):
    id: int
    share_type: str
    project_id: Optional[int] = None
    strategy_id: Optional[int] = None
    shared_by_id: int
    shared_by_name: Optional[str] = None
    shared_with_id: Optional[int] = None
    shared_with_email: Optional[str] = None
    shared_with_name: Optional[str] = None
    permission: str
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    is_public_link: bool
    link_expires_at: Optional[datetime] = None
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ShareUpdate(BaseModel):
    permission: Optional[str] = Field(None, pattern="^(view|comment|edit|admin)$")
    is_active: Optional[bool] = None


class ShareListResponse(BaseModel):
    shares: List[ShareResponse]
    total: int

