import React from 'react'
import { toast } from 'react-hot-toast'
import { format, isValid, addMinutes, differenceInMinutes, isSameDay } from 'date-fns'

interface DraftRestoreToastProps {
    draftData: any
    onRestore: () => void
    onDiscard: () => void
    onDismiss: () => void
    toastId: string
    expiresAtMs: number
}

export const DraftRestoreToast = ({ draftData, onRestore, onDiscard, onDismiss, toastId, expiresAtMs }: DraftRestoreToastProps) => {
    // Normalize data fields between different draft formats
    const title = draftData.title || draftData.topic || 'Untitled Draft'

    const [secondsLeft, setSecondsLeft] = React.useState(() => {
        const msLeft = expiresAtMs - Date.now()
        return Math.max(0, Math.ceil(msLeft / 1000))
    })

    React.useEffect(() => {
        const interval = window.setInterval(() => {
            const msLeft = expiresAtMs - Date.now()
            setSecondsLeft(Math.max(0, Math.ceil(msLeft / 1000)))
        }, 250)
        return () => window.clearInterval(interval)
    }, [expiresAtMs])
    
    let dateDisplay = ''
    const start = draftData.start_datetime || draftData.startDatetime
    
    if (start) {
        try {
            const startDate = new Date(start)
            // Check if date is valid
            if (isValid(startDate)) {
                // Determine End Date
                let endDate: Date | null = null
                
                if (draftData.end_datetime) {
                    const parsedEnd = new Date(draftData.end_datetime)
                    if (isValid(parsedEnd)) {
                        endDate = parsedEnd
                    }
                } else if (draftData.duration) {
                    // Calculate end from duration
                    const duration = parseInt(draftData.duration)
                    if (!isNaN(duration)) {
                        endDate = addMinutes(startDate, duration)
                    }
                }

                // Determine Duration
                let durationMins = 0
                if (draftData.duration) {
                    durationMins = parseInt(draftData.duration)
                } else if (endDate) {
                    durationMins = differenceInMinutes(endDate, startDate)
                }

                // Format Display String
                // Example: 10/27/2023 10:30 PM
                dateDisplay = format(startDate, 'MM/dd/yyyy h:mm a')

                if (endDate) {
                    if (isSameDay(startDate, endDate)) {
                        // Same day: - 11:30 PM
                        dateDisplay += ` - ${format(endDate, 'h:mm a')}`
                    } else {
                        // Different day: - 10/28/2023 10:30 AM
                        dateDisplay += ` - ${format(endDate, 'MM/dd/yyyy h:mm a')}`
                    }
                }

                if (durationMins > 0) {
                    let durationStr = ''
                    if (durationMins < 60) {
                        durationStr = `${durationMins}m`
                    } else if (durationMins % 60 === 0) {
                        durationStr = `${durationMins / 60}h`
                    } else {
                        durationStr = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
                    }
                    dateDisplay += ` (${durationStr})`
                }
            }
        } catch (e) {
            // Invalid date format in draft, ignore
        }
    }

    return (
        <div className="flex flex-col gap-2 min-w-[280px] max-w-sm bg-white p-1 rounded-lg relative">
            <button 
                onClick={onDismiss}
                className="absolute top-1 right-1 p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors"
                aria-label="Dismiss"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="flex items-start gap-3">
                <div className="bg-yellow-100 p-2 rounded-full mt-1">
                    <svg className="w-4 h-4 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-zinc-900 text-sm">Resume Editing?</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Found an unsaved draft from your previous session.</p>
                    
                    <div className="mt-2 bg-zinc-50 p-2 rounded border border-zinc-100">
                        <p className="text-xs font-semibold text-zinc-800 line-clamp-1">{title}</p>
                        {dateDisplay && (
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{dateDisplay}</p>
                        )}
                        <p className="text-[10px] text-red-700 mt-1 font-medium">Closing in {secondsLeft}s</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mt-1 pl-[3.25rem]">
                <button
                    onClick={() => {
                        onRestore()
                        toast.dismiss(toastId)
                        toast.success('Draft restored')
                    }}
                    className="flex-1 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold rounded transition-colors shadow-sm"
                >
                    Resume
                </button>
                <button
                    onClick={() => {
                        onDiscard()
                        toast.dismiss(toastId)
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-xs font-bold rounded transition-colors"
                >
                    Discard
                </button>
            </div>
        </div>
    )
}

// Helper function to trigger the toast easily
export const showDraftRestoreToast = (
    key: string, 
    onRestore: (data: any) => void, 
    onDiscard?: () => void,
    durationSeconds?: number
) => {
    // Check if we are in browser environment
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(key)
    if (!saved) return

    try {
        const data = JSON.parse(saved)
        const durationMs = Math.max(1, Math.round((durationSeconds ?? 10) * 1000))
        const expiresAtMs = Date.now() + durationMs
        toast((t) => (
            <DraftRestoreToast 
                draftData={data} 
                toastId={t.id}
                expiresAtMs={expiresAtMs}
                onRestore={() => {
                    // Clear draft token immediately upon restoration
                    localStorage.removeItem(key)
                    onRestore(data)
                }}
                onDiscard={() => {
                    localStorage.removeItem(key)
                    toast.success('Draft discarded')
                    onDiscard?.()
                }}
                onDismiss={() => toast.dismiss(t.id)}
            />
        ), { duration: durationMs, position: 'top-right', id: `draft-${key}` })
    } catch (e) {
        console.error("Failed to parse draft", e)
    }
}
