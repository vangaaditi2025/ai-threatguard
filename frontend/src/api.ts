const baseUrl = import.meta.env.VITE_API_URL?.trim() || '/api'

export function apiUrl(path: string) {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}
