from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from database import get_db
from models import Project, Document, TestStrategy, Participant
from schemas import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
def get_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    active_only: bool = Query(True),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    
    if active_only:
        query = query.filter(Project.is_active == True)
    
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    
    projects = query.order_by(Project.updated_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for proj in projects:
        doc_count = db.query(func.count(Document.id)).filter(Document.project_id == proj.id).scalar()
        strategy_count = db.query(func.count(TestStrategy.id)).filter(TestStrategy.project_id == proj.id).scalar()
        participant_count = db.query(func.count(Participant.id)).filter(Participant.project_id == proj.id).scalar()
        
        result.append(ProjectResponse(
            id=proj.id,
            name=proj.name,
            description=proj.description,
            is_cross_team=proj.is_cross_team or False,
            is_active=proj.is_active,
            created_at=proj.created_at,
            updated_at=proj.updated_at,
            document_count=doc_count,
            strategy_count=strategy_count,
            participant_count=participant_count
        ))
    
    return result


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    doc_count = db.query(func.count(Document.id)).filter(Document.project_id == project.id).scalar()
    strategy_count = db.query(func.count(TestStrategy.id)).filter(TestStrategy.project_id == project.id).scalar()
    participant_count = db.query(func.count(Participant.id)).filter(Participant.project_id == project.id).scalar()
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        is_cross_team=project.is_cross_team or False,
        is_active=project.is_active,
        created_at=project.created_at,
        updated_at=project.updated_at,
        document_count=doc_count,
        strategy_count=strategy_count,
        participant_count=participant_count
    )


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        is_cross_team=db_project.is_cross_team or False,
        is_active=db_project.is_active,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        document_count=0,
        strategy_count=0,
        participant_count=0
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    
    doc_count = db.query(func.count(Document.id)).filter(Document.project_id == db_project.id).scalar()
    strategy_count = db.query(func.count(TestStrategy.id)).filter(TestStrategy.project_id == db_project.id).scalar()
    participant_count = db.query(func.count(Participant.id)).filter(Participant.project_id == db_project.id).scalar()
    
    return ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        is_cross_team=db_project.is_cross_team or False,
        is_active=db_project.is_active,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        document_count=doc_count,
        strategy_count=strategy_count,
        participant_count=participant_count
    )


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_project.is_active = False
    db.commit()
    return None

