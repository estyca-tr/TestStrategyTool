from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from models import TestPlan, TestStrategy
from schemas import TestPlanCreate, TestPlanUpdate, TestPlanResponse
from services.jira_client import JiraClient

router = APIRouter()


@router.get("/search-jira")
def search_jira_issues(
    query: str = Query("", description="Search text for issue summary"),
    project_key: str = Query("QARD", description="Jira project key"),
    issue_type: str = Query("Test Plan", description="Issue type to filter"),
    max_results: int = Query(10, ge=1, le=50)
):
    """Search for Jira issues by summary text"""
    try:
        client = JiraClient()
        results = client.search_issues(query, project_key, issue_type, max_results)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_test_plans(
    project_id: Optional[int] = None,
    strategy_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(TestPlan).options(joinedload(TestPlan.strategy))
    
    if project_id:
        query = query.filter(TestPlan.project_id == project_id)
    
    if strategy_id:
        query = query.filter(TestPlan.strategy_id == strategy_id)
    
    if status:
        query = query.filter(TestPlan.status == status)
    
    plans = query.order_by(TestPlan.updated_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for plan in plans:
        result.append({
            "id": plan.id,
            "strategy_id": plan.strategy_id,
            "project_id": plan.project_id,
            "title": plan.title,
            "description": plan.description,
            "jira_issue_key": plan.jira_issue_key,
            "jira_issue_url": plan.jira_issue_url,
            "jira_project_key": plan.jira_project_key,
            "status": plan.status,
            "created_at": plan.created_at,
            "updated_at": plan.updated_at,
            "strategy_title": plan.strategy.title if plan.strategy else None
        })
    
    return result


@router.get("/{plan_id}", response_model=TestPlanResponse)
def get_test_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(TestPlan).options(
        joinedload(TestPlan.strategy)
    ).filter(TestPlan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    
    return TestPlanResponse(
        id=plan.id,
        strategy_id=plan.strategy_id,
        title=plan.title,
        description=plan.description,
        objectives=plan.objectives,
        features_to_test=plan.features_to_test,
        features_not_to_test=plan.features_not_to_test,
        test_cases_summary=plan.test_cases_summary,
        environment_requirements=plan.environment_requirements,
        schedule=plan.schedule,
        status=plan.status,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        strategy_title=plan.strategy.title if plan.strategy else None
    )


@router.post("", response_model=TestPlanResponse, status_code=201)
def create_test_plan(plan: TestPlanCreate, db: Session = Depends(get_db)):
    # Verify strategy exists
    strategy = db.query(TestStrategy).filter(TestStrategy.id == plan.strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    db_plan = TestPlan(**plan.model_dump())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    return TestPlanResponse(
        id=db_plan.id,
        strategy_id=db_plan.strategy_id,
        title=db_plan.title,
        description=db_plan.description,
        objectives=db_plan.objectives,
        features_to_test=db_plan.features_to_test,
        features_not_to_test=db_plan.features_not_to_test,
        test_cases_summary=db_plan.test_cases_summary,
        environment_requirements=db_plan.environment_requirements,
        schedule=db_plan.schedule,
        status=db_plan.status,
        created_at=db_plan.created_at,
        updated_at=db_plan.updated_at,
        strategy_title=strategy.title
    )


@router.put("/{plan_id}", response_model=TestPlanResponse)
def update_test_plan(plan_id: int, plan: TestPlanUpdate, db: Session = Depends(get_db)):
    db_plan = db.query(TestPlan).options(
        joinedload(TestPlan.strategy)
    ).filter(TestPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    
    update_data = plan.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plan, key, value)
    
    db.commit()
    db.refresh(db_plan)
    
    return TestPlanResponse(
        id=db_plan.id,
        strategy_id=db_plan.strategy_id,
        title=db_plan.title,
        description=db_plan.description,
        objectives=db_plan.objectives,
        features_to_test=db_plan.features_to_test,
        features_not_to_test=db_plan.features_not_to_test,
        test_cases_summary=db_plan.test_cases_summary,
        environment_requirements=db_plan.environment_requirements,
        schedule=db_plan.schedule,
        status=db_plan.status,
        created_at=db_plan.created_at,
        updated_at=db_plan.updated_at,
        strategy_title=db_plan.strategy.title if db_plan.strategy else None
    )


@router.delete("/{plan_id}", status_code=204)
def delete_test_plan(plan_id: int, db: Session = Depends(get_db)):
    db_plan = db.query(TestPlan).filter(TestPlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Test plan not found")
    
    db.delete(db_plan)
    db.commit()
    return None


@router.post("/link-jira", status_code=201)
def link_jira_test_plan(
    strategy_id: int,
    jira_issue_key: str,
    jira_issue_url: str = None,
    title: str = None,
    db: Session = Depends(get_db)
):
    """Link an existing Jira issue to a strategy as a test plan"""
    # Verify strategy exists
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Check if already linked
    existing = db.query(TestPlan).filter(
        TestPlan.strategy_id == strategy_id,
        TestPlan.jira_issue_key == jira_issue_key
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="This Jira issue is already linked to this strategy")
    
    # Extract project key from issue key (e.g., QARD-123 -> QARD)
    jira_project_key = jira_issue_key.split('-')[0] if '-' in jira_issue_key else None
    
    # Use provided title or default to "Jira: {key}"
    plan_title = title if title else f"Jira: {jira_issue_key}"
    
    # Create the link
    db_plan = TestPlan(
        strategy_id=strategy_id,
        project_id=strategy.project_id,
        title=plan_title,
        jira_issue_key=jira_issue_key,
        jira_issue_url=jira_issue_url or f"https://etoro-jira.atlassian.net/browse/{jira_issue_key}",
        jira_project_key=jira_project_key,
        status="active"
    )
    
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    return {
        "id": db_plan.id,
        "strategy_id": db_plan.strategy_id,
        "jira_issue_key": db_plan.jira_issue_key,
        "jira_issue_url": db_plan.jira_issue_url,
        "title": db_plan.title,
        "created_at": db_plan.created_at
    }

