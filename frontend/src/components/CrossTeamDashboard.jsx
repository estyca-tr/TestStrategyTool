import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, FileText, Layers, BarChart3, ChevronDown, ChevronRight, 
  Plus, Edit2, Trash2, ExternalLink, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'
import { strategiesAPI, participantsAPI, breakdownAPI, progressAPI } from '../services/api'
import BreakdownEditor from './BreakdownEditor'
import ProgressDashboard from './ProgressDashboard'

function CrossTeamDashboard({ projectId, onUpdate }) {
  const [strategy, setStrategy] = useState(null)
  const [participants, setParticipants] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('breakdown') // participants, strategy, breakdown, progress
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [newParticipant, setNewParticipant] = useState({ name: '', team: '', role: '' })
  const [expandedSections, setExpandedSections] = useState({ participants: true, strategy: false, breakdown: true, progress: true })
  const [mainTab, setMainTab] = useState('breakdown') // breakdown | progress

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      setLoading(true)
      const [strategiesData, participantsData] = await Promise.all([
        strategiesAPI.getAll({ project_id: projectId }),
        participantsAPI.getAll(projectId)
      ])
      
      // Find cross-team strategy
      const crossTeamStrategy = strategiesData.find(s => s.is_cross_team)
      setStrategy(crossTeamStrategy || null)
      setParticipants(participantsData)
      
      // Load progress if strategy exists
      if (crossTeamStrategy) {
        try {
          const progressData = await progressAPI.getByStrategy(crossTeamStrategy.id)
          setProgress(progressData)
        } catch (e) {
          console.log('Progress not available')
        }
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddParticipant() {
    if (!newParticipant.name.trim()) return
    try {
      await participantsAPI.create(projectId, newParticipant)
      setShowAddParticipant(false)
      setNewParticipant({ name: '', team: '', role: '' })
      loadData()
      onUpdate?.()
    } catch (err) {
      alert('Failed to add participant: ' + err.message)
    }
  }

  async function handleDeleteParticipant(id, name) {
    if (!confirm(`Remove ${name}?`)) return
    try {
      await participantsAPI.delete(id)
      loadData()
      onUpdate?.()
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  function toggleSection(section) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Extract unique teams
  const teams = [...new Set(participants.map(p => p.team).filter(Boolean))]

  if (loading) {
    return <div className="ctd-loading">Loading...</div>
  }

  return (
    <div className="cross-team-dashboard">
      {/* Header with Progress Overview */}
      <div className="ctd-header">
        <div className="ctd-header-left">
          <h2>🎯 Cross-Team E2E Dashboard</h2>
          {progress && (
            <div className="ctd-progress-mini">
              <div className="ctd-progress-bar">
                <div 
                  className="ctd-progress-fill" 
                  style={{ width: `${progress.completion_percentage || 0}%` }}
                />
              </div>
              <span>{Math.round(progress.completion_percentage || 0)}%</span>
            </div>
          )}
        </div>
        {strategy && (
          <Link to={`/strategy/${strategy.id}`} className="btn btn-primary btn-sm">
            <ExternalLink size={14} />
            View Full Strategy
          </Link>
        )}
      </div>

      <div className="ctd-grid">
        {/* Left Column - Participants & Teams (Compact) */}
        <div className="ctd-sidebar">
          <div className="ctd-section ctd-section-compact">
            <div className="ctd-section-header" onClick={() => toggleSection('participants')}>
              <div className="ctd-section-title">
                {expandedSections.participants ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Users size={16} />
                <span>Teams & Participants</span>
                <span className="ctd-badge">{participants.length}</span>
              </div>
              <button 
                className="btn btn-ghost btn-xs"
                onClick={(e) => { e.stopPropagation(); setShowAddParticipant(true); }}
              >
                <Plus size={14} />
              </button>
            </div>
            
            {expandedSections.participants && (
              <div className="ctd-section-content">
                {teams.length === 0 ? (
                  <div className="ctd-empty-small">
                    <span>No teams yet</span>
                    <button className="btn btn-link btn-xs" onClick={() => setShowAddParticipant(true)}>
                      Add first participant
                    </button>
                  </div>
                ) : (
                  <div className="ctd-teams-list">
                    {teams.map(team => (
                      <div key={team} className="ctd-team-row">
                        <span className="ctd-team-name">🏢 {team}</span>
                        <div className="ctd-team-members">
                          {participants.filter(p => p.team === team).map(p => (
                            <div key={p.id} className="ctd-member" title={`${p.name} - ${p.role || 'No role'}`}>
                              <span className="ctd-member-avatar">{p.name.charAt(0)}</span>
                              <span className="ctd-member-name">{p.name}</span>
                              <button 
                                className="ctd-member-delete"
                                onClick={() => handleDeleteParticipant(p.id, p.name)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Quick Add Participant */}
                {showAddParticipant && (
                  <div className="ctd-quick-add">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newParticipant.name}
                      onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })}
                      className="form-input form-input-sm"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Team"
                      value={newParticipant.team}
                      onChange={e => setNewParticipant({ ...newParticipant, team: e.target.value })}
                      className="form-input form-input-sm"
                      list="team-suggestions"
                    />
                    <datalist id="team-suggestions">
                      {teams.map(t => <option key={t} value={t} />)}
                    </datalist>
                    <div className="ctd-quick-add-actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => setShowAddParticipant(false)}>Cancel</button>
                      <button className="btn btn-primary btn-xs" onClick={handleAddParticipant}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Summary */}
          {progress && (
            <div className="ctd-section ctd-section-compact">
              <div className="ctd-section-header" onClick={() => toggleSection('progress')}>
                <div className="ctd-section-title">
                  {expandedSections.progress ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <BarChart3 size={16} />
                  <span>Status Overview</span>
                </div>
              </div>
              
              {expandedSections.progress && (
                <div className="ctd-section-content">
                  <div className="ctd-status-grid">
                    <div className="ctd-status-item ctd-status-todo">
                      <span className="ctd-status-count">{progress.not_started || 0}</span>
                      <span className="ctd-status-label">To Do</span>
                    </div>
                    <div className="ctd-status-item ctd-status-progress">
                      <span className="ctd-status-count">{progress.in_progress || 0}</span>
                      <span className="ctd-status-label">In Progress</span>
                    </div>
                    <div className="ctd-status-item ctd-status-done">
                      <span className="ctd-status-count">{progress.completed || 0}</span>
                      <span className="ctd-status-label">Done</span>
                    </div>
                    <div className="ctd-status-item ctd-status-blocked">
                      <span className="ctd-status-count">{progress.blocked || 0}</span>
                      <span className="ctd-status-label">Blocked</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content - Test Breakdown & Progress */}
        <div className="ctd-main">
          {strategy ? (
            <>
              {/* Main Tabs */}
              <div className="ctd-main-tabs">
                <button 
                  className={`ctd-main-tab ${mainTab === 'breakdown' ? 'active' : ''}`}
                  onClick={() => setMainTab('breakdown')}
                >
                  <Layers size={16} />
                  Test Breakdown
                </button>
                <button 
                  className={`ctd-main-tab ${mainTab === 'progress' ? 'active' : ''}`}
                  onClick={() => setMainTab('progress')}
                >
                  <BarChart3 size={16} />
                  Progress Dashboard
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="ctd-main-content">
                {mainTab === 'breakdown' ? (
                  <BreakdownEditor 
                    strategyId={strategy.id} 
                    participants={participants}
                    onUpdate={loadData}
                  />
                ) : (
                  <ProgressDashboard strategyId={strategy.id} />
                )}
              </div>
            </>
          ) : (
            <div className="ctd-no-strategy">
              <Layers size={48} />
              <h3>No Cross-Team Strategy Yet</h3>
              <p>Create a Cross-Team E2E Strategy to start managing tests</p>
              <Link to={`/strategy/new?project=${projectId}&type=cross_team`} className="btn btn-primary">
                <Plus size={16} />
                Create Cross-Team Strategy
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .cross-team-dashboard {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        
        .ctd-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
          border-bottom: 1px solid var(--border-color);
        }
        
        .ctd-header-left {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
        }
        
        .ctd-header h2 {
          margin: 0;
          font-size: 1.1rem;
        }
        
        .ctd-progress-mini {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .ctd-progress-bar {
          width: 100px;
          height: 6px;
          background: var(--bg-primary);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .ctd-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
          transition: width 0.3s;
        }
        
        .ctd-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          min-height: 400px;
        }
        
        .ctd-sidebar {
          background: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          padding: var(--space-sm);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .ctd-main {
          padding: var(--space-md);
          overflow-y: auto;
        }
        
        .ctd-section {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        
        .ctd-section-compact .ctd-section-header {
          padding: var(--space-sm) var(--space-md);
        }
        
        .ctd-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .ctd-section-header:hover {
          background: var(--bg-hover);
        }
        
        .ctd-section-title {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        .ctd-badge {
          background: var(--accent-purple);
          color: white;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 4px;
        }
        
        .ctd-section-content {
          padding: var(--space-sm);
          border-top: 1px solid var(--border-color);
        }
        
        .ctd-empty-small {
          text-align: center;
          padding: var(--space-sm);
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        
        .ctd-teams-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .ctd-team-row {
          background: var(--bg-primary);
          border-radius: var(--radius-sm);
          padding: var(--space-xs);
        }
        
        .ctd-team-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-cyan);
          display: block;
          margin-bottom: 4px;
        }
        
        .ctd-team-members {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .ctd-member {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-secondary);
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 0.75rem;
        }
        
        .ctd-member-avatar {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 600;
        }
        
        .ctd-member-name {
          max-width: 60px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .ctd-member-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          font-size: 0.9rem;
          line-height: 1;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .ctd-member:hover .ctd-member-delete {
          opacity: 1;
        }
        
        .ctd-member-delete:hover {
          color: var(--accent-red);
        }
        
        .ctd-quick-add {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          margin-top: var(--space-sm);
          padding: var(--space-sm);
          background: var(--bg-hover);
          border-radius: var(--radius-sm);
        }
        
        .ctd-quick-add .form-input {
          font-size: 0.8rem;
          padding: 6px 8px;
        }
        
        .ctd-quick-add-actions {
          display: flex;
          gap: var(--space-xs);
          justify-content: flex-end;
        }
        
        .ctd-status-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-xs);
        }
        
        .ctd-status-item {
          text-align: center;
          padding: var(--space-xs);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
        }
        
        .ctd-status-count {
          display: block;
          font-size: 1.2rem;
          font-weight: 700;
        }
        
        .ctd-status-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        
        .ctd-status-todo .ctd-status-count { color: #6b7280; }
        .ctd-status-progress .ctd-status-count { color: #f59e0b; }
        .ctd-status-done .ctd-status-count { color: #10b981; }
        .ctd-status-blocked .ctd-status-count { color: #ef4444; }
        
        .ctd-no-strategy {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-xl);
          text-align: center;
          color: var(--text-muted);
          min-height: 300px;
        }
        
        .ctd-no-strategy h3 {
          margin: var(--space-md) 0 var(--space-sm);
          color: var(--text-primary);
        }
        
        .ctd-no-strategy p {
          margin-bottom: var(--space-lg);
        }
        
        .ctd-loading {
          padding: var(--space-xl);
          text-align: center;
          color: var(--text-muted);
        }
        
        .btn-link {
          background: none;
          border: none;
          color: var(--accent-cyan);
          cursor: pointer;
          text-decoration: underline;
        }
        
        .ctd-main-tabs {
          display: flex;
          gap: var(--space-xs);
          margin-bottom: var(--space-md);
          padding-bottom: var(--space-sm);
          border-bottom: 1px solid var(--border-color);
        }
        
        .ctd-main-tab {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: none;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .ctd-main-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .ctd-main-tab.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
          color: var(--accent-cyan);
        }
        
        .ctd-main-content {
          flex: 1;
        }
      `}</style>
    </div>
  )
}

export default CrossTeamDashboard

