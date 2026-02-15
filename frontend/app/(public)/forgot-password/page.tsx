'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { forgotPassword } from '@/services/api'
import { FormInput } from '@/components/auth/FormInput'
import { FormButton } from '@/components/auth/FormButton'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')

        try {
            await forgotPassword(email)
            setStatus('success')
            toast.success('Reset link sent! Check your email.')
        } catch (err: any) {
            console.error(err)
            setStatus('error')
            const errorMsg = err.response?.data?.detail || 'Failed to send reset link. Please try again.'
            toast.error(errorMsg, { id: 'forgot-password-error' })
        }
    }

    return (
        <div className="min-h-screen flex bg-amber-50 font-sans">
            {/* Left Side - Playful Yellow */}
            <div className="hidden lg:flex lg:w-1/2 bg-yellow-400 relative flex-col justify-between p-12 lg:p-16 overflow-hidden">
                {/* Abstract Shapes */}
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white rounded-full opacity-20 blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-orange-400 rounded-full opacity-20 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="h-12 w-12 bg-zinc-900 rounded-full flex items-center justify-center text-yellow-400 font-bold text-2xl">
                            A
                        </div>
                        <span className="text-3xl font-black text-zinc-900 tracking-tight">ATAS</span>
                    </div>

                    <h1 className="text-6xl font-black text-zinc-900 leading-[1.1] mb-6">
                        Recover <br />
                        Your <span className="text-white inline-block transform -rotate-2 bg-zinc-900 px-4 py-1 rounded-lg shadow-xl">Access</span>
                    </h1>
                    <p className="text-xl text-zinc-900/80 font-medium max-w-md leading-relaxed">
                        Don't worry, it happens to the best of us. We'll help you get back to booking amazing events in no time.
                    </p>
                </div>

                <div className="relative z-10">
                    <div className="bg-white/30 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-xl max-w-sm transform rotate-2 hover:rotate-0 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                            </div>
                            <div>
                                <p className="font-bold text-zinc-900 text-sm">System Support</p>
                                <p className="text-xs text-zinc-900/60">ATAS Team</p>
                            </div>
                        </div>
                        <p className="text-zinc-900/80 text-sm font-medium">
                            "Security is our top priority. Resetting your password is quick, easy, and secure."
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Forgot Password Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white rounded-l-[3rem] shadow-[-20px_0_60px_rgba(0,0,0,0.05)] z-20">
                <div className="w-full max-w-md space-y-10">
                    {status === 'success' ? (
                        <div className="text-center lg:text-left animate-fade-in">
                            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
                                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-2">Check your email</h3>
                            <p className="text-zinc-500 font-medium mb-8">
                                We've sent a 6-digit code to{' '}
                                {(() => {
                                    const domain = email.split('@')[1]?.toLowerCase()
                                    let inboxUrl = null

                                    if (domain === 'gmail.com') inboxUrl = 'https://mail.google.com'
                                    else if (['outlook.com', 'hotmail.com', 'live.com'].includes(domain)) inboxUrl = 'https://outlook.live.com'
                                    else if (domain === 'yahoo.com') inboxUrl = 'https://mail.yahoo.com'

                                    return inboxUrl ? (
                                        <a
                                            href={inboxUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-bold text-zinc-900 hover:text-yellow-600 transition-colors underline decoration-2 decoration-yellow-400 underline-offset-2"
                                        >
                                            {email}
                                        </a>
                                    ) : <span className="font-bold text-zinc-900">{email}</span>
                                })()}
                            </p>
                            <Link
                                href={`/reset-password?email=${encodeURIComponent(email)}`}
                                className="w-full flex justify-center py-4 px-6 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                            >
                                Enter Code & Reset Password
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center lg:text-left">
                                <h2 className="text-4xl font-black text-zinc-900 mb-3">
                                    Forgot <br />Password?
                                </h2>
                                <p className="text-gray-500 font-medium">
                                    Remember your password? <Link href="/login" className="text-zinc-900 font-bold hover:underline decoration-yellow-400 decoration-4 underline-offset-2">Login Now</Link>
                                </p>
                            </div>

                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="space-y-5">
                                    <FormInput
                                        id="email"
                                        label="Email address"
                                        type="email"
                                        placeholder="atas@gmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <FormButton disabled={status === 'loading'}>
                                    {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                                </FormButton>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
