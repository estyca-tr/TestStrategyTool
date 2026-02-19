import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, FileText, Plus, ArrowRight, Clock, Sparkles, Rocket, PenTool } from 'lucide-react'
import { projectsAPI, strategiesAPI } from '../services/api'
import { format, parseISO } from 'date-fns'

function Dashboard() {
  const [stats, setStats] = useState({ projects: 0, strategies: 0 })
  const [recentStrategies, setRecentStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    try {
      setLoading(true)
      const [projects, strategies] = await Promise.all([
        projectsAPI.getAll(),
        strategiesAPI.getAll({ limit: 5 })
      ])
      
      setStats({
        projects: projects.length,
        strategies: strategies.length
      })
      setRecentStrategies(strategies)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }
  
  return (
    <div className="dashboard animate-in">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-sm">Manage your test strategies and documentation</p>
        </div>
        <Link to="/strategy/new" className="btn btn-primary btn-lg">
          <Plus size={20} />
          New Strategy
        </Link>
      </header>
      
      {/* Stats */}
      <div className="stats-grid mb-lg">
        <div className="stat-card">
          <div className="stat-icon cyan">
            <FolderOpen size={24} />
          </div>
          <div className="stat-value">{stats.projects}</div>
          <div className="stat-label">Projects</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon pink">
            <FileText size={24} />
          </div>
          <div className="stat-value">{stats.strategies}</div>
          <div className="stat-label">Test Strategies</div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions mb-lg">
        <h2 className="mb-md">
          <Sparkles size={24} className="icon-orange" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Quick Actions
        </h2>
        <div className="actions-grid">
          <Link to="/projects" className="action-card action-cyan">
            <div className="icon-box cyan">
              <Rocket size={22} />
            </div>
            <div>
              <h4>Create Project</h4>
              <p>Start a new project to organize your documents</p>
            </div>
            <ArrowRight size={20} />
          </Link>
          
          <Link to="/strategy/new" className="action-card action-pink">
            <div className="icon-box pink">
              <PenTool size={22} />
            </div>
            <div>
              <h4>Write Strategy</h4>
              <p>Create a new test strategy document</p>
            </div>
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
      
      {/* Recent Strategies */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Strategies</h3>
          <Link to="/projects" className="btn btn-ghost">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        
        {recentStrategies.length > 0 ? (
          <div className="strategies-list">
            {recentStrategies.map(strategy => (
              <Link 
                key={strategy.id} 
                to={`/strategy/${strategy.id}`}
                className="strategy-item"
              >
                <div className="strategy-icon">
                  <FileText size={20} />
                </div>
                <div className="strategy-info">
                  <h4>{strategy.title}</h4>
                  <p>{strategy.project_name || 'No project'}</p>
                </div>
                <span className={`badge badge-${strategy.status}`}>
                  {strategy.status}
                </span>
                <div className="strategy-date">
                  <Clock size={14} />
                  {format(parseISO(strategy.updated_at), 'MMM d, yyyy')}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FileText size={48} />
            <p>No strategies yet</p>
            <Link to="/strategy/new" className="btn btn-primary mt-md">
              Create Your First Strategy
            </Link>
          </div>
        )}
      </div>
      
      
      <style>{`
        .dashboard {
          max-width: 1200px;
        }
        
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
        }
        
        .action-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-lg);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          text-decoration: none;
          color: inherit;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        
        .action-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-accent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .action-card.action-cyan::before { background: var(--gradient-cyan); }
        .action-card.action-pink::before { background: var(--gradient-pink); }
        .action-card.action-green::before { background: var(--gradient-success); }
        .action-card.action-orange::before { background: var(--gradient-warning); }
        
        .action-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        
        .action-card:hover::before {
          opacity: 1;
        }
        
        .action-card > div:not(.icon-box) {
          flex: 1;
        }
        
        .action-card h4 {
          margin-bottom: var(--space-xs);
        }
        
        .action-card p {
          font-size: 0.875rem;
        }
        
        .action-card svg:last-child {
          color: var(--text-muted);
          transition: transform 0.2s;
        }
        
        .action-card:hover svg:last-child {
          transform: translateX(4px);
          color: var(--text-primary);
        }
        
        .strategies-list {
          display: flex;
          flex-direction: column;
        }
        
        .strategy-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: inherit;
          transition: background 0.2s;
        }
        
        .strategy-item:hover {
          background: var(--bg-hover);
        }
        
        .strategy-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-accent);
          border-radius: var(--radius-md);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }
        
        .strategy-info {
          flex: 1;
        }
        
        .strategy-info h4 {
          margin-bottom: 2px;
        }
        
        .strategy-info p {
          font-size: 0.875rem;
        }
        
        .strategy-date {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        
        @media (max-width: 900px) {
          .actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default Dashboard

