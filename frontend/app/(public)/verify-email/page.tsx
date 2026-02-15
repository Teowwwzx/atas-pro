'use client'

import React, { useEffect, useState, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { verifyEmail, getMyProfile, resendVerification } from '@/services/api'
import { toast } from 'react-hot-toast'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  // Check for redirect URL from query params, or check localStorage for booking draft
  const getRedirectUrl = () => {
    const paramRedirect = searchParams.get('redirect')
    if (paramRedirect) return paramRedirect

    // Check localStorage for pending redirect (Lazy Login)
    try {
      const pending = localStorage.getItem('pending_redirect')
      if (pending) return pending
    } catch (e) { }

    // Check localStorage for any booking drafts
    try {
      const keys = Object.keys(localStorage)
      const draftKey = keys.find(key => key.startsWith('booking_draft_'))
      if (draftKey) {
        const expertId = draftKey.replace('booking_draft_', '')
        return `/book/${expertId}`
      }
    } catch (e) {
      // localStorage not available
    }

    return '/dashboard'
  }

  const redirectUrl = getRedirectUrl()
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const lastSubmittedCodeRef = useRef<string>('')

  // Resend logic
  const [countdown, setCountdown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  // Timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!/^\d*$/.test(val)) return

    const newCode = [...code]
    if (val.length > 1) {
      newCode[index] = val.slice(-1)
    } else {
      newCode[index] = val
    }
    setCode(newCode)

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newCode = [...code]
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char
    })
    setCode(newCode)
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  const verifyCode = async (codeToVerify: string) => {
    if (!email || !codeToVerify) return

    setStatus('loading')
    try {
      const res = await verifyEmail(email, codeToVerify)
      setMessage(res.message || 'Email verified successfully.')
      setStatus('success')
      toast.success('Email verified!')

      // Auto-login if token is returned
      if (res.access_token) {
        localStorage.setItem('atas_token', res.access_token)
        localStorage.removeItem('pending_login_email')
        localStorage.removeItem('pending_redirect') // Clear pending redirect after consumption

        try {
          // Check onboarding status
          const profile = await getMyProfile()
          if (!profile.is_onboarded) {
            toast('Please complete your onboarding!', { icon: '👋' })
            setTimeout(() => {
              window.location.href = `/onboarding?redirect=${encodeURIComponent(redirectUrl)}`
            }, 2000)
          } else {
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 2000)
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error)
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 2000)
        }
      } else {
        setTimeout(() => {
          window.location.href = redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'
        }, 2000)
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      const errorMsg = e?.response?.data?.detail || 'Failed to verify email.'
      setMessage(errorMsg)
      setStatus('error')
      toast.error(errorMsg)
    }
  }

  // Auto-submit effect
  useEffect(() => {
    const fullCode = code.join('')
    if (fullCode.length < 6) {
      lastSubmittedCodeRef.current = ''
    }
    if (fullCode.length === 6 && fullCode !== lastSubmittedCodeRef.current && status !== 'loading' && status !== 'success') {
      lastSubmittedCodeRef.current = fullCode
      verifyCode(fullCode)
    }
  }, [code, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    lastSubmittedCodeRef.current = fullCode
    verifyCode(fullCode)
  }

  const handleResend = async () => {
    if (countdown > 0) {
      toast.error(`Please wait ${countdown}s before resending.`, { id: 'resend-wait' })
      return
    }
    if (!email) {
      toast.error('Email address is missing.', { id: 'resend-email-missing' })
      return
    }

    setIsResending(true)
    try {
      await resendVerification(email)
      toast.success('Verification code resent! Please check your inbox.', { id: 'resend-success' })
      setCountdown(60)
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Verification code already sent. Please try again later.'

      toast.error(msg, { id: 'resend-error' })

      // If we get an error saying it's already sent, we should probably start the timer 
      // so the user knows they have to wait.
      setCountdown(60)
    } finally {
      setIsResending(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center lg:text-left animate-fade-in">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2">Email Verified</h3>
        <p className="text-zinc-500 font-medium mb-8">{message}</p>
        <Link
          href={redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
          className="w-full flex justify-center py-4 px-6 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className=" flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 max-w-lg w-full relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-100 rounded-full blur-2xl -ml-12 -mb-12 opacity-50"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600 mb-6 rotate-3">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-zinc-500 font-medium text-lg">
              We've sent a 6-digit verification code to <br />
              <span className="text-zinc-700 font-bold">{email || 'your email address'}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Input (Hidden or Read-only if needed, but keeping editable for flexibility if user made a typo) */}
            <div className="hidden">
              <label htmlFor="email" className="block text-sm font-bold text-zinc-900 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all font-medium"
                placeholder="atas@gmail.com"
              />
            </div>

            <div className="space-y-4">
              <label htmlFor="code" className="block text-sm font-bold text-zinc-900 text-center uppercase tracking-wider text-xs">
                Verification Code
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className={`
                                    w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-center
                                    rounded-lg border-2 text-xl sm:text-2xl font-bold transition-all duration-200
                                    outline-none focus:ring-2 focus:ring-yellow-400/20
                                    ${digit
                        ? 'border-yellow-400 bg-yellow-50/50 text-zinc-900'
                        : 'border-zinc-100 bg-zinc-50/50 text-zinc-300 focus:border-yellow-400 focus:bg-white'
                      }
                                `}
                  />
                ))}
              </div>
              <p className="text-center text-xs text-zinc-400 font-medium">
                Enter the 6-digit code from your inbox
              </p>
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || code.join('').length < 6}
              className="w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-yellow-400/20 text-lg font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify Account'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <div className="text-sm font-medium text-zinc-500">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || countdown > 0}
                className="text-zinc-900 font-bold hover:underline decoration-yellow-400 decoration-2 underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
              </button>
            </div>

            <div>
              <Link href={redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'} className="text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex bg-amber-50 font-sans">
      <div className="hidden lg:flex lg:w-1/2 bg-yellow-400 relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 bg-zinc-900 rounded-full flex items-center justify-center text-yellow-400 font-bold text-2xl">A</div>
            <span className="text-3xl font-black text-zinc-900 tracking-tight">ATAS</span>
          </div>
          <h1 className="text-6xl font-black text-zinc-900 leading-[1.1] mb-6">
            Verify <br /> Email
          </h1>
          <p className="text-xl text-zinc-900/80 font-medium max-w-md leading-relaxed">
            Confirm your email to access your dashboard and manage events.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white rounded-l-[3rem] shadow-[-20px_0_60px_rgba(0,0,0,0.05)] z-20">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-black text-zinc-900 mb-3">Email Verification</h2>
            <p className="text-gray-500 font-medium">We are processing your verification.</p>
          </div>
          <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
