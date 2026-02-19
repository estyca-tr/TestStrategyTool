import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderOpen, FileText, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { projectsAPI } from '../services/api'
import { format, parseISO } from 'date-fns'

function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  
  useEffect(() => {
    loadProjects()
  }, [])
  
  async function loadProjects() {
    try {
      setLoading(true)
      const params = {}
      if (search && search.trim()) params.search = search.trim()
      const data = await projectsAPI.getAll(params)
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    const timer = setTimeout(loadProjects, 300)
    return () => clearTimeout(timer)
  }, [search])
  
  async function handleDelete(id) {
    if (!confirm('Delete this project?')) return
    try {
      await projectsAPI.delete(id)
      setProjects(projects.filter(p => p.id !== id))
    } catch (err) {
      alert('Failed to delete')
    }
  }
  
  return (
    <div className="projects-page animate-in">
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="mt-sm">Organize your test strategies by project</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          New Project
        </button>
      </header>
      
      {/* Search */}
      <div className="search-bar mb-lg">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          className="form-input"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      
      {/* Projects Grid */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : projects.length > 0 ? (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card card">
              <div className="project-header">
                <div className="project-icon">
                  <FolderOpen size={24} />
                </div>
                <div className="project-actions">
                  <button 
                    className="btn btn-ghost"
                    onClick={() => setEditingProject(project)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="btn btn-ghost"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <Link to={`/projects/${project.id}`} className="project-content">
                <h3>{project.name}</h3>
                <p>{project.description || 'No description'}</p>
              </Link>
              
              <div className="project-stats">
                <div className="project-stat">
                  <FileText size={16} />
                  <span>{project.document_count} docs</span>
                </div>
                <div className="project-stat">
                  <span>{project.strategy_count} strategies</span>
                </div>
              </div>
              
              <div className="project-date">
                Updated {format(parseISO(project.updated_at), 'MMM d, yyyy')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FolderOpen size={64} />
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary mt-md" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Create Project
          </button>
        </div>
      )}
      
      {/* Modal */}
      {(showModal || editingProject) && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowModal(false)
            setEditingProject(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingProject(null)
            loadProjects()
          }}
        />
      )}
      
      <style>{`
        .search-bar {
          position: relative;
          max-width: 400px;
        }
        
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        
        .search-bar .form-input {
          padding-left: 2.75rem;
        }
        
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-lg);
        }
        
        .project-card {
          display: flex;
          flex-direction: column;
        }
        
        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-md);
        }
        
        .project-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-accent);
          border-radius: var(--radius-md);
          color: white;
        }
        
        .project-actions {
          display: flex;
          gap: var(--space-xs);
        }
        
        .project-content {
          flex: 1;
          text-decoration: none;
          color: inherit;
          margin-bottom: var(--space-md);
        }
        
        .project-content h3 {
          margin-bottom: var(--space-xs);
          transition: color 0.2s;
        }
        
        .project-content:hover h3 {
          color: var(--accent-primary);
        }
        
        .project-stats {
          display: flex;
          gap: var(--space-lg);
          padding-top: var(--space-md);
          border-top: 1px solid var(--border-color);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .project-stat {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }
        
        .project-date {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: var(--space-sm);
        }
      `}</style>
    </div>
  )
}

function ProjectModal({ project, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || ''
  })
  const [saving, setSaving] = useState(false)
  
  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    try {
      setSaving(true)
      if (project) {
        await projectsAPI.update(project.id, formData)
      } else {
        await projectsAPI.create(formData)
      }
      onSave()
    } catch (err) {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{project ? 'Edit Project' : 'New Project'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Payment System Redesign"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project..."
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-lg);
        }
        
        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          width: 100%;
          max-width: 480px;
        }
        
        .modal h2 {
          margin-bottom: var(--space-lg);
        }
        
        .modal-actions {
          display: flex;
          gap: var(--space-md);
          justify-content: flex-end;
          margin-top: var(--space-lg);
        }
      `}</style>
    </div>
  )
}

export default Projects

