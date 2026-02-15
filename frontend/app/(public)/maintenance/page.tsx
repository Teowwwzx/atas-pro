'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { pingApi } from '@/services/api'

export default function MaintenancePage() {
  const [status, setStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')

  useEffect(() => {
    let mounted = true
    pingApi()
      .then(() => { if (mounted) setStatus('online') })
      .catch(() => { if (mounted) setStatus('offline') })
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-3xl font-black text-gray-900">Maintenance</h1>
        <p className="mt-3 text-gray-600">We are performing scheduled maintenance. Please check back soon.</p>
        <div className="mt-6">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status === 'online' ? 'bg-green-100 text-green-700' : status === 'offline' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>Backend: {status}</span>
        </div>
        <div className="mt-8 space-y-3">
          <Link href="/" className="block w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Back to Home</Link>
          <button onClick={() => window.location.reload()} className="block w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Retry</button>
        </div>
      </div>
    </div>
  )
}
