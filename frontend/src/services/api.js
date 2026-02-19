// In production, use the full backend URL; in development, use relative path (proxied by Vite)
const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }
  
  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']
  }
  
  const response = await fetch(url, config)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    // Handle Pydantic validation errors (detail is an array) or string errors
    let errorMessage = `HTTP ${response.status}`
    if (error.detail) {
      if (Array.isArray(error.detail)) {
        errorMessage = error.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
      } else if (typeof error.detail === 'string') {
        errorMessage = error.detail
      } else {
        errorMessage = JSON.stringify(error.detail)
      }
    }
    throw new Error(errorMessage)
  }
  
  if (response.status === 204) {
    return null
  }
  
  return response.json()
}

// Projects
export const projectsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/projects${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => fetchAPI(`/projects/${id}`),
  
  create: (data) => fetchAPI('/projects', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: (id, data) => fetchAPI(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (id) => fetchAPI(`/projects/${id}`, {
    method: 'DELETE'
  })
}

// Documents
export const documentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/documents${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => fetchAPI(`/documents/${id}`),
  
  upload: async (projectId, name, docType, file) => {
    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('name', name)
    formData.append('doc_type', docType)
    formData.append('file', file)
    
    return fetchAPI('/documents/upload', {
      method: 'POST',
      body: formData
    })
  },
  
  createNote: (data) => fetchAPI('/documents/note', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  createLink: (data) => fetchAPI('/documents/link', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  createPastedDoc: (data) => fetchAPI('/documents/paste', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  delete: (id) => fetchAPI(`/documents/${id}`, {
    method: 'DELETE'
  })
}

// Strategies
export const strategiesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/strategies${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => fetchAPI(`/strategies/${id}`),
  
  create: (data) => fetchAPI('/strategies', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: (id, data) => fetchAPI(`/strategies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (id) => fetchAPI(`/strategies/${id}`, {
    method: 'DELETE'
  }),
  
  generateFromDocuments: (projectId) => fetchAPI(`/strategies/generate/${projectId}`, {
    method: 'POST'
  }),
  
  publishToConfluence: (id, spaceKey = 'MG', parentPageId = null) => {
    const params = new URLSearchParams({ space_key: spaceKey })
    if (parentPageId) params.append('parent_page_id', parentPageId)
    return fetchAPI(`/strategies/${id}/publish-confluence?${params.toString()}`, {
      method: 'POST'
    })
  },
  
  createJiraTestPlan: (id, projectKey, issueType = 'Story') => {
    const params = new URLSearchParams({ project_key: projectKey, issue_type: issueType })
    return fetchAPI(`/strategies/${id}/create-jira-test-plan?${params.toString()}`, {
      method: 'POST'
    })
  },
  
  getJiraIssueTypes: (projectKey) => fetchAPI(`/strategies/jira/issue-types/${projectKey}`)
}

// Test Plans
export const testPlansAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/test-plans${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => fetchAPI(`/test-plans/${id}`),
  
  create: (data) => fetchAPI('/test-plans', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: (id, data) => fetchAPI(`/test-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (id) => fetchAPI(`/test-plans/${id}`, {
    method: 'DELETE'
  })
}

// Comments (for reviews)
export const commentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/comments${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => fetchAPI(`/comments/${id}`),
  
  create: (data) => fetchAPI('/comments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: (id, data) => fetchAPI(`/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  resolve: (id) => fetchAPI(`/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_resolved: true })
  }),
  
  delete: (id) => fetchAPI(`/comments/${id}`, {
    method: 'DELETE'
  })
}

// ============== Cross-Team APIs ==============

// Participants
export const participantsAPI = {
  getAll: (projectId) => fetchAPI(`/projects/${projectId}/participants`),
  
  getById: (id) => fetchAPI(`/participants/${id}`),
  
  create: (projectId, data) => fetchAPI(`/projects/${projectId}/participants`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: (id, data) => fetchAPI(`/participants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (id) => fetchAPI(`/participants/${id}`, {
    method: 'DELETE'
  }),
  
  getTeams: (projectId) => fetchAPI(`/projects/${projectId}/teams`)
}

// Breakdown (Categories & Items)
export const breakdownAPI = {
  // Categories
  getAll: (strategyId, type = null) => {
    const params = type ? `?type=${type}` : ''
    return fetchAPI(`/strategies/${strategyId}/breakdowns${params}`)
  },
  
  createCategory: (strategyId, data) => fetchAPI(`/strategies/${strategyId}/breakdowns`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  updateCategory: (categoryId, data) => fetchAPI(`/breakdowns/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  deleteCategory: (categoryId) => fetchAPI(`/breakdowns/${categoryId}`, {
    method: 'DELETE'
  }),
  
  // Items
  createItem: (categoryId, data) => fetchAPI(`/breakdowns/${categoryId}/items`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  getItem: (itemId) => fetchAPI(`/breakdown-items/${itemId}`),
  
  updateItem: (itemId, data) => fetchAPI(`/breakdown-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  updateItemStatus: (itemId, status) => fetchAPI(`/breakdown-items/${itemId}/status?status=${status}`, {
    method: 'PATCH'
  }),
  
  deleteItem: (itemId) => fetchAPI(`/breakdown-items/${itemId}`, {
    method: 'DELETE'
  })
}

// Progress
export const progressAPI = {
  getFull: (strategyId) => fetchAPI(`/strategies/${strategyId}/progress`),
  
  getSummary: (strategyId) => fetchAPI(`/strategies/${strategyId}/progress/summary`),
  
  getByParticipant: (strategyId) => fetchAPI(`/strategies/${strategyId}/progress/by-participant`),
  
  getByCategory: (strategyId) => fetchAPI(`/strategies/${strategyId}/progress/by-category`)
}

// ============== Authentication ==============

const AUTH_TOKEN_KEY = 'tst_auth_token'

function getAuthHeader() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const authAPI = {
  register: (data) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    if (result.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, result.access_token)
    }
    return result
  }),
  
  login: (email, password) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }).then(result => {
    if (result.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, result.access_token)
    }
    return result
  }),
  
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    return Promise.resolve()
  },
  
  getCurrentUser: () => fetchAPI('/auth/me', {
    headers: getAuthHeader()
  }),
  
  updateProfile: (data) => fetchAPI('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: getAuthHeader()
  }),
  
  searchUsers: (query) => fetchAPI(`/auth/users?search=${encodeURIComponent(query)}`, {
    headers: getAuthHeader()
  }),
  
  isAuthenticated: () => !!localStorage.getItem(AUTH_TOKEN_KEY),
  
  getToken: () => localStorage.getItem(AUTH_TOKEN_KEY)
}

// ============== Sharing ==============

export const sharesAPI = {
  create: (data) => fetchAPI('/shares', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: getAuthHeader()
  }),
  
  getProjectShares: (projectId) => fetchAPI(`/shares/project/${projectId}`, {
    headers: getAuthHeader()
  }),
  
  getStrategyShares: (strategyId) => fetchAPI(`/shares/strategy/${strategyId}`, {
    headers: getAuthHeader()
  }),
  
  getSharedWithMe: () => fetchAPI('/shares/shared-with-me', {
    headers: getAuthHeader()
  }),
  
  accessByToken: (token) => fetchAPI(`/shares/access/${token}`),
  
  update: (shareId, data) => fetchAPI(`/shares/${shareId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: getAuthHeader()
  }),
  
  delete: (shareId) => fetchAPI(`/shares/${shareId}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  })
}

