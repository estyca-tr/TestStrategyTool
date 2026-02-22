import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, FileText, ClipboardCheck, PenTool, User, LogIn, LogOut, Share2, Lock, Mail, Eye, EyeOff, Users, Briefcase } from 'lucide-react'
import { authAPI } from '../services/api'

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Login form state
  const [authMode, setAuthMode] = useState('login') // login | register
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', name: '', team: '', role: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  useEffect(() => {
    checkAuth()
  }, [])
  
  async function checkAuth() {
    setIsLoading(true)
    if (authAPI.isAuthenticated()) {
      try {
        const user = await authAPI.getCurrentUser()
        setCurrentUser(user)
      } catch {
        // Token invalid
        authAPI.logout()
      }
    }
    setIsLoading(false)
  }
  
  function handleLogout() {
    authAPI.logout()
    setCurrentUser(null)
    setShowUserMenu(false)
  }
  
  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    
    try {
      let result
      if (authMode === 'login') {
        result = await authAPI.login(authForm.username, authForm.password)
      } else {
        result = await authAPI.register({
          email: authForm.email,
          password: authForm.password,
          name: authForm.name,
          team: authForm.team || null,
          role: authForm.role || null
        })
      }
      setCurrentUser(result.user)
      // Redirect to dashboard after successful login
      navigate('/', { replace: true })
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <style>{`
          .auth-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .auth-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--accent-cyan);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }
  
  // Not logged in - show login screen
  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                <ClipboardCheck size={32} />
              </div>
              <h1>Test Strategy Tool</h1>
            </div>
            <p>Manage your test strategies and documentation</p>
          </div>
          
          <div className="auth-card">
            <div className="auth-tabs">
              <button 
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button 
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                Create Account
              </button>
            </div>
            
            <form onSubmit={handleAuthSubmit}>
              {authError && (
                <div className="auth-error">
                  {authError}
                </div>
              )}
              
              {authMode === 'register' && (
                <div className="auth-field">
                  <User size={18} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={authForm.name}
                    onChange={e => setAuthForm({...authForm, name: e.target.value})}
                    required
                  />
                </div>
              )}
              
              {authMode === 'login' ? (
                <div className="auth-field">
                  <User size={18} />
                  <input
                    type="text"
                    placeholder="Username"
                    value={authForm.username}
                    onChange={e => setAuthForm({...authForm, username: e.target.value})}
                    required
                  />
                </div>
              ) : (
                <div className="auth-field">
                  <Mail size={18} />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={authForm.email}
                    onChange={e => setAuthForm({...authForm, email: e.target.value})}
                  />
                </div>
              )}
              
              <div className="auth-field">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={authForm.password}
                  onChange={e => setAuthForm({...authForm, password: e.target.value})}
                  required
                  minLength={6}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {authMode === 'register' && (
                <>
                  <div className="auth-field">
                    <Users size={18} />
                    <input
                      type="text"
                      placeholder="Team (optional)"
                      value={authForm.team}
                      onChange={e => setAuthForm({...authForm, team: e.target.value})}
                    />
                  </div>
                  <div className="auth-field">
                    <Briefcase size={18} />
                    <input
                      type="text"
                      placeholder="Role (optional)"
                      value={authForm.role}
                      onChange={e => setAuthForm({...authForm, role: e.target.value})}
                    />
                  </div>
                </>
              )}
              
              <button 
                type="submit" 
                className="auth-submit"
                disabled={authLoading}
              >
                {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>
          </div>
          
          <p className="auth-footer">
            Test Strategy Tool v1.0.2
          </p>
        </div>
        
        <style>{`
          .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            padding: 20px;
          }
          
          .auth-container {
            width: 100%;
            max-width: 420px;
          }
          
          .auth-header {
            text-align: center;
            margin-bottom: 32px;
          }
          
          .auth-logo {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
          }
          
          .auth-logo-icon {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%);
            border-radius: 20px;
            color: white;
            box-shadow: 0 8px 32px rgba(245, 158, 11, 0.3);
          }
          
          .auth-header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
          }
          
          .auth-header p {
            color: var(--text-muted);
            margin: 0;
          }
          
          .auth-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          }
          
          .auth-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
          }
          
          .auth-tabs button {
            flex: 1;
            padding: 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            color: var(--text-muted);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .auth-tabs button:hover {
            color: var(--text-primary);
            background: var(--bg-hover);
          }
          
          .auth-tabs button.active {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            border-color: transparent;
            color: white;
          }
          
          .auth-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 16px;
            font-size: 0.9rem;
          }
          
          .auth-field {
            display: flex;
            align-items: center;
            gap: 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 0 16px;
            margin-bottom: 16px;
            transition: border-color 0.2s;
          }
          
          .auth-field:focus-within {
            border-color: var(--accent-cyan);
          }
          
          .auth-field svg {
            color: var(--text-muted);
            flex-shrink: 0;
          }
          
          .auth-field input {
            flex: 1;
            background: none;
            border: none;
            padding: 16px 0;
            color: var(--text-primary);
            font-size: 1rem;
          }
          
          .auth-field input:focus {
            outline: none;
          }
          
          .password-toggle {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            display: flex;
          }
          
          .password-toggle:hover {
            color: var(--text-primary);
          }
          
          .auth-submit {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
          }
          
          .auth-submit:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
          }
          
          .auth-submit:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          
          .auth-footer {
            text-align: center;
            margin-top: 24px;
            color: var(--text-muted);
            font-size: 0.85rem;
          }
        `}</style>
      </div>
    )
  }
  
  // Logged in - show normal app
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <ClipboardCheck size={22} />
            </div>
            <span className="logo-text">Test Strategy</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <div className="nav-icon orange">
              <LayoutDashboard size={18} />
            </div>
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <div className="nav-icon cyan">
              <FolderOpen size={18} />
            </div>
            <span>Projects</span>
          </NavLink>
          
          <NavLink to="/strategy/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <div className="nav-icon pink">
              <PenTool size={18} />
            </div>
            <span>New Strategy</span>
          </NavLink>
          
          {currentUser && (
            <NavLink to="/shared" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <div className="nav-icon purple">
                <Share2 size={18} />
              </div>
              <span>Shared with Me</span>
            </NavLink>
          )}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-section">
            <div 
              className="user-info"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-email">{currentUser.email}</span>
              </div>
            </div>
            {showUserMenu && (
              <div className="user-menu">
                <button onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
          <p className="version">v1.0.0</p>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
      
      <style>{`
        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .logo-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          border-radius: var(--radius-md);
          color: white;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        
        .logo-text {
          font-size: 1.125rem;
          font-weight: 700;
          background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .sidebar-nav {
          flex: 1;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .nav-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          color: white;
          flex-shrink: 0;
        }
        
        .nav-icon.orange { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); }
        .nav-icon.cyan { background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%); }
        .nav-icon.pink { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); }
        .nav-icon.purple { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); }
        .nav-icon.green { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); }
        .nav-icon.blue { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.625rem 0.875rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.2s;
          font-size: 0.9375rem;
          font-weight: 500;
        }
        
        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        
        .nav-link.active {
          color: var(--text-primary);
          background: var(--bg-card);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .nav-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          width: 3px;
          height: 24px;
          background: var(--accent-primary);
          border-radius: 0 2px 2px 0;
        }
        
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
        }
        
        .version {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 0.5rem;
        }
        
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        
        .user-section {
          position: relative;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .user-info:hover {
          background: var(--bg-hover);
        }
        
        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .user-name {
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-email {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .user-menu button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem;
          background: none;
          border: none;
          color: var(--text-primary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .user-menu button:hover {
          background: var(--bg-hover);
        }
        
        @media (max-width: 1024px) {
          .logo-text,
          .nav-link span {
            display: none;
          }
          
          .nav-link {
            justify-content: center;
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Layout

