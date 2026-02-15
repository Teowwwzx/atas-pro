'use client'

import useSWR from 'swr'
import api from '@/services/api'
import { ProfileResponse } from '@/services/api.types'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { isTokenExpired } from '@/lib/auth'

// This is the fetcher function that `useSWR` will call.
const fetcher = (url: string) => api.get<ProfileResponse>(url).then((res) => res.data)

interface UseUserParams {
    redirectTo?: string
    redirectIfFound?: boolean
}

export function useUser({ redirectTo, redirectIfFound }: UseUserParams = {}) {
    const router = useRouter()

    // Determine if we should fetch (client-side only + valid token)
    const shouldFetch = typeof window !== 'undefined'
        ? (() => {
            const token = localStorage.getItem('atas_token')
            return token && !isTokenExpired(token)
        })()
        : false

    // The key for SWR is `/profiles/me`. If null, SWR will not fetch.
    const { data, error, isLoading, mutate } = useSWR<ProfileResponse>(
        shouldFetch ? '/profiles/me' : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 600000, // 10 minutes
            shouldRetryOnError: false
        }
    )

    // Check if user has a profile by verifying data exists
    const hasProfile = data !== null && data !== undefined

    useEffect(() => {
        if (!redirectTo || isLoading) return

        if (
            // If redirectTo is set, redirect if the user was not found.
            (redirectTo && !redirectIfFound && !hasProfile) ||
            // If redirectIfFound is also set, redirect if the user was found
            (redirectIfFound && hasProfile)
        ) {
            router.push(redirectTo)
        }
    }, [data, redirectIfFound, redirectTo, isLoading, router, hasProfile])

    return {
        user: data,
        error,
        isLoading,
        mutate, // We can use this to manually trigger a re-fetch
    }
}
