import { EventDetails } from '@/services/api.types'

export enum EventPhase {
    DRAFT = 'draft',
    PRE_EVENT = 'pre_event',
    EVENT_DAY = 'event_day',
    ONGOING = 'ongoing',
    POST_EVENT = 'post_event'
}

/**
 * Determine the current phase of an event based on its status and timing
 * 
 * DRAFT: Not published yet (team building phase)
 * PRE_EVENT: Published, >24h before start (promotion & registration)
 * EVENT_DAY: Within 24h of start, not started yet (final prep)
 * ONGOING: Event started, not ended yet (execution)
 * POST_EVENT: Event ended (analytics & wrap-up)
 */
export function getEventPhase(event: EventDetails | null): EventPhase {
    if (!event) return EventPhase.DRAFT

    const now = new Date()
    const start = new Date(event.start_datetime)
    const end = new Date(event.end_datetime)

    // DRAFT = not published (team building, internal collaboration)
    if (event.status === 'ended') {
        return EventPhase.POST_EVENT
    }

    if (event.status !== 'published') {
        return EventPhase.DRAFT
    }

    // POST_EVENT = after end time (analytics, export data)
    if (now > end) {
        return EventPhase.POST_EVENT
    }

    // ONGOING = event has started but not ended (active execution)
    if (now >= start && now <= end) {
        return EventPhase.ONGOING
    }

    // EVENT_DAY = within 24 hours of start (final prep + early arrival scanning)
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilStart <= 24) {
        return EventPhase.EVENT_DAY
    }

    // PRE_EVENT = published but >24h before start (promotion, registration management)
    return EventPhase.PRE_EVENT
}

/**
 * Check if inviting team members (committee, speaker, sponsor) is allowed
 */
export function canInviteTeam(phase: EventPhase): boolean {
    return phase === EventPhase.DRAFT || phase === EventPhase.PRE_EVENT
}

/**
 * Check if scanning attendance is allowed
 */
export function canScanAttendance(phase: EventPhase): boolean {
    return phase === EventPhase.EVENT_DAY || phase === EventPhase.ONGOING
}

/**
 * Check if editing core event details is allowed
 */
export function canEditCoreDetails(phase: EventPhase): boolean {
    return phase === EventPhase.DRAFT || phase === EventPhase.PRE_EVENT
}

/**
 * Check if publishing/unpublishing is allowed
 */
export function canTogglePublish(phase: EventPhase): boolean {
    return phase === EventPhase.DRAFT || phase === EventPhase.PRE_EVENT
}

/**
 * Get human-readable phase description
 */
export function getPhaseLabel(phase: EventPhase): string {
    switch (phase) {
        case EventPhase.DRAFT:
            return 'Draft Mode'
        case EventPhase.PRE_EVENT:
            return 'Pre-Event'
        case EventPhase.EVENT_DAY:
            return 'Event Day'
        case EventPhase.ONGOING:
            return 'Ongoing'
        case EventPhase.POST_EVENT:
            return 'Event Completed'
        default:
            return 'Unknown'
    }
}

/**
 * Get phase icon
 */
export function getPhaseIcon(phase: EventPhase): string {
    switch (phase) {
        case EventPhase.DRAFT:
            return '📝'
        case EventPhase.PRE_EVENT:
            return '🚀'
        case EventPhase.EVENT_DAY:
            return '⏰'
        case EventPhase.ONGOING:
            return '🎯'
        case EventPhase.POST_EVENT:
            return '✅'
        default:
            return '📅'
    }
}
