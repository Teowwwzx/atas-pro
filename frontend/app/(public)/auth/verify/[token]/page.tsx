'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { verifyEmail } from '@/services/api'

function VerifyEmailContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const token = params.token as string
    const email = searchParams.get('email')

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(token && email ? 'verifying' : 'error')
    const [message, setMessage] = useState(token && email ? '' : 'Invalid verification link.')

    useEffect(() => {
        if (!token || !email) return

        const verify = async () => {
            try {
                const data = await verifyEmail(email, token)
                setStatus('success')

                // Auto-login if token is returned
                if (data.access_token) {
                    localStorage.setItem('atas_token', data.access_token)
                    localStorage.removeItem('pending_login_email')

                    // Delay redirect to show success message
                    setTimeout(() => {
                        window.location.href = '/dashboard'
                    }, 2000)
                }
            } catch (err: any) {
                console.error(err)
                setStatus('error')
                if (err.response?.data?.detail) {
                    setMessage(err.response.data.detail)
                } else {
                    setMessage('Verification failed. The link may be invalid or expired.')
                }
            }
        }

        verify()
    }, [token])

    return (
        <div className="flex min-h-screen flex-col justify-center bg-amber-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-6 shadow-sm sm:rounded-[2.5rem] sm:px-12 border border-yellow-100 text-center">
                    {status === 'verifying' && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 animate-pulse mb-6">
                                <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-2">Verifying your email...</h3>
                            <p className="text-zinc-500 font-medium">
                                Please wait while we verify your account.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
                                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-2">Email Verified!</h3>
                            <p className="text-zinc-500 font-medium mb-8">
                                Your account has been successfully verified. Redirecting you to dashboard...
                            </p>
                            <div>
                                <Link
                                    href="/login"
                                    className="w-full flex justify-center py-4 px-6 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                                >
                                    Continue to Login
                                </Link>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
                                <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-2">Verification Failed</h3>
                            <p className="text-red-600 font-bold mb-8 bg-red-50 py-3 px-4 rounded-xl border border-red-100">
                                {message}
                            </p>
                            <div>
                                <Link
                                    href="/login"
                                    className="font-bold text-zinc-900 hover:text-yellow-600 transition-colors underline decoration-2 decoration-yellow-400 underline-offset-4"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col justify-center bg-amber-50 py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-10 px-6 shadow-sm sm:rounded-[2.5rem] sm:px-12 border border-yellow-100 text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 animate-pulse mb-6">
                            <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-zinc-900 mb-2">Loading...</h3>
                    </div>
                </div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}
