from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class DocumentType(enum.Enum):
    HLD = "hld"
    PRD = "prd"
    OTHER = "other"


class StrategyStatus(enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"


class BreakdownType(enum.Enum):
    TEAM = "team"
    FEATURE = "feature"
    ENVIRONMENT = "environment"


class ItemStatus(enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class ItemPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_cross_team = Column(Boolean, default=False)  # Cross-team project flag
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    strategies = relationship("TestStrategy", back_populates="project", cascade="all, delete-orphan")
    participants = relationship("Participant", back_populates="project", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    doc_type = Column(String(20), nullable=False)  # hld, prd, other, note
    file_path = Column(String(500))
    file_type = Column(String(20))  # pdf, docx, md, text
    content_text = Column(Text)  # Extracted text or free text content
    notes = Column(Text)  # Additional notes/prompt for the document
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="documents")


class TestStrategy(Base):
    __tablename__ = "test_strategies"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(200), nullable=False)
    version = Column(String(20), default="1.0")
    status = Column(String(20), default="draft")
    is_cross_team = Column(Boolean, default=False)  # True = Cross-Team E2E, False = Regular Team Strategy
    
    # Strategy sections
    introduction = Column(Text)
    scope_in = Column(Text)
    scope_out = Column(Text)
    test_approach = Column(Text)
    test_types = Column(Text)  # JSON string
    test_environment = Column(Text)
    entry_criteria = Column(Text)
    exit_criteria = Column(Text)
    risks_and_mitigations = Column(Text)  # JSON string
    open_points = Column(Text)  # Open questions/issues to resolve
    resources = Column(Text)
    schedule = Column(Text)
    deliverables = Column(Text)
    
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="strategies")
    test_plans = relationship("TestPlan", back_populates="strategy", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="strategy", cascade="all, delete-orphan")
    breakdown_categories = relationship("BreakdownCategory", back_populates="strategy", cascade="all, delete-orphan")


class TestPlan(Base):
    __tablename__ = "test_plans"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("test_strategies.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Jira integration
    jira_issue_key = Column(String(50))  # e.g., QARD-79896
    jira_issue_url = Column(String(500))  # Full URL to the Jira issue
    jira_project_key = Column(String(20))  # e.g., QARD
    
    # Test plan sections
    objectives = Column(Text)
    features_to_test = Column(Text)  # JSON string
    features_not_to_test = Column(Text)  # JSON string
    test_cases_summary = Column(Text)  # JSON string
    environment_requirements = Column(Text)
    schedule = Column(Text)
    
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    strategy = relationship("TestStrategy", back_populates="test_plans")
    project = relationship("Project")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("test_strategies.id"), nullable=False)
    section = Column(String(50))  # Which section the comment is about (or null for general)
    author = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    strategy = relationship("TestStrategy", back_populates="comments")


# ============================================
# Cross-Team Models
# ============================================

class Participant(Base):
    """Team members participating in cross-team test strategies"""
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    team = Column(String(100), nullable=False)
    role = Column(String(100))  # Optional: QA Lead, QA Engineer, etc.
    email = Column(String(200))  # Optional
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="participants")
    assigned_items = relationship("BreakdownItem", back_populates="assignee")


class BreakdownCategory(Base):
    """Categories for organizing test breakdown (by team, feature, or environment)"""
    __tablename__ = "breakdown_categories"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("test_strategies.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("breakdown_categories.id"), nullable=True)  # For nested categories
    name = Column(String(200), nullable=False)
    type = Column(String(20), nullable=False)  # 'team', 'feature', 'environment'
    eta = Column(DateTime, nullable=True)  # Estimated completion date for this category
    duration_days = Column(Integer, nullable=True)  # Estimated duration in days
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    strategy = relationship("TestStrategy", back_populates="breakdown_categories")
    items = relationship("BreakdownItem", back_populates="category", cascade="all, delete-orphan")
    parent = relationship("BreakdownCategory", remote_side=[id], back_populates="children")
    children = relationship("BreakdownCategory", back_populates="parent", cascade="all, delete-orphan")


class BreakdownItem(Base):
    """Individual test items within a breakdown category"""
    __tablename__ = "breakdown_items"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("breakdown_categories.id"), nullable=False)
    parent_item_id = Column(Integer, ForeignKey("breakdown_items.id"), nullable=True)  # For nested sub-items
    title = Column(String(300), nullable=False)
    description = Column(Text)
    assignee_id = Column(Integer, ForeignKey("participants.id"), nullable=True)
    status = Column(String(20), default="not_started")  # not_started, in_progress, completed, blocked
    priority = Column(String(10), default="medium")  # low, medium, high
    eta = Column(DateTime, nullable=True)  # Estimated completion date
    duration_days = Column(Integer, nullable=True)  # Estimated duration in days
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("BreakdownCategory", back_populates="items")
    assignee = relationship("Participant", back_populates="assigned_items")
    parent_item = relationship("BreakdownItem", remote_side=[id], back_populates="sub_items")
    sub_items = relationship("BreakdownItem", back_populates="parent_item", cascade="all, delete-orphan")


# ============== User & Authentication ==============

class User(Base):
    """User account for authentication and ownership"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    password_hash = Column(String(255), nullable=True)  # Null for SSO users
    avatar_url = Column(String(500))
    team = Column(String(100))
    role = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    owned_projects = relationship("Project", back_populates="owner", foreign_keys="Project.owner_id")
    shares_given = relationship("Share", back_populates="shared_by", foreign_keys="Share.shared_by_id")
    shares_received = relationship("Share", back_populates="shared_with", foreign_keys="Share.shared_with_id")


class SharePermission(enum.Enum):
    VIEW = "view"           # Can view only
    COMMENT = "comment"     # Can view and add comments
    EDIT = "edit"           # Can edit content
    ADMIN = "admin"         # Can edit and manage shares


class ShareType(enum.Enum):
    PROJECT = "project"
    STRATEGY = "strategy"
    BREAKDOWN = "breakdown"


class Share(Base):
    """Sharing permissions for projects and strategies"""
    __tablename__ = "shares"

    id = Column(Integer, primary_key=True, index=True)
    
    # What is being shared
    share_type = Column(String(50), nullable=False)  # project, strategy, breakdown
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    strategy_id = Column(Integer, ForeignKey("test_strategies.id"), nullable=True)
    
    # Who shared and with whom
    shared_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_with_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null = shared via link
    shared_with_email = Column(String(255))  # For inviting non-users
    
    # Permissions
    permission = Column(String(20), default="view")  # view, comment, edit, admin
    
    # Share link (for public/link sharing)
    share_token = Column(String(100), unique=True, index=True)
    is_public_link = Column(Boolean, default=False)
    link_expires_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    accessed_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    shared_by = relationship("User", back_populates="shares_given", foreign_keys=[shared_by_id])
    shared_with = relationship("User", back_populates="shares_received", foreign_keys=[shared_with_id])
    project = relationship("Project", back_populates="shares")
    strategy = relationship("TestStrategy", back_populates="shares")


# ============== Quick Notes ==============

class NoteCategory(enum.Enum):
    GENERAL = "general"
    LINK = "link"
    CREDENTIALS = "credentials"
    CONTACT = "contact"
    REFERENCE = "reference"


class QuickNote(Base):
    """Quick notes for storing important information"""
    __tablename__ = "quick_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    category = Column(String(50), default="general")  # general, link, credentials, contact, reference
    is_pinned = Column(Boolean, default=False)
    color = Column(String(20), default="#3b82f6")  # For visual organization
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notes")


# Add notes relationship to User
User.notes = relationship("QuickNote", back_populates="user", cascade="all, delete-orphan")


# Add owner_id to Project
Project.owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
Project.owner = relationship("User", back_populates="owned_projects", foreign_keys=[Project.owner_id])
Project.shares = relationship("Share", back_populates="project")

# Add shares relationship to TestStrategy
TestStrategy.shares = relationship("Share", back_populates="strategy")

