'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'

const PAGE_SIZE = 10

// ... imports
import { EditReviewModal } from '@/components/admin/modals/EditReviewModal'
import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons'

// ... existing code

export default function ReviewsPage() {
    const [page, setPage] = useState(1)
    const [reviewerEmail, setReviewerEmail] = useState('')
    const [revieweeEmail, setRevieweeEmail] = useState('')
    const [eventId, setEventId] = useState('')
    const [minRating, setMinRating] = useState<number | ''>('')
    const [maxRating, setMaxRating] = useState<number | ''>('')
    const [startAfter, setStartAfter] = useState('')
    const [endBefore, setEndBefore] = useState('')
    const [debounced, setDebounced] = useState<{ reviewerEmail: string; revieweeEmail: string; eventId: string; minRating: number | ''; maxRating: number | ''; startAfter: string; endBefore: string }>({ reviewerEmail: '', revieweeEmail: '', eventId: '', minRating: '', maxRating: '', startAfter: '', endBefore: '' })
    const [deleteReason, setDeleteReason] = useState('')
    const [editingReview, setEditingReview] = useState<import('@/services/api.types').ReviewResponse | null>(null)

    // ... existing useEffect and useMemo and useSWR

    useEffect(() => {
        const t = setTimeout(() => setDebounced({ reviewerEmail, revieweeEmail, eventId, minRating, maxRating, startAfter, endBefore }), 300)
        return () => clearTimeout(t)
    }, [reviewerEmail, revieweeEmail, eventId, minRating, maxRating, startAfter, endBefore])

    const params = useMemo(() => ({
        page,
        page_size: PAGE_SIZE,
        reviewer_email: debounced.reviewerEmail || undefined,
        reviewee_email: debounced.revieweeEmail || undefined,
        event_id: debounced.eventId || undefined,
        min_rating: typeof debounced.minRating === 'number' ? debounced.minRating : undefined,
        max_rating: typeof debounced.maxRating === 'number' ? debounced.maxRating : undefined,
        start_after: debounced.startAfter || undefined,
        end_before: debounced.endBefore || undefined,
    }), [page, debounced])

    const { data: items, mutate } = useSWR(['/reviews', params], () => adminService.getReviews(params))
    const { data: totalCount } = useSWR(
        ['/reviews/count', {
            reviewer_email: params.reviewer_email,
            reviewee_email: params.reviewee_email,
            event_id: params.event_id,
            min_rating: params.min_rating,
            max_rating: params.max_rating,
            start_after: params.start_after,
            end_before: params.end_before,
        }],
        () => adminService.getReviewsCount({
            reviewer_email: params.reviewer_email,
            reviewee_email: params.reviewee_email,
            event_id: params.event_id,
            min_rating: params.min_rating,
            max_rating: params.max_rating,
            start_after: params.start_after,
            end_before: params.end_before,
        })
    )

    const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0

    const handleDelete = async (id: string) => {
        try {
            if (!deleteReason.trim()) {
                toast.error('Please provide a reason for deletion')
                return
            }
            await adminService.deleteReview(id, deleteReason.trim())
            toast.success('Review removed')
            mutate()
        } catch {
            toast.error('Failed to remove review')
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Reviews Moderation</h1>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <input value={reviewerEmail} onChange={(e) => setReviewerEmail(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" placeholder="Reviewer email" />
                <input value={revieweeEmail} onChange={(e) => setRevieweeEmail(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" placeholder="Reviewee email" />
                <input value={eventId} onChange={(e) => setEventId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Event ID (uuid)" />
                <input value={minRating} onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : '')} type="number" min={1} max={5} className="border rounded-lg px-3 py-2 text-sm" placeholder="Min rating" />
                <input value={maxRating} onChange={(e) => setMaxRating(e.target.value ? Number(e.target.value) : '')} type="number" min={1} max={5} className="border rounded-lg px-3 py-2 text-sm" placeholder="Max rating" />
                <input value={startAfter} onChange={(e) => setStartAfter(e.target.value)} type="datetime-local" className="border rounded-lg px-3 py-2 text-sm" />
                <input value={endBefore} onChange={(e) => setEndBefore(e.target.value)} type="datetime-local" className="border rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-2">
                    <button className="px-3 py-2 border rounded-lg" onClick={() => { setReviewerEmail(''); setRevieweeEmail(''); setEventId(''); setMinRating(''); setMaxRating(''); setStartAfter(''); setEndBefore(''); setPage(1) }}>Clear</button>
                </div>
                <div className="md:col-span-3">
                    <input value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Reason for deletion (required for audit)" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Rating</th>
                                <th className="px-6 py-3">Comment</th>
                                <th className="px-6 py-3">Reviewer</th>
                                <th className="px-6 py-3">Reviewee</th>
                                <th className="px-6 py-3">Event</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(items || []).map((r) => (
                                <tr key={r.id}>
                                    <td className="px-6 py-3 font-bold">{r.rating}</td>
                                    <td className="px-6 py-3 text-gray-700 max-w-lg">{r.comment || '-'}</td>
                                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.reviewer_id ? r.reviewer_id.slice(0, 8) : 'N/A'}...</td>
                                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.reviewee_id ? r.reviewee_id.slice(0, 8) : 'N/A'}...</td>
                                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{r.event_id ? r.event_id.slice(0, 8) : 'N/A'}...</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => setEditingReview(r)}
                                                className="px-3 py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil1Icon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(items && items.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No reviews found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <div className="text-sm text-gray-600">Page {page} / {totalPages || 1}</div>
                    <div className="flex gap-2">
                        <button className="px-3 py-2 border rounded-lg" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                        <button className="px-3 py-2 border rounded-lg" disabled={!totalPages || page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                    </div>
                </div>
            </div>

            {editingReview && (
                <EditReviewModal
                    isOpen={!!editingReview}
                    onClose={() => setEditingReview(null)}
                    review={editingReview}
                    onSuccess={() => mutate()}
                />
            )}
        </div>
    )
}
