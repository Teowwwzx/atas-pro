'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useUser()
    const router = useRouter()
    const pathname = usePathname()
    const [isChecking, setIsChecking] = useState(true)

    // Pages that don't require onboarding to be completed
    const IGNORED_PATHS = [
        '/events', 
        '/discover'
    ]

    useEffect(() => {
        if (isLoading) return

        if (user) {
            // Check if current path starts with any ignored path
            const isIgnored = IGNORED_PATHS.some(path => pathname.startsWith(path))

            if (!user.is_onboarded && pathname !== '/onboarding' && !isIgnored) {
                router.push('/onboarding')
            } else if (user.is_onboarded && pathname === '/onboarding') {
                // Optional: Redirect away from onboarding if already completed
                router.push('/dashboard')
            } else {
                setIsChecking(false)
            }
        } else {
            // If no user is found, useUser hook might handle redirect to login
            // or we just let it render (and maybe the page handles it)
            setIsChecking(false)
        }
    }, [user, isLoading, pathname, router])

    // Show loading state while determining access
    if (isLoading || isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
            </div>
        )
    }

    return <>{children}</>
}
