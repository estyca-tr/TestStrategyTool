import { useState, useEffect } from 'react'
import { 
  Layers, Plus, ChevronDown, ChevronRight, Grip, Edit2, Trash2, 
  User, X, Check, Clock, CheckCircle2, AlertCircle, Circle
} from 'lucide-react'
import { breakdownAPI } from '../services/api'

const CATEGORY_TYPES = [
  { value: 'team', label: 'By Team', icon: '👥' },
  { value: 'feature', label: 'By Feature', icon: '⚡' },
  { value: 'environment', label: 'By Environment', icon: '🌐' },
  { value: 'other', label: 'Custom', icon: '📋' }
]

const ITEM_STATUSES = [
  { value: 'not_started', label: 'To Do', icon: Circle, color: '#6b7280' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: '#f59e0b' },
  { value: 'completed', label: 'Done', icon: CheckCircle2, color: '#10b981' },
  { value: 'blocked', label: 'Blocked', icon: AlertCircle, color: '#ef4444' }
]

const PRIORITIES = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#6b7280' }
]

function BreakdownEditor({ strategyId, participants = [], onUpdate }) {
  const [categories, setCategories] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState(null)  // parent_id for subcategory
  const [newCategory, setNewCategory] = useState({ name: '', type: 'feature', description: '', parent_id: null })
  const [editingCategory, setEditingCategory] = useState(null)
  const [addingItemTo, setAddingItemTo] = useState(null)
  const [addingSubItemTo, setAddingSubItemTo] = useState(null)  // For sub-items under an item
  const [newItem, setNewItem] = useState({ title: '', description: '', assignee_id: null, priority: 'medium', parent_item_id: null, team: '', eta: '', duration_days: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [expandedItems, setExpandedItems] = useState({})  // Track expanded items for sub-items
  const [editingSubItem, setEditingSubItem] = useState(null)  // For editing sub-items
  const [customTeams, setCustomTeams] = useState([])  // Custom teams added by user
  const [showCustomTeamInput, setShowCustomTeamInput] = useState(false)
  const [customTeamName, setCustomTeamName] = useState('')
  
  // Extract unique teams from participants + custom teams
  const participantTeams = [...new Set(participants.map(p => p.team).filter(Boolean))]
  const availableTeams = [...new Set([...participantTeams, ...customTeams])]
  
  function handleAddCustomTeam() {
    if (customTeamName.trim() && !availableTeams.includes(customTeamName.trim())) {
      setCustomTeams(prev => [...prev, customTeamName.trim()])
      setNewItem({ ...newItem, team: customTeamName.trim() })
    }
    setCustomTeamName('')
    setShowCustomTeamInput(false)
  }

  useEffect(() => {
    loadCategories()
  }, [strategyId])
  
  // Extract teams from existing sub-items and add to custom teams
  useEffect(() => {
    const extractedTeams = new Set()
    categories.forEach(category => {
      category.items?.forEach(item => {
        item.sub_items?.forEach(subItem => {
          // Extract team from title (format: "Team: Description")
          if (subItem.title.includes(':')) {
            const team = subItem.title.split(':')[0].trim()
            if (team && !participantTeams.includes(team)) {
              extractedTeams.add(team)
            }
          }
        })
      })
    })
    if (extractedTeams.size > 0) {
      setCustomTeams(prev => [...new Set([...prev, ...extractedTeams])])
    }
  }, [categories, participantTeams])

  async function loadCategories() {
    try {
      const data = await breakdownAPI.getAll(strategyId)
      setCategories(data)
      // Auto-expand all
      const expanded = {}
      data.forEach(c => expanded[c.id] = true)
      setExpandedCategories(expanded)
    } catch (err) {
      console.error('Failed to load breakdown categories:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory() {
    if (!newCategory.name.trim()) return
    
    try {
      const categoryData = {
        name: newCategory.name,
        type: newCategory.type,
        parent_id: addingSubcategoryTo || null
      }
      await breakdownAPI.createCategory(strategyId, categoryData)
      setShowAddCategory(false)
      setAddingSubcategoryTo(null)
      setNewCategory({ name: '', type: 'feature', description: '', parent_id: null })
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to create category: ' + err.message)
    }
  }
  
  function openAddSubcategory(parentId) {
    setAddingSubcategoryTo(parentId)
    setShowAddCategory(true)
  }

  async function handleUpdateCategory(id) {
    if (!editingCategory.name.trim()) return
    
    try {
      await breakdownAPI.updateCategory(id, editingCategory)
      setEditingCategory(null)
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to update category: ' + err.message)
    }
  }

  async function handleDeleteCategory(id, name) {
    if (!confirm(`Delete "${name}" and all its items?`)) return
    
    try {
      await breakdownAPI.deleteCategory(id)
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to delete category: ' + err.message)
    }
  }

  async function handleAddItem(categoryId, parentItemId = null) {
    if (!newItem.title.trim()) return
    
    try {
      // For sub-items, prepend team name if selected
      let title = newItem.title
      if (parentItemId && newItem.team) {
        title = `${newItem.team}: ${newItem.title}`
        // Add team to custom teams list if not already there
        if (!availableTeams.includes(newItem.team)) {
          setCustomTeams(prev => [...prev, newItem.team])
        }
      }
      
      const itemData = {
        title,
        description: newItem.description,
        assignee_id: newItem.assignee_id,
        priority: newItem.priority,
        parent_item_id: parentItemId,
        eta: newItem.eta || null,
        duration_days: newItem.duration_days ? parseInt(newItem.duration_days) : null
      }
      await breakdownAPI.createItem(categoryId, itemData)
      setAddingItemTo(null)
      setAddingSubItemTo(null)
      setNewItem({ title: '', description: '', assignee_id: null, priority: 'medium', parent_item_id: null, team: '', eta: '', duration_days: '' })
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to add item: ' + err.message)
    }
  }
  
  async function handleUpdateSubItem(itemId) {
    if (!editingSubItem.title.trim()) return
    
    try {
      // Build title with team prefix if team selected
      let title = editingSubItem.title
      if (editingSubItem.team && !editingSubItem.title.includes(':')) {
        title = `${editingSubItem.team}: ${editingSubItem.title}`
      }
      
      await breakdownAPI.updateItem(itemId, {
        title,
        description: editingSubItem.description,
        assignee_id: editingSubItem.assignee_id
      })
      setEditingSubItem(null)
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to update: ' + err.message)
    }
  }
  
  function toggleItem(itemId) {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  async function handleUpdateItem(itemId) {
    if (!editingItem.title.trim()) return
    
    try {
      await breakdownAPI.updateItem(itemId, editingItem)
      setEditingItem(null)
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to update item: ' + err.message)
    }
  }

  async function handleUpdateItemStatus(itemId, status) {
    try {
      await breakdownAPI.updateItemStatus(itemId, status)
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  async function handleDeleteItem(itemId, title) {
    if (!confirm(`Delete "${title}"?`)) return
    
    try {
      await breakdownAPI.deleteItem(itemId)
      loadCategories()
      onUpdate?.()
    } catch (err) {
      alert('Failed to delete item: ' + err.message)
    }
  }

  function toggleCategory(id) {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return <div className="breakdown-loading">Loading breakdown...</div>
  }

  return (
    <div className="breakdown-editor">
      <div className="be-header">
        <div className="be-header-left">
          <Layers size={20} className="be-icon" />
          <h3>Test Breakdown</h3>
          <span className="be-count">{categories.length} categories</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddCategory(true)}>
          <Plus size={16} />
          Add Category
        </button>
      </div>

      <div className="be-categories">
        {categories.length === 0 ? (
          <div className="be-empty">
            <Layers size={48} />
            <p>No breakdown yet</p>
            <span>Organize your test efforts by team, feature, or environment</span>
            <button className="btn btn-primary mt-md" onClick={() => setShowAddCategory(true)}>
              <Plus size={16} />
              Create First Category
            </button>
          </div>
        ) : (
          categories.map(category => (
            <div key={category.id} className="be-category">
              <div 
                className="be-category-header"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="be-category-left">
                  {expandedCategories[category.id] ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  <span className="be-category-type-icon">
                    {CATEGORY_TYPES.find(t => t.value === category.type)?.icon}
                  </span>
                  
                  {editingCategory?.id === category.id ? (
                    <div className="be-inline-edit" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="form-input form-input-sm"
                        autoFocus
                      />
                      <select
                        value={editingCategory.type}
                        onChange={e => setEditingCategory({ ...editingCategory, type: e.target.value })}
                        className="form-select form-select-sm"
                      >
                        {CATEGORY_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditingCategory(null)}>
                        <X size={14} />
                      </button>
                      <button className="btn btn-primary btn-xs" onClick={() => handleUpdateCategory(category.id)}>
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="be-category-name">{category.name}</span>
                      <span className="be-category-badge">{category.items?.length || 0} items</span>
                      {category.children?.length > 0 && (
                        <span className="be-category-badge be-subcategory-badge">{category.children.length} sub</span>
                      )}
                    </>
                  )}
                </div>
                
                {editingCategory?.id !== category.id && (
                  <div className="be-category-actions be-actions-visible" onClick={e => e.stopPropagation()}>
                    <button 
                      className="btn btn-primary btn-xs"
                      title="הוסף תת-קטגוריה"
                      onClick={() => openAddSubcategory(category.id)}
                    >
                      <Plus size={14} />
                      Sub
                    </button>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      onClick={() => setEditingCategory({ id: category.id, name: category.name, type: category.type })}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-xs"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {expandedCategories[category.id] && (
                <div className="be-category-content">
                  {category.items?.map(item => (
                    <div key={item.id} className="be-item-wrapper">
                      <div className={`be-item be-item-${item.status} ${item.sub_items?.length > 0 ? 'has-sub-items' : ''}`}>
                        {editingItem?.id === item.id ? (
                          <div className="be-item-edit">
                            <input
                              type="text"
                              value={editingItem.title}
                              onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                              className="form-input form-input-sm"
                              placeholder="Title"
                            />
                            <textarea
                              value={editingItem.description || ''}
                              onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                              className="form-textarea form-textarea-sm"
                              placeholder="Description (optional)"
                            />
                            <div className="be-item-edit-row">
                              <select
                                value={editingItem.assignee_id || ''}
                                onChange={e => setEditingItem({ ...editingItem, assignee_id: e.target.value || null })}
                                className="form-select form-select-sm"
                              >
                                <option value="">Unassigned</option>
                                {participants.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <select
                                value={editingItem.priority}
                                onChange={e => setEditingItem({ ...editingItem, priority: e.target.value })}
                                className="form-select form-select-sm"
                              >
                                {PRIORITIES.map(p => (
                                  <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                              </select>
                              <div className="be-item-edit-actions">
                                <button className="btn btn-ghost btn-xs" onClick={() => setEditingItem(null)}>
                                  <X size={14} />
                                </button>
                                <button className="btn btn-primary btn-xs" onClick={() => handleUpdateItem(item.id)}>
                                  <Check size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Expand toggle for items with sub-items */}
                            <div 
                              className="be-item-expand" 
                              onClick={() => toggleItem(item.id)}
                            >
                              {item.sub_items?.length > 0 ? (
                                expandedItems[item.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                              ) : (
                                <div style={{ width: 14 }} />
                              )}
                            </div>
                            <div className="be-item-status-btn" onClick={e => e.stopPropagation()}>
                              <select
                                value={item.status}
                                onChange={e => handleUpdateItemStatus(item.id, e.target.value)}
                                className="be-status-select"
                                style={{ color: ITEM_STATUSES.find(s => s.value === item.status)?.color }}
                              >
                                {ITEM_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="be-item-content">
                              <span className="be-item-title">{item.title}</span>
                              {item.description && (
                                <span className="be-item-desc">{item.description}</span>
                              )}
                            </div>
                            {item.sub_items?.length > 0 && (
                              <button 
                                className="be-sub-items-toggle"
                                onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                                title={expandedItems[item.id] ? "Hide team responsibilities" : "Show team responsibilities"}
                              >
                                {expandedItems[item.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span className="be-sub-items-count-text">👥 {item.sub_items.length}</span>
                              </button>
                            )}
                            {item.assignee_name && (
                              <div className="be-item-assignee">
                                <div className="be-assignee-avatar">
                                  {item.assignee_name.charAt(0).toUpperCase()}
                                </div>
                                <span>{item.assignee_name}</span>
                              </div>
                            )}
                            <div 
                              className="be-item-priority"
                              style={{ background: PRIORITIES.find(p => p.value === item.priority)?.color }}
                            >
                              {item.priority}
                            </div>
                            {item.eta && (
                              <div className="be-item-eta" title="ETA">
                                📅 {new Date(item.eta).toLocaleDateString('he-IL')}
                              </div>
                            )}
                            {item.duration_days && (
                              <div className="be-item-duration" title="Duration">
                                ⏱️ {item.duration_days}d
                              </div>
                            )}
                            <div className="be-item-actions be-actions-visible">
                              <button 
                                className="btn btn-primary btn-xs"
                                title="Add Team Responsibility"
                                onClick={(e) => { e.stopPropagation(); setAddingSubItemTo(item.id); setExpandedItems(prev => ({ ...prev, [item.id]: true })); }}
                              >
                                <Plus size={12} />
                                Team
                              </button>
                              <button 
                                className="btn btn-ghost btn-xs be-edit-btn"
                                title="Edit"
                                onClick={() => setEditingItem({ 
                                  id: item.id, 
                                  title: item.title, 
                                  description: item.description,
                                  assignee_id: item.assignee_id,
                                  priority: item.priority 
                                })}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="btn btn-ghost btn-xs be-delete-btn"
                                title="Delete"
                                onClick={() => handleDeleteItem(item.id, item.title)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Sub-items (team responsibilities) */}
                      {(expandedItems[item.id] || addingSubItemTo === item.id) && (
                        <div className="be-sub-items">
                          {item.sub_items?.map(subItem => (
                            <div key={subItem.id} className={`be-sub-item be-item-${subItem.status}`}>
                              {editingSubItem?.id === subItem.id ? (
                                /* Edit Sub-Item Form */
                                <div className="be-sub-item-edit">
                                  <div className="be-sub-item-edit-row">
                                    <select
                                      value={availableTeams.includes(editingSubItem.team) ? editingSubItem.team : '__custom__'}
                                      onChange={e => {
                                        if (e.target.value === '__custom__') {
                                          // Keep current custom value
                                        } else {
                                          setEditingSubItem({ ...editingSubItem, team: e.target.value })
                                        }
                                      }}
                                      className="form-select form-select-sm"
                                    >
                                      <option value="">Select Team...</option>
                                      {availableTeams.map(team => (
                                        <option key={team} value={team}>{team}</option>
                                      ))}
                                      <option value="__custom__">✏️ Custom...</option>
                                    </select>
                                    {(!availableTeams.includes(editingSubItem.team) || editingSubItem.team === '') && (
                                      <input
                                        type="text"
                                        value={editingSubItem.team}
                                        onChange={e => setEditingSubItem({ ...editingSubItem, team: e.target.value })}
                                        className="form-input form-input-sm"
                                        placeholder="Team name..."
                                        style={{ maxWidth: '120px' }}
                                      />
                                    )}
                                    <input
                                      type="text"
                                      value={editingSubItem.title}
                                      onChange={e => setEditingSubItem({ ...editingSubItem, title: e.target.value })}
                                      className="form-input form-input-sm"
                                      placeholder="What this team needs to test..."
                                    />
                                  </div>
                                  <textarea
                                    value={editingSubItem.description || ''}
                                    onChange={e => setEditingSubItem({ ...editingSubItem, description: e.target.value })}
                                    className="form-textarea form-textarea-sm"
                                    placeholder="📝 Description / Details (optional)..."
                                    rows={2}
                                  />
                                  <div className="be-sub-item-edit-row">
                                    <select
                                      value={editingSubItem.assignee_id || ''}
                                      onChange={e => setEditingSubItem({ ...editingSubItem, assignee_id: e.target.value || null })}
                                      className="form-select form-select-sm"
                                    >
                                      <option value="">Assign to...</option>
                                      {participants.filter(p => !editingSubItem.team || p.team === editingSubItem.team).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
                                      ))}
                                    </select>
                                    <button className="btn btn-ghost btn-xs" onClick={() => setEditingSubItem(null)}>
                                      <X size={14} />
                                    </button>
                                    <button className="btn btn-primary btn-xs" onClick={() => handleUpdateSubItem(subItem.id)}>
                                      <Check size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Display Sub-Item */
                                <>
                                  <div className="be-sub-item-marker">└</div>
                                  <select
                                    value={subItem.status}
                                    onChange={e => handleUpdateItemStatus(subItem.id, e.target.value)}
                                    className="be-status-select"
                                    style={{ color: ITEM_STATUSES.find(s => s.value === subItem.status)?.color }}
                                  >
                                    {ITEM_STATUSES.map(s => (
                                      <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                  </select>
                                  <div className="be-sub-item-content">
                                    <span className="be-sub-item-title">{subItem.title}</span>
                                    {subItem.description && (
                                      <span className="be-item-desc">{subItem.description}</span>
                                    )}
                                  </div>
                                  {subItem.assignee_name && (
                                    <div className="be-item-assignee">
                                      <div className="be-assignee-avatar">
                                        {subItem.assignee_name.charAt(0).toUpperCase()}
                                      </div>
                                      <span>{subItem.assignee_name}</span>
                                    </div>
                                  )}
                                  <div className="be-item-actions be-actions-visible">
                                    <button 
                                      className="btn btn-ghost btn-xs be-edit-btn"
                                      title="Edit"
                                      onClick={() => {
                                        // Parse team from title if exists
                                        const parts = subItem.title.split(':')
                                        const team = parts.length > 1 ? parts[0].trim() : ''
                                        const title = parts.length > 1 ? parts.slice(1).join(':').trim() : subItem.title
                                        setEditingSubItem({
                                          id: subItem.id,
                                          team,
                                          title,
                                          description: subItem.description,
                                          assignee_id: subItem.assignee_id
                                        })
                                      }}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      className="btn btn-ghost btn-xs be-delete-btn"
                                      title="Delete"
                                      onClick={() => handleDeleteItem(subItem.id, subItem.title)}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          
                          {/* Add Sub-Item Form */}
                          {addingSubItemTo === item.id && (
                            <div className="be-add-sub-item-form">
                              <div className="be-sub-item-edit-row">
                                {showCustomTeamInput ? (
                                  /* Custom team input */
                                  <div className="be-custom-team-input">
                                    <input
                                      type="text"
                                      value={customTeamName}
                                      onChange={e => setCustomTeamName(e.target.value)}
                                      className="form-input form-input-sm"
                                      placeholder="Enter team name..."
                                      autoFocus
                                      onKeyDown={e => e.key === 'Enter' && handleAddCustomTeam()}
                                    />
                                    <button className="btn btn-primary btn-xs" onClick={handleAddCustomTeam}>✓</button>
                                    <button className="btn btn-ghost btn-xs" onClick={() => setShowCustomTeamInput(false)}>✕</button>
                                  </div>
                                ) : (
                                  /* Team selector */
                                  <select
                                    value={newItem.team}
                                    onChange={e => {
                                      if (e.target.value === '__custom__') {
                                        setShowCustomTeamInput(true)
                                      } else {
                                        setNewItem({ ...newItem, team: e.target.value })
                                      }
                                    }}
                                    className="form-select form-select-sm be-team-select"
                                    autoFocus
                                  >
                                    <option value="">🏢 Select Team...</option>
                                    {availableTeams.map(team => (
                                      <option key={team} value={team}>{team}</option>
                                    ))}
                                    <option value="__custom__">➕ Add New Team...</option>
                                  </select>
                                )}
                                <input
                                  type="text"
                                  value={newItem.title}
                                  onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                  className="form-input form-input-sm"
                                  placeholder="What this team needs to test..."
                                />
                              </div>
                              <textarea
                                value={newItem.description || ''}
                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                className="form-textarea form-textarea-sm"
                                placeholder="📝 Description / Details (optional)..."
                                rows={2}
                              />
                              <div className="be-add-item-row">
                                <select
                                  value={newItem.assignee_id || ''}
                                  onChange={e => setNewItem({ ...newItem, assignee_id: e.target.value || null })}
                                  className="form-select form-select-sm"
                                >
                                  <option value="">👤 Assign to...</option>
                                  {participants
                                    .filter(p => !newItem.team || p.team === newItem.team)
                                    .map(p => (
                                      <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
                                    ))
                                  }
                                </select>
                                <button className="btn btn-ghost btn-xs" onClick={() => { setAddingSubItemTo(null); setShowCustomTeamInput(false); setNewItem({ ...newItem, team: '', title: '', description: '' }); }}>Cancel</button>
                                <button className="btn btn-primary btn-xs" onClick={() => handleAddItem(category.id, item.id)}>Add</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Item Form */}
                  {addingItemTo === category.id ? (
                    <div className="be-add-item-form">
                      <input
                        type="text"
                        value={newItem.title}
                        onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                        className="form-input"
                        placeholder="What needs to be tested?"
                        autoFocus
                      />
                      <textarea
                        value={newItem.description || ''}
                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        className="form-textarea"
                        placeholder="📝 Description / Details (optional)..."
                        rows={2}
                      />
                      <div className="be-add-item-row">
                        <select
                          value={newItem.assignee_id || ''}
                          onChange={e => setNewItem({ ...newItem, assignee_id: e.target.value || null })}
                          className="form-select"
                        >
                          <option value="">Assign to...</option>
                          {participants.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={newItem.priority}
                          onChange={e => setNewItem({ ...newItem, priority: e.target.value })}
                          className="form-select"
                        >
                          {PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>{p.label} Priority</option>
                          ))}
                        </select>
                      </div>
                      <div className="be-add-item-row be-eta-row">
                        <div className="be-eta-field">
                          <label className="be-eta-label">📅 ETA</label>
                          <input
                            type="date"
                            value={newItem.eta || ''}
                            onChange={e => setNewItem({ ...newItem, eta: e.target.value })}
                            className="form-input form-input-sm"
                          />
                        </div>
                        <div className="be-eta-field">
                          <label className="be-eta-label">⏱️ Days</label>
                          <input
                            type="number"
                            value={newItem.duration_days || ''}
                            onChange={e => setNewItem({ ...newItem, duration_days: e.target.value })}
                            className="form-input form-input-sm"
                            placeholder="Days"
                            min="1"
                            style={{ width: '80px' }}
                          />
                        </div>
                        <button className="btn btn-ghost" onClick={() => setAddingItemTo(null)}>
                          Cancel
                        </button>
                        <button className="btn btn-primary" onClick={() => handleAddItem(category.id)}>
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="be-add-item-btn"
                      onClick={() => setAddingItemTo(category.id)}
                    >
                      <Plus size={16} />
                      Add Test Item
                    </button>
                  )}
                  
                  {/* Render nested sub-categories */}
                  {category.children && category.children.length > 0 && (
                    <div className="be-subcategories">
                      {category.children.map(subcat => (
                        <div key={subcat.id} className="be-subcategory">
                          <div className="be-subcategory-header" onClick={() => toggleCategory(subcat.id)}>
                            <div className="be-category-left">
                              {expandedCategories[subcat.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              <span className="be-category-type-icon">{CATEGORY_TYPES.find(t => t.value === subcat.type)?.icon}</span>
                              <span className="be-category-name">{subcat.name}</span>
                              <span className="be-category-badge">{subcat.items?.length || 0} items</span>
                            </div>
                            <div className="be-category-actions be-actions-visible" onClick={e => e.stopPropagation()}>
                              <button 
                                className="btn btn-primary btn-xs"
                                title="Add sub-category"
                                onClick={() => openAddSubcategory(subcat.id)}
                              >
                                <Plus size={14} />
                                Sub
                              </button>
                              <button 
                                className="btn btn-ghost btn-xs be-edit-btn" 
                                title="Edit" 
                                onClick={() => setEditingCategory({ id: subcat.id, name: subcat.name, type: subcat.type })}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="btn btn-ghost btn-xs be-delete-btn" 
                                title="Delete" 
                                onClick={() => handleDeleteCategory(subcat.id, subcat.name)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {expandedCategories[subcat.id] && (
                            <div className="be-subcategory-content">
                              {subcat.items?.map(item => (
                                <div key={item.id} className={`be-item be-item-${item.status}`}>
                                  <div className="be-item-drag"><Grip size={14} /></div>
                                  <select value={item.status} onChange={e => handleUpdateItemStatus(item.id, e.target.value)} className="be-status-select" style={{ color: ITEM_STATUSES.find(s => s.value === item.status)?.color }}>
                                    {ITEM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                  </select>
                                  <div className="be-item-content">
                                    <span className="be-item-title">{item.title}</span>
                                    {item.description && <span className="be-item-desc">{item.description}</span>}
                                  </div>
                                  {item.assignee_name && (
                                    <div className="be-item-assignee">
                                      <div className="be-assignee-avatar">{item.assignee_name.charAt(0).toUpperCase()}</div>
                                      <span>{item.assignee_name}</span>
                                    </div>
                                  )}
                                  <div className="be-item-priority" style={{ background: PRIORITIES.find(p => p.value === item.priority)?.color }}>{item.priority}</div>
                                  {item.eta && (
                                    <div className="be-item-eta" title="ETA">
                                      📅 {new Date(item.eta).toLocaleDateString('he-IL')}
                                    </div>
                                  )}
                                  {item.duration_days && (
                                    <div className="be-item-duration" title="Duration">
                                      ⏱️ {item.duration_days}d
                                    </div>
                                  )}
                                  <div className="be-item-actions be-actions-visible">
                                    <button 
                                      className="btn btn-ghost btn-xs be-edit-btn"
                                      title="Edit"
                                      onClick={() => setEditingItem({ 
                                        id: item.id, 
                                        title: item.title, 
                                        description: item.description,
                                        assignee_id: item.assignee_id,
                                        priority: item.priority,
                                        eta: item.eta ? item.eta.split('T')[0] : '',
                                        duration_days: item.duration_days || '' 
                                      })}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      className="btn btn-ghost btn-xs be-delete-btn"
                                      title="Delete"
                                      onClick={() => handleDeleteItem(item.id, item.title)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Add Item Form for subcategory */}
                              {addingItemTo === subcat.id ? (
                                <div className="be-add-item-form">
                                  <input
                                    type="text"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    className="form-input"
                                    placeholder="What needs to be tested?"
                                    autoFocus
                                  />
                                  <div className="be-add-item-row">
                                    <select
                                      value={newItem.assignee_id || ''}
                                      onChange={e => setNewItem({ ...newItem, assignee_id: e.target.value || null })}
                                      className="form-select"
                                    >
                                      <option value="">Assign to...</option>
                                      {participants.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={newItem.priority}
                                      onChange={e => setNewItem({ ...newItem, priority: e.target.value })}
                                      className="form-select"
                                    >
                                      {PRIORITIES.map(p => (
                                        <option key={p.value} value={p.value}>{p.label} Priority</option>
                                      ))}
                                    </select>
                                    <button className="btn btn-ghost" onClick={() => setAddingItemTo(null)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={() => handleAddItem(subcat.id)}>Add</button>
                                  </div>
                                </div>
                              ) : (
                                <button className="be-add-item-btn" onClick={() => setAddingItemTo(subcat.id)}>
                                  <Plus size={16} /> Add Test Item
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="modal-overlay" onClick={() => { setShowAddCategory(false); setAddingSubcategoryTo(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{addingSubcategoryTo ? 'Add Sub-Category' : 'Add Category'}</h2>
              <button className="btn btn-ghost" onClick={() => { setShowAddCategory(false); setAddingSubcategoryTo(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Category Type</label>
                <div className="be-type-options">
                  {CATEGORY_TYPES.map(type => (
                    <div
                      key={type.value}
                      className={`be-type-option ${newCategory.type === type.value ? 'active' : ''}`}
                      onClick={() => setNewCategory({ ...newCategory, type: type.value })}
                    >
                      <span className="be-type-icon">{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder={
                    newCategory.type === 'team' ? 'e.g., Trading Team QA' :
                    newCategory.type === 'feature' ? 'e.g., User Authentication' :
                    newCategory.type === 'environment' ? 'e.g., Production Tests' :
                    'e.g., Regression Suite'
                  }
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-textarea"
                  value={newCategory.description}
                  onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Brief description of this test category..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddCategory(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddCategory}>
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .breakdown-editor {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }
        
        .be-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--border-color);
        }
        
        .be-header-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .be-header-left h3 {
          font-size: 1rem;
          margin: 0;
        }
        
        .be-icon {
          color: var(--accent-cyan);
        }
        
        .be-count {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .be-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-xl);
          color: var(--text-muted);
          text-align: center;
        }
        
        .be-empty p {
          margin-top: var(--space-md);
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .be-categories {
          padding: var(--space-md);
        }
        
        .be-category {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          margin-bottom: var(--space-sm);
          overflow: hidden;
        }
        
        .be-category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .be-category-header:hover {
          background: var(--bg-hover);
        }
        
        .be-category-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        
        .be-category-type-icon {
          font-size: 1.2rem;
        }
        
        .be-category-name {
          font-weight: 600;
        }
        
        .be-category-badge {
          font-size: 0.75rem;
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: 10px;
          color: var(--text-muted);
        }
        
        .be-category-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .be-category-actions.be-actions-visible,
        .be-item-actions.be-actions-visible {
          opacity: 1;
        }
        
        .be-category-header:hover .be-category-actions {
          opacity: 1;
        }
        
        .be-subcategory-badge {
          background: var(--accent-cyan) !important;
          color: white !important;
        }
        
        .be-category-content {
          border-top: 1px solid var(--border-color);
          padding: var(--space-sm);
        }
        
        .be-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-xs);
          background: var(--bg-secondary);
          transition: all 0.2s;
        }
        
        .be-item:hover {
          background: var(--bg-hover);
        }
        
        .be-item-completed {
          opacity: 0.6;
        }
        
        .be-item-completed .be-item-title {
          text-decoration: line-through;
        }
        
        .be-item-drag {
          color: var(--text-muted);
          cursor: grab;
        }
        
        .be-status-select {
          background: none;
          border: none;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        
        .be-status-select:hover {
          background: var(--bg-hover);
        }
        
        .be-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .be-item-title {
          font-size: 0.9rem;
        }
        
        .be-item-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .be-item-assignee {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .be-assignee-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 600;
        }
        
        .be-item-priority {
          font-size: 0.65rem;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }
        
        .be-item-eta,
        .be-item-duration {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .be-eta-row {
          align-items: center;
        }
        
        .be-eta-field {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .be-eta-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        
        .be-item-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .be-item:hover .be-item-actions {
          opacity: 1;
        }
        
        .be-edit-btn {
          color: var(--text-secondary) !important;
        }
        
        .be-edit-btn:hover {
          color: var(--accent-cyan) !important;
          background: rgba(6, 182, 212, 0.1) !important;
        }
        
        .be-delete-btn {
          color: var(--text-secondary) !important;
        }
        
        .be-delete-btn:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
        
        .be-add-item-btn {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          width: 100%;
          padding: var(--space-sm);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-sm);
          background: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .be-add-item-btn:hover {
          border-color: var(--accent-cyan);
          color: var(--accent-cyan);
          background: rgba(6, 182, 212, 0.05);
        }
        
        .be-add-item-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding: var(--space-sm);
          background: var(--bg-hover);
          border-radius: var(--radius-sm);
        }
        
        .be-add-item-row {
          display: flex;
          gap: var(--space-sm);
        }
        
        .be-add-item-row .form-select {
          flex: 1;
        }
        
        .be-inline-edit {
          display: flex;
          gap: var(--space-sm);
          align-items: center;
        }
        
        .be-item-edit {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          flex: 1;
          padding: var(--space-sm);
        }
        
        .be-item-edit-row {
          display: flex;
          gap: var(--space-sm);
        }
        
        .be-item-edit-actions {
          display: flex;
          gap: 4px;
        }
        
        .be-type-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-sm);
        }
        
        .be-type-option {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .be-type-option:hover {
          border-color: var(--accent-cyan);
        }
        
        .be-type-option.active {
          border-color: var(--accent-cyan);
          background: rgba(6, 182, 212, 0.1);
        }
        
        .be-type-icon {
          font-size: 1.5rem;
        }
        
        .btn-xs {
          padding: 4px 8px;
          font-size: 0.75rem;
        }
        
        .form-input-sm,
        .form-select-sm,
        .form-textarea-sm {
          padding: 6px 10px;
          font-size: 0.875rem;
        }
        
        .form-textarea-sm {
          min-height: 60px;
        }
        
        .modal {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          width: 500px;
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
        
        /* Nested subcategories */
        .be-subcategories {
          margin-top: var(--space-md);
          padding-left: var(--space-lg);
          border-left: 2px solid var(--accent-cyan);
        }
        
        .be-subcategory {
          background: rgba(6, 182, 212, 0.05);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-sm);
          border: 1px solid var(--border-color);
        }
        
        .be-subcategory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
        }
        
        .be-subcategory-header:hover {
          background: var(--bg-hover);
        }
        
        .be-subcategory-header .be-category-actions {
          opacity: 1 !important;
          display: flex;
          gap: 4px;
        }
        
        .be-subcategory-content {
          padding: var(--space-sm);
          border-top: 1px solid var(--border-color);
        }
        
        .breakdown-loading {
          padding: var(--space-xl);
          text-align: center;
          color: var(--text-muted);
        }
        
        /* Item wrapper for nested structure */
        .be-item-wrapper {
          margin-bottom: var(--space-xs);
        }
        
        .be-item.has-sub-items {
          border-left: 3px solid var(--accent-purple);
        }
        
        .be-item-expand {
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }
        
        .be-sub-items-count {
          font-size: 0.7rem;
          color: var(--accent-purple);
          margin-top: 2px;
        }
        
        /* Toggle button for sub-items */
        .be-sub-items-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.15));
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 20px;
          color: var(--accent-purple);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          margin-left: auto;
          margin-right: var(--space-sm);
        }
        
        .be-sub-items-toggle:hover {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(168, 85, 247, 0.3));
          border-color: var(--accent-purple);
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }
        
        .be-sub-items-toggle:active {
          transform: scale(0.98);
        }
        
        .be-sub-items-count-text {
          font-size: 0.8rem;
        }
        
        /* Sub-items (team responsibilities) */
        .be-sub-items {
          margin-left: 32px;
          padding-left: var(--space-md);
          border-left: 2px solid var(--accent-purple);
        }
        
        .be-sub-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-xs) var(--space-sm);
          background: rgba(139, 92, 246, 0.1);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-xs);
          font-size: 0.85rem;
        }
        
        .be-sub-item-marker {
          color: var(--accent-purple);
          font-weight: bold;
          width: 12px;
        }
        
        .be-sub-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .be-sub-item-title {
          font-size: 0.85rem;
        }
        
        .be-add-sub-item-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          padding: var(--space-sm);
          background: rgba(139, 92, 246, 0.1);
          border-radius: var(--radius-sm);
          margin-top: var(--space-xs);
        }
        
        .be-team-select {
          min-width: 150px;
          max-width: 180px;
        }
        
        .be-sub-item-edit {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          padding: var(--space-xs);
        }
        
        .be-sub-item-edit-row {
          display: flex;
          gap: var(--space-sm);
          align-items: center;
        }
        
        .form-textarea-sm {
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          min-height: 60px;
          resize: vertical;
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
        }
        
        .form-textarea-sm:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        
        .form-textarea-sm::placeholder {
          color: var(--text-muted);
        }
        
        .be-sub-item-edit-row .form-input {
          flex: 1;
        }
        
        .be-custom-team-input {
          display: flex;
          gap: 4px;
          align-items: center;
          min-width: 180px;
        }
        
        .be-custom-team-input .form-input {
          flex: 1;
          min-width: 100px;
        }
      `}</style>
    </div>
  )
}

export default BreakdownEditor

