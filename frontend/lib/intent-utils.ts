// Intent display utilities
// Maps backend enum values to user-friendly display labels with styling

export interface IntentDisplay {
    label: string
    icon: string
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'yellow' | 'indigo'
}

export const INTENT_DISPLAY_MAP: Record<string, IntentDisplay> = {
    // Speaking & Events
    'open_to_speak': {
        label: 'Open to Speak',
        icon: '🎤',
        color: 'blue'
    },
    'looking_for_speaker': {
        label: 'Looking for Speaker',
        icon: '📢',
        color: 'blue'
    },

    // Sponsorship
    'open_to_sponsor': {
        label: 'Open to Sponsor',
        icon: '💰',
        color: 'yellow'
    },
    'looking_for_sponsor': {
        label: 'Looking for Sponsor',
        icon: '🚀',
        color: 'purple'
    },

    // Career
    'hiring_talent': {
        label: 'Hiring Talent',
        icon: '💼',
        color: 'green'
    },
    'open_to_job': {
        label: 'Open to Job',
        icon: '👔',
        color: 'indigo'
    },
}

/**
 * Get display label for an intent enum value
 * @param intent - Backend enum value (e.g., 'seeking_mentorship')
 * @returns User-friendly display object or null if not found
 */
export function getIntentDisplay(intent: string): IntentDisplay | null {
    return INTENT_DISPLAY_MAP[intent] || null
}

/**
 * Get Tailwind badge classes based on intent color
 */
export function getIntentBadgeClasses(color: IntentDisplay['color']): string {
    const colorMap: Record<IntentDisplay['color'], string> = {
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        green: 'bg-green-100 text-green-800 border-green-200',
        orange: 'bg-orange-100 text-orange-800 border-orange-200',
        pink: 'bg-pink-100 text-pink-800 border-pink-200',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }
    return colorMap[color] || colorMap.blue
}
