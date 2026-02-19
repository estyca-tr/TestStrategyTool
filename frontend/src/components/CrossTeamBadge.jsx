import { Users } from 'lucide-react'

function CrossTeamBadge({ count = 0, size = 'default' }) {
  const sizeClasses = {
    small: 'cross-team-badge-sm',
    default: 'cross-team-badge',
    large: 'cross-team-badge-lg'
  }
  
  return (
    <span className={sizeClasses[size]}>
      <Users size={size === 'small' ? 12 : size === 'large' ? 18 : 14} />
      <span>Cross-Team</span>
      {count > 0 && <span className="badge-count">{count}</span>}
      
      <style>{`
        .cross-team-badge,
        .cross-team-badge-sm,
        .cross-team-badge-lg {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: #1a1a2e;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .cross-team-badge-sm {
          padding: 2px 8px;
          font-size: 0.7rem;
        }
        
        .cross-team-badge-lg {
          padding: 6px 14px;
          font-size: 0.875rem;
        }
        
        .cross-team-badge .badge-count,
        .cross-team-badge-sm .badge-count,
        .cross-team-badge-lg .badge-count {
          background: rgba(0, 0, 0, 0.2);
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 0.7rem;
        }
      `}</style>
    </span>
  )
}

export default CrossTeamBadge




