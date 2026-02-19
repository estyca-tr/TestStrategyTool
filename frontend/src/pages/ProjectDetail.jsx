import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, File, Trash2, Plus, Download, ExternalLink, Link2, FileUp, PenLine, Sparkles, LinkIcon, Users, ToggleLeft, ToggleRight, Target } from 'lucide-react'
import { projectsAPI, documentsAPI, strategiesAPI, testPlansAPI, participantsAPI } from '../services/api'
import { format, parseISO } from 'date-fns'
import ParticipantsManager from '../components/ParticipantsManager'
import CrossTeamBadge from '../components/CrossTeamBadge'
import CrossTeamDashboard from '../components/CrossTeamDashboard'

function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadType, setUploadType] = useState('hld')
  const [viewingDoc, setViewingDoc] = useState(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteData, setNoteData] = useState({ name: '', content: '' })
  const [testPlans, setTestPlans] = useState([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkData, setLinkData] = useState({ name: '', url: '' })
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteData, setPasteData] = useState({ name: '', content: '' })
  const [participants, setParticipants] = useState([])
  const [togglingCrossTeam, setTogglingCrossTeam] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [id])
  
  async function loadData() {
    try {
      setLoading(true)
      const [projectData, docsData, strategiesData, testPlansData] = await Promise.all([
        projectsAPI.getById(id),
        documentsAPI.getAll({ project_id: id }),
        strategiesAPI.getAll({ project_id: id }),
        testPlansAPI.getAll({ project_id: id })
      ])
      setProject(projectData)
      setDocuments(docsData)
      setStrategies(strategiesData)
      setTestPlans(testPlansData || [])
      
      // Load participants if cross-team project
      if (projectData.is_cross_team) {
        loadParticipants()
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadParticipants() {
    try {
      const data = await participantsAPI.getAll(id)
      setParticipants(data)
    } catch (err) {
      console.error('Failed to load participants:', err)
    }
  }
  
  async function toggleCrossTeam() {
    if (togglingCrossTeam) return
    
    const newValue = !project.is_cross_team
    const confirmMsg = newValue 
      ? 'Enable Cross-Team mode? This allows adding participants from multiple teams.'
      : 'Disable Cross-Team mode? Participant data will be preserved.'
    
    if (!confirm(confirmMsg)) return
    
    setTogglingCrossTeam(true)
    try {
      await projectsAPI.update(id, { is_cross_team: newValue })
      setProject({ ...project, is_cross_team: newValue })
      if (newValue) {
        loadParticipants()
      }
    } catch (err) {
      alert('Failed to update project: ' + err.message)
    } finally {
      setTogglingCrossTeam(false)
    }
  }
  
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    try {
      await documentsAPI.upload(id, file.name, uploadType, file)
      loadData()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
  
  async function handleDeleteDoc(docId) {
    if (!confirm('Delete this document?')) return
    try {
      await documentsAPI.delete(docId)
      setDocuments(documents.filter(d => d.id !== docId))
    } catch (err) {
      alert('Delete failed')
    }
  }
  
  async function handleSaveNote() {
    if (!noteData.name.trim() || !noteData.content.trim()) {
      alert('Please enter a name and content')
      return
    }
    
    try {
      await documentsAPI.createNote({
        project_id: parseInt(id),
        name: noteData.name,
        content: noteData.content
      })
      setShowNoteModal(false)
      setNoteData({ name: '', content: '' })
      loadData()
    } catch (err) {
      alert('Failed to save note: ' + err.message)
    }
  }
  
  async function handleSaveLink() {
    if (!linkData.name.trim() || !linkData.url.trim()) {
      alert('Please enter a name and URL')
      return
    }
    
    try {
      await documentsAPI.createLink({
        project_id: parseInt(id),
        name: linkData.name,
        url: linkData.url,
        doc_type: uploadType
      })
      setShowLinkModal(false)
      setLinkData({ name: '', url: '' })
      loadData()
    } catch (err) {
      alert('Failed to save link: ' + err.message)
    }
  }
  
  async function handleSavePastedContent() {
    if (!pasteData.name.trim() || !pasteData.content.trim()) {
      alert('Please enter a name and paste your content')
      return
    }
    
    try {
      await documentsAPI.createPastedDoc({
        project_id: parseInt(id),
        name: pasteData.name,
        content: pasteData.content,
        doc_type: uploadType
      })
      setShowPasteModal(false)
      setPasteData({ name: '', content: '' })
      loadData()
    } catch (err) {
      alert('Failed to save document: ' + err.message)
    }
  }
  
  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }
  
  if (!project) {
    return (
      <div className="empty-state">
        <p>Project not found</p>
        <Link to="/projects" className="btn btn-primary mt-md">Back to Projects</Link>
      </div>
    )
  }
  
  const hldDocs = documents.filter(d => d.doc_type === 'hld')
  const prdDocs = documents.filter(d => d.doc_type === 'prd')
  const noteDocs = documents.filter(d => d.doc_type === 'note')
  const otherDocs = documents.filter(d => d.doc_type === 'other')
  
  return (
    <div className="project-detail animate-in">
      <header className="page-header">
        <div className="page-header-content">
          <Link to="/projects" className="btn btn-ghost">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="project-title-row">
              <h1>{project.name}</h1>
              {project.is_cross_team && <CrossTeamBadge count={participants.length} />}
            </div>
            {project.description && <p className="mt-sm">{project.description}</p>}
          </div>
        </div>
        <div className="header-actions-row">
          <button 
            className={`btn ${project.is_cross_team ? 'btn-cross-team-active' : 'btn-ghost'}`}
            onClick={toggleCrossTeam}
            disabled={togglingCrossTeam}
            title={project.is_cross_team ? 'Cross-Team Enabled' : 'Enable Cross-Team Mode'}
          >
            {project.is_cross_team ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            <Users size={16} />
            {togglingCrossTeam ? '...' : 'Cross-Team'}
          </button>
          <Link to={`/strategy/new?project=${id}`} className="btn btn-primary">
            <Plus size={18} />
            New Strategy
          </Link>
        </div>
      </header>
      
      {/* Cross-Team Dashboard - All in One */}
      {project.is_cross_team && (
        <div className="cross-team-section">
          <CrossTeamDashboard 
            projectId={parseInt(id)}
            onUpdate={loadData}
          />
        </div>
      )}
      
      <div className="project-grid">
        {/* Documents Section */}
        <div className="card documents-card">
          <div className="card-header">
            <h3>📁 Documents</h3>
          </div>
          
          {/* Document Tabs */}
          <div className="doc-tabs">
            <button 
              className={`doc-tab ${uploadType === 'hld' ? 'active' : ''}`}
              onClick={() => setUploadType('hld')}
            >
              <span className="tab-icon">📐</span>
              HLD
              {hldDocs.length > 0 && <span className="tab-count">{hldDocs.length}</span>}
            </button>
            <button 
              className={`doc-tab ${uploadType === 'prd' ? 'active' : ''}`}
              onClick={() => setUploadType('prd')}
            >
              <span className="tab-icon">📋</span>
              PRD
              {prdDocs.length > 0 && <span className="tab-count">{prdDocs.length}</span>}
            </button>
            <button 
              className={`doc-tab ${uploadType === 'other' ? 'active' : ''}`}
              onClick={() => setUploadType('other')}
            >
              <span className="tab-icon">📄</span>
              Other
              {otherDocs.length > 0 && <span className="tab-count">{otherDocs.length}</span>}
            </button>
            <button 
              className={`doc-tab ${uploadType === 'note' ? 'active' : ''}`}
              onClick={() => setUploadType('note')}
            >
              <span className="tab-icon">✏️</span>
              Notes
              {noteDocs.length > 0 && <span className="tab-count">{noteDocs.length}</span>}
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="tab-content">
            {/* Current Tab Documents */}
            {uploadType === 'hld' && hldDocs.length > 0 && (
              <div className="doc-list mb-md">
                {hldDocs.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} onDelete={handleDeleteDoc} onView={setViewingDoc} />
                ))}
              </div>
            )}
            {uploadType === 'prd' && prdDocs.length > 0 && (
              <div className="doc-list mb-md">
                {prdDocs.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} onDelete={handleDeleteDoc} onView={setViewingDoc} />
                ))}
              </div>
            )}
            {uploadType === 'other' && otherDocs.length > 0 && (
              <div className="doc-list mb-md">
                {otherDocs.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} onDelete={handleDeleteDoc} onView={setViewingDoc} />
                ))}
              </div>
            )}
            {uploadType === 'note' && noteDocs.length > 0 && (
              <div className="doc-list mb-md">
                {noteDocs.map(doc => (
                  <DocumentItem key={doc.id} doc={doc} onDelete={handleDeleteDoc} onView={setViewingDoc} />
                ))}
              </div>
            )}
            
            {/* Add New - different for Notes vs other types */}
            {uploadType === 'note' ? (
              <div className="add-options">
                <div 
                  className="add-option-card"
                  onClick={() => setShowNoteModal(true)}
                >
                  <div className="add-option-icon purple">
                    <PenLine size={24} />
                  </div>
                  <div className="add-option-text">
                    <h5>Write Free Text</h5>
                    <p>Prompt, notes, requirements</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="add-options">
                <div 
                  className="add-option-card"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="add-option-icon cyan">
                    <FileUp size={24} />
                  </div>
                  <div className="add-option-text">
                    <h5>{uploading ? 'Uploading...' : 'Upload File'}</h5>
                    <p>PDF, Word, or Markdown</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                
                <div 
                  className="add-option-card"
                  onClick={() => setShowLinkModal(true)}
                >
                  <div className="add-option-icon green">
                    <LinkIcon size={24} />
                  </div>
                  <div className="add-option-text">
                    <h5>Add Link</h5>
                    <p>Google Docs, Confluence, etc.</p>
                  </div>
                </div>
                
                <div 
                  className="add-option-card"
                  onClick={() => setShowPasteModal(true)}
                >
                  <div className="add-option-icon orange">
                    <FileText size={24} />
                  </div>
                  <div className="add-option-text">
                    <h5>Paste Content</h5>
                    <p>Copy & paste text directly</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Empty state */}
            {((uploadType === 'hld' && hldDocs.length === 0) ||
              (uploadType === 'prd' && prdDocs.length === 0) ||
              (uploadType === 'other' && otherDocs.length === 0) ||
              (uploadType === 'note' && noteDocs.length === 0)) && (
              <p className="empty-tab-msg">No {uploadType.toUpperCase()} documents yet. Add one above!</p>
            )}
          </div>
        </div>
        
        {/* Strategies Section */}
        <div className="card">
          <div className="card-header">
            <h3>Test Strategies</h3>
            <Link to={`/strategy/new?project=${id}`} className="btn btn-secondary">
              <Plus size={16} />
              New
            </Link>
          </div>
          
          {strategies.length > 0 ? (
            <div className="strategies-list">
              {strategies.map(strategy => (
                <Link 
                  key={strategy.id}
                  to={`/strategy/${strategy.id}`}
                  className="strategy-item"
                >
                  <FileText size={20} />
                  <div className="strategy-info">
                    <h4>{strategy.title}</h4>
                    <p>v{strategy.version} • {format(parseISO(strategy.updated_at), 'MMM d')}</p>
                  </div>
                  <span className={`badge badge-${strategy.status}`}>
                    {strategy.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <FileText size={40} />
              <p>No strategies yet</p>
              <Link to={`/strategy/new?project=${id}`} className="btn btn-primary mt-md">
                Create Strategy
              </Link>
            </div>
          )}
          
          {/* Jira Test Plans Section */}
          <div className="jira-section">
            <div className="jira-header">
              <ExternalLink size={18} className="jira-icon" />
              <h4>Test Plans in Jira ({testPlans.length})</h4>
            </div>
            <div className="jira-content">
              {testPlans.length > 0 ? (
                <div className="jira-plans-list">
                  {testPlans.map(plan => (
                    <a 
                      key={plan.id}
                      href={plan.jira_issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="jira-plan-item"
                    >
                      <div className="jira-plan-info">
                        <span className="jira-key">{plan.jira_issue_key}</span>
                        <span className="jira-title">{plan.title}</span>
                      </div>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="jira-placeholder">
                  <Link2 size={24} />
                  <span>No test plans linked yet</span>
                  <p className="jira-hint">Create a Test Plan from any strategy to see it here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .project-detail {
          max-width: 1200px;
        }
        
        .project-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        
        .header-actions-row {
          display: flex;
          gap: var(--space-sm);
        }
        
        .btn-cross-team-active {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: #1a1a2e;
          border: none;
        }
        
        .btn-cross-team-active:hover {
          background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
        }
        
        .cross-team-section {
          margin-bottom: var(--space-lg);
        }
        
        .project-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-lg);
        }
        
        .upload-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        /* Document Tabs */
        .doc-tabs {
          display: flex;
          border-bottom: 2px solid var(--border-color);
          margin-bottom: 0;
        }
        
        .doc-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0.875rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .doc-tab:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        
        .doc-tab.active {
          color: var(--accent-cyan);
          border-bottom-color: var(--accent-cyan);
        }
        
        .tab-icon {
          font-size: 1rem;
        }
        
        .tab-count {
          background: var(--accent-purple);
          color: white;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }
        
        .tab-content {
          padding: var(--space-lg);
        }
        
        .doc-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .add-options {
          display: flex;
          gap: var(--space-md);
          margin-top: var(--space-md);
        }
        
        .add-option-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-hover);
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .add-option-card:hover {
          border-color: var(--accent-cyan);
          background: rgba(6, 182, 212, 0.05);
          transform: translateY(-2px);
        }
        
        .add-option-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .add-option-icon.cyan {
          background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
        }
        
        .add-option-icon.green {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
        }
        
        .add-option-icon.purple {
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
        }
        
        .add-option-icon.orange {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
        }
        
        .doc-modal-large {
          max-width: 800px;
          width: 90%;
        }
        
        .paste-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding: var(--space-lg);
          margin-top: var(--space-sm);
        }
        
        .paste-header-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .paste-header-left h2 {
          margin: 0;
          font-size: 1.1rem;
        }
        
        .paste-header-actions {
          display: flex;
          gap: var(--space-sm);
        }
        
        .add-option-text h5 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        
        .add-option-text p {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        
        .empty-tab-msg {
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
          padding: var(--space-md) 0;
        }
        
        .documents-card .card-header h3 {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .doc-section {
          margin-bottom: var(--space-lg);
        }
        
        .doc-section-title {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-sm);
        }
        
        .doc-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-hover);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-sm);
        }
        
        .doc-item > svg:first-child {
          width: 32px;
          height: 32px;
          padding: 6px;
          background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
          border-radius: var(--radius-sm);
          color: white;
          box-shadow: 0 3px 10px rgba(6, 182, 212, 0.25);
        }
        
        .doc-item-info {
          flex: 1;
        }
        
        .doc-item-info h5 {
          font-size: 0.9375rem;
          margin-bottom: 2px;
        }
        
        .doc-item-info p {
          font-size: 0.8125rem;
        }
        
        .strategies-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .strategy-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--bg-hover);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }
        
        .strategy-item:hover {
          background: var(--bg-card);
          transform: translateX(4px);
        }
        
        .strategy-item > svg:first-child {
          width: 36px;
          height: 36px;
          padding: 8px;
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
          border-radius: var(--radius-sm);
          color: white;
          box-shadow: 0 3px 10px rgba(236, 72, 153, 0.25);
        }
        
        .strategy-info {
          flex: 1;
        }
        
        .strategy-info h4 {
          font-size: 0.9375rem;
          margin-bottom: 2px;
        }
        
        .strategy-info p {
          font-size: 0.8125rem;
        }
        
        .upload-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }
        
        .upload-icon-wrapper {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
          color: white;
          margin-bottom: var(--space-sm);
        }
        
        .upload-icon-wrapper.cyan {
          background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%);
          box-shadow: 0 6px 20px rgba(6, 182, 212, 0.3);
        }
        
        .upload-icon-wrapper.purple {
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3);
        }
        
        .upload-icon-wrapper.green {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }
        
        .upload-title {
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .upload-area.upload-file {
          border-color: rgba(6, 182, 212, 0.4);
        }
        
        .upload-area.upload-file:hover {
          border-color: #06b6d4;
          background: rgba(6, 182, 212, 0.08);
        }
        
        .upload-area.write-note {
          border-color: rgba(139, 92, 246, 0.4);
        }
        
        .upload-area.write-note:hover {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
        }
        
        .jira-section {
          margin-top: var(--space-lg);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--border-color);
        }
        
        .jira-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        
        .jira-header h4 {
          font-size: 0.9375rem;
          font-weight: 600;
        }
        
        .jira-icon {
          width: 28px;
          height: 28px;
          padding: 5px;
          background: linear-gradient(135deg, #0052CC 0%, #2684FF 100%);
          border-radius: var(--radius-sm);
          color: white;
          box-shadow: 0 3px 10px rgba(0, 82, 204, 0.3);
        }
        
        .jira-content {
          padding: var(--space-sm);
        }
        
        .jira-placeholder {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: linear-gradient(135deg, rgba(0, 82, 204, 0.05) 0%, rgba(0, 82, 204, 0.1) 100%);
          border: 1px dashed rgba(0, 82, 204, 0.3);
          border-radius: var(--radius-md);
        }
        
        .jira-placeholder svg:first-child {
          color: #0052CC;
          opacity: 0.5;
        }
        
        .jira-placeholder span {
          flex: 1;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        
        .btn-jira {
          background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%);
          color: white;
          border: none;
        }
        
        .btn-jira:hover {
          background: linear-gradient(135deg, #0747A6 0%, #003d99 100%);
        }
        
        .jira-plan-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-hover);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-sm);
          color: #0052CC;
          text-decoration: none;
          transition: all 0.2s;
        }
        
        .jira-plan-item:hover {
          background: rgba(0, 82, 204, 0.1);
        }
        
        .jira-plans-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .jira-plan-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .jira-key {
          font-weight: 700;
          font-size: 0.875rem;
          color: #0052CC;
        }
        
        .jira-title {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        
        .jira-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }
        
        @media (max-width: 900px) {
          .project-grid {
            grid-template-columns: 1fr;
          }
          
          .upload-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      
      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="modal-overlay" onClick={() => setViewingDoc(null)}>
          <div className="doc-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-modal-header">
              <h2>{viewingDoc.name}</h2>
              <span className="badge badge-draft">{viewingDoc.doc_type?.toUpperCase()}</span>
            </div>
            <div className="doc-modal-content">
              {viewingDoc.content_text ? (
                <pre>{viewingDoc.content_text}</pre>
              ) : (
                <p className="text-muted">No text content extracted from this document.</p>
              )}
            </div>
            <div className="doc-modal-actions">
              <button className="btn btn-secondary" onClick={() => setViewingDoc(null)}>
                Close
              </button>
              <Link 
                to={`/strategy/new?project=${id}&doc=${viewingDoc.id}`} 
                className="btn btn-primary"
              >
                Use in New Strategy
              </Link>
            </div>
          </div>
          
          <style>{`
            .doc-modal {
              background: var(--bg-card);
              border: 1px solid var(--border-color);
              border-radius: var(--radius-xl);
              width: 90%;
              max-width: 800px;
              max-height: 80vh;
              display: flex;
              flex-direction: column;
            }
            
            .doc-modal-header {
              display: flex;
              align-items: center;
              gap: var(--space-md);
              padding: var(--space-lg);
              border-bottom: 1px solid var(--border-color);
            }
            
            .doc-modal-header h2 {
              flex: 1;
              font-size: 1.25rem;
            }
            
            .doc-modal-content {
              flex: 1;
              overflow: auto;
              padding: var(--space-lg);
            }
            
            .doc-modal-content pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: var(--font-sans);
              font-size: 0.9375rem;
              line-height: 1.7;
              color: var(--text-secondary);
            }
            
            .doc-modal-actions {
              display: flex;
              gap: var(--space-md);
              justify-content: flex-end;
              padding: var(--space-lg);
              border-top: 1px solid var(--border-color);
            }
            
            .link-type-info {
              display: flex;
              align-items: center;
              gap: var(--space-sm);
              padding: var(--space-sm) var(--space-md);
              background: var(--bg-hover);
              border-radius: var(--radius-md);
              margin-top: var(--space-md);
            }
            
            .form-hint {
              display: block;
              font-size: 0.8125rem;
              color: var(--text-muted);
              margin-top: 6px;
            }
            
            .link-doc-icon {
              color: var(--accent-green);
            }
            
            .pasted-doc-icon {
              color: #f59e0b;
            }
          `}</style>
        </div>
      )}
      
      {/* Note Writing Modal */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="doc-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-modal-header">
              <h2>Write Free Text</h2>
            </div>
            <div className="doc-modal-content">
              <div className="form-group mb-md">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={noteData.name}
                  onChange={e => setNoteData({ ...noteData, name: e.target.value })}
                  placeholder="e.g., Initial Requirements, Feature Prompt..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content *</label>
                <textarea
                  className="form-textarea"
                  value={noteData.content}
                  onChange={e => setNoteData({ ...noteData, content: e.target.value })}
                  placeholder="Write your requirements, prompts, notes, or any free text here...&#10;&#10;This will be available as reference when writing your test strategy."
                  style={{ minHeight: '250px' }}
                />
              </div>
            </div>
            <div className="doc-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveNote}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="doc-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-modal-header">
              <h2>🔗 Add Document Link</h2>
            </div>
            <div className="doc-modal-content">
              <div className="form-group mb-md">
                <label className="form-label">Document Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={linkData.name}
                  onChange={e => setLinkData({ ...linkData, name: e.target.value })}
                  placeholder="e.g., Feature Requirements Doc, API Design..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">URL *</label>
                <input
                  type="url"
                  className="form-input"
                  value={linkData.url}
                  onChange={e => setLinkData({ ...linkData, url: e.target.value })}
                  placeholder="https://docs.google.com/document/d/..."
                />
                <span className="form-hint">Paste the link to Google Docs, Confluence, Notion, or any other document</span>
              </div>
              <div className="link-type-info">
                <span className="badge">{uploadType.toUpperCase()}</span>
                <span className="text-muted">This link will be saved as {uploadType.toUpperCase()} document</span>
              </div>
            </div>
            <div className="doc-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLinkModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveLink}>
                <LinkIcon size={16} />
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Paste Content Modal */}
      {showPasteModal && (
        <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="doc-modal doc-modal-large" onClick={e => e.stopPropagation()}>
            <div className="doc-modal-header paste-header">
              <div className="paste-header-left">
                <h2>📋 Paste Document Content</h2>
                <div className="paste-header-badge">
                  <span className="badge">{uploadType.toUpperCase()}</span>
                </div>
              </div>
              <div className="paste-header-actions">
                <button className="btn btn-secondary" onClick={() => setShowPasteModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSavePastedContent}>
                  <FileText size={16} />
                  Save
                </button>
              </div>
            </div>
            <div className="doc-modal-content">
              <div className="form-group mb-md">
                <label className="form-label">Document Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={pasteData.name}
                  onChange={e => setPasteData({ ...pasteData, name: e.target.value })}
                  placeholder="e.g., Product Requirements, High Level Design..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content *</label>
                <textarea
                  className="form-textarea"
                  value={pasteData.content}
                  onChange={e => setPasteData({ ...pasteData, content: e.target.value })}
                  placeholder="Paste your document content here...&#10;&#10;Copy the text from Google Docs, Word, or any other source and paste it here."
                  style={{ minHeight: '400px', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentItem({ doc, onDelete, onView }) {
  const isLink = doc.file_type === 'link'
  const isPasted = doc.file_type === 'pasted'
  
  const getTypeLabel = () => {
    if (isLink) return '🔗 External Link'
    if (isPasted) return '📋 Pasted Content'
    return doc.file_type?.toUpperCase()
  }
  
  const getIcon = () => {
    if (isLink) return <LinkIcon size={20} className="link-doc-icon" />
    if (isPasted) return <FileText size={20} className="pasted-doc-icon" />
    return <File size={20} />
  }
  
  return (
    <div className="doc-item">
      {getIcon()}
      <div className="doc-item-info">
        <h5>{doc.name}</h5>
        <p className="text-muted">{getTypeLabel()}</p>
      </div>
      {isLink ? (
        <a 
          href={doc.file_path} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-ghost"
          title="Open Link"
        >
          <ExternalLink size={16} />
        </a>
      ) : (
        <button className="btn btn-ghost" onClick={() => onView(doc)} title="View Content">
          <FileText size={16} />
        </button>
      )}
      <button className="btn btn-ghost" onClick={() => onDelete(doc.id)} title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export default ProjectDetail

