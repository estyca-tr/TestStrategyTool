from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Participant, Project
from schemas import ParticipantCreate, ParticipantUpdate, ParticipantResponse

router = APIRouter()


@router.get("/projects/{project_id}/participants", response_model=List[ParticipantResponse])
def get_project_participants(
    project_id: int,
    team: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all participants for a project"""
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = db.query(Participant).filter(Participant.project_id == project_id)
    
    if team:
        query = query.filter(Participant.team == team)
    
    participants = query.order_by(Participant.team, Participant.name).all()
    
    result = []
    for p in participants:
        result.append(ParticipantResponse(
            id=p.id,
            project_id=p.project_id,
            name=p.name,
            team=p.team,
            role=p.role,
            email=p.email,
            created_at=p.created_at,
            assigned_items_count=len(p.assigned_items) if p.assigned_items else 0
        ))
    
    return result


@router.post("/projects/{project_id}/participants", response_model=ParticipantResponse, status_code=201)
def create_participant(
    project_id: int,
    participant: ParticipantCreate,
    db: Session = Depends(get_db)
):
    """Add a participant to a project"""
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if participant with same name and team already exists
    existing = db.query(Participant).filter(
        Participant.project_id == project_id,
        Participant.name == participant.name,
        Participant.team == participant.team
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Participant '{participant.name}' from team '{participant.team}' already exists"
        )
    
    db_participant = Participant(
        project_id=project_id,
        name=participant.name,
        team=participant.team,
        role=participant.role,
        email=participant.email
    )
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    
    return ParticipantResponse(
        id=db_participant.id,
        project_id=db_participant.project_id,
        name=db_participant.name,
        team=db_participant.team,
        role=db_participant.role,
        email=db_participant.email,
        created_at=db_participant.created_at,
        assigned_items_count=0
    )


@router.get("/participants/{participant_id}", response_model=ParticipantResponse)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
    """Get a specific participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    return ParticipantResponse(
        id=participant.id,
        project_id=participant.project_id,
        name=participant.name,
        team=participant.team,
        role=participant.role,
        email=participant.email,
        created_at=participant.created_at,
        assigned_items_count=len(participant.assigned_items) if participant.assigned_items else 0
    )


@router.put("/participants/{participant_id}", response_model=ParticipantResponse)
def update_participant(
    participant_id: int,
    update_data: ParticipantUpdate,
    db: Session = Depends(get_db)
):
    """Update a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(participant, key, value)
    
    db.commit()
    db.refresh(participant)
    
    return ParticipantResponse(
        id=participant.id,
        project_id=participant.project_id,
        name=participant.name,
        team=participant.team,
        role=participant.role,
        email=participant.email,
        created_at=participant.created_at,
        assigned_items_count=len(participant.assigned_items) if participant.assigned_items else 0
    )


@router.delete("/participants/{participant_id}", status_code=204)
def delete_participant(participant_id: int, db: Session = Depends(get_db)):
    """Delete a participant (assigned items will be unassigned)"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    db.delete(participant)
    db.commit()
    return None


@router.get("/projects/{project_id}/teams", response_model=List[str])
def get_project_teams(project_id: int, db: Session = Depends(get_db)):
    """Get unique team names for a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    teams = db.query(Participant.team).filter(
        Participant.project_id == project_id
    ).distinct().all()
    
    return [t[0] for t in teams]




