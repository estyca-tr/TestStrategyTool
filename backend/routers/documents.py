from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import re
import aiofiles
import requests

from database import get_db
from models import Document, Project
from schemas import DocumentResponse, NoteCreate
from services.file_parser import extract_text_from_file

router = APIRouter()

UPLOAD_DIR = "uploads"


def extract_google_doc_content(url: str) -> str:
    """
    Extract text content from a Google Docs URL.
    Works for publicly shared documents (Anyone with the link can view).
    """
    # Extract document ID from various Google Docs URL formats
    patterns = [
        r'docs\.google\.com/document/d/([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/file/d/([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)',
    ]
    
    doc_id = None
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            doc_id = match.group(1)
            break
    
    if not doc_id:
        return f"Could not extract document ID from URL: {url}"
    
    # Try to export as plain text
    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
    
    try:
        response = requests.get(export_url, timeout=30)
        if response.status_code == 200:
            content = response.text
            # Clean up the content
            if content and len(content) > 50:
                return content
            else:
                return f"Document appears to be empty or inaccessible. URL: {url}"
        else:
            return f"Could not fetch document (status {response.status_code}). Make sure it's shared with 'Anyone with the link'. URL: {url}"
    except Exception as e:
        return f"Error fetching document: {str(e)}. URL: {url}"


def extract_confluence_content(url: str) -> str:
    """
    Extract content from Confluence URL using the MCP connection if available.
    """
    # For now, return a placeholder - Confluence requires authentication
    return f"Confluence document link: {url}\n\nNote: To extract content, please copy-paste from Confluence or export the page."


@router.get("", response_model=List[DocumentResponse])
def get_documents(
    project_id: Optional[int] = None,
    doc_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    
    if project_id:
        query = query.filter(Document.project_id == project_id)
    
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    
    documents = query.order_by(Document.uploaded_at.desc()).all()
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(document)


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    project_id: int = Form(...),
    name: str = Form(...),
    doc_type: str = Form(...),  # hld, prd, other
    file: UploadFile = File(...)
):
    db = next(get_db())
    
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file type
    allowed_extensions = [".pdf", ".docx", ".doc", ".md", ".txt"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Create project upload directory
    project_dir = os.path.join(UPLOAD_DIR, str(project_id))
    os.makedirs(project_dir, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(project_dir, unique_filename)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Extract text content
    content_text = extract_text_from_file(file_path, file_ext)
    
    # Save to database
    db_document = Document(
        project_id=project_id,
        name=name,
        doc_type=doc_type,
        file_path=file_path,
        file_type=file_ext[1:],  # Remove the dot
        content_text=content_text
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    return DocumentResponse.model_validate(db_document)


@router.post("/note", response_model=DocumentResponse, status_code=201)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """Create a free-text note/prompt without file upload"""
    # Verify project exists
    project = db.query(Project).filter(Project.id == note.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_document = Document(
        project_id=note.project_id,
        name=note.name,
        doc_type="note",
        file_type="text",
        content_text=note.content,
        notes=note.notes
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    return DocumentResponse.model_validate(db_document)


@router.post("/link", response_model=DocumentResponse, status_code=201)
def create_link(data: dict, db: Session = Depends(get_db)):
    """Create a link document (Google Docs, Confluence, etc.)"""
    project_id = data.get('project_id')
    name = data.get('name')
    url = data.get('url')
    doc_type = data.get('doc_type', 'other')
    
    if not project_id or not name or not url:
        raise HTTPException(status_code=400, detail="project_id, name, and url are required")
    
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Try to extract content from the URL
    content_text = ""
    
    if 'docs.google.com' in url or 'drive.google.com' in url:
        # Google Docs - try to fetch content
        content_text = extract_google_doc_content(url)
    elif 'confluence' in url.lower() or 'atlassian.net/wiki' in url:
        # Confluence - placeholder for now
        content_text = extract_confluence_content(url)
    else:
        # Other links - just store the URL
        content_text = f"External document link: {url}"
    
    db_document = Document(
        project_id=project_id,
        name=name,
        doc_type=doc_type,
        file_type="link",
        file_path=url,  # Store URL in file_path
        content_text=content_text
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    return DocumentResponse.model_validate(db_document)


@router.post("/paste", response_model=DocumentResponse, status_code=201)
def create_pasted_document(data: dict, db: Session = Depends(get_db)):
    """Create a document from pasted content (copy-paste from Google Docs, etc.)"""
    project_id = data.get('project_id')
    name = data.get('name')
    content = data.get('content')
    doc_type = data.get('doc_type', 'other')
    
    if not project_id or not name or not content:
        raise HTTPException(status_code=400, detail="project_id, name, and content are required")
    
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_document = Document(
        project_id=project_id,
        name=name,
        doc_type=doc_type,
        file_type="pasted",
        content_text=content
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    return DocumentResponse.model_validate(db_document)


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(document_id: int, notes: str = None, db: Session = Depends(get_db)):
    """Update document notes"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if notes is not None:
        document.notes = notes
    
    db.commit()
    db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file if exists
    if document.file_path and os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    db.delete(document)
    db.commit()
    return None

