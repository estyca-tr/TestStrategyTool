import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, CheckCircle, Clock, FileText, MessageSquare, Send, X, ExternalLink, Download, FileDown, ChevronDown, FileType, Upload, Loader2, Users, Layers, BarChart3, Share2 } from 'lucide-react'
import { strategiesAPI, commentsAPI, projectsAPI, participantsAPI, sharesAPI, authAPI, testPlansAPI } from '../services/api'
import { format, parseISO } from 'date-fns'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import BreakdownEditor from '../components/BreakdownEditor'
import ProgressDashboard from '../components/ProgressDashboard'
import CrossTeamBadge from '../components/CrossTeamBadge'
import ShareModal from '../components/ShareModal'
import AuthModal from '../components/AuthModal'

const SECTION_LABELS = {
  introduction: 'Introduction',
  scope_in: 'In Scope',
  scope_out: 'Out of Scope',
  test_approach: 'Test Approach',
  test_types: 'Test Types',
  test_environment: 'Test Environment',
  entry_criteria: 'Entry Criteria',
  exit_criteria: 'Exit Criteria',
  risks_and_mitigations: 'Risks & Mitigations',
  open_points: 'נקודות פתוחות / Open Points',
  resources: 'Resources',
  schedule: 'Schedule',
  deliverables: 'Deliverables'
}

function StrategyView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [strategy, setStrategy] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState({ author: '', content: '', section: '' })
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [confluenceResult, setConfluenceResult] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [jiraIssueKey, setJiraIssueKey] = useState('')
  const [jiraTitle, setJiraTitle] = useState('')
  const [isLinkingJira, setIsLinkingJira] = useState(false)
  const [linkedTestPlans, setLinkedTestPlans] = useState([])
  const [project, setProject] = useState(null)
  const [participants, setParticipants] = useState([])
  const [activeTab, setActiveTab] = useState('content') // content, breakdown, progress
  const [showShareModal, setShowShareModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [shares, setShares] = useState([])
  
  // Toast helper
  const showToast = (type, title, message, action = null) => {
    setToast({ type, title, message, action })
    if (!action) {
      setTimeout(() => setToast(null), 4000)
    }
  }
  
  // Confirm helper
  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ title, message, onConfirm })
  }
  
  useEffect(() => {
    loadData()
    checkAuth()
    loadLinkedTestPlans()
  }, [id])
  
  async function checkAuth() {
    if (authAPI.isAuthenticated()) {
      try {
        const user = await authAPI.getCurrentUser()
        setCurrentUser(user)
        loadShares()
      } catch (err) {
        console.log('Auth check failed')
      }
    }
  }
  
  async function loadShares() {
    try {
      const result = await sharesAPI.getStrategyShares(id)
      setShares(result.shares || [])
    } catch (err) {
      console.log('Failed to load shares:', err)
    }
  }
  
  async function loadData() {
    try {
      setLoading(true)
      const [strategyData, commentsData] = await Promise.all([
        strategiesAPI.getById(id),
        commentsAPI.getAll({ strategy_id: id, include_resolved: true })
      ])
      setStrategy(strategyData)
      setComments(commentsData)
      
      // Load project to check if cross-team
      if (strategyData.project_id) {
        const projectData = await projectsAPI.getById(strategyData.project_id)
        setProject(projectData)
        
        // Load participants if cross-team
        if (projectData.is_cross_team) {
          const participantsData = await participantsAPI.getAll(projectData.id)
          setParticipants(participantsData)
        }
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Share button handler
  function handleShareClick() {
    if (!currentUser) {
      setShowAuthModal(true)
    } else {
      setShowShareModal(true)
    }
  }
  
  async function handleShare(shareData) {
    const result = await sharesAPI.create(shareData)
    await loadShares()
    showToast('success', '🔗 Shared!', `Shared with ${shareData.shared_with_email}`)
    return result
  }
  
  async function handleUpdateShare(shareId, data) {
    await sharesAPI.update(shareId, data)
    await loadShares()
  }
  
  async function handleDeleteShare(shareId) {
    await sharesAPI.delete(shareId)
    await loadShares()
    showToast('success', '✓ Access removed', 'Share has been revoked')
  }
  
  async function handleToggleCrossTeam() {
    try {
      const newValue = !strategy.is_cross_team
      await strategiesAPI.update(id, { is_cross_team: newValue })
      setStrategy({ ...strategy, is_cross_team: newValue })
      showToast('success', newValue ? '🌐 Cross-Team Enabled' : '📋 Team Strategy', 
        newValue ? 'Test Breakdown and Progress tabs are now available' : 'Strategy is now a team/project strategy')
      if (newValue) {
        loadData() // Reload to get participants
      }
    } catch (err) {
      showToast('error', '⚠️ Error', 'Failed to update strategy type')
    }
  }
  
  async function handleCreateShareLink(shareData) {
    const result = await sharesAPI.create(shareData)
    await loadShares()
    showToast('success', '🔗 Link Created!', 'Shareable link has been created')
    return result
  }
  
  async function handleAddComment() {
    if (!newComment.author.trim() || !newComment.content.trim()) {
      showToast('error', '⚠️ Missing Information', 'Please enter your name and comment')
      return
    }
    
    try {
      await commentsAPI.create({
        strategy_id: parseInt(id),
        author: newComment.author,
        content: newComment.content,
        section: newComment.section || null
      })
      setNewComment({ ...newComment, content: '', section: '' })
      showToast('success', '💬 Comment Added', 'Your comment has been posted successfully')
      loadData()
    } catch (err) {
      showToast('error', '❌ Error', 'Failed to add comment. Please try again.')
    }
  }
  
  async function handleResolveComment(commentId) {
    try {
      await commentsAPI.resolve(commentId)
      showToast('success', '✅ Resolved', 'Comment marked as resolved')
      loadData()
    } catch (err) {
      showToast('error', '❌ Error', 'Failed to resolve comment')
    }
  }
  
  async function handleDeleteComment(commentId) {
    showConfirm(
      '🗑️ Delete Comment',
      'Are you sure you want to delete this comment?',
      async () => {
        try {
          await commentsAPI.delete(commentId)
          setComments(comments.filter(c => c.id !== commentId))
          showToast('success', '🗑️ Deleted', 'Comment has been removed')
        } catch (err) {
          showToast('error', '❌ Error', 'Failed to delete comment')
        }
      }
    )
  }
  
  async function handlePublishToConfluence() {
    if (isPublishing) return
    
    showConfirm(
      '📤 Publish to Confluence',
      'This will publish the strategy to Confluence (Space: MG). If a page already exists, it will be updated.',
      async () => {
        setIsPublishing(true)
        setConfluenceResult(null)
        
        try {
          const result = await strategiesAPI.publishToConfluence(id, 'MG')
          setConfluenceResult(result)
          
          showToast(
            'success',
            result.action === 'created' ? '🎉 Page Created!' : '✨ Page Updated!',
            `Successfully ${result.action} "${result.page_title}" in Confluence`,
            { label: 'Open in Confluence', url: result.page_url }
          )
        } catch (err) {
          showToast(
            'error',
            '❌ Publication Failed',
            err.message || 'Could not publish to Confluence. Please try again.'
          )
        } finally {
          setIsPublishing(false)
        }
      }
    )
  }
  
  async function fetchJiraIssueTypes(projectKey) {
    if (!projectKey.trim() || projectKey.length < 2) {
      setJiraIssueTypes([])
      return
    }
    
    setIsLoadingIssueTypes(true)
    try {
      const result = await strategiesAPI.getJiraIssueTypes(projectKey.trim())
      setJiraIssueTypes(result.issue_types || [])
      // Auto-select first issue type
      if (result.issue_types?.length > 0) {
        setSelectedIssueType(result.issue_types[0].name)
      }
    } catch (err) {
      setJiraIssueTypes([])
    } finally {
      setIsLoadingIssueTypes(false)
    }
  }
  
  async function handleLinkJiraTestPlan() {
    if (!jiraIssueKey.trim()) {
      showToast('error', '⚠️ Missing Issue Key', 'Please enter a Jira issue key (e.g., QARD-123)')
      return
    }
    
    setIsLinkingJira(true)
    
    try {
      const result = await testPlansAPI.linkJira(id, jiraIssueKey.trim(), null, jiraTitle.trim() || null)
      
      setShowJiraModal(false)
      setJiraIssueKey('')
      setJiraTitle('')
      
      // Refresh linked test plans
      loadLinkedTestPlans()
      
      showToast(
        'success',
        '🔗 Test Plan Linked!',
        `Linked "${result.jira_issue_key}" to this strategy`,
        { label: 'Open in Jira', url: result.issue_url }
      )
    } catch (err) {
      showToast(
        'error',
        '❌ Failed to Link',
        err.message || 'Could not link test plan. Please check the issue key.'
      )
    } finally {
      setIsLinkingJira(false)
    }
  }
  
  async function loadLinkedTestPlans() {
    try {
      const plans = await testPlansAPI.getAll({ strategy_id: id })
      setLinkedTestPlans(plans)
    } catch (err) {
      console.error('Failed to load linked test plans:', err)
    }
  }
  
  async function handleUnlinkTestPlan(planId) {
    if (!confirm('Are you sure you want to unlink this test plan?')) return
    try {
      await testPlansAPI.delete(planId)
      loadLinkedTestPlans()
      showToast('success', '🗑️ Unlinked', 'Test plan unlinked successfully')
    } catch (err) {
      showToast('error', '❌ Error', err.message)
    }
  }
  
  function generateContent() {
    let content = `# ${strategy.title}\n\n`
    content += `**Project:** ${strategy.project_name || 'N/A'}\n`
    content += `**Version:** ${strategy.version}\n`
    content += `**Status:** ${strategy.status}\n`
    content += `**Created:** ${format(parseISO(strategy.created_at), 'MMMM d, yyyy')}\n`
    if (strategy.created_by) content += `**Author:** ${strategy.created_by}\n`
    content += `\n---\n\n`
    
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
      if (strategy[key]?.trim()) {
        content += `## ${label}\n\n${strategy[key]}\n\n`
      }
    })
    
    return content
  }
  
  function exportAsMarkdown() {
    const content = generateContent()
    const blob = new Blob([content], { type: 'text/markdown' })
    downloadFile(blob, `${strategy.title.replace(/\s+/g, '_')}.md`)
    setShowExportMenu(false)
    showToast('success', '📄 Exported!', 'Markdown file downloaded successfully')
  }
  
  function exportAsText() {
    let content = `${strategy.title}\n${'='.repeat(strategy.title.length)}\n\n`
    content += `Project: ${strategy.project_name || 'N/A'}\n`
    content += `Version: ${strategy.version}\n`
    content += `Status: ${strategy.status}\n`
    content += `Created: ${format(parseISO(strategy.created_at), 'MMMM d, yyyy')}\n`
    if (strategy.created_by) content += `Author: ${strategy.created_by}\n`
    content += `\n${'-'.repeat(50)}\n\n`
    
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
      if (strategy[key]?.trim()) {
        content += `${label}\n${'-'.repeat(label.length)}\n\n${strategy[key]}\n\n`
      }
    })
    
    const blob = new Blob([content], { type: 'text/plain' })
    downloadFile(blob, `${strategy.title.replace(/\s+/g, '_')}.txt`)
    setShowExportMenu(false)
    showToast('success', '📄 Exported!', 'Text file downloaded successfully')
  }
  
  function exportAsHTML() {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strategy.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #4f46e5; margin-top: 30px; }
    .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .meta p { margin: 5px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge.draft { background: #e5e7eb; color: #6b7280; }
    .badge.review { background: #fef3c7; color: #d97706; }
    .badge.approved { background: #d1fae5; color: #059669; }
  </style>
</head>
<body>
  <h1>${strategy.title}</h1>
  <div class="meta">
    <p><strong>Project:</strong> ${strategy.project_name || 'N/A'}</p>
    <p><strong>Version:</strong> ${strategy.version}</p>
    <p><strong>Status:</strong> <span class="badge ${strategy.status}">${strategy.status}</span></p>
    <p><strong>Created:</strong> ${format(parseISO(strategy.created_at), 'MMMM d, yyyy')}</p>
    ${strategy.created_by ? `<p><strong>Author:</strong> ${strategy.created_by}</p>` : ''}
  </div>
`
    
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
      if (strategy[key]?.trim()) {
        content += `  <h2>${label}</h2>\n  <p>${strategy[key].replace(/\n/g, '</p>\n  <p>')}</p>\n\n`
      }
    })
    
    content += `</body>\n</html>`
    
    const blob = new Blob([content], { type: 'text/html' })
    downloadFile(blob, `${strategy.title.replace(/\s+/g, '_')}.html`)
    setShowExportMenu(false)
    showToast('success', '🌐 Exported!', 'HTML file downloaded successfully')
  }
  
  function exportAsJSON() {
    const data = {
      title: strategy.title,
      project: strategy.project_name,
      version: strategy.version,
      status: strategy.status,
      created_at: strategy.created_at,
      created_by: strategy.created_by,
      sections: {}
    }
    
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
      if (strategy[key]?.trim()) {
        data.sections[key] = {
          title: label,
          content: strategy[key]
        }
      }
    })
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadFile(blob, `${strategy.title.replace(/\s+/g, '_')}.json`)
    setShowExportMenu(false)
    showToast('success', '📦 Exported!', 'JSON file downloaded successfully')
  }
  
  async function exportAsWord() {
    const children = []
    
    // Title
    children.push(
      new Paragraph({
        text: strategy.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 }
      })
    )
    
    // Meta info
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Project: ', bold: true }),
          new TextRun({ text: strategy.project_name || 'N/A' })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Version: ', bold: true }),
          new TextRun({ text: strategy.version })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun({ text: strategy.status })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Created: ', bold: true }),
          new TextRun({ text: format(parseISO(strategy.created_at), 'MMMM d, yyyy') })
        ],
        spacing: { after: 100 }
      })
    )
    
    if (strategy.created_by) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Author: ', bold: true }),
            new TextRun({ text: strategy.created_by })
          ],
          spacing: { after: 100 }
        })
      )
    }
    
    // Divider
    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 300 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '6366f1' }
        }
      })
    )
    
    // Sections
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
      if (strategy[key]?.trim()) {
        children.push(
          new Paragraph({
            text: label,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
        
        // Split content by newlines and add each as a paragraph
        strategy[key].split('\n').forEach(line => {
          children.push(
            new Paragraph({
              text: line || '',
              spacing: { after: 100 }
            })
          )
        })
      }
    })
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    })
    
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${strategy.title.replace(/\s+/g, '_')}.docx`)
    setShowExportMenu(false)
    showToast('success', '📝 Exported!', 'Word document downloaded successfully')
  }
  
  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  async function handleDelete() {
    showConfirm(
      '🗑️ Delete Strategy',
      'Are you sure you want to delete this strategy? This action cannot be undone.',
      async () => {
        try {
          await strategiesAPI.delete(id)
          navigate('/projects')
        } catch (err) {
          showToast('error', '❌ Delete Failed', 'Could not delete the strategy. Please try again.')
        }
      }
    )
  }
  
  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }
  
  if (!strategy) {
    return (
      <div className="empty-state">
        <p>Strategy not found</p>
        <Link to="/projects" className="btn btn-primary mt-md">Back to Projects</Link>
      </div>
    )
  }
  
  const filledSections = Object.entries(SECTION_LABELS).filter(([key]) => strategy[key]?.trim())
  
  return (
    <div className="strategy-view animate-in">
      <header className="page-header stacked">
        <div className="header-top-row">
          <div className="page-header-content">
            <Link to={`/projects/${strategy.project_id}`} className="btn btn-ghost">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="strategy-meta">
                <span className={`badge badge-${strategy.status}`}>{strategy.status}</span>
                <span className="text-muted">v{strategy.version}</span>
                {strategy?.is_cross_team && <CrossTeamBadge count={participants.length} />}
              </div>
              <h1>{strategy.title}</h1>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {/* Export Button with Dropdown */}
          <div className="export-dropdown">
            <button 
              className="btn btn-success"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download size={18} />
              Export
              <ChevronDown size={16} />
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={exportAsWord}>
                  <FileType size={16} className="icon-blue" />
                  Word (.docx)
                </button>
                <button onClick={exportAsMarkdown}>
                  <FileDown size={16} className="icon-purple" />
                  Markdown (.md)
                </button>
                <button onClick={exportAsText}>
                  <FileText size={16} className="icon-cyan" />
                  Plain Text (.txt)
                </button>
                <button onClick={exportAsHTML}>
                  <FileDown size={16} className="icon-orange" />
                  HTML (.html)
                </button>
                <button onClick={exportAsJSON}>
                  <FileDown size={16} className="icon-green" />
                  JSON (.json)
                </button>
              </div>
            )}
          </div>
          
          {/* Share Button */}
          <button 
            className="btn btn-share"
            onClick={handleShareClick}
          >
            <Share2 size={18} />
            Share
            {shares.length > 0 && <span className="share-count">{shares.length}</span>}
          </button>
          
          {/* Publish to Confluence Button */}
          <button 
            className="btn btn-confluence"
            onClick={handlePublishToConfluence}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 size={18} className="spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Publish to Confluence
              </>
            )}
          </button>
          
          <button 
            className={`btn ${showComments ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare size={18} />
            Review ({comments.filter(c => !c.is_resolved).length})
          </button>
          <button 
            className="btn btn-jira"
            onClick={() => setShowJiraModal(true)}
          >
            <ExternalLink size={18} />
            Link Jira Test Plan
          </button>
          <Link to={`/strategy/${id}/edit`} className="btn btn-secondary">
            <Edit2 size={18} />
            Edit
          </Link>
          <button className="btn btn-ghost" onClick={handleDelete}>
            <Trash2 size={18} />
          </button>
        </div>
      </header>
      
      {/* Cross-Team Tabs */}
      {strategy?.is_cross_team && (
        <div className="cross-team-tabs">
          <button 
            className={`ct-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <FileText size={18} />
            Strategy Content
          </button>
          <button 
            className={`ct-tab ${activeTab === 'breakdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('breakdown')}
          >
            <Layers size={18} />
            Test Breakdown
          </button>
          <button 
            className={`ct-tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            <BarChart3 size={18} />
            Progress
          </button>
        </div>
      )}
      
      {/* Cross-Team Breakdown Tab */}
      {strategy?.is_cross_team && activeTab === 'breakdown' && (
        <div className="cross-team-content">
          <BreakdownEditor 
            strategyId={parseInt(id)}
            participants={participants}
            onUpdate={loadData}
          />
        </div>
      )}
      
      {/* Cross-Team Progress Tab */}
      {strategy?.is_cross_team && activeTab === 'progress' && (
        <div className="cross-team-content">
          <ProgressDashboard strategyId={parseInt(id)} />
        </div>
      )}
      
      {/* Main Content Tab */}
      {(!strategy?.is_cross_team || activeTab === 'content') && (
      <div className="view-layout">
        {/* Main Content */}
        <div className="view-main">
          {filledSections.map(([key, label]) => (
            <section key={key} id={key} className="content-section">
              <h2>{label}</h2>
              <div className="section-body">
                {strategy[key].split('\n').map((line, i) => (
                  <p key={i}>{line || <br />}</p>
                ))}
              </div>
            </section>
          ))}
          
          {filledSections.length === 0 && (
            <div className="empty-state">
              <FileText size={48} />
              <p>No content yet</p>
              <Link to={`/strategy/${id}/edit`} className="btn btn-primary mt-md">
                Start Writing
              </Link>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <aside className="view-sidebar">
          {/* Info Card */}
          <div className="sidebar-card">
            <h4>Document Info</h4>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`badge badge-${strategy.status}`}>{strategy.status}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Version</span>
                <span>{strategy.version}</span>
              </div>
              {strategy.created_by && (
                <div className="info-item">
                  <span className="info-label">Author</span>
                  <span>{strategy.created_by}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Created</span>
                <span>{format(parseISO(strategy.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Sections</span>
                <span>{filledSections.length}/{Object.keys(SECTION_LABELS).length}</span>
              </div>
              <div className="info-item strategy-type-toggle">
                <span className="info-label">Strategy Type</span>
                <button 
                  className={`type-toggle-btn ${strategy.is_cross_team ? 'active' : ''}`}
                  onClick={handleToggleCrossTeam}
                  title={strategy.is_cross_team ? 'Click to change to Team Strategy' : 'Click to enable Cross-Team mode'}
                >
                  {strategy.is_cross_team ? '🌐 Cross-Team' : '📋 Team'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Table of Contents */}
          <div className="sidebar-card">
            <h4>Contents</h4>
            <nav className="toc">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <a 
                  key={key} 
                  href={`#${key}`}
                  className={`toc-item ${strategy[key]?.trim() ? '' : 'empty'}`}
                  onClick={(e) => {
                    e.preventDefault()
                    const element = document.getElementById(key)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                >
                  {strategy[key]?.trim() 
                    ? <CheckCircle size={14} className="text-success" />
                    : <Clock size={14} />
                  }
                  {label}
                </a>
              ))}
            </nav>
          </div>
          
          {/* Linked Jira Test Plans */}
          <div className="sidebar-card">
            <div className="card-header">
              <h4>🔗 Linked Jira Issues</h4>
              <button 
                className="btn btn-ghost btn-xs"
                onClick={() => setShowJiraModal(true)}
                title="Link new Jira issue"
              >
                +
              </button>
            </div>
            {linkedTestPlans.length === 0 ? (
              <p className="text-muted text-sm">No linked issues yet</p>
            ) : (
              <div className="linked-plans-list">
                {linkedTestPlans.map(plan => {
                  // Always construct the URL from the issue key to avoid double-URL issues
                  const jiraUrl = `https://etorogroup.atlassian.net/browse/${plan.jira_issue_key}`;
                  return (
                  <div key={plan.id} className="linked-plan-item">
                    <div className="linked-plan-info">
                      <button 
                        type="button"
                        className="linked-plan-link"
                        onClick={() => window.open(jiraUrl, '_blank')}
                      >
                        🎫 {plan.jira_issue_key} ↗️
                      </button>
                      {plan.title && !plan.title.startsWith('Jira:') && (
                        <span className="linked-plan-title">{plan.title}</span>
                      )}
                    </div>
                    <button 
                      className="btn btn-ghost btn-xs be-delete-btn"
                      onClick={() => handleUnlinkTestPlan(plan.id)}
                      title="Unlink"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
      )}
      
      <style>{`
        .strategy-view {
          max-width: 1200px;
        }
        
        .cross-team-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-secondary);
          padding: 6px;
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
          width: fit-content;
        }
        
        .ct-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ct-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .ct-tab.active {
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        
        .cross-team-content {
          margin-bottom: var(--space-xl);
        }
        
        .strategy-meta {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-sm);
        }
        
        .page-header.stacked {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-md);
        }
        
        .header-top-row {
          width: 100%;
        }
        
        .header-actions {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
          align-items: stretch;
        }
        
        .header-actions .btn {
          min-width: 160px;
          height: 42px;
          justify-content: center;
          display: inline-flex;
          align-items: center;
          padding: 0 var(--space-md);
          font-size: 0.875rem;
        }
        
        .header-actions .btn-ghost {
          min-width: 80px;
        }
        
        .header-actions .btn-danger {
          min-width: 42px;
          padding: 0;
        }
        
        .export-dropdown {
          position: relative;
        }
        
        .export-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: var(--space-xs);
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          min-width: 180px;
          z-index: 50;
          overflow: hidden;
        }
        
        .export-menu button {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .export-menu button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .export-menu button svg {
          flex-shrink: 0;
        }
        
        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          border: none;
        }
        
        .btn-success:hover {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }
        
        .btn-jira {
          background: linear-gradient(135deg, #0052CC 0%, #0747A6 100%);
          color: white;
          border: none;
        }
        
        .btn-jira:hover {
          background: linear-gradient(135deg, #0747A6 0%, #003d99 100%);
        }
        
        .btn-confluence {
          background: linear-gradient(135deg, #0052CC 0%, #172B4D 100%);
          color: white;
          border: none;
        }
        
        .btn-confluence:hover {
          background: linear-gradient(135deg, #0747A6 0%, #091E42 100%);
        }
        
        .btn-confluence:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .view-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: var(--space-xl);
        }
        
        .view-main {
          display: flex;
          flex-direction: column;
          gap: var(--space-xl);
        }
        
        .content-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          scroll-margin-top: 20px;
        }
        
        .content-section h2 {
          font-size: 1.25rem;
          margin-bottom: var(--space-md);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--border-color);
        }
        
        .section-body p {
          color: var(--text-secondary);
          margin-bottom: var(--space-sm);
          line-height: 1.7;
        }
        
        .view-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }
        
        .sidebar-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }
        
        .sidebar-card h4 {
          font-size: 0.9375rem;
          margin-bottom: var(--space-md);
        }
        
        .sidebar-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .sidebar-card .card-header h4 {
          margin-bottom: 0;
        }
        
        .info-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }
        
        .info-label {
          color: var(--text-muted);
        }
        
        .linked-plans-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .linked-plan-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: var(--bg-hover);
          border-radius: var(--radius-sm);
        }
        
        .linked-plan-link {
          color: var(--accent-cyan);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .linked-plan-link {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }
        
        .linked-plan-link:hover {
          text-decoration: underline;
        }
        
        .link-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          color: var(--accent-cyan);
          font-size: 1rem;
        }
        
        .link-button:hover {
          text-decoration: underline;
        }
        
        .linked-plan-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          overflow: hidden;
        }
        
        .linked-plan-title {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .strategy-type-toggle {
          margin-top: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--border-color);
        }
        
        .type-toggle-btn {
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .type-toggle-btn:hover {
          border-color: var(--accent-purple);
          color: var(--text-primary);
        }
        
        .type-toggle-btn.active {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }
        
        .toc {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        
        .toc-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-xs) 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-decoration: none;
        }
        
        .toc-item:hover {
          color: var(--text-primary);
        }
        
        .toc-item.empty {
          color: var(--text-muted);
          pointer-events: none;
          opacity: 0.5;
        }
        
        @media (max-width: 1024px) {
          .view-layout {
            grid-template-columns: 1fr;
          }
          
          .view-sidebar {
            order: -1;
            flex-direction: row;
            flex-wrap: wrap;
          }
          
          .sidebar-card {
            flex: 1;
            min-width: 250px;
          }
        }
      `}</style>
      
      {/* Comments/Review Panel */}
      {showComments && (
        <div className="comments-panel">
          <div className="comments-header">
            <h3>Team Review</h3>
            <button className="btn btn-ghost" onClick={() => setShowComments(false)}>
              <X size={18} />
            </button>
          </div>
          
          {/* Add Comment Form */}
          <div className="comment-form">
            <input
              type="text"
              className="form-input mb-sm"
              placeholder="Your name"
              value={newComment.author}
              onChange={e => setNewComment({ ...newComment, author: e.target.value })}
            />
            <select
              className="form-select mb-sm"
              value={newComment.section}
              onChange={e => setNewComment({ ...newComment, section: e.target.value })}
            >
              <option value="">General comment</option>
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <div className="comment-input-row">
              <textarea
                className="form-textarea"
                placeholder="Write your comment or suggestion..."
                value={newComment.content}
                onChange={e => setNewComment({ ...newComment, content: e.target.value })}
                style={{ minHeight: '80px' }}
              />
              <button className="btn btn-primary" onClick={handleAddComment}>
                <Send size={16} />
              </button>
            </div>
          </div>
          
          {/* Comments List */}
          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className={`comment-item ${comment.is_resolved ? 'resolved' : ''}`}>
                  <div className="comment-header">
                    <strong>{comment.author}</strong>
                    {comment.section && (
                      <span className="comment-section">{SECTION_LABELS[comment.section]}</span>
                    )}
                    <span className="comment-date">
                      {format(parseISO(comment.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                  <div className="comment-actions">
                    {!comment.is_resolved && (
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleResolveComment(comment.id)}
                      >
                        <CheckCircle size={14} />
                        Resolve
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                No comments yet. Be the first to review!
              </p>
            )}
          </div>
          
          <style>{`
            .comments-panel {
              position: fixed;
              right: 0;
              top: 0;
              width: 400px;
              height: 100vh;
              background: var(--bg-card);
              border-left: 1px solid var(--border-color);
              display: flex;
              flex-direction: column;
              z-index: 100;
              box-shadow: -4px 0 20px rgba(0,0,0,0.3);
            }
            
            .comments-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: var(--space-lg);
              border-bottom: 1px solid var(--border-color);
            }
            
            .comments-header h3 {
              font-size: 1.125rem;
            }
            
            .comment-form {
              padding: var(--space-lg);
              border-bottom: 1px solid var(--border-color);
              background: var(--bg-secondary);
            }
            
            .comment-input-row {
              display: flex;
              gap: var(--space-sm);
            }
            
            .comment-input-row .form-textarea {
              flex: 1;
            }
            
            .comment-input-row .btn {
              align-self: flex-end;
            }
            
            .comments-list {
              flex: 1;
              overflow: auto;
              padding: var(--space-md);
            }
            
            .comment-item {
              background: var(--bg-hover);
              border-radius: var(--radius-md);
              padding: var(--space-md);
              margin-bottom: var(--space-md);
            }
            
            .comment-item.resolved {
              opacity: 0.6;
              border-left: 3px solid var(--success);
            }
            
            .comment-header {
              display: flex;
              align-items: center;
              gap: var(--space-sm);
              margin-bottom: var(--space-sm);
              font-size: 0.875rem;
            }
            
            .comment-section {
              background: var(--accent-primary);
              color: white;
              padding: 2px 8px;
              border-radius: var(--radius-sm);
              font-size: 0.75rem;
            }
            
            .comment-date {
              margin-left: auto;
              color: var(--text-muted);
              font-size: 0.75rem;
            }
            
            .comment-content {
              color: var(--text-secondary);
              font-size: 0.9375rem;
              line-height: 1.5;
              margin-bottom: var(--space-sm);
            }
            
            .comment-actions {
              display: flex;
              gap: var(--space-xs);
            }
            
            @media (max-width: 768px) {
              .comments-panel {
                width: 100%;
              }
            }
          `}</style>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <div className="toast-header">
              <span className="toast-title">{toast.title}</span>
              <button className="toast-close" onClick={() => setToast(null)}>×</button>
            </div>
            <p className="toast-message">{toast.message}</p>
            {toast.action && (
              <button 
                className="toast-action"
                onClick={() => {
                  window.open(toast.action.url, '_blank')
                  setToast(null)
                }}
              >
                {toast.action.label} →
              </button>
            )}
          </div>
          <style>{`
            .toast {
              position: fixed;
              bottom: 24px;
              right: 24px;
              min-width: 360px;
              max-width: 450px;
              border-radius: 16px;
              padding: 20px 24px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
              z-index: 1000;
              animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
              backdrop-filter: blur(20px);
            }
            
            @keyframes slideIn {
              from {
                transform: translateX(100%) scale(0.8);
                opacity: 0;
              }
              to {
                transform: translateX(0) scale(1);
                opacity: 1;
              }
            }
            
            .toast-success {
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
              border-left: 4px solid #34d399;
            }
            
            .toast-error {
              background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%);
              border-left: 4px solid #f87171;
            }
            
            .toast-info {
              background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(29, 78, 216, 0.95) 100%);
              border-left: 4px solid #60a5fa;
            }
            
            .toast-content {
              color: white;
            }
            
            .toast-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            
            .toast-title {
              font-size: 1.125rem;
              font-weight: 700;
              letter-spacing: -0.01em;
            }
            
            .toast-close {
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              font-size: 1.25rem;
              cursor: pointer;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            }
            
            .toast-close:hover {
              background: rgba(255,255,255,0.3);
              transform: scale(1.1);
            }
            
            .toast-message {
              font-size: 0.9375rem;
              opacity: 0.95;
              line-height: 1.5;
            }
            
            .toast-action {
              margin-top: 16px;
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 10px 20px;
              border-radius: 10px;
              font-size: 0.9375rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              width: 100%;
            }
            
            .toast-action:hover {
              background: rgba(255,255,255,0.3);
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
          `}</style>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="modal-actions">
              <button 
                className="btn btn-ghost"
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  confirmModal.onConfirm()
                  setConfirmModal(null)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
          <style>{`
            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.7);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              animation: fadeIn 0.2s ease;
            }
            
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            .modal-content {
              background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
              border: 1px solid var(--border-color);
              border-radius: 20px;
              padding: 32px;
              max-width: 440px;
              width: 90%;
              box-shadow: 0 30px 90px rgba(0,0,0,0.5);
              animation: modalSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            @keyframes modalSlide {
              from {
                transform: scale(0.9) translateY(-20px);
                opacity: 0;
              }
              to {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
            }
            
            .modal-content h3 {
              font-size: 1.375rem;
              margin-bottom: 12px;
              color: var(--text-primary);
            }
            
            .modal-content p {
              color: var(--text-secondary);
              line-height: 1.6;
              margin-bottom: 28px;
            }
            
            .modal-actions {
              display: flex;
              gap: 12px;
              justify-content: flex-end;
            }
            
            .modal-actions .btn {
              min-width: 100px;
            }
          `}</style>
        </div>
      )}
      
      {/* Link Jira Test Plan Modal */}
      {showJiraModal && (
        <div className="modal-overlay">
          <div className="modal-content jira-modal">
            <div className="jira-modal-header">
              <div className="jira-icon">🔗</div>
              <h3>Link Jira Test Plan</h3>
            </div>
            <p>Link an existing Jira issue to this strategy.</p>
            
            <div className="form-group">
              <label className="form-label">Jira Issue Key *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., QARD-123"
                value={jiraIssueKey}
                onChange={(e) => setJiraIssueKey(e.target.value.toUpperCase())}
                autoFocus
              />
              <span className="form-hint">Enter the Jira issue key you want to link (e.g., QARD-12345)</span>
            </div>
            
            <div className="form-group">
              <label className="form-label">Title (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., E2E Tests - Open Position Flow"
                value={jiraTitle}
                onChange={(e) => setJiraTitle(e.target.value)}
              />
              <span className="form-hint">Give this test plan a descriptive name</span>
            </div>
            
            {jiraIssueKey && (
              <div className="preview-box">
                <span className="preview-label">Will link to:</span>
                <button 
                  type="button"
                  className="preview-value link-button"
                  onClick={() => window.open(`https://etorogroup.atlassian.net/browse/${jiraIssueKey}`, '_blank')}
                >
                  🔗 {jiraIssueKey} ↗️
                </button>
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  setShowJiraModal(false)
                  setJiraIssueKey('')
                  setJiraTitle('')
                }}
                disabled={isLinkingJira}
              >
                Cancel
              </button>
              <button 
                className="btn btn-jira"
                onClick={handleLinkJiraTestPlan}
                disabled={isLinkingJira || !jiraIssueKey.trim()}
              >
                {isLinkingJira ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Link Issue
                  </>
                )}
              </button>
            </div>
          </div>
          <style>{`
            .jira-modal {
              max-width: 480px;
            }
            
            .jira-modal-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }
            
            .jira-icon {
              font-size: 2rem;
            }
            
            .jira-modal-header h3 {
              margin: 0;
            }
            
            .jira-modal p {
              color: var(--text-secondary);
              margin-bottom: 24px;
            }
            
            .form-group {
              margin-bottom: 20px;
            }
            
            .form-label {
              display: block;
              font-weight: 600;
              margin-bottom: 8px;
              color: var(--text-primary);
            }
            
            .form-hint {
              display: block;
              font-size: 0.8125rem;
              color: var(--text-muted);
              margin-top: 6px;
            }
            
            .preview-box {
              background: var(--bg-hover);
              border: 1px solid var(--border-color);
              border-radius: var(--radius-md);
              padding: 16px;
              margin-bottom: 24px;
            }
            
            .preview-label {
              display: block;
              font-size: 0.75rem;
              color: var(--text-muted);
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 6px;
            }
            
            .preview-value {
              font-weight: 600;
              color: var(--text-primary);
            }
            
            .loading-types {
              display: flex;
              align-items: center;
              gap: 8px;
              color: var(--text-muted);
              font-size: 0.875rem;
              padding: 12px;
              background: var(--bg-hover);
              border-radius: var(--radius-md);
            }
            
            .no-types {
              color: var(--warning, #f59e0b);
              font-size: 0.875rem;
              padding: 12px;
              background: rgba(245, 158, 11, 0.1);
              border-radius: var(--radius-md);
              border: 1px solid rgba(245, 158, 11, 0.3);
            }
            
            .form-select {
              width: 100%;
              padding: 12px 16px;
              font-size: 1rem;
              border: 1px solid var(--border-color);
              border-radius: var(--radius-md);
              background: var(--bg-secondary);
              color: var(--text-primary);
              cursor: pointer;
            }
            
            .form-select:focus {
              outline: none;
              border-color: var(--accent-primary);
              box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
            }
          `}</style>
        </div>
      )}
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareType="strategy"
        resourceId={parseInt(id)}
        resourceName={strategy?.title || 'Strategy'}
        currentShares={shares}
        onShare={handleShare}
        onUpdateShare={handleUpdateShare}
        onDeleteShare={handleDeleteShare}
        onCreateLink={handleCreateShareLink}
      />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user)
          setShowAuthModal(false)
          setShowShareModal(true)
        }}
      />
      
      <style>{`
        .btn-share {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-share:hover {
          background: linear-gradient(135deg, #9a6dff 0%, #8b4cf7 100%);
          transform: translateY(-1px);
        }
        
        .share-count {
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          margin-left: 4px;
        }
      `}</style>
    </div>
  )
}

export default StrategyView

