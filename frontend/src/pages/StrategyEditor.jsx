import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, ChevronDown, ChevronUp, CheckCircle, FileText, X, Copy, Sparkles } from 'lucide-react'
import { strategiesAPI, projectsAPI, documentsAPI } from '../services/api'

const SECTIONS = [
  { key: 'introduction', title: 'Introduction', placeholder: 'Provide an overview of the test strategy, its purpose, and the system under test...' },
  { key: 'scope_in', title: 'In Scope', placeholder: 'List features, modules, and functionalities that will be tested...' },
  { key: 'scope_out', title: 'Out of Scope', placeholder: 'List features or areas that will NOT be tested and explain why...' },
  { key: 'test_approach', title: 'Test Approach', placeholder: 'Describe the overall testing methodology (Agile, Waterfall, Risk-based, etc.)...' },
  { key: 'test_types', title: 'Test Types', placeholder: 'List the types of testing to be performed:\n- Functional Testing\n- Integration Testing\n- Performance Testing\n- Security Testing\n- UAT...' },
  { key: 'test_environment', title: 'Test Environment', placeholder: 'Describe the test environment requirements:\n- Hardware\n- Software\n- Network configuration\n- Test data requirements...' },
  { key: 'entry_criteria', title: 'Entry Criteria', placeholder: 'List conditions that must be met before testing begins:\n- Code complete\n- Unit tests passing\n- Environment ready...' },
  { key: 'exit_criteria', title: 'Exit Criteria', placeholder: 'List conditions that must be met to conclude testing:\n- All critical bugs fixed\n- X% test coverage\n- Sign-off received...' },
  { key: 'risks_and_mitigations', title: 'Risks & Mitigations', placeholder: 'Identify risks and mitigation strategies:\n\nRisk: Limited testing time\nMitigation: Prioritize critical features\n\nRisk: Environment instability\nMitigation: Have backup environment ready...' },
  { key: 'resources', title: 'Resources', placeholder: 'List team members and their roles:\n- Test Lead: Name\n- QA Engineers: Names\n- Automation Engineers: Names...' },
  { key: 'schedule', title: 'Schedule', placeholder: 'Define the testing timeline:\n- Test Planning: Week 1\n- Test Case Development: Week 2-3\n- Test Execution: Week 4-6\n- Bug Fixing: Week 7\n- Regression: Week 8...' },
  { key: 'deliverables', title: 'Deliverables', placeholder: 'List expected deliverables:\n- Test Strategy Document\n- Test Plan\n- Test Cases\n- Test Execution Report\n- Defect Report\n- Final Test Summary...' }
]

function StrategyEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')
  const docId = searchParams.get('doc')
  
  const [projects, setProjects] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [expandedSections, setExpandedSections] = useState(['introduction'])
  
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    title: '',
    version: '1.0',
    is_cross_team: false,
    created_by: '',
    introduction: '',
    scope_in: '',
    scope_out: '',
    test_approach: '',
    test_types: '',
    test_environment: '',
    entry_criteria: '',
    exit_criteria: '',
    risks_and_mitigations: '',
    resources: '',
    schedule: '',
    deliverables: ''
  })
  
  useEffect(() => {
    loadData()
  }, [id])
  
  async function loadData() {
    try {
      setLoading(true)
      const projectsData = await projectsAPI.getAll()
      setProjects(projectsData)
      
      // Load documents for the project and set is_cross_team
      if (projectId) {
        const docsData = await documentsAPI.getAll({ project_id: projectId })
        setDocuments(docsData)
        
        // Set is_cross_team based on the project type (for new strategies)
        const project = projectsData.find(p => p.id === parseInt(projectId))
        if (project) {
          setFormData(prev => ({ ...prev, is_cross_team: project.is_cross_team || false }))
        }
        
        // If a specific doc was passed, select it
        if (docId) {
          const doc = docsData.find(d => d.id === parseInt(docId))
          if (doc) {
            setSelectedDoc(doc)
            setShowDocPanel(true)
          }
        }
      }
      
      if (id) {
        const strategy = await strategiesAPI.getById(id)
        setFormData({
          project_id: strategy.project_id,
          title: strategy.title,
          version: strategy.version,
          is_cross_team: strategy.is_cross_team || false,
          created_by: strategy.created_by || '',
          introduction: strategy.introduction || '',
          scope_in: strategy.scope_in || '',
          scope_out: strategy.scope_out || '',
          test_approach: strategy.test_approach || '',
          test_types: strategy.test_types || '',
          test_environment: strategy.test_environment || '',
          entry_criteria: strategy.entry_criteria || '',
          exit_criteria: strategy.exit_criteria || '',
          risks_and_mitigations: strategy.risks_and_mitigations || '',
          resources: strategy.resources || '',
          schedule: strategy.schedule || '',
          deliverables: strategy.deliverables || ''
        })
        setExpandedSections(SECTIONS.filter(s => strategy[s.key]).map(s => s.key))
        
        // Load documents for existing strategy's project
        if (strategy.project_id) {
          const docsData = await documentsAPI.getAll({ project_id: strategy.project_id })
          setDocuments(docsData)
        }
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Get the selected project object
  const selectedProject = projects.find(p => p.id === parseInt(formData.project_id))
  const isProjectCrossTeam = selectedProject?.is_cross_team || false

  // Load docs when project changes
  async function handleProjectChange(newProjectId) {
    handleFieldChange('project_id', newProjectId)
    
    // Always sync is_cross_team with the project type
    const project = projects.find(p => p.id === parseInt(newProjectId))
    handleFieldChange('is_cross_team', project?.is_cross_team || false)
    
    if (newProjectId) {
      const docsData = await documentsAPI.getAll({ project_id: newProjectId })
      setDocuments(docsData)
    } else {
      setDocuments([])
    }
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }
  
  async function handleGenerateFromDocuments() {
    if (!formData.project_id) {
      alert('Please select a project first')
      return
    }
    
    if (!confirm('This will generate content based on uploaded documents. Existing content will be replaced. Continue?')) {
      return
    }
    
    setGenerating(true)
    try {
      const result = await strategiesAPI.generateFromDocuments(formData.project_id)
      
      if (result.generated_content) {
        const generated = result.generated_content
        setFormData(prev => ({
          ...prev,
          title: prev.title || `${result.project_name} - Test Strategy`,
          introduction: generated.introduction || prev.introduction,
          scope_in: generated.scope_in || prev.scope_in,
          scope_out: generated.scope_out || prev.scope_out,
          test_approach: generated.test_approach || prev.test_approach,
          test_types: generated.test_types || prev.test_types,
          test_environment: generated.test_environment || prev.test_environment,
          entry_criteria: generated.entry_criteria || prev.entry_criteria,
          exit_criteria: generated.exit_criteria || prev.exit_criteria,
          risks_and_mitigations: generated.risks_and_mitigations || prev.risks_and_mitigations,
          resources: generated.resources || prev.resources,
          schedule: generated.schedule || prev.schedule,
          deliverables: generated.deliverables || prev.deliverables
        }))
        
        // Expand all sections to show generated content
        setExpandedSections(SECTIONS.map(s => s.key))
        
        alert(`Generated content based on ${result.document_count} document(s)! Review and edit as needed.`)
      }
    } catch (err) {
      alert('Generation failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }
  
  function toggleSection(key) {
    setExpandedSections(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }
  
  function handleFieldChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }
  
  async function handleSave(status = null) {
    if (!formData.project_id || !formData.title.trim()) {
      alert('Please select a project and enter a title')
      return
    }
    
    setSaving(true)
    try {
      const data = { ...formData }
      if (status) data.status = status
      
      if (id) {
        await strategiesAPI.update(id, data)
      } else {
        const newStrategy = await strategiesAPI.create(data)
        navigate(`/strategy/${newStrategy.id}`)
        return
      }
      
      alert('Saved successfully!')
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }
  
  const completedSections = SECTIONS.filter(s => formData[s.key]?.trim()).length
  const progress = Math.round((completedSections / SECTIONS.length) * 100)
  
  return (
    <div className="strategy-editor animate-in">
      <header className="editor-header">
        <div className="page-header-content">
          <Link to={id ? `/strategy/${id}` : '/projects'} className="btn btn-ghost">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{id ? 'Edit Strategy' : 'New Test Strategy'}</h1>
            <p className="mt-sm">Fill in the sections to create your test strategy document</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => handleSave()}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {id && (
            <button 
              className="btn btn-success" 
              onClick={() => handleSave('approved')}
              disabled={saving}
            >
              <CheckCircle size={18} />
              Approve
            </button>
          )}
        </div>
      </header>
      
      {/* Progress Bar */}
      <div className="progress-bar mb-lg">
        <div className="progress-info">
          <span>Progress</span>
          <span>{completedSections}/{SECTIONS.length} sections</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      
      {/* Documents & Generate Toolbar */}
      {documents.length > 0 && (
        <div className="docs-toolbar mb-lg">
          <div className="toolbar-buttons">
            <button 
              className={`btn ${showDocPanel ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowDocPanel(!showDocPanel)}
            >
              <FileText size={18} />
              Reference Documents ({documents.length})
            </button>
            <button 
              className="btn btn-accent"
              onClick={handleGenerateFromDocuments}
              disabled={generating}
            >
              <Sparkles size={18} />
              {generating ? 'Generating...' : 'Auto-Fill from Documents'}
            </button>
          </div>
          {showDocPanel && (
            <div className="doc-selector">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  className={`doc-chip ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  {doc.doc_type?.toUpperCase()}: {doc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* No Documents Warning */}
      {formData.project_id && documents.length === 0 && (
        <div className="no-docs-warning mb-lg">
          <p>💡 Upload HLD/PRD documents to your project to enable auto-generation of strategy content.</p>
          <Link to={`/projects/${formData.project_id}`} className="btn btn-secondary btn-sm">
            Go to Project → Upload Documents
          </Link>
        </div>
      )}
      
      {/* Basic Info */}
      <div className="card mb-lg">
        <h3 className="mb-md">Basic Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select
              className="form-select"
              value={formData.project_id}
              onChange={e => handleProjectChange(e.target.value)}
            >
              <option value="">Select a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Strategy Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={e => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Payment System Test Strategy"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Version</label>
            <input
              type="text"
              className="form-input"
              value={formData.version}
              onChange={e => handleFieldChange('version', e.target.value)}
              placeholder="1.0"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Author</label>
            <input
              type="text"
              className="form-input"
              value={formData.created_by}
              onChange={e => handleFieldChange('created_by', e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>
        
        {/* Strategy type is now determined by the project's is_cross_team setting */}
      </div>
      
      {/* Sections */}
      <div className="sections">
        {SECTIONS.map((section, index) => (
          <div key={section.key} className="section-card">
            <div 
              className="section-header"
              onClick={() => toggleSection(section.key)}
            >
              <span className="section-number">{index + 1}</span>
              <span className="section-title">{section.title}</span>
              <span className={`section-status ${formData[section.key]?.trim() ? 'filled' : ''}`}>
                {formData[section.key]?.trim() ? 'Completed' : 'Empty'}
              </span>
              {expandedSections.includes(section.key) 
                ? <ChevronUp size={20} /> 
                : <ChevronDown size={20} />
              }
            </div>
            
            {expandedSections.includes(section.key) && (
              <div className="section-content">
                <textarea
                  className="form-textarea section-textarea"
                  value={formData[section.key]}
                  onChange={e => handleFieldChange(section.key, e.target.value)}
                  placeholder={section.placeholder}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Bottom Actions */}
      <div className="bottom-actions">
        <button 
          className="btn btn-secondary btn-lg" 
          onClick={() => handleSave()}
          disabled={saving}
        >
          <Save size={20} />
          Save Draft
        </button>
        <button 
          className="btn btn-primary btn-lg" 
          onClick={() => handleSave('in_review')}
          disabled={saving}
        >
          Submit for Review
        </button>
      </div>
      
      {/* Document Reference Panel */}
      {showDocPanel && selectedDoc && (
        <div className="doc-panel">
          <div className="doc-panel-header">
            <h4>{selectedDoc.name}</h4>
            <span className="badge badge-draft">{selectedDoc.doc_type?.toUpperCase()}</span>
            <button className="btn btn-ghost ml-auto" onClick={() => setShowDocPanel(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="doc-panel-content">
            {selectedDoc.content_text ? (
              <>
                <div className="doc-panel-toolbar">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => copyToClipboard(selectedDoc.content_text)}
                  >
                    <Copy size={14} />
                    Copy All
                  </button>
                </div>
                <pre>{selectedDoc.content_text}</pre>
              </>
            ) : (
              <p className="text-muted">No text content extracted from this document.</p>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        .strategy-editor {
          max-width: 900px;
        }
        
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-xl);
        }
        
        .header-actions {
          display: flex;
          gap: var(--space-sm);
        }
        
        .progress-bar {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--space-md) var(--space-lg);
        }
        
        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: var(--space-sm);
        }
        
        .progress-track {
          height: 8px;
          background: var(--bg-hover);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: var(--gradient-accent);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
        }
        
        .sections {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .section-textarea {
          min-height: 180px;
          font-family: var(--font-sans);
          line-height: 1.7;
        }
        
        .bottom-actions {
          display: flex;
          justify-content: center;
          gap: var(--space-md);
          padding: var(--space-xl) 0;
          margin-top: var(--space-lg);
          border-top: 1px solid var(--border-color);
        }
        
        .docs-toolbar {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--space-md) var(--space-lg);
        }
        
        .toolbar-buttons {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
        }
        
        .btn-accent {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
        }
        
        .btn-accent:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
        }
        
        .no-docs-warning {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-lg);
          padding: var(--space-md) var(--space-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-md);
        }
        
        .no-docs-warning p {
          margin: 0;
          color: var(--text-secondary);
        }
        
        .doc-selector {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        
        .doc-chip {
          padding: 0.375rem 0.75rem;
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-sans);
        }
        
        .doc-chip:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        
        .doc-chip.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        
        .doc-panel {
          position: fixed;
          right: 0;
          top: 0;
          width: 450px;
          height: 100vh;
          background: var(--bg-card);
          border-left: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 100;
          box-shadow: -4px 0 20px rgba(0,0,0,0.3);
        }
        
        .doc-panel-header {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-lg);
          border-bottom: 1px solid var(--border-color);
        }
        
        .doc-panel-header h4 {
          font-size: 1rem;
        }
        
        .doc-panel-content {
          flex: 1;
          overflow: auto;
          padding: var(--space-lg);
        }
        
        .doc-panel-toolbar {
          margin-bottom: var(--space-md);
        }
        
        .doc-panel-content pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: var(--font-sans);
          font-size: 0.875rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        
        .ml-auto {
          margin-left: auto;
        }
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .doc-panel {
            width: 100%;
          }
          
          .editor-header {
            flex-direction: column;
            gap: var(--space-md);
          }
          
          .header-actions {
            width: 100%;
          }
          
          .header-actions .btn {
            flex: 1;
          }
        }
        
        /* Strategy Type Selector */
        .strategy-type-selector {
          margin-top: var(--space-lg);
        }
        
        .type-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
          margin-top: var(--space-sm);
        }
        
        .type-option {
          display: flex;
          gap: var(--space-md);
          padding: var(--space-lg);
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .type-option:hover {
          border-color: var(--accent-purple);
          background: rgba(139, 92, 246, 0.05);
        }
        
        .type-option.active {
          border-color: var(--accent-purple);
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }
        
        .type-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }
        
        .type-content h4 {
          margin: 0 0 var(--space-xs);
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .type-content p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        
        /* Cross-Team Badge (shown instead of selector for cross-team projects) */
        .cross-team-badge {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-lg);
        }
        
        .cross-team-badge .badge-icon {
          font-size: 1.5rem;
        }
        
        .cross-team-badge .badge-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .cross-team-badge .badge-content strong {
          color: var(--accent-blue);
          font-size: 0.95rem;
        }
        
        .cross-team-badge .badge-content span {
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        
        @media (max-width: 768px) {
          .type-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default StrategyEditor

