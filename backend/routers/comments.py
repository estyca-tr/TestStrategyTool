from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Comment, TestStrategy
from schemas import CommentCreate, CommentUpdate, CommentResponse

router = APIRouter()


@router.get("", response_model=List[CommentResponse])
def get_comments(
    strategy_id: Optional[int] = None,
    section: Optional[str] = None,
    include_resolved: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Comment)
    
    if strategy_id:
        query = query.filter(Comment.strategy_id == strategy_id)
    
    if section:
        query = query.filter(Comment.section == section)
    
    if not include_resolved:
        query = query.filter(Comment.is_resolved == False)
    
    comments = query.order_by(Comment.created_at.desc()).all()
    return [CommentResponse.model_validate(c) for c in comments]


@router.get("/{comment_id}", response_model=CommentResponse)
def get_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return CommentResponse.model_validate(comment)


@router.post("", response_model=CommentResponse, status_code=201)
def create_comment(comment: CommentCreate, db: Session = Depends(get_db)):
    # Verify strategy exists
    strategy = db.query(TestStrategy).filter(TestStrategy.id == comment.strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    db_comment = Comment(**comment.model_dump())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return CommentResponse.model_validate(db_comment)


@router.put("/{comment_id}", response_model=CommentResponse)
def update_comment(comment_id: int, comment: CommentUpdate, db: Session = Depends(get_db)):
    db_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    update_data = comment.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_comment, key, value)
    
    db.commit()
    db.refresh(db_comment)
    
    return CommentResponse.model_validate(db_comment)


@router.delete("/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    db_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(db_comment)
    db.commit()
    return None






