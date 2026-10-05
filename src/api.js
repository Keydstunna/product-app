import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: BASE })

export function saveSession(data) {
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  localStorage.setItem('user', JSON.stringify(data.user))
}

export function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

let refreshing = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const refresh = localStorage.getItem('refresh_token')

    if (error.response?.status === 401 && refresh && !original._retry) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          axios.post(BASE + '/api/auth/refresh', { refresh_token: refresh })
        const res = await refreshing
        refreshing = null

        const t = res.data.tokens
        localStorage.setItem('access_token', t.access_token)
        localStorage.setItem('refresh_token', t.refresh_token)
        original.headers.Authorization = 'Bearer ' + t.access_token
        return api(original)
      } catch {
        refreshing = null
        clearSession()
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

export default api