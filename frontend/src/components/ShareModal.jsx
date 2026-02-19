import { useState, useEffect } from 'react'
import { 
  X, Link2, Copy, Check, Mail, Users, Globe, Lock, Eye, Edit2, 
  Shield, Trash2, Clock, UserPlus
} from 'lucide-react'

const PERMISSIONS = [
  { value: 'view', label: 'Can View', icon: Eye, description: 'Can see content only' },
  { value: 'comment', label: 'Can Comment', icon: Users, description: 'Can view and add comments' },
  { value: 'edit', label: 'Can Edit', icon: Edit2, description: 'Can modify content' },
  { value: 'admin', label: 'Admin', icon: Shield, description: 'Full access including sharing' }
]

function ShareModal({ 
  isOpen, 
  onClose, 
  shareType = 'strategy',  // project | strategy
  resourceId,
  resourceName,
  currentShares = [],
  onShare,
  onUpdateShare,
  onDeleteShare,
  onCreateLink
}) {
  const [activeTab, setActiveTab] = useState('people') // people | link
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('view')
  const [linkPermission, setLinkPermission] = useState('view')
  const [linkExpires, setLinkExpires] = useState('never')
  const [shareLink, setShareLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  // Find existing link share
  useEffect(() => {
    const existingLink = currentShares.find(s => s.is_public_link)
    if (existingLink) {
      setShareLink(existingLink.share_url)
    }
  }, [currentShares])

  async function handleShareWithPerson() {
    if (!email.trim()) return
    
    setLoading(true)
    try {
      await onShare?.({
        share_type: shareType,
        [`${shareType}_id`]: resourceId,
        shared_with_email: email,
        permission,
        is_public_link: false
      })
      setEmail('')
    } catch (err) {
      alert('Failed to share: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLink() {
    setLoading(true)
    try {
      const expiresInDays = linkExpires === 'never' ? null : 
                           linkExpires === '7d' ? 7 :
                           linkExpires === '30d' ? 30 : null
      
      const result = await onCreateLink?.({
        share_type: shareType,
        [`${shareType}_id`]: resourceId,
        permission: linkPermission,
        is_public_link: true,
        expires_in_days: expiresInDays
      })
      
      if (result?.share_url) {
        setShareLink(window.location.origin + result.share_url)
      }
    } catch (err) {
      alert('Failed to create link: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  const peopleShares = currentShares.filter(s => !s.is_public_link)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Share "{resourceName}"</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="share-tabs">
          <button 
            className={`share-tab ${activeTab === 'people' ? 'active' : ''}`}
            onClick={() => setActiveTab('people')}
          >
            <UserPlus size={16} />
            People
          </button>
          <button 
            className={`share-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Link2 size={16} />
            Link
          </button>
        </div>

        <div className="share-modal-content">
          {activeTab === 'people' ? (
            /* Share with People */
            <div className="share-people">
              <div className="share-input-row">
                <div className="share-email-input">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="Enter email address..."
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleShareWithPerson()}
                  />
                </div>
                <select 
                  value={permission} 
                  onChange={e => setPermission(e.target.value)}
                  className="share-permission-select"
                >
                  {PERMISSIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary"
                  onClick={handleShareWithPerson}
                  disabled={loading || !email.trim()}
                >
                  Share
                </button>
              </div>

              {/* Current Shares List */}
              <div className="share-list">
                <h4>Shared with</h4>
                {peopleShares.length === 0 ? (
                  <div className="share-empty">
                    <Lock size={24} />
                    <span>Only you have access</span>
                  </div>
                ) : (
                  peopleShares.map(share => (
                    <div key={share.id} className="share-item">
                      <div className="share-item-avatar">
                        {(share.shared_with_name || share.shared_with_email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="share-item-info">
                        <span className="share-item-name">
                          {share.shared_with_name || share.shared_with_email}
                        </span>
                        {share.shared_with_name && (
                          <span className="share-item-email">{share.shared_with_email}</span>
                        )}
                      </div>
                      <select 
                        value={share.permission}
                        onChange={e => onUpdateShare?.(share.id, { permission: e.target.value })}
                        className="share-permission-select-sm"
                      >
                        {PERMISSIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => onDeleteShare?.(share.id)}
                        title="Remove access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Share via Link */
            <div className="share-link">
              {shareLink ? (
                /* Link exists */
                <div className="share-link-created">
                  <div className="share-link-icon">
                    <Globe size={24} />
                  </div>
                  <p>Anyone with the link can access</p>
                  <div className="share-link-box">
                    <input 
                      type="text" 
                      value={shareLink} 
                      readOnly 
                      className="share-link-input"
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Create new link */
                <div className="share-link-create">
                  <div className="share-link-icon">
                    <Link2 size={32} />
                  </div>
                  <h4>Create a shareable link</h4>
                  <p>Anyone with the link will be able to access this {shareType}</p>
                  
                  <div className="share-link-options">
                    <div className="share-option">
                      <label>Permission</label>
                      <select 
                        value={linkPermission}
                        onChange={e => setLinkPermission(e.target.value)}
                      >
                        <option value="view">View only</option>
                        <option value="comment">Can comment</option>
                        <option value="edit">Can edit</option>
                      </select>
                    </div>
                    <div className="share-option">
                      <label>Expires</label>
                      <select 
                        value={linkExpires}
                        onChange={e => setLinkExpires(e.target.value)}
                      >
                        <option value="never">Never</option>
                        <option value="7d">In 7 days</option>
                        <option value="30d">In 30 days</option>
                      </select>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={handleCreateLink}
                    disabled={loading}
                  >
                    <Link2 size={16} />
                    {loading ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <style>{`
          .share-modal {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            width: 500px;
            max-width: 95vw;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          }
          
          .share-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-lg);
            border-bottom: 1px solid var(--border-color);
          }
          
          .share-modal-header h2 {
            margin: 0;
            font-size: 1.1rem;
          }
          
          .share-tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
          }
          
          .share-tab {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-xs);
            padding: var(--space-md);
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
          }
          
          .share-tab:hover {
            color: var(--text-primary);
            background: var(--bg-hover);
          }
          
          .share-tab.active {
            color: var(--accent-cyan);
            border-bottom-color: var(--accent-cyan);
          }
          
          .share-modal-content {
            padding: var(--space-lg);
            min-height: 300px;
          }
          
          .share-input-row {
            display: flex;
            gap: var(--space-sm);
            margin-bottom: var(--space-lg);
          }
          
          .share-email-input {
            flex: 1;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0 var(--space-sm);
          }
          
          .share-email-input input {
            flex: 1;
            background: none;
            border: none;
            padding: var(--space-sm);
            color: var(--text-primary);
          }
          
          .share-email-input input:focus {
            outline: none;
          }
          
          .share-permission-select,
          .share-permission-select-sm {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: var(--space-sm);
            color: var(--text-primary);
          }
          
          .share-permission-select-sm {
            padding: 4px 8px;
            font-size: 0.8rem;
          }
          
          .share-list {
            margin-top: var(--space-md);
          }
          
          .share-list h4 {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: var(--space-sm);
          }
          
          .share-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: var(--space-xl);
            color: var(--text-muted);
            gap: var(--space-sm);
          }
          
          .share-item {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm);
            border-radius: var(--radius-md);
            transition: background 0.2s;
          }
          
          .share-item:hover {
            background: var(--bg-hover);
          }
          
          .share-item-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
          }
          
          .share-item-info {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          
          .share-item-name {
            font-weight: 500;
          }
          
          .share-item-email {
            font-size: 0.8rem;
            color: var(--text-muted);
          }
          
          /* Link sharing */
          .share-link-create,
          .share-link-created {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: var(--space-lg);
          }
          
          .share-link-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-cyan);
            margin-bottom: var(--space-md);
          }
          
          .share-link-create h4 {
            margin: 0 0 var(--space-xs);
          }
          
          .share-link-create p {
            color: var(--text-muted);
            margin-bottom: var(--space-lg);
          }
          
          .share-link-options {
            display: flex;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
            width: 100%;
            justify-content: center;
          }
          
          .share-option {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
          }
          
          .share-option label {
            font-size: 0.8rem;
            color: var(--text-muted);
          }
          
          .share-option select {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: var(--space-sm);
            color: var(--text-primary);
          }
          
          .share-link-box {
            display: flex;
            gap: var(--space-sm);
            width: 100%;
            margin-top: var(--space-md);
          }
          
          .share-link-input {
            flex: 1;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: var(--space-sm);
            color: var(--text-primary);
            font-size: 0.85rem;
          }
          
          .btn-lg {
            padding: var(--space-md) var(--space-xl);
          }
        `}</style>
      </div>
    </div>
  )
}

export default ShareModal

