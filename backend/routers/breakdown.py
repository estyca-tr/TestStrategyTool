from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from models import BreakdownCategory, BreakdownItem, TestStrategy, Participant
from schemas import (
    BreakdownCategoryCreate, BreakdownCategoryUpdate, BreakdownCategoryResponse,
    BreakdownItemCreate, BreakdownItemUpdate, BreakdownItemResponse
)

router = APIRouter()


# ============== Category Endpoints ==============

def build_item_response(item, all_items):
    """Helper to build item response with nested sub-items"""
    # Find sub-items for this item
    sub_items = []
    for sub in all_items:
        if sub.parent_item_id == item.id:
            sub_items.append(build_item_response(sub, all_items))
    sub_items.sort(key=lambda x: x.order_index)
    
    return BreakdownItemResponse(
        id=item.id,
        category_id=item.category_id,
        parent_item_id=item.parent_item_id,
        title=item.title,
        description=item.description,
        assignee_id=item.assignee_id,
        assignee_name=item.assignee.name if item.assignee else None,
        assignee_team=item.assignee.team if item.assignee else None,
        status=item.status,
        priority=item.priority,
        eta=item.eta,
        duration_days=item.duration_days,
        order_index=item.order_index,
        created_at=item.created_at,
        updated_at=item.updated_at,
        sub_items=sub_items
    )


def build_category_response(cat, all_categories):
    """Helper to build category response with nested children"""
    # Get all items for this category
    all_items = list(cat.items) if cat.items else []
    
    # Build only root items (no parent)
    items = []
    completed_count = 0
    for item in sorted(all_items, key=lambda x: x.order_index):
        if item.parent_item_id is None:  # Only root-level items
            if item.status == "completed":
                completed_count += 1
            items.append(build_item_response(item, all_items))
    
    # Find children for this category
    children = []
    for child_cat in all_categories:
        if child_cat.parent_id == cat.id:
            children.append(build_category_response(child_cat, all_categories))
    
    # Sort children by order_index
    children.sort(key=lambda x: x.order_index)
    
    return BreakdownCategoryResponse(
        id=cat.id,
        strategy_id=cat.strategy_id,
        parent_id=cat.parent_id,
        name=cat.name,
        type=cat.type,
        order_index=cat.order_index,
        eta=cat.eta,
        duration_days=cat.duration_days,
        created_at=cat.created_at,
        items=items,
        children=children,
        items_count=len(items),
        completed_count=completed_count
    )


@router.get("/strategies/{strategy_id}/breakdowns", response_model=List[BreakdownCategoryResponse])
def get_strategy_breakdowns(
    strategy_id: int,
    type: Optional[str] = None,
    flat: bool = False,  # If true, return flat list instead of tree
    db: Session = Depends(get_db)
):
    """Get all breakdown categories with their items for a strategy (nested tree structure)"""
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    query = db.query(BreakdownCategory).options(
        joinedload(BreakdownCategory.items).joinedload(BreakdownItem.assignee)
    ).filter(BreakdownCategory.strategy_id == strategy_id)
    
    if type:
        query = query.filter(BreakdownCategory.type == type)
    
    all_categories = query.order_by(BreakdownCategory.order_index).all()
    
    # If flat mode requested, return all categories without nesting
    if flat:
        result = []
        for cat in all_categories:
            result.append(build_category_response(cat, []))  # Empty list = no children
        return result
    
    # Build tree: only return root-level categories (parent_id is None)
    result = []
    for cat in all_categories:
        if cat.parent_id is None:
            result.append(build_category_response(cat, all_categories))
    
    return result


@router.post("/strategies/{strategy_id}/breakdowns", response_model=BreakdownCategoryResponse, status_code=201)
def create_breakdown_category(
    strategy_id: int,
    category: BreakdownCategoryCreate,
    db: Session = Depends(get_db)
):
    """Create a new breakdown category (can be nested under a parent)"""
    strategy = db.query(TestStrategy).filter(TestStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Verify parent exists if provided
    if category.parent_id:
        parent = db.query(BreakdownCategory).filter(
            BreakdownCategory.id == category.parent_id,
            BreakdownCategory.strategy_id == strategy_id
        ).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent category not found")
    
    # Get max order_index (within parent if nested)
    query = db.query(BreakdownCategory).filter(BreakdownCategory.strategy_id == strategy_id)
    if category.parent_id:
        query = query.filter(BreakdownCategory.parent_id == category.parent_id)
    else:
        query = query.filter(BreakdownCategory.parent_id == None)
    max_order = query.count()
    
    db_category = BreakdownCategory(
        strategy_id=strategy_id,
        parent_id=category.parent_id,
        name=category.name,
        type=category.type,
        order_index=category.order_index if category.order_index else max_order,
        eta=category.eta,
        duration_days=category.duration_days
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return BreakdownCategoryResponse(
        id=db_category.id,
        strategy_id=db_category.strategy_id,
        parent_id=db_category.parent_id,
        name=db_category.name,
        type=db_category.type,
        order_index=db_category.order_index,
        eta=db_category.eta,
        duration_days=db_category.duration_days,
        created_at=db_category.created_at,
        items=[],
        children=[],
        items_count=0,
        completed_count=0
    )


@router.put("/breakdowns/{category_id}", response_model=BreakdownCategoryResponse)
def update_breakdown_category(
    category_id: int,
    update_data: BreakdownCategoryUpdate,
    db: Session = Depends(get_db)
):
    """Update a breakdown category"""
    category = db.query(BreakdownCategory).filter(BreakdownCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    
    # Count items
    items_count = len(category.items) if category.items else 0
    completed_count = sum(1 for item in category.items if item.status == "completed") if category.items else 0
    
    return BreakdownCategoryResponse(
        id=category.id,
        strategy_id=category.strategy_id,
        name=category.name,
        type=category.type,
        order_index=category.order_index,
        created_at=category.created_at,
        items=[],  # Don't load items on update
        items_count=items_count,
        completed_count=completed_count
    )


@router.delete("/breakdowns/{category_id}", status_code=204)
def delete_breakdown_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a breakdown category and all its items"""
    category = db.query(BreakdownCategory).filter(BreakdownCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return None


# ============== Item Endpoints ==============

@router.post("/breakdowns/{category_id}/items", response_model=BreakdownItemResponse, status_code=201)
def create_breakdown_item(
    category_id: int,
    item: BreakdownItemCreate,
    db: Session = Depends(get_db)
):
    """Add an item to a breakdown category (can be nested under a parent item)"""
    category = db.query(BreakdownCategory).filter(BreakdownCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Verify parent item if provided
    if item.parent_item_id:
        parent_item = db.query(BreakdownItem).filter(
            BreakdownItem.id == item.parent_item_id,
            BreakdownItem.category_id == category_id
        ).first()
        if not parent_item:
            raise HTTPException(status_code=400, detail="Parent item not found")
    
    # Verify assignee if provided
    assignee = None
    if item.assignee_id:
        assignee = db.query(Participant).filter(Participant.id == item.assignee_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee not found")
    
    # Get max order_index within parent or category
    query = db.query(BreakdownItem).filter(BreakdownItem.category_id == category_id)
    if item.parent_item_id:
        query = query.filter(BreakdownItem.parent_item_id == item.parent_item_id)
    else:
        query = query.filter(BreakdownItem.parent_item_id == None)
    max_order = query.count()
    
    db_item = BreakdownItem(
        category_id=category_id,
        parent_item_id=item.parent_item_id,
        title=item.title,
        description=item.description,
        assignee_id=item.assignee_id,
        status=item.status,
        priority=item.priority,
        order_index=item.order_index if item.order_index else max_order,
        eta=item.eta,
        duration_days=item.duration_days
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    return BreakdownItemResponse(
        id=db_item.id,
        category_id=db_item.category_id,
        parent_item_id=db_item.parent_item_id,
        title=db_item.title,
        description=db_item.description,
        assignee_id=db_item.assignee_id,
        assignee_name=assignee.name if assignee else None,
        assignee_team=assignee.team if assignee else None,
        status=db_item.status,
        priority=db_item.priority,
        order_index=db_item.order_index,
        eta=db_item.eta,
        duration_days=db_item.duration_days,
        created_at=db_item.created_at,
        updated_at=db_item.updated_at,
        sub_items=[]
    )


@router.get("/breakdown-items/{item_id}", response_model=BreakdownItemResponse)
def get_breakdown_item(item_id: int, db: Session = Depends(get_db)):
    """Get a specific breakdown item"""
    item = db.query(BreakdownItem).options(
        joinedload(BreakdownItem.assignee)
    ).filter(BreakdownItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Build sub_items for response
    all_items = db.query(BreakdownItem).filter(BreakdownItem.category_id == item.category_id).all()
    item_response = build_item_response(item, all_items)
    return item_response


@router.put("/breakdown-items/{item_id}", response_model=BreakdownItemResponse)
def update_breakdown_item(
    item_id: int,
    update_data: BreakdownItemUpdate,
    db: Session = Depends(get_db)
):
    """Update a breakdown item"""
    item = db.query(BreakdownItem).options(
        joinedload(BreakdownItem.assignee)
    ).filter(BreakdownItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Verify new assignee if changing
    if 'assignee_id' in update_dict and update_dict['assignee_id']:
        assignee = db.query(Participant).filter(Participant.id == update_dict['assignee_id']).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee not found")
    
    for key, value in update_dict.items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    
    # Reload assignee relationship
    item = db.query(BreakdownItem).options(
        joinedload(BreakdownItem.assignee)
    ).filter(BreakdownItem.id == item_id).first()
    
    return BreakdownItemResponse(
        id=item.id,
        category_id=item.category_id,
        parent_item_id=item.parent_item_id,
        title=item.title,
        description=item.description,
        assignee_id=item.assignee_id,
        assignee_name=item.assignee.name if item.assignee else None,
        assignee_team=item.assignee.team if item.assignee else None,
        status=item.status,
        priority=item.priority,
        order_index=item.order_index,
        created_at=item.created_at,
        updated_at=item.updated_at,
        sub_items=[]
    )


@router.patch("/breakdown-items/{item_id}/status", response_model=BreakdownItemResponse)
def update_item_status(
    item_id: int,
    status: str = Query(..., pattern="^(not_started|in_progress|completed|blocked)$"),
    db: Session = Depends(get_db)
):
    """Quick status update for an item"""
    item = db.query(BreakdownItem).options(
        joinedload(BreakdownItem.assignee)
    ).filter(BreakdownItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.status = status
    db.commit()
    db.refresh(item)
    
    return BreakdownItemResponse(
        id=item.id,
        category_id=item.category_id,
        parent_item_id=item.parent_item_id,
        title=item.title,
        description=item.description,
        assignee_id=item.assignee_id,
        assignee_name=item.assignee.name if item.assignee else None,
        assignee_team=item.assignee.team if item.assignee else None,
        status=item.status,
        priority=item.priority,
        order_index=item.order_index,
        created_at=item.created_at,
        updated_at=item.updated_at,
        sub_items=[]
    )


@router.delete("/breakdown-items/{item_id}", status_code=204)
def delete_breakdown_item(item_id: int, db: Session = Depends(get_db)):
    """Delete a breakdown item"""
    item = db.query(BreakdownItem).filter(BreakdownItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return None




