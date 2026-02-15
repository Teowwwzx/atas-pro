import React from 'react'
import { cn } from '@/lib/utils'

interface ParticipantCountProps {
    count: number
    max?: number | null
    className?: string
    label?: string
}

export function ParticipantCount({ count, max, className, label = 'participants' }: ParticipantCountProps) {
    return (
        <span className={cn("text-xs text-zinc-500 font-medium flex items-center gap-1", className)}>
            {count} {max ? `/ ${max}` : ''} {label}
        </span>
    )
}
