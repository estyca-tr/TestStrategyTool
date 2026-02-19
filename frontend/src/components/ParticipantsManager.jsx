import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, Mail, User, Building2, X, Check } from 'lucide-react'
import { participantsAPI } from '../services/api'

function ParticipantsManager({ projectId, participants = [], onUpdate }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', team: '', role: '', email: '' })
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setFormData({ name: '', team: '', role: '', email: '' })
    setEditingId(null)
  }

  async function handleAdd() {
    if (!formData.name.trim() || !formData.team.trim()) {
      alert('Name and Team are required')
      return
    }
    
    setLoading(true)
    try {
      await participantsAPI.create(projectId, formData)
      setShowAddModal(false)
      resetForm()
      onUpdate()
    } catch (err) {
      alert('Failed to add participant: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id) {
    if (!formData.name.trim() || !formData.team.trim()) {
      alert('Name and Team are required')
      return
    }
    
    setLoading(true)
    try {
      await participantsAPI.update(id, formData)
      resetForm()
      onUpdate()
    } catch (err) {
      alert('Failed to update participant: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Remove ${name} from this project?`)) return
    
    try {
      await participantsAPI.delete(id)
      onUpdate()
    } catch (err) {
      alert('Failed to remove participant: ' + err.message)
    }
  }

  function startEdit(participant) {
    setFormData({
      name: participant.name,
      team: participant.team,
      role: participant.role || '',
      email: participant.email || ''
    })
    setEditingId(participant.id)
  }

  // Group participants by team
  const byTeam = participants.reduce((acc, p) => {
    if (!acc[p.team]) acc[p.team] = []
    acc[p.team].push(p)
    return acc
  }, {})

  return (
    <div className="participants-manager">
      <div className="pm-header">
        <div className="pm-header-left">
          <Users size={20} className="pm-icon" />
          <h3>Participants</h3>
          <span className="pm-count">{participants.length}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="pm-empty">
          <Users size={48} />
          <p>No participants yet</p>
          <span>Add QA team members who will be part of this cross-team effort</span>
          <button className="btn btn-primary mt-md" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add First Participant
          </button>
        </div>
      ) : (
        <div className="pm-teams">
          {Object.entries(byTeam).map(([team, members]) => (
            <div key={team} className="pm-team">
              <div className="pm-team-header">
                <Building2 size={16} />
                <span>{team}</span>
                <span className="pm-team-count">{members.length}</span>
              </div>
              <div className="pm-team-members">
                {members.map(p => (
                  <div key={p.id} className="pm-member">
                    {editingId === p.id ? (
                      <div className="pm-member-edit">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Name"
                          className="form-input form-input-sm"
                        />
                        <input
                          type="text"
                          value={formData.team}
                          onChange={e => setFormData({ ...formData, team: e.target.value })}
                          placeholder="Team"
                          className="form-input form-input-sm"
                        />
                        <input
                          type="text"
                          value={formData.role}
                          onChange={e => setFormData({ ...formData, role: e.target.value })}
                          placeholder="Role (optional)"
                          className="form-input form-input-sm"
                        />
                        <div className="pm-edit-actions">
                          <button className="btn btn-ghost btn-sm" onClick={resetForm} disabled={loading}>
                            <X size={14} />
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(p.id)} disabled={loading}>
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="pm-member-avatar">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="pm-member-info">
                          <span className="pm-member-name">{p.name}</span>
                          {p.role && <span className="pm-member-role">{p.role}</span>}
                        </div>
                        {p.assigned_items_count > 0 && (
                          <span className="pm-member-items">{p.assigned_items_count} items</span>
                        )}
                        <div className="pm-member-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id, p.name)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Participant</h2>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sarah Cohen"
                    autoFocus
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Team *</label>
                <div className="input-with-icon">
                  <Building2 size={18} />
                  <input
                    type="text"
                    className="form-input"
                    value={formData.team}
                    onChange={e => setFormData({ ...formData, team: e.target.value })}
                    placeholder="e.g., Team Alpha, Trading QA"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., QA Lead, QA Engineer"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., sarah@company.com"
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
                {loading ? 'Adding...' : 'Add Participant'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .participants-manager {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        
        .pm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--border-color);
        }
        
        .pm-header-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .pm-header-left h3 {
          font-size: 1rem;
          margin: 0;
        }
        
        .pm-icon {
          color: var(--accent-yellow);
        }
        
        .pm-count {
          background: var(--accent-purple);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .pm-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-xl);
          color: var(--text-muted);
          text-align: center;
        }
        
        .pm-empty p {
          margin-top: var(--space-md);
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .pm-empty span {
          font-size: 0.875rem;
          max-width: 300px;
        }
        
        .pm-teams {
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .pm-team {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        
        .pm-team-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-hover);
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .pm-team-count {
          margin-left: auto;
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.75rem;
        }
        
        .pm-team-members {
          display: flex;
          flex-direction: column;
        }
        
        .pm-member {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid var(--border-color);
        }
        
        .pm-member:last-child {
          border-bottom: none;
        }
        
        .pm-member:hover {
          background: var(--bg-hover);
        }
        
        .pm-member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .pm-member-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .pm-member-name {
          font-weight: 500;
        }
        
        .pm-member-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .pm-member-items {
          font-size: 0.75rem;
          background: var(--accent-cyan);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
        }
        
        .pm-member-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .pm-member:hover .pm-member-actions {
          opacity: 1;
        }
        
        .pm-member-edit {
          display: flex;
          gap: var(--space-sm);
          flex: 1;
          flex-wrap: wrap;
        }
        
        .pm-member-edit .form-input-sm {
          flex: 1;
          min-width: 100px;
          padding: 6px 10px;
          font-size: 0.875rem;
        }
        
        .pm-edit-actions {
          display: flex;
          gap: 4px;
        }
        
        .input-with-icon {
          position: relative;
        }
        
        .input-with-icon svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        
        .input-with-icon .form-input {
          padding-left: 40px;
        }
        
        .modal {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          width: 450px;
          max-width: 95vw;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-lg);
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h2 {
          font-size: 1.1rem;
          margin: 0;
        }
        
        .modal-content {
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        
        .modal-actions {
          display: flex;
          gap: var(--space-sm);
          justify-content: flex-end;
          padding: var(--space-lg);
          border-top: 1px solid var(--border-color);
        }
        
        .btn-sm {
          padding: 6px 10px;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  )
}

export default ParticipantsManager




