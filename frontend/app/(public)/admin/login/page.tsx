'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { login, getMe } from '@/services/api'

const ADMIN_ROLES = ['admin', 'customer_support', 'content_moderator']

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('atas_token') : null
    if (!token) return
      ; (async () => {
        try {
          const me = await getMe()
          const ok = (me.roles || []).some(r => ADMIN_ROLES.includes(r))
          if (ok) {
            router.replace('/admin')
          }
        } catch { }
      })()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    try {
      const { access_token } = await login({ email, password })
      localStorage.setItem('atas_token', access_token)
      const me = await getMe()
      const ok = (me.roles || []).some(r => ADMIN_ROLES.includes(r))
      if (!ok) {
        toast.error('This account does not have admin access')
        try { localStorage.removeItem('atas_token') } catch { }
        return
      }
      toast.success('Welcome, admin')
      router.push('/admin')
    } catch (error: any) {
      // Check if account is suspended or inactive
      const errorMessage = error?.response?.data?.detail || error?.message || 'Invalid credentials.'
      if (errorMessage.toLowerCase().includes('suspended')) {
        toast.error('Your account has been suspended. Please contact the system administrator.', { duration: 6000 })
      } else if (errorMessage.toLowerCase().includes('inactive')) {
        toast.error('Your account is inactive. Please contact the system administrator.', { duration: 6000 })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-amber-50">
      <div className="w-full flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center">
            <h2 className="text-4xl font-black text-zinc-900 mb-3">Admin Login</h2>
            <p className="text-gray-500 font-medium">For ATAS administrators only</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@atas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  {/* <label htmlFor="password" className="block text-sm font-bold text-zinc-900">Password</label>
                  <Link href="/forgot-password" className="text-xs font-bold text-gray-400 hover:text-zinc-900 transition-colors">Forgot?</Link> */}
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-yellow-400 text-zinc-900 font-black text-lg shadow-[0_4px_0_rgb(0,0,0)] hover:shadow-[0_2px_0_rgb(0,0,0)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
            >
              {isLoading ? 'Logging in...' : 'Login as Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

