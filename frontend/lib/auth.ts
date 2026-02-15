interface JwtPayload {
  exp?: number | string
  sub?: string
  roles?: string[]
  [key: string]: unknown
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join('')
    )
    return JSON.parse(jsonPayload) as JwtPayload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token)
  if (!payload || !payload.exp) return false
  const exp = typeof payload.exp === 'number' ? payload.exp : Date.parse(payload.exp) / 1000
  const now = Math.floor(Date.now() / 1000)
  return now >= exp
}

export function logout() {
  try {
    localStorage.removeItem('atas_token')
  } catch {}
}

