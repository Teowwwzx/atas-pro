import React from 'react'

export type IntentType =
    | 'open_to_speak'
    | 'looking_for_speaker'
    | 'open_to_sponsor'
    | 'looking_for_sponsor'
    | 'open_to_job'
    | 'hiring_talent'

interface IntentConfig {
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
}

export const INTENT_CONFIG: Record<IntentType, IntentConfig> = {
    open_to_speak: {
        label: 'Speaker',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        ),
    },
    looking_for_speaker: {
        label: 'Looking for Speaker',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
    open_to_sponsor: {
        label: 'Open to Sponsor',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    looking_for_sponsor: {
        label: 'Seeking Sponsor',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    open_to_job: {
        label: 'Open to Job',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-2 10H6a2 2 0 01-2-2V7h16v8a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    hiring_talent: {
        label: 'Hiring',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
}

interface ProfileBadgeProps {
    intent: IntentType
    position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
    size?: 'sm' | 'md'
}

export function ProfileBadge({ intent, position = 'top-right', size = 'sm' }: ProfileBadgeProps) {
    const config = INTENT_CONFIG[intent]
    if (!config) return null

    const positionClasses = {
        'top-right': 'top-0 right-0',
        'bottom-right': 'bottom-0 right-0',
        'top-left': 'top-0 left-0',
        'bottom-left': 'bottom-0 left-0',
    }

    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-1 text-[10px]',
    }

    return (
        <div
            className={`absolute ${positionClasses[position]} flex items-center gap-0.5 ${config.bgColor} ${config.color} rounded-full font-bold ${sizeClasses[size]} border border-white shadow-sm`}
            title={config.label}
        >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
        </div>
    )
}

interface ProfileIntentBadgesProps {
    intents: IntentType[]
    size?: 'sm' | 'md'
}

export function ProfileIntentBadges({ intents, size = 'sm' }: ProfileIntentBadgesProps) {
    if (!intents || intents.length === 0) return null

    // Display up to 2 badges, prioritizing top-right and bottom-right positions
    const positions: Array<'top-right' | 'bottom-right'> = ['top-right', 'bottom-right']
    
    // Filter out invalid intents
    const validIntents = intents.filter(intent => INTENT_CONFIG[intent])

    return (
        <>
            {validIntents.slice(0, 2).map((intent, index) => (
                <ProfileBadge
                    key={intent}
                    intent={intent}
                    position={positions[index]}
                    size={size}
                />
            ))}
        </>
    )
}
