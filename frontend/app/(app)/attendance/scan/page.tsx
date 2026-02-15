'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { scanAttendance, getEventParticipants, getEventById } from '@/services/api'
import { EventParticipantDetails } from '@/services/api.types'
import { toast } from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Dynamically import QR scanner to avoid SSR issues
const Html5QrcodePlugin = dynamic(() => import('@/components/attendance/QRScanner'), { ssr: false })

function AttendanceScanInner() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId') || ''

  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [participants, setParticipants] = useState<EventParticipantDetails[]>([])
  const [showHint, setShowHint] = useState(true)
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(true)
  const [eventTitle, setEventTitle] = useState<string>('')

  // Guard to prevent spam processing of the same scan event
  const processingRef = useRef(false)

  const fetchParticipants = async () => {
    if (!eventId) return
    try {
      const data = await getEventParticipants(eventId)
      setParticipants(data)
    } catch (error) {
      console.error('Failed to fetch participants', error)
    }
  }

  useEffect(() => {
    fetchParticipants()
  }, [eventId])

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) {
        setIsAttendanceOpen(false)
        return
      }
      try {
        const evt = await getEventById(eventId)
        setEventTitle(evt.title || '')
        const open = evt.registration_status === 'opened' && !!evt.is_attendance_enabled
        setIsAttendanceOpen(open)
      } catch {
        setIsAttendanceOpen(false)
      }
    }
    loadEvent()
  }, [eventId])

  const handleScan = async (scannedToken: string) => {
    const cleanToken = scannedToken?.trim()

    // Prevent invalid or duplicate scans or concurrent processing
    if (!cleanToken) return
    if (processingRef.current) return
    if (cleanToken === lastScanned) return
    if (!isAttendanceOpen) {
      toast.error('Attendance scanning is disabled')
      return
    }

    processingRef.current = true
    setLoading(true)
    setLastScanned(cleanToken)

    try {
      await scanAttendance(eventId, cleanToken)
      toast.success('✅ Attendance recorded!', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold',
        }
      })
      fetchParticipants() // Refresh list
      // Reset after 3 seconds to allow next scan
      setTimeout(() => {
        setLastScanned(null)
      }, 3000)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to record attendance')
      // Allow retry sooner on error? Or keep standard cooldown
      setLastScanned(null) // Reset immediately on error to allow retry
    } finally {
      setLoading(false)
      // Small cooldown before releasing processing guard to prevent double-fire
      setTimeout(() => {
        processingRef.current = false
      }, 1000)
    }
  }

  const handleManualScan = async () => {
    await handleScan(token)
    setToken('') // Clear input after scan
  }

  const attendedParticipants = participants.filter(p => p.status === 'attended')
  // Sort by most recently updated/attended if possible, or just reverse to show newest first?
  // Since we don't have explicit 'attended_at' in the type (only updated_at), we can try to sort by updated_at
  const sortedAttended = [...attendedParticipants].sort((a, b) => {
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  })

  return (
    <div className="min-h-screen py-8 px-4">
      {/* <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4"> */}
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 mb-2">Scan Attendance</h1>
          <p className="text-zinc-600 font-medium">Scan participant QR codes to record attendance</p>
          {!isAttendanceOpen && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 border-2 border-yellow-200">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 9v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold text-yellow-700">Attendance scanning is disabled</span>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${mode === 'camera'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-zinc-700 border-2 border-zinc-200 hover:border-blue-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Camera Scan
            </div>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${mode === 'manual'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-zinc-700 border-2 border-zinc-200 hover:border-blue-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Entry
            </div>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100">
          {mode === 'camera' ? (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Position QR Code in Frame</h3>
                <p className="text-sm text-zinc-500">The camera will automatically scan when detected</p>
              </div>

              <div className="relative">
                {isAttendanceOpen ? (
                  <Html5QrcodePlugin
                    fps={10}
                    qrbox={250}
                    disableFlip={false}
                    qrCodeSuccessCallback={handleScan}
                  />
                ) : (
                  <div className="w-full h-64 rounded-2xl border-2 border-zinc-200 bg-zinc-50 flex items-center justify-center">
                    <span className="text-zinc-500 font-bold">Scanning disabled</span>
                  </div>
                )}
              </div>

              {loading && (
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-bold text-blue-900">Recording attendance...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wider">
                  QR Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter or paste QR token"
                  className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-zinc-900 font-medium"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2 uppercase tracking-wider">
                  Registration Email <span className="text-zinc-400 normal-case">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="participant@example.com"
                  className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-zinc-900 font-medium"
                />
              </div>

              <button
                onClick={handleManualScan}
                disabled={loading || !token.trim() || !isAttendanceOpen}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {isAttendanceOpen ? 'Record Attendance' : 'Scanning Disabled'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        {showHint && (
          <div className="mt-6 bg-zinc-50 rounded-2xl p-6 border border-zinc-200 relative group">
            <button
              onClick={() => setShowHint(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-200 rounded-full transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to Use
            </h4>
            <ul className="space-y-2 text-sm text-zinc-700">
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Ask participants to show their attendance QR code</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>Use Camera Scan mode for quick scanning, or Manual Entry for pasted tokens</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Successful scans will show a green confirmation message</span>
              </li>
            </ul>
          </div>
        )}

        {/* Attended List */}
        <div className="mt-8">
          <h3 className="text-xl font-black text-zinc-900 mb-4 flex items-center justify-between">
            <span>Recent Attendees</span>
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{sortedAttended.length}</span>
          </h3>

          {sortedAttended.length === 0 ? (
            <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-zinc-400 font-medium">No attendees yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAttended.map((p) => {
                // Check if profile is public or private
                const isPublic = p.user_visibility === 'public'
                const displayName = isPublic ? (p.user_full_name || p.name || 'Unknown User') : 'Private User'
                const displayEmail = isPublic ? p.email : '•••@•••.•••'
                const displayAvatar = isPublic ? (p.user_avatar || null) : null
                const initial = isPublic ? (displayName.charAt(0) || '?') : '🔒'

                return (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4 animate-fadeIn">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isPublic ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'
                      }`}>
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900 truncate">{displayName}</h4>
                        {!isPublic && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 truncate">{displayEmail}</p>
                    </div>
                    <div className="text-xs font-medium text-zinc-400">
                      {new Date(p.updated_at || p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AttendanceScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>}>
      <AttendanceScanInner />
    </Suspense>
  )
}
