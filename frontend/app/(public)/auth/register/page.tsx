'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { register, loginWithGoogle, getMyProfile } from '@/services/api'
import { FormInput } from '@/components/auth/FormInput'
import { FormButton } from '@/components/auth/FormButton'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/utils'

function RegisterPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleReady, setGoogleReady] = useState(false)

    // Extract redirect URL from query params (e.g., /book/expertId for draft restoration)
    const redirectUrl = searchParams?.get('redirect') || '/dashboard'


    useEffect(() => {
        const emailParam = searchParams?.get('email')
        if (emailParam) {
            setEmail(emailParam)
        }
    }, [searchParams])

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

                            // Validate email if provided in params
                            const emailParam = searchParams?.get('email')
                            if (emailParam) {
                                try {
                                    // Simple decode to check email
                                    const base64Url = idToken.split('.')[1]
                                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
                                    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                                    }).join(''))
                                    const payload = JSON.parse(jsonPayload)

                                    if (payload.email && payload.email.toLowerCase() !== emailParam.toLowerCase()) {
                                        toast.error(`Please sign in with ${emailParam} to link your attendance.`)
                                        return
                                    }
                                } catch (e) {
                                    // Ignore decode errors, let backend handle it
                                }
                            }

                            try {
                                const { access_token } = await loginWithGoogle(idToken)
                                localStorage.setItem('atas_token', access_token)
                                const profile = await getMyProfile()
                                if (!profile.is_onboarded) {
                                    toast('Please complete your onboarding!', { icon: '👋' })
                                    router.push(`/onboarding?redirect=${encodeURIComponent(redirectUrl)}`)
                                } else {
                                    toast.success('Welcome back!')
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
                        (window as any).google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', shape: 'pill', text: 'signup_with' })
                    }
                } catch { }
            }
            document.body.appendChild(script)
        } else {
            setGoogleReady(true)
            // Re-render button if script already loaded
            try {
                setTimeout(() => {
                    const target = document.getElementById('googleSignInBtn')
                    if (target && (window as any).google?.accounts.id.renderButton) {
                        (window as any).google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', shape: 'pill', text: 'signup_with' })
                    }
                }, 100)
            } catch { }
        }
    }, [router, searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            await register({ email, password })
            setSuccess(true)
        } catch (err: any) {
            console.error(err)
            if (err.response?.data?.detail) {
                setError(err.response.data.detail)
            } else {
                setError('Registration failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow-xl shadow-indigo-100 sm:rounded-xl sm:px-10 border border-gray-100 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="mt-3 text-lg font-medium text-gray-900">Registration Successful!</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Please check your email to verify your account before logging in.
                        </p>
                        <div className="mt-6">
                            <Link
                                href={redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Join the Community
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                        href={redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                        className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-indigo-100 sm:rounded-xl sm:px-10 border border-gray-100">
                    <div className="mb-6">
                        <div id="googleSignInBtn" className="flex justify-center"></div>
                    </div>
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-gray-500">Or register with email</span>
                        </div>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <FormInput
                            id="email"
                            label="Email address"
                            type="email"
                            placeholder="you@student.uni.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <FormInput
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <FormInput
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            Error
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <FormButton>
                                {loading ? 'Creating account...' : 'Create account'}
                            </FormButton>
                        </div>

                        <div className="mt-4 text-center text-xs text-gray-500">
                            By clicking "Create account", you agree to our{' '}
                            <Link href="/terms" className="underline hover:text-indigo-600">
                                Terms & Conditions
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="underline hover:text-indigo-600">
                                Privacy Policy
                            </Link>
                            .
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <RegisterPageContent />
        </Suspense>
    )
}
