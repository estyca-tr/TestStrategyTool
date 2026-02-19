from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from database import get_db
from models import TestStrategy, Project, TestPlan, Document, Participant
from datetime import datetime
from schemas import TestStrategyCreate, TestStrategyUpdate, TestStrategyResponse
from services.content_generator import generate_strategy_content
from services.confluence_client import ConfluenceClient, strategy_to_confluence_html
from services.jira_client import JiraClient

router = APIRouter()


@router.get("", response_model=List[TestStrategyResponse])
def get_strategies(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(TestStrategy).options(joinedload(TestStrategy.project))
    
    if project_id:
        query = query.filter(TestStrategy.project_id == project_id)
    
    if status:
        query = query.filter(TestStrategy.status == status)
    
    strategies = query.order_by(TestStrategy.updated_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for strategy in strategies:
        plan_count = db.query(func.count(TestPlan.id)).filter(TestPlan.strategy_id == strategy.id).scalar()
        
        result.append(TestStrategyResponse(
            id=strategy.id,
            project_id=strategy.project_id,
            title=strategy.title,
            version=strategy.version,
            status=strategy.status,
            is_cross_team=strategy.is_cross_team,
            introduction=strategy.introduction,
            scope_in=strategy.scope_in,
            scope_out=strategy.scope_out,
            test_approach=strategy.test_approach,
            test_types=strategy.test_types,
            test_environment=strategy.test_environment,
            entry_criteria=strategy.entry_criteria,
            exit_criteria=strategy.exit_criteria,
            risks_and_mitigations=strategy.risks_and_mitigations,
            open_points=strategy.open_points,
            resources=strategy.resources,
            schedule=strategy.schedule,
            deliverables=strategy.deliverables,
            created_by=strategy.created_by,
            created_at=strategy.created_at,
            updated_at=strategy.updated_at,
            project_name=strategy.project.name if strategy.project else None,
            test_plan_count=plan_count
        ))
    
    return result


@router.get("/{strategy_id}", response_model=TestStrategyResponse)
def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(TestStrategy).options(
        joinedload(TestStrategy.project)
    ).filter(TestStrategy.id == strategy_id).first()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    plan_count = db.query(func.count(TestPlan.id)).filter(TestPlan.strategy_id == strategy.id).scalar()
    
    return TestStrategyResponse(
        id=strategy.id,
        project_id=strategy.project_id,
        title=strategy.title,
        version=strategy.version,
        status=strategy.status,
        is_cross_team=strategy.is_cross_team,
        introduction=strategy.introduction,
        scope_in=strategy.scope_in,
        scope_out=strategy.scope_out,
        test_approach=strategy.test_approach,
        test_types=strategy.test_types,
        test_environment=strategy.test_environment,
        entry_criteria=strategy.entry_criteria,
        exit_criteria=strategy.exit_criteria,
        risks_and_mitigations=strategy.risks_and_mitigations,
        open_points=strategy.open_points,
        resources=strategy.resources,
        schedule=strategy.schedule,
        deliverables=strategy.deliverables,
        created_by=strategy.created_by,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
        project_name=strategy.project.name if strategy.project else None,
        test_plan_count=plan_count
    )


@router.post("", response_model=TestStrategyResponse, status_code=201)
def create_strategy(strategy: TestStrategyCreate, db: Session = Depends(get_db)):
    # Verify project exists
    project = db.query(Project).filter(Project.id == strategy.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_strategy = TestStrategy(**strategy.model_dump())
    db.add(db_strategy)
    db.commit()
    db.refresh(db_strategy)
    
    return TestStrategyResponse(
        id=db_strategy.id,
        project_id=db_strategy.project_id,
        title=db_strategy.title,
        version=db_strategy.version,
        status=db_strategy.status,
        is_cross_team=db_strategy.is_cross_team,
        introduction=db_strategy.introduction,
        scope_in=db_strategy.scope_in,
        scope_out=db_strategy.scope_out,
        test_approach=db_strategy.test_approach,
        test_types=db_strategy.test_types,
        test_environment=db_strategy.test_environment,
        entry_criteria=db_strategy.entry_criteria,
        exit_criteria=db_strategy.exit_criteria,
        risks_and_mitigations=db_strategy.risks_and_mitigations,
        open_points=db_strategy.open_points,
        resources=db_strategy.resources,
        schedule=db_strategy.schedule,
        deliverables=db_strategy.deliverables,
        created_by=db_strategy.created_by,
        created_at=db_strategy.created_at,
        updated_at=db_strategy.updated_at,
        project_name=project.name,
        test_plan_count=0
    )


@router.put("/{strategy_id}", response_model=TestStrategyResponse)
def update_strategy(strategy_id: int, strategy: TestStrategyUpdate, db: Session = Depends(get_db)):
    db_strategy = db.query(TestStrategy).options(
        joinedload(TestStrategy.project)
    ).filter(TestStrategy.id == strategy_id).first()
    
    if not db_strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    update_data = strategy.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_strategy, key, value)
    
    db.commit()
    db.refresh(db_strategy)
    
    plan_count = db.query(func.count(TestPlan.id)).filter(TestPlan.strategy_id == db_strategy.id).scalar()
    
    return TestStrategyResponse(
        id=db_strategy.id,
        project_id=db_strategy.project_id,
        title=db_strategy.title,
        version=db_strategy.version,
        status=db_strategy.status,
        is_cross_team=db_strategy.is_cross_team,
        introduction=db_strategy.introduction,
        scope_in=db_strategy.scope_in,
        scope_out=db_strategy.scope_out,
        test_approach=db_strategy.test_approach,
        test_types=db_strategy.test_types,
        test_environment=db_strategy.test_environment,
        entry_criteria=db_strategy.entry_criteria,
        exit_criteria=db_strategy.exit_criteria,
        risks_and_mitigations=db_strategy.risks_and_mitigations,
        open_points=db_strategy.open_points,
        resources=db_strategy.resources,
        schedule=db_strategy.schedule,
        deliverables=db_strategy.deliverables,
        created_by=db_strategy.created_by,
        created_at=db_strategy.created_at,
        updated_at=db_strategy.updated_at,
        project_name=db_strategy.project.name if db_strategy.project else None,
        test_plan_count=plan_count
    )


@router.delete("/{strategy_id}", status_code=204)
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    db_strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not db_strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    db.delete(db_strategy)
    db.commit()
    return None


@router.post("/generate/{project_id}")
def generate_from_documents(project_id: int, db: Session = Depends(get_db)):
    """Generate test strategy content based on project documents"""
    
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all documents for the project
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    
    if not documents:
        raise HTTPException(
            status_code=400, 
            detail="No documents found for this project. Please upload HLD/PRD documents first."
        )
    
    # Convert to list of dicts
    doc_list = [
        {
            'name': doc.name,
            'doc_type': doc.doc_type,
            'content_text': doc.content_text
        }
        for doc in documents
    ]
    
    # Get participants for cross-team projects
    participants_list = []
    if project.is_cross_team:
        participants = db.query(Participant).filter(Participant.project_id == project_id).all()
        participants_list = [
            {
                'id': p.id,
                'name': p.name,
                'team': p.team,
                'role': p.role,
                'email': p.email
            }
            for p in participants
        ]
    
    # Generate content with cross-team context
    generated = generate_strategy_content(
        doc_list, 
        is_cross_team=project.is_cross_team,
        participants=participants_list
    )
    
    return {
        "project_id": project_id,
        "project_name": project.name,
        "is_cross_team": project.is_cross_team,
        "participant_count": len(participants_list),
        "generated_content": generated,
        "document_count": len(documents)
    }


@router.post("/{strategy_id}/publish-confluence")
def publish_to_confluence(
    strategy_id: int, 
    space_key: str = Query(default="MG"),
    parent_page_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Publish a test strategy to Confluence"""
    
    # Get the strategy
    strategy = db.query(TestStrategy).options(
        joinedload(TestStrategy.project)
    ).filter(TestStrategy.id == strategy_id).first()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Prepare strategy data for conversion
    strategy_data = {
        'title': strategy.title,
        'project_name': strategy.project.name if strategy.project else 'N/A',
        'version': strategy.version,
        'status': strategy.status,
        'created_by': strategy.created_by,
        'introduction': strategy.introduction,
        'scope_in': strategy.scope_in,
        'scope_out': strategy.scope_out,
        'test_approach': strategy.test_approach,
        'test_types': strategy.test_types,
        'test_environment': strategy.test_environment,
        'entry_criteria': strategy.entry_criteria,
        'exit_criteria': strategy.exit_criteria,
        'risks_and_mitigations': strategy.risks_and_mitigations,
        'resources': strategy.resources,
        'schedule': strategy.schedule,
        'deliverables': strategy.deliverables
    }
    
    # Convert to Confluence HTML format
    html_content = strategy_to_confluence_html(strategy_data)
    
    # Initialize Confluence client
    client = ConfluenceClient()
    
    try:
        # Check if page already exists
        page_title = f"Test Strategy: {strategy.title}"
        existing_page = client.find_page_by_title(space_key, page_title)
        
        if existing_page:
            # Update existing page
            version = existing_page.get('version', {}).get('number', 1)
            result = client.update_page(
                page_id=existing_page['id'],
                title=page_title,
                content_html=html_content,
                version=version
            )
            action = "updated"
        else:
            # Create new page
            result = client.create_page(
                space_key=space_key,
                title=page_title,
                content_html=html_content,
                parent_id=parent_page_id
            )
            action = "created"
        
        # Build the page URL
        page_url = f"{client.base_url}/spaces/{space_key}/pages/{result['id']}"
        
        return {
            "success": True,
            "action": action,
            "page_id": result['id'],
            "page_title": page_title,
            "page_url": page_url,
            "space_key": space_key
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to publish to Confluence: {str(e)}"
        )


@router.get("/jira/issue-types/{project_key}")
def get_jira_issue_types(project_key: str):
    """Get available issue types for a Jira project"""
    client = JiraClient()
    
    try:
        issue_types = client.get_issue_types(project_key)
        return {
            "project_key": project_key,
            "issue_types": [
                {"id": it.get("id"), "name": it.get("name"), "description": it.get("description", "")}
                for it in issue_types
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch issue types: {str(e)}"
        )


@router.post("/{strategy_id}/create-jira-test-plan")
def create_jira_test_plan(
    strategy_id: int,
    project_key: str = Query(..., description="Jira project key (e.g., MG, QA)"),
    issue_type: str = Query(default="Story", description="Issue type name"),
    db: Session = Depends(get_db)
):
    """Create a Test Plan issue in Jira based on the strategy"""
    
    # Get the strategy
    strategy = db.query(TestStrategy).options(
        joinedload(TestStrategy.project)
    ).filter(TestStrategy.id == strategy_id).first()
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Initialize Jira client
    client = JiraClient()
    
    try:
        # Create the issue with strategy title as summary
        summary = f"Test Plan: {strategy.title}"
        
        result = client.create_issue(
            project_key=project_key,
            summary=summary,
            description="",  # Empty for now as requested
            issue_type=issue_type
        )
        
        # Save the test plan to the database
        test_plan = TestPlan(
            strategy_id=strategy_id,
            project_id=strategy.project_id,
            title=summary,
            jira_issue_key=result["key"],
            jira_issue_url=result["url"],
            jira_project_key=project_key,
            status="created"
        )
        db.add(test_plan)
        db.commit()
        
        return {
            "success": True,
            "issue_key": result["key"],
            "issue_id": result["id"],
            "issue_url": result["url"],
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Jira issue: {str(e)}"
        )

