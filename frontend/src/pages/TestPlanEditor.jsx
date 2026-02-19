import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'
import { testPlansAPI, strategiesAPI } from '../services/api'

function TestPlanEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const strategyId = searchParams.get('strategy')
  
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    strategy_id: strategyId || '',
    title: '',
    description: '',
    objectives: '',
    features_to_test: '',
    features_not_to_test: '',
    test_cases_summary: '',
    environment_requirements: '',
    schedule: ''
  })
  
  useEffect(() => {
    loadData()
  }, [id])
  
  async function loadData() {
    try {
      setLoading(true)
      const strategiesData = await strategiesAPI.getAll()
      setStrategies(strategiesData)
      
      if (id) {
        const plan = await testPlansAPI.getById(id)
        setFormData({
          strategy_id: plan.strategy_id,
          title: plan.title,
          description: plan.description || '',
          objectives: plan.objectives || '',
          features_to_test: plan.features_to_test || '',
          features_not_to_test: plan.features_not_to_test || '',
          test_cases_summary: plan.test_cases_summary || '',
          environment_requirements: plan.environment_requirements || '',
          schedule: plan.schedule || ''
        })
      } else if (strategyId) {
        // Pre-fill from strategy
        const strategy = strategiesData.find(s => s.id === parseInt(strategyId))
        if (strategy) {
          setFormData(prev => ({
            ...prev,
            title: `Test Plan - ${strategy.title}`,
            objectives: strategy.introduction || '',
            features_to_test: strategy.scope_in || '',
            features_not_to_test: strategy.scope_out || '',
            environment_requirements: strategy.test_environment || '',
            schedule: strategy.schedule || ''
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }
  
  function handleFieldChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }
  
  async function handleSave(status = null) {
    if (!formData.strategy_id || !formData.title.trim()) {
      alert('Please select a strategy and enter a title')
      return
    }
    
    setSaving(true)
    try {
      const data = { ...formData }
      if (status) data.status = status
      
      if (id) {
        await testPlansAPI.update(id, data)
        alert('Saved successfully!')
      } else {
        const newPlan = await testPlansAPI.create(data)
        navigate(`/test-plan/${newPlan.id}`)
      }
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }
  
  return (
    <div className="test-plan-editor animate-in">
      <header className="page-header">
        <div className="page-header-content">
          <Link to={strategyId ? `/strategy/${strategyId}` : '/projects'} className="btn btn-ghost">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{id ? 'Edit Test Plan' : 'New Test Plan'}</h1>
            <p className="mt-sm">Create a detailed test plan from your strategy</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => handleSave()}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => handleSave('approved')}
            disabled={saving}
          >
            <CheckCircle size={18} />
            Approve
          </button>
        </div>
      </header>
      
      {/* Basic Info */}
      <div className="card mb-lg">
        <h3 className="mb-md">Basic Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Based on Strategy *</label>
            <select
              className="form-select"
              value={formData.strategy_id}
              onChange={e => handleFieldChange('strategy_id', e.target.value)}
            >
              <option value="">Select a strategy...</option>
              {strategies.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Test Plan Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={e => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Sprint 5 Test Plan"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={e => handleFieldChange('description', e.target.value)}
            placeholder="Brief description of this test plan..."
            style={{ minHeight: '80px' }}
          />
        </div>
      </div>
      
      {/* Sections */}
      <div className="sections-grid">
        <div className="card">
          <h3 className="mb-md">Test Objectives</h3>
          <textarea
            className="form-textarea"
            value={formData.objectives}
            onChange={e => handleFieldChange('objectives', e.target.value)}
            placeholder="What are the main objectives of this test cycle?&#10;&#10;- Verify new payment flow&#10;- Regression test checkout process&#10;- Performance testing under load..."
          />
        </div>
        
        <div className="card">
          <h3 className="mb-md">Features to Test</h3>
          <textarea
            className="form-textarea"
            value={formData.features_to_test}
            onChange={e => handleFieldChange('features_to_test', e.target.value)}
            placeholder="List the features/modules to be tested:&#10;&#10;- User registration flow&#10;- Payment processing&#10;- Order management&#10;- Email notifications..."
          />
        </div>
        
        <div className="card">
          <h3 className="mb-md">Features NOT to Test</h3>
          <textarea
            className="form-textarea"
            value={formData.features_not_to_test}
            onChange={e => handleFieldChange('features_not_to_test', e.target.value)}
            placeholder="List features excluded from this test cycle and why:&#10;&#10;- Admin dashboard (no changes)&#10;- Legacy API (being deprecated)..."
          />
        </div>
        
        <div className="card">
          <h3 className="mb-md">Test Cases Summary</h3>
          <textarea
            className="form-textarea"
            value={formData.test_cases_summary}
            onChange={e => handleFieldChange('test_cases_summary', e.target.value)}
            placeholder="Summary of test cases:&#10;&#10;Total: 150 test cases&#10;- Smoke tests: 20&#10;- Functional: 80&#10;- Integration: 30&#10;- Performance: 20..."
          />
        </div>
        
        <div className="card">
          <h3 className="mb-md">Environment Requirements</h3>
          <textarea
            className="form-textarea"
            value={formData.environment_requirements}
            onChange={e => handleFieldChange('environment_requirements', e.target.value)}
            placeholder="Test environment details:&#10;&#10;- Staging server: staging.example.com&#10;- Database: PostgreSQL 14&#10;- Test data: Anonymized production data&#10;- Browser support: Chrome, Firefox, Safari..."
          />
        </div>
        
        <div className="card">
          <h3 className="mb-md">Schedule</h3>
          <textarea
            className="form-textarea"
            value={formData.schedule}
            onChange={e => handleFieldChange('schedule', e.target.value)}
            placeholder="Testing timeline:&#10;&#10;Week 1: Test case preparation&#10;Week 2: Smoke testing&#10;Week 3-4: Full test execution&#10;Week 5: Bug verification & regression..."
          />
        </div>
      </div>
      
      {/* Bottom Actions */}
      <div className="bottom-actions">
        <button 
          className="btn btn-secondary btn-lg" 
          onClick={() => handleSave()}
          disabled={saving}
        >
          <Save size={20} />
          Save Draft
        </button>
        <button 
          className="btn btn-primary btn-lg" 
          onClick={() => handleSave('in_review')}
          disabled={saving}
        >
          Submit for Review
        </button>
      </div>
      
      <style>{`
        .test-plan-editor {
          max-width: 1100px;
        }
        
        .header-actions {
          display: flex;
          gap: var(--space-sm);
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
        }
        
        .sections-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-lg);
        }
        
        .sections-grid .card {
          display: flex;
          flex-direction: column;
        }
        
        .sections-grid .form-textarea {
          flex: 1;
          min-height: 150px;
        }
        
        .bottom-actions {
          display: flex;
          justify-content: center;
          gap: var(--space-md);
          padding: var(--space-xl) 0;
          margin-top: var(--space-lg);
          border-top: 1px solid var(--border-color);
        }
        
        @media (max-width: 768px) {
          .form-grid,
          .sections-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default TestPlanEditor






