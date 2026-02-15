"use client"

import * as React from "react"
import Link from "next/link"
import { useUser } from "@/hooks/useUser"
import { Avatar } from "@/components/ui/Avatar"

export default function Navbar() {
  const { user, isLoading } = useUser()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-yellow-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="inline-flex items-center gap-2 group">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-zinc-900 font-black text-lg transform group-hover:rotate-12 transition-transform duration-300 shadow-sm">A</span>
          <span className="text-xl font-black text-zinc-900 tracking-tight">ATAS</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-bold">
          {isLoading ? (
             // Loading state (optional, or just show nothing/skeleton)
             <div className="h-8 w-20 bg-zinc-100 animate-pulse rounded-full"></div>
          ) : user ? (
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 bg-yellow-50 text-zinc-900 rounded-full hover:bg-yellow-100 transition-all border border-yellow-200">
               <span className="hidden sm:inline">Dashboard</span>
               <Avatar 
                  src={user.avatar_url} 
                  alt={user.full_name || 'User'} 
                  fallback={user.full_name?.charAt(0) || 'U'}
                  size="sm"
               />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-zinc-600 hover:text-zinc-900 transition-colors">Login</Link>
              <Link href="/register" className="px-5 py-2.5 bg-zinc-900 text-yellow-400 rounded-full hover:bg-zinc-800 hover:scale-105 transition-all duration-200 shadow-md">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
