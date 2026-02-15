// frontend/app/(public)/verify/[token]/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AxiosError } from 'axios'

import { verifyEmail } from '@/services/api'
import { ApiErrorResponse } from '@/services/api.types'
import { LoadingBackdrop } from '@/components/ui/LoadingBackdrop'

function VerifyEmailContent() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const { token } = params
    const email = searchParams.get('email')
    const [message, setMessage] = useState('Verifying your email...')

    useEffect(() => {
        if (token && email) {
            const doVerification = async () => {
                try {
                    await verifyEmail(email, token as string)
                    toast.success('Email verified! You may now log in.')
                    setMessage('Verification successful! Redirecting to login...')
                    try { localStorage.setItem('email_verified', '1') } catch {}
                } catch (error) {
                    const err = error as AxiosError<ApiErrorResponse>
                    const detail =
                        err.response?.data?.detail || 'Invalid or expired token.'
                    toast.error(detail)
                    setMessage(`${detail}. Redirecting to login...`)
                } finally {
                    // Redirect to login after a short delay
                    setTimeout(() => {
                        router.push('/login')
                    }, 3000)
                }
            }
            doVerification()
        } else if (!email) {
            setMessage('Invalid verification link (missing email).')
            toast.error('Invalid verification link.')
        }
    }, [token, email, router])

    return (
        <>
            <LoadingBackdrop isLoading={true} />
            <div className="w-full max-w-md text-center">
                <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
            </div>
        </>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<LoadingBackdrop isLoading={true} />}>
            <VerifyEmailContent />
        </Suspense>
    )
}
