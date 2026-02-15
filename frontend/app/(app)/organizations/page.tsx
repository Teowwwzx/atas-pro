'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublicOrganizations } from '@/services/api'
import { OrganizationResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function OrganizationsPage() {
  const [items, setItems] = useState<OrganizationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getPublicOrganizations()
        setItems(data)
      } catch (error: unknown) {
        const e = error as { response?: { data?: { detail?: string } } }
        toast.error(e.response?.data?.detail || 'Failed to load organizations')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const filtered = items.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-zinc-900">Organizations</h1>
          <Link href="/organizations/create" className="px-5 py-2 bg-zinc-900 text-white rounded-full font-bold text-sm hover:bg-zinc-800">
            Create Organization
          </Link>
        </div>

        <div className="mb-6">
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-4 bg-white border-transparent rounded-2xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white shadow-sm transition-all duration-200 font-medium"
              placeholder="Search organizations by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((org) => (
              <Link key={org.id} href={`/organizations/${org.id}`} className="block group">
                <div className="bg-white overflow-hidden shadow-sm rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-zinc-100 group-hover:-translate-y-1">
                  <div className="h-3 bg-yellow-400"></div>
                  <div className="px-6 py-6">
                    <div className="flex items-center gap-3 mb-4">
                      {org.logo_url && (<img src={org.logo_url} alt="logo" className="h-10 w-10 rounded-lg" />)}
                      <div>
                        <h3 className="text-lg font-black text-zinc-900 truncate group-hover:text-yellow-600 transition-colors">{org.name}</h3>
                        {org.type && (<span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{org.type}</span>)}
                      </div>
                    </div>
                    {org.description && (
                      <p className="text-sm text-zinc-700 line-clamp-3">{org.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
