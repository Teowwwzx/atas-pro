
"use client"

import React, { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { adminService } from '@/services/admin.service'
import { Toaster, toast } from 'react-hot-toast'
import { format } from 'date-fns'

export default function CommunicationLogsPage() {
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [resendingId, setResendingId] = useState<string | null>(null)

    const { data: logs, error, isLoading } = useSWR(
        ['/admin/communications', page, statusFilter],
        () => adminService.getCommunicationLogs({ page, status: statusFilter || undefined })
    )

    const handleResend = async (id: string) => {
        setResendingId(id)
        try {
            await adminService.resendCommunication(id)
            toast.success('Email resent successfully!')
            mutate(['/admin/communications', page, statusFilter]) // Refresh list
        } catch (err) {
            console.error(err)
            toast.error('Failed to resend email')
        } finally {
            setResendingId(null)
        }
    }

    if (error) return <div className="p-8 text-red-500">Failed to load logs</div>

    return (
        <div className="space-y-6">
            <Toaster />

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Communication Logs</h1>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-gray-900 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Status</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                    </select>
                    <button
                        onClick={() => mutate(['/admin/communications', page, statusFilter])}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Recipient</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Error / Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs && logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {log.recipient}
                                            <div className="text-xs text-slate-400 font-normal uppercase mt-0.5">{log.type}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.subject || ''}>
                                            {log.subject || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                                                ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                                                    log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'}`}>
                                                {log.status === 'sent' && <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                                {log.status === 'failed' && <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {log.created_at ? format(new Date(log.created_at), 'MMM d, h:mm a') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {log.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleResend(log.id)}
                                                        disabled={resendingId === log.id}
                                                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                                                    >
                                                        {resendingId === log.id ? 'Sending...' : 'Retry Send'}
                                                    </button>
                                                )}
                                                {log.error_message && (
                                                    <span className="text-xs text-red-500 max-w-[200px] truncate" title={log.error_message}>
                                                        {log.error_message}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
