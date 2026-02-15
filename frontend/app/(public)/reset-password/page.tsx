'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/services/api'
import { FormInput } from '@/components/auth/FormInput'
import { FormButton } from '@/components/auth/FormButton'

import { toast } from 'react-hot-toast'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialEmail = searchParams.get('email') || ''

    const [email, setEmail] = useState(initialEmail)
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')

        if (!email || !code || !password || !confirmPassword) {
            setStatus('error')
            toast.error('Please fill in all fields.')
            return
        }

        if (password !== confirmPassword) {
            setStatus('error')
            toast.error('Passwords do not match.', { id: 'password-mismatch' })
            return
        }

        try {
            await resetPassword({ email, code, password })
            setStatus('success')
            toast.success('Password reset successfully!')
        } catch (err: any) {
            console.error(err)
            setStatus('error')
            const errorMsg = err.response?.data?.detail || 'Failed to reset password. Please try again.'
            toast.error(errorMsg, { id: 'reset-password-error' })
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
                <h3 className="text-2xl font-black text-zinc-900 mb-2">Password Reset!</h3>
                <p className="text-zinc-500 font-medium mb-8">
                    Your password has been successfully updated.
                </p>
                <Link
                    href="/login"
                    className="w-full flex justify-center py-4 px-6 border border-transparent rounded-full shadow-lg text-base font-bold text-zinc-900 bg-yellow-400 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                >
                    Login with New Password
                </Link>
            </div>
        )
    }

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
                <FormInput
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="atas@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <div>
                    <label htmlFor="code" className="block text-sm font-bold text-zinc-900 mb-2">
                        Verification Code
                    </label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all font-medium tracking-widest text-center text-2xl"
                        placeholder="000000"
                    />
                </div>
                <FormInput
                    id="password"
                    label="New Password"
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
            </div>

            <FormButton disabled={status === 'loading'}>
                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
            </FormButton>
        </form>
    )
}

export default function ResetPasswordPage() {
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
                        Secure <br />
                        Your <span className="text-white inline-block transform rotate-2 bg-zinc-900 px-4 py-1 rounded-lg shadow-xl">Account</span>
                    </h1>
                    <p className="text-xl text-zinc-900/80 font-medium max-w-md leading-relaxed">
                        Create a strong password to protect your account and keep your data safe.
                    </p>
                </div>

                <div className="relative z-10">
                    <div className="bg-white/30 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-xl max-w-sm transform -rotate-1 hover:rotate-0 transition-all duration-300">
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
                            "We recommend using a mix of letters, numbers, and symbols for maximum security."
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Reset Password Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white rounded-l-[3rem] shadow-[-20px_0_60px_rgba(0,0,0,0.05)] z-20">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-black text-zinc-900 mb-3">
                            Reset <br />Password
                        </h2>
                        <p className="text-gray-500 font-medium">
                            Enter your new password below.
                        </p>
                    </div>

                    <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
