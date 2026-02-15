'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, MagnifyingGlassIcon, PlusIcon, PersonIcon, BellIcon } from '@radix-ui/react-icons'

export function BottomNav() {
    const pathname = usePathname()

    const isActive = (path: string) => pathname === path

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 md:hidden pb-safe">
            <div className="flex justify-between items-end h-16 px-6 pb-2">
                <Link
                    href="/dashboard"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/dashboard') ? 'text-yellow-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    <HomeIcon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link
                    href="/discover"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/discover') ? 'text-yellow-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Discover</span>
                </Link>

                <div className="relative -top-5">
                    <Link
                        href="/events/create"
                        className="flex items-center justify-center w-14 h-14 bg-yellow-400 rounded-full shadow-xl hover:bg-yellow-500 hover:scale-105 transition-all text-zinc-900 ring-4 ring-amber-50"
                    >
                        <PlusIcon className="w-8 h-8" />
                    </Link>
                </div>

                <Link
                    href="/notifications"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/notifications') ? 'text-yellow-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    <BellIcon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Alerts</span>
                </Link>

                <Link
                    href="/profile"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/profile') ? 'text-yellow-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                    <PersonIcon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </div>
        </div>
    )
}
