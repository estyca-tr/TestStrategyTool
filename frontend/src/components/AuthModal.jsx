import { useState } from 'react'
import { X, Mail, Lock, User, Users, Briefcase } from 'lucide-react'
import { authAPI } from '../services/api'

function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('login') // login | register
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    team: '',
    role: ''
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      let result
      
      if (mode === 'login') {
        result = await authAPI.login(formData.email, formData.password)
      } else {
        result = await authAPI.register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          team: formData.team || null,
          role: formData.role || null
        })
      }
      
      onSuccess?.(result.user)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="auth-field">
              <User size={18} />
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={e => updateField('email', e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={e => updateField('password', e.target.value)}
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="auth-field">
                <Users size={18} />
                <input
                  type="text"
                  placeholder="Team (optional)"
                  value={formData.team}
                  onChange={e => updateField('team', e.target.value)}
                />
              </div>
              <div className="auth-field">
                <Briefcase size={18} />
                <input
                  type="text"
                  placeholder="Role (optional)"
                  value={formData.role}
                  onChange={e => updateField('role', e.target.value)}
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('register')}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>

        <style>{`
          .auth-modal {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            width: 400px;
            max-width: 95vw;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            overflow: hidden;
          }
          
          .auth-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-lg);
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
            border-bottom: 1px solid var(--border-color);
          }
          
          .auth-modal-header h2 {
            margin: 0;
            font-size: 1.3rem;
          }
          
          .auth-form {
            padding: var(--space-xl);
          }
          
          .auth-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-md);
            margin-bottom: var(--space-md);
            font-size: 0.9rem;
          }
          
          .auth-field {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0 var(--space-md);
            margin-bottom: var(--space-md);
            transition: border-color 0.2s;
          }
          
          .auth-field:focus-within {
            border-color: var(--accent-cyan);
          }
          
          .auth-field svg {
            color: var(--text-muted);
          }
          
          .auth-field input {
            flex: 1;
            background: none;
            border: none;
            padding: var(--space-md);
            color: var(--text-primary);
            font-size: 1rem;
          }
          
          .auth-field input:focus {
            outline: none;
          }
          
          .btn-block {
            width: 100%;
            padding: var(--space-md);
            font-size: 1rem;
            margin-top: var(--space-md);
          }
          
          .auth-switch {
            text-align: center;
            margin-top: var(--space-lg);
            color: var(--text-muted);
          }
          
          .auth-switch button {
            background: none;
            border: none;
            color: var(--accent-cyan);
            cursor: pointer;
            font-weight: 500;
          }
          
          .auth-switch button:hover {
            text-decoration: underline;
          }
        `}</style>
      </div>
    </div>
  )
}

export default AuthModal

