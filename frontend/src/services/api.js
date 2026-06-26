import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: (month, year) => api.get('/api/dashboard', { params: { month, year } }),
}

// ─── Accounts ────────────────────────────────────────────────────────────────
export const accountsAPI = {
  list: () => api.get('/api/accounts'),
  create: (data) => api.post('/api/accounts', data),
  update: (id, data) => api.put(`/api/accounts/${id}`, data),
  delete: (id) => api.delete(`/api/accounts/${id}`),
}

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoriesAPI = {
  list: () => api.get('/api/categories'),
  create: (data) => api.post('/api/categories', data),
  delete: (id) => api.delete(`/api/categories/${id}`),
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsAPI = {
  list: (params) => api.get('/api/transactions', { params }),
  create: (data) => api.post('/api/transactions', data),
  update: (id, data) => api.put(`/api/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/transactions/${id}`),
}

// ─── Bills ───────────────────────────────────────────────────────────────────
export const billsAPI = {
  list: (params) => api.get('/api/bills', { params }),
  create: (data) => api.post('/api/bills', data),
  update: (id, data) => api.put(`/api/bills/${id}`, data),
  delete: (id) => api.delete(`/api/bills/${id}`),
}
