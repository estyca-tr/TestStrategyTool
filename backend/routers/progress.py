from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

from database import get_db
from models import TestStrategy, BreakdownCategory, BreakdownItem, Participant
from schemas import (
    ProgressSummary, ParticipantProgress, CategoryProgress, StrategyProgress
)

router = APIRouter()


@router.get("/strategies/{strategy_id}/progress", response_model=StrategyProgress)
def get_strategy_progress(strategy_id: int, db: Session = Depends(get_db)):
    """Get complete progress summary for a strategy"""
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Get all items for this strategy
    items = db.query(BreakdownItem).join(BreakdownCategory).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).all()
    
    # Calculate summary
    total = len(items)
    completed = sum(1 for item in items if item.status == "completed")
    in_progress = sum(1 for item in items if item.status == "in_progress")
    blocked = sum(1 for item in items if item.status == "blocked")
    not_started = sum(1 for item in items if item.status == "not_started")
    
    summary = ProgressSummary(
        total_items=total,
        completed=completed,
        in_progress=in_progress,
        blocked=blocked,
        not_started=not_started,
        completion_percentage=round((completed / total * 100) if total > 0 else 0, 1)
    )
    
    # Get progress by participant
    participant_progress = []
    participants = db.query(Participant).join(BreakdownItem).join(BreakdownCategory).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).distinct().all()
    
    for p in participants:
        p_items = [item for item in items if item.assignee_id == p.id]
        p_total = len(p_items)
        p_completed = sum(1 for item in p_items if item.status == "completed")
        
        participant_progress.append(ParticipantProgress(
            participant_id=p.id,
            participant_name=p.name,
            participant_team=p.team,
            total_items=p_total,
            completed=p_completed,
            completion_percentage=round((p_completed / p_total * 100) if p_total > 0 else 0, 1)
        ))
    
    # Sort by completion percentage descending
    participant_progress.sort(key=lambda x: x.completion_percentage, reverse=True)
    
    # Get progress by category
    category_progress = []
    categories = db.query(BreakdownCategory).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).all()
    
    for cat in categories:
        c_items = [item for item in items if item.category_id == cat.id]
        c_total = len(c_items)
        c_completed = sum(1 for item in c_items if item.status == "completed")
        
        category_progress.append(CategoryProgress(
            category_id=cat.id,
            category_name=cat.name,
            category_type=cat.type,
            total_items=c_total,
            completed=c_completed,
            completion_percentage=round((c_completed / c_total * 100) if c_total > 0 else 0, 1)
        ))
    
    return StrategyProgress(
        strategy_id=strategy_id,
        summary=summary,
        by_participant=participant_progress,
        by_category=category_progress
    )


@router.get("/strategies/{strategy_id}/progress/summary", response_model=ProgressSummary)
def get_progress_summary(strategy_id: int, db: Session = Depends(get_db)):
    """Get just the progress summary for a strategy"""
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Count items by status
    items = db.query(BreakdownItem).join(BreakdownCategory).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).all()
    
    total = len(items)
    completed = sum(1 for item in items if item.status == "completed")
    in_progress = sum(1 for item in items if item.status == "in_progress")
    blocked = sum(1 for item in items if item.status == "blocked")
    not_started = sum(1 for item in items if item.status == "not_started")
    
    return ProgressSummary(
        total_items=total,
        completed=completed,
        in_progress=in_progress,
        blocked=blocked,
        not_started=not_started,
        completion_percentage=round((completed / total * 100) if total > 0 else 0, 1)
    )


@router.get("/strategies/{strategy_id}/progress/by-participant", response_model=List[ParticipantProgress])
def get_progress_by_participant(strategy_id: int, db: Session = Depends(get_db)):
    """Get progress breakdown by participant"""
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Get all items for this strategy
    items = db.query(BreakdownItem).join(BreakdownCategory).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).all()
    
    # Get unique participants
    participants = db.query(Participant).join(BreakdownItem).join(BreakdownCategory).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).distinct().all()
    
    result = []
    for p in participants:
        p_items = [item for item in items if item.assignee_id == p.id]
        p_total = len(p_items)
        p_completed = sum(1 for item in p_items if item.status == "completed")
        
        result.append(ParticipantProgress(
            participant_id=p.id,
            participant_name=p.name,
            participant_team=p.team,
            total_items=p_total,
            completed=p_completed,
            completion_percentage=round((p_completed / p_total * 100) if p_total > 0 else 0, 1)
        ))
    
    # Sort by completion percentage descending
    result.sort(key=lambda x: x.completion_percentage, reverse=True)
    
    return result


@router.get("/strategies/{strategy_id}/progress/by-category", response_model=List[CategoryProgress])
def get_progress_by_category(strategy_id: int, db: Session = Depends(get_db)):
    """Get progress breakdown by category"""
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    categories = db.query(BreakdownCategory).options(
        joinedload(BreakdownCategory.items)
    ).filter(
        BreakdownCategory.strategy_id == strategy_id
    ).order_by(BreakdownCategory.order_index).all()
    
    result = []
    for cat in categories:
        c_total = len(cat.items) if cat.items else 0
        c_completed = sum(1 for item in cat.items if item.status == "completed") if cat.items else 0
        
        result.append(CategoryProgress(
            category_id=cat.id,
            category_name=cat.name,
            category_type=cat.type,
            total_items=c_total,
            completed=c_completed,
            completion_percentage=round((c_completed / c_total * 100) if c_total > 0 else 0, 1)
        ))
    
    return result




