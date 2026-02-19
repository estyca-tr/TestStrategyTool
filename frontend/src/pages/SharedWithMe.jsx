import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Share2, FileText, FolderOpen, Eye, Edit2, Clock, User, ExternalLink } from 'lucide-react'
import { sharesAPI, authAPI } from '../services/api'
import { format, parseISO } from 'date-fns'

const PERMISSION_LABELS = {
  view: { label: 'צפייה', icon: Eye, color: '#06b6d4' },
  comment: { label: 'הערות', icon: Eye, color: '#f59e0b' },
  edit: { label: 'עריכה', icon: Edit2, color: '#10b981' },
  admin: { label: 'מנהל', icon: Edit2, color: '#8b5cf6' }
}

function SharedWithMe() {
  const navigate = useNavigate()
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/')
      return
    }
    loadShares()
  }, [])

  async function loadShares() {
    try {
      setLoading(true)
      const result = await sharesAPI.getSharedWithMe()
      setShares(result.shares || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page loading-page">
        <div className="loading-spinner" />
        <p>Loading shared items...</p>
      </div>
    )
  }

  return (
    <div className="page shared-page">
      <div className="page-header">
        <div>
          <h1>🔗 Shared with Me</h1>
          <p className="text-muted">אסטרטגיות ופרויקטים ששותפו איתך</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {shares.length === 0 ? (
        <div className="empty-state">
          <Share2 size={64} />
          <h2>אין פריטים משותפים</h2>
          <p>כשמישהו ישתף איתך אסטרטגיה או פרויקט, הם יופיעו כאן</p>
        </div>
      ) : (
        <div className="shares-grid">
          {shares.map(share => {
            const perm = PERMISSION_LABELS[share.permission] || PERMISSION_LABELS.view
            const PermIcon = perm.icon
            
            return (
              <div key={share.id} className="share-card">
                <div className="share-card-header">
                  <div className="share-type-icon">
                    {share.share_type === 'project' ? (
                      <FolderOpen size={24} />
                    ) : (
                      <FileText size={24} />
                    )}
                  </div>
                  <div className="share-permission" style={{ background: perm.color }}>
                    <PermIcon size={12} />
                    {perm.label}
                  </div>
                </div>
                
                <div className="share-card-body">
                  <h3>{share.share_type === 'project' ? 'Project' : 'Strategy'}</h3>
                  <p className="share-id">ID: {share.project_id || share.strategy_id}</p>
                  
                  <div className="share-meta">
                    <div className="share-meta-item">
                      <User size={14} />
                      <span>By: {share.shared_by_name || 'Unknown'}</span>
                    </div>
                    <div className="share-meta-item">
                      <Clock size={14} />
                      <span>{format(parseISO(share.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="share-card-footer">
                  {share.share_type === 'strategy' && share.strategy_id && (
                    <Link to={`/strategy/${share.strategy_id}`} className="btn btn-primary">
                      <ExternalLink size={16} />
                      Open
                    </Link>
                  )}
                  {share.share_type === 'project' && share.project_id && (
                    <Link to={`/projects/${share.project_id}`} className="btn btn-primary">
                      <ExternalLink size={16} />
                      Open
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .shared-page {
          padding: var(--space-xl);
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          color: var(--text-muted);
        }
        
        .empty-state svg {
          margin-bottom: var(--space-lg);
          opacity: 0.3;
        }
        
        .empty-state h2 {
          margin-bottom: var(--space-sm);
          color: var(--text-primary);
        }
        
        .shares-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-lg);
          margin-top: var(--space-xl);
        }
        
        .share-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: all 0.2s;
        }
        
        .share-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }
        
        .share-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
          border-bottom: 1px solid var(--border-color);
        }
        
        .share-type-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-cyan);
        }
        
        .share-permission {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .share-card-body {
          padding: var(--space-md);
        }
        
        .share-card-body h3 {
          margin: 0 0 var(--space-xs);
        }
        
        .share-id {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: var(--space-md);
        }
        
        .share-meta {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .share-meta-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        
        .share-card-footer {
          padding: var(--space-md);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
        }
        
        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: var(--space-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        
        .loading-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-cyan);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: var(--space-md);
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SharedWithMe

