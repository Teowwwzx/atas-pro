'use client'

import React, { useState, useEffect } from 'react'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { logout, getMe } from '@/services/api'
import { useUser } from '@/hooks/useUser'
import { ProfileResponse } from '@/services/api.types'
import { SearchModal } from './SearchModal'
import { NotificationBell } from './NotificationBell'
import { Button } from './Button'
import { Avatar } from './Avatar'

export function AppNavbar() {
    const router = useRouter()
    const pathname = usePathname()

    const { user: profile, error } = useUser()
    const [isDashboardPro, setIsDashboardPro] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)

    // Fetch extra user data if profile is loaded
    useEffect(() => {
        if (profile) {
            getMe()
                .then(data => setIsDashboardPro(data.is_dashboard_pro || false))
                .catch(() => { })
        }
    }, [profile])

    // Handle invalid token that passed initial check but failed on server
    useEffect(() => {
        if (error?.response?.status === 401) {
            logout()
        }
    }, [error])

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    const isActive = (path: string) => pathname === path

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-yellow-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href={profile ? "/dashboard" : "/"} className="flex items-center gap-2 group">
                                <div className="bg-yellow-400 text-zinc-900 h-10 w-10 flex items-center justify-center rounded-xl font-black text-xl transform group-hover:rotate-12 transition-transform duration-300 shadow-sm">
                                    ATAS
                                </div>
                                {/* <span className="font-black text-2xl tracking-tight text-zinc-900"></span> */}
                            </Link>
                        </div>
                        <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                            {profile && (
                                <Link
                                    href="/dashboard"
                                    className={`inline-flex items-center gap-1.5 px-1 pt-1 border-b-4 text-sm font-bold transition-all duration-200 ${isActive('/dashboard')
                                        ? 'border-yellow-400 text-zinc-900'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-yellow-200'
                                        }`}
                                >
                                    Dashboard
                                    {isDashboardPro && (
                                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    )}
                                </Link>
                            )}
                            <Link
                                href="/discover"
                                className={`inline-flex items-center px-1 pt-1 border-b-4 text-sm font-bold transition-all duration-200 ${isActive('/discover')
                                    ? 'border-yellow-400 text-zinc-900'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-yellow-200'
                                    }`}
                            >
                                Discover
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="ml-3 relative flex items-center gap-4">
                            { /* Removed redundant search icon */}


                            {profile && (
                                <div className="hidden md:block">
                                    <NotificationBell />
                                </div>
                            )}

                            {profile && (
                                <Link href="/events/create" className="hidden sm:block">
                                    <Button
                                        variant="primary"
                                        className="rounded-full"
                                    >
                                        Create Event
                                    </Button>
                                </Link>
                            )}

                            {profile ? (
                                <div className="relative hidden sm:block">
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 items-center gap-3 pl-2 pr-1 py-1 border border-gray-100 hover:shadow-md transition-all"
                                    >
                                        <span className="sr-only">Open user menu</span>
                                        <span className="text-zinc-700 font-bold hidden md:block pl-2">
                                            {profile?.full_name || 'User'}
                                        </span>
                                        <Avatar
                                            src={profile?.avatar_url}
                                            alt={profile?.full_name || 'User'}
                                            fallback={profile?.full_name?.charAt(0)}
                                            size="md"
                                        />
                                    </button>

                                    {isMenuOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl py-2 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none animate-fadeIn border border-gray-100">
                                            <div className="px-4 py-3 border-b border-gray-100 mb-1">
                                                <p className="text-sm text-zinc-500">Signed in as</p>
                                                <p className="text-sm font-bold text-zinc-900 truncate">{profile?.full_name}</p>
                                            </div>
                                            <Link
                                                href="/profile"
                                                className="block px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-yellow-50 hover:text-zinc-900 mx-2 rounded-xl transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                Your Profile
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="block px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-yellow-50 hover:text-zinc-900 mx-2 rounded-xl transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 mx-2 rounded-xl transition-colors mt-1"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-6 ml-2">
                                    <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-zinc-600">
                                        <Link href="/discover" className="hover:text-yellow-600 transition-colors">Discover</Link>
                                        <Link href="/organizations" className="hover:text-yellow-600 transition-colors">Organizations</Link>
                                        <Link href="/experts" className="hover:text-yellow-600 transition-colors">People</Link>
                                    </div>
                                    <div className="h-5 w-px bg-zinc-200 hidden lg:block"></div>
                                    <Link href="/login" className="text-sm font-bold text-zinc-900 px-5 py-2.5 bg-yellow-400 rounded-full hover:bg-yellow-300 hover:scale-105 transition-all duration-200 shadow-sm">
                                        Login
                                    </Link>
                                </div>
                            )}

                            {/* Profile Avatar for Mobile (Top Right) - Replaces Hamburger */}
                            {profile && (
                                <Link href="/profile" className="sm:hidden block">
                                    <Avatar
                                        src={profile?.avatar_url}
                                        alt={profile?.full_name || 'User'}
                                        fallback={profile?.full_name?.charAt(0)}
                                        size="md"
                                    />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
        </nav>
    )
}
