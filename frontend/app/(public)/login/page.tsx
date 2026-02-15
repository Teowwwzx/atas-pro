
// frontend/app/(public)/login/page.tsx
'use client'


import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'
import { getApiErrorMessage } from '@/lib/utils'

import { login, getMyProfile, getMe, resendVerification, loginWithGoogle, logout } from '@/services/api'
import { ApiErrorResponse } from '@/services/api.types'

function LoginPageContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showVerificationModal, setShowVerificationModal] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [googleReady, setGoogleReady] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const redirect = searchParams.get('redirect')
        if (redirect) {
            localStorage.setItem('pending_redirect', redirect)
        }
    }, [searchParams])

    // Check for redirect URL from params, or look for booking draft in localStorage
    const getRedirectUrl = () => {
        const paramRedirect = searchParams.get('redirect')
        if (paramRedirect) return paramRedirect

        // Check localStorage for booking drafts
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


    React.useEffect(() => {
        const token = localStorage.getItem('atas_token')
        if (token) {
            localStorage.removeItem('pending_redirect')
            router.replace(redirectUrl)
        }
        try {
            const pendingEmail = localStorage.getItem('pending_login_email')
            if (pendingEmail) {
                setEmail(pendingEmail)
            }
            const verified = localStorage.getItem('email_verified')
            if (verified) {
                toast.success('Email verified! Please login to continue.')
                localStorage.removeItem('email_verified')
            }
        } catch { }
    }, [router])

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!clientId) {
            return
        }
        const scriptId = 'google-identity-services'
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.defer = true
            script.id = scriptId
            script.onload = () => {
                setGoogleReady(true)
                try {
                    (window as any).google?.accounts.id.initialize({
                        client_id: clientId,
                        callback: async (response: any) => {
                            const idToken = response?.credential
                            if (!idToken) return
                            try {
                                const { access_token } = await loginWithGoogle(idToken)
                                localStorage.setItem('atas_token', access_token)
                                const profile = await getMyProfile()
                                if (!profile.is_onboarded) {
                                    toast('Please complete your onboarding!', { icon: '👋' })
                                    // Pass redirect URL through onboarding so draft can be restored after completion
                                    router.push(`/onboarding?redirect=${encodeURIComponent(redirectUrl)}`)
                                } else {
                                    toast.success('Welcome back!')
                                    localStorage.removeItem('pending_redirect')
                                    router.push(redirectUrl)
                                }
                            } catch (err: any) {
                                toast.error(getApiErrorMessage(err, 'Google sign-in failed'))
                            }
                        },
                    })
                } catch { }
                try {
                    const target = document.getElementById('googleSignInBtn')
                    if (target && (window as any).google?.accounts.id.renderButton) {
                        (window as any).google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with' })
                    }
                } catch { }
            }
            document.body.appendChild(script)
        } else {
            setGoogleReady(true)
        }
    }, [])

    // Timer effect
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isLoading) return
        setIsLoading(true)

        try {
            const { access_token } = await login({ email, password })
            localStorage.setItem('atas_token', access_token)

            try {
                // Security Check: Prevent blocking roles (Admins) from logging in here
                const userMe = await getMe()
                const blockedRoles = ['admin', 'customer_support', 'content_moderator']

                if (userMe.roles.some(role => blockedRoles.includes(role))) {
                    await logout()
                    toast.error('Admin accounts must use the Admin Portal.', { duration: 4000 })
                    router.push('/admin/login')
                    return
                }

                const profile = await getMyProfile()

                // Check is_onboarded status
                if (!profile.is_onboarded) {
                    toast('Please complete your onboarding!', { icon: '👋' })
                    // Pass redirect URL through onboarding so draft can be restored after completion
                    router.push(`/onboarding?redirect=${encodeURIComponent(redirectUrl)}`)
                } else {
                    toast.success('Welcome back!')
                    localStorage.removeItem('pending_redirect')
                    router.push(redirectUrl)
                }
            } catch (profileError) {
                const err = profileError as AxiosError
                if (err.response?.status === 404) {
                    toast.success('Please complete your profile.')
                    // Pass redirect URL through onboarding
                    router.push(`/onboarding?redirect=${encodeURIComponent(redirectUrl)}`)
                } else {
                    throw profileError
                }
            }
        } catch (error: any) {
            const message = getApiErrorMessage(error, 'Invalid credentials.')

            // Check if account is suspended - show contact admin message
            if (error.response?.status === 400 && message.toLowerCase().includes('suspended')) {
                toast.error('Your account has been suspended. Please contact admin for assistance.', {
                    duration: 6000,
                    id: 'login-error'
                })
            }
            // Check if account is inactive (but verified) - show contact admin message
            else if (error.response?.status === 400 && message.toLowerCase().includes('inactive')) {
                toast.error('Your account is inactive. Please contact admin for assistance.', {
                    duration: 6000,
                    id: 'login-error'
                })
            }
            // Check if error is related to unverified account - show verification modal
            else if (error.response?.status === 400 && message.toLowerCase().includes('verify your email')) {
                try { localStorage.setItem('pending_login_email', email) } catch { }
                setShowVerificationModal(true)
            } else {
                toast.error(message, { id: 'login-error' })
            }
            // Clear password only for security, keep email so user doesn't need to retype
            setPassword('')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendVerification = async () => {
        if (!email) {
            toast.error('Please enter your email first')
            return
        }
        if (countdown > 0) return

        setIsResending(true)
        try {
            await resendVerification(email)
            toast.success('Verification email sent! Please check your inbox.')
            setCountdown(60) // Start 60s cooldown
            try { localStorage.setItem('pending_login_email', email) } catch { }
            // setShowVerificationModal(false) 
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to resend email'))
        } finally {
            setIsResending(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-amber-50 font-sans relative">

            {/* Verification Modal */}
            {showVerificationModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl transform scale-100 transition-all relative overflow-hidden">
                        {/* Close button absolute top right */}
                        <button
                            onClick={() => setShowVerificationModal(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="text-center mt-2">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-yellow-100 mb-6 rotate-3 shadow-sm">
                                <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-black text-zinc-900 mb-2">Verify your email</h3>
                            <p className="text-zinc-500 font-medium mb-8 leading-relaxed">
                                Your account needs verification. Enter the 6-digit code sent to <span className="text-zinc-900 font-bold">{email}</span>
                            </p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => router.push(`/verify-email?email=${encodeURIComponent(email)}`)}
                                    className="w-full inline-flex justify-center items-center rounded-xl border border-transparent shadow-lg shadow-yellow-400/20 px-6 py-4 bg-yellow-400 text-lg font-bold text-zinc-900 hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-all"
                                >
                                    Enter Code
                                </button>

                                <button
                                    onClick={handleResendVerification}
                                    disabled={isResending || countdown > 0}
                                    className="text-sm font-bold text-zinc-400 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isResending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Side - Playful Yellow */}
            <div className="hidden lg:flex lg:w-1/2 bg-yellow-400 relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
                {/* Abstract Shapes */}
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white rounded-full opacity-20 blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-400 rounded-full opacity-20 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <a href="/">
                            <div className="h-14 w-14 bg-zinc-900 rounded-full flex items-center justify-center text-yellow-400 font-bold text-2xl">
                                {/* ATAS */}
                                <span className="text-3xl font-black text-white tracking-tight">ATAS</span>
                            </div>
                        </a>
                    </div>

                    <h1 className="text-6xl font-black text-zinc-900 leading-[1.1] mb-6">
                        Unlock the <br />
                        Expert <span className="text-white inline-block transform -rotate-2 bg-zinc-900 px-4 py-1 rounded-lg shadow-xl">Knowledge</span>
                    </h1>
                    <p className="text-xl text-zinc-900/80 font-medium max-w-md leading-relaxed">
                        The most fun way to book industry experts for your university events. Simple, fast, and reliable.
                    </p>
                </div>

                <div className="relative z-10">
                    <div className="bg-white/30 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-xl max-w-sm transform rotate-2 hover:rotate-0 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                            </div>
                            <div>
                                <p className="font-bold text-zinc-900 text-sm">Sarah Jenkins</p>
                                <p className="text-xs text-zinc-900/60">Event Organizer</p>
                            </div>
                        </div>
                        <p className="text-zinc-900/80 text-sm font-medium">
                            "ATAS made finding a speaker for our tech week incredibly easy. Highly recommend!"
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white rounded-l-[3rem] shadow-[-20px_0_60px_rgba(0,0,0,0.05)] z-20">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-black text-zinc-900 mb-3">
                            Hey, <br />Login Now!
                        </h2>
                        <p className="text-gray-500 font-medium">
                            I Am A Old User / <Link href={`/register${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-zinc-900 font-bold hover:underline decoration-yellow-400 decoration-4 underline-offset-2">Create New</Link>
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div className="group">
                                <label htmlFor="email" className="block text-sm font-bold text-zinc-900 mb-2 ml-1">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@university.edu.my"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-2xl bg-gray-100 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5 transition-all duration-200 placeholder-gray-400"
                                />
                            </div>

                            <div className="group">
                                <div className="flex items-center justify-between mb-2 ml-1">
                                    <label htmlFor="password" className="block text-sm font-bold text-zinc-900">
                                        Password
                                    </label>
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
                                <div className="flex justify-end mt-2">
                                    <Link href="/forgot-password" className="text-xs font-bold text-gray-400 hover:text-zinc-900 transition-colors">
                                        Forget Password? / Reset
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-full bg-yellow-400 text-zinc-900 font-black text-lg shadow-[0_4px_0_rgb(0,0,0)] hover:shadow-[0_2px_0_rgb(0,0,0)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Logging in...' : 'Login Now'}
                            {isLoading && (
                                <svg className="animate-spin h-5 w-5 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                        </button>

                        <div className="relative">
                            <div className="flex items-center gap-2 my-6">
                                <div className="h-px bg-gray-200 flex-1" />
                                <span className="text-xs font-bold text-gray-400">OR</span>
                                <div className="h-px bg-gray-200 flex-1" />
                            </div>
                            <div id="googleSignInBtn" className="flex justify-center" />
                            {!googleReady && (
                                <button type="button" disabled className="w-full mt-4 py-3 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed">Loading Google...</button>
                            )}
                        </div>


                    </form>
                    <div className="mt-8 text-center text-xs text-gray-400">
                        By logging in, you agree to our{' '}
                        <Link href="/terms" className="underline hover:text-zinc-900 transition-colors">
                            Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="underline hover:text-zinc-900 transition-colors">
                            Privacy Policy
                        </Link>
                        .
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    )
}
