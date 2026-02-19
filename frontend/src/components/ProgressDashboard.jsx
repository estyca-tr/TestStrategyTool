import { useState, useEffect } from 'react'
import { 
  BarChart3, Users, Layers, CheckCircle2, Clock, AlertCircle, 
  TrendingUp, Target, ArrowUp, ArrowDown 
} from 'lucide-react'
import { progressAPI } from '../services/api'

function ProgressDashboard({ strategyId }) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('overview') // overview, by-participant, by-category

  useEffect(() => {
    loadProgress()
  }, [strategyId])

  async function loadProgress() {
    try {
      const data = await progressAPI.getFull(strategyId)
      setProgress(data)
    } catch (err) {
      console.error('Failed to load progress:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="progress-loading">Loading progress...</div>
  }

  if (!progress) {
    return <div className="progress-empty">No progress data available</div>
  }

  // Backend returns: { summary: {...}, by_participant: [...], by_category: [...] }
  const summary = progress.summary || {}
  const { 
    total_items = 0, 
    completed = 0, 
    in_progress = 0,
    blocked = 0,
    not_started = 0,
    completion_percentage = 0
  } = summary
  
  const by_participant = progress.by_participant || []
  const by_category = progress.by_category || []
  
  // Map to simpler names for the UI
  const completed_items = completed
  const in_progress_items = in_progress
  const blocked_items = blocked
  const overall_progress = completion_percentage
  const todoItems = not_started

  return (
    <div className="progress-dashboard">
      <div className="pd-header">
        <div className="pd-header-left">
          <BarChart3 size={20} className="pd-icon" />
          <h3>Progress Dashboard</h3>
        </div>
        <div className="pd-view-tabs">
          <button 
            className={`pd-tab ${view === 'overview' ? 'active' : ''}`}
            onClick={() => setView('overview')}
          >
            Overview
          </button>
          <button 
            className={`pd-tab ${view === 'by-participant' ? 'active' : ''}`}
            onClick={() => setView('by-participant')}
          >
            By Person
          </button>
          <button 
            className={`pd-tab ${view === 'by-category' ? 'active' : ''}`}
            onClick={() => setView('by-category')}
          >
            By Category
          </button>
        </div>
      </div>

      {view === 'overview' && (
        <div className="pd-overview">
          {/* Main Progress Circle */}
          <div className="pd-main-progress">
            <div className="pd-progress-ring">
              <svg viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--bg-hover)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - overall_progress / 100)}`}
                  transform="rotate(-90 60 60)"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="pd-progress-text">
                <span className="pd-progress-value">{Math.round(overall_progress)}%</span>
                <span className="pd-progress-label">Complete</span>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="pd-status-cards">
            <div className="pd-status-card pd-card-done">
              <CheckCircle2 size={24} />
              <div className="pd-card-info">
                <span className="pd-card-value">{completed_items}</span>
                <span className="pd-card-label">Completed</span>
              </div>
            </div>
            <div className="pd-status-card pd-card-progress">
              <Clock size={24} />
              <div className="pd-card-info">
                <span className="pd-card-value">{in_progress_items}</span>
                <span className="pd-card-label">In Progress</span>
              </div>
            </div>
            <div className="pd-status-card pd-card-todo">
              <Target size={24} />
              <div className="pd-card-info">
                <span className="pd-card-value">{todoItems}</span>
                <span className="pd-card-label">To Do</span>
              </div>
            </div>
            <div className="pd-status-card pd-card-blocked">
              <AlertCircle size={24} />
              <div className="pd-card-info">
                <span className="pd-card-value">{blocked_items}</span>
                <span className="pd-card-label">Blocked</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'by-participant' && (
        <div className="pd-by-participant">
          {by_participant.length === 0 ? (
            <div className="pd-empty-view">
              <Users size={48} />
              <p>No participant data yet</p>
            </div>
          ) : (
            <div className="pd-participant-list">
              {by_participant.map(p => (
                <div key={p.participant_id} className="pd-participant">
                  <div className="pd-participant-avatar">
                    {p.participant_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="pd-participant-info">
                    <div className="pd-participant-name">
                      <span>{p.participant_name}</span>
                      {p.participant_team && <span className="pd-participant-team">{p.participant_team}</span>}
                    </div>
                    <div className="pd-participant-stats">
                      <span className="pd-stat-completed">{p.completed} done</span>
                      <span className="pd-stat-total">/ {p.total_items} items</span>
                    </div>
                  </div>
                  <div className="pd-participant-progress">
                    <div className="pd-mini-bar">
                      <div 
                        className="pd-mini-bar-fill"
                        style={{ width: `${p.completion_percentage}%` }}
                      />
                    </div>
                    <span className="pd-mini-percent">{Math.round(p.completion_percentage)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'by-category' && (
        <div className="pd-by-category">
          {by_category.length === 0 ? (
            <div className="pd-empty-view">
              <Layers size={48} />
              <p>No category data yet</p>
            </div>
          ) : (
            <div className="pd-category-list">
              {by_category.map(c => {
                const typeIcons = { team: '👥', feature: '⚡', environment: '🌐', other: '📋' }
                return (
                  <div key={c.category_id} className="pd-category">
                    <div className="pd-category-header">
                      <span className="pd-category-icon">{typeIcons[c.category_type] || '📋'}</span>
                      <span className="pd-category-name">{c.category_name}</span>
                    </div>
                    <div className="pd-category-bar">
                      <div className="pd-bar-segments">
                        <div 
                          className="pd-bar-done"
                          style={{ width: `${c.completion_percentage}%` }}
                          title={`${c.completed} completed`}
                        />
                      </div>
                    </div>
                    <div className="pd-category-stats">
                      <span>{c.completed}/{c.total_items}</span>
                      <span className="pd-category-percent">{Math.round(c.completion_percentage)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        .progress-dashboard {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        
        .pd-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        
        .pd-header-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .pd-header-left h3 {
          font-size: 1rem;
          margin: 0;
        }
        
        .pd-icon {
          color: var(--accent-green);
        }
        
        .pd-view-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-primary);
          padding: 4px;
          border-radius: var(--radius-md);
        }
        
        .pd-tab {
          padding: 6px 12px;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.8rem;
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }
        
        .pd-tab:hover {
          color: var(--text-primary);
        }
        
        .pd-tab.active {
          background: var(--accent-purple);
          color: white;
        }
        
        .pd-overview {
          padding: var(--space-lg);
        }
        
        .pd-main-progress {
          display: flex;
          justify-content: center;
          padding: var(--space-lg);
        }
        
        .pd-progress-ring {
          position: relative;
          width: 140px;
          height: 140px;
        }
        
        .pd-progress-ring svg {
          width: 100%;
          height: 100%;
        }
        
        .pd-progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        .pd-progress-value {
          font-size: 2rem;
          font-weight: 700;
          display: block;
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .pd-progress-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .pd-status-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin-top: var(--space-md);
        }
        
        @media (max-width: 768px) {
          .pd-status-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .pd-status-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        
        .pd-card-done svg {
          color: #10b981;
        }
        
        .pd-card-progress svg {
          color: #f59e0b;
        }
        
        .pd-card-todo svg {
          color: #6b7280;
        }
        
        .pd-card-blocked svg {
          color: #ef4444;
        }
        
        .pd-card-info {
          display: flex;
          flex-direction: column;
        }
        
        .pd-card-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .pd-card-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .pd-by-participant,
        .pd-by-category {
          padding: var(--space-lg);
        }
        
        .pd-empty-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-xl);
          color: var(--text-muted);
        }
        
        .pd-empty-view p {
          margin-top: var(--space-md);
        }
        
        .pd-participant-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .pd-participant {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        
        .pd-participant-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        
        .pd-participant-info {
          flex: 1;
        }
        
        .pd-participant-name {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-weight: 500;
        }
        
        .pd-participant-team {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 10px;
        }
        
        .pd-participant-stats {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        
        .pd-stat-completed {
          color: #10b981;
        }
        
        .pd-participant-progress {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          min-width: 120px;
        }
        
        .pd-mini-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-hover);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .pd-mini-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .pd-mini-percent {
          font-size: 0.8rem;
          font-weight: 600;
          min-width: 40px;
          text-align: right;
        }
        
        .pd-category-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .pd-category {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          padding: var(--space-md);
        }
        
        .pd-category-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }
        
        .pd-category-icon {
          font-size: 1.2rem;
        }
        
        .pd-category-name {
          font-weight: 500;
        }
        
        .pd-category-bar {
          height: 12px;
          background: var(--bg-hover);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .pd-bar-segments {
          display: flex;
          height: 100%;
        }
        
        .pd-bar-done {
          background: #10b981;
          transition: width 0.3s ease;
        }
        
        .pd-bar-progress {
          background: #f59e0b;
          transition: width 0.3s ease;
        }
        
        .pd-bar-blocked {
          background: #ef4444;
          transition: width 0.3s ease;
        }
        
        .pd-category-stats {
          display: flex;
          justify-content: space-between;
          margin-top: var(--space-sm);
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        
        .pd-category-percent {
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .progress-loading,
        .progress-empty {
          padding: var(--space-xl);
          text-align: center;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

export default ProgressDashboard

