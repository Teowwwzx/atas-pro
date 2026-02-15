import api from './api'
import {
    UserResponse,
    OrganizationResponse,
    OrganizationVisibility,
    OrganizationType,
    AuditLog,
    EventDetails,
    BroadcastNotificationRequest
} from './api.types'

export interface AdminStats {
    total_users: number
    total_organizations: number
    total_audit_logs: number
    pending_approvals: number
}

export const adminService = {
    // --- Export ---
    exportUsers: async () => {
        const response = await api.get('/admin/export/users', { responseType: 'blob' })
        return response.data as Blob
    },

    exportEvents: async () => {
        const response = await api.get('/admin/export/events', { responseType: 'blob' })
        return response.data as Blob
    },

    exportOrganizations: async () => {
        const response = await api.get('/admin/export/organizations', { responseType: 'blob' })
        return response.data as Blob
    },

    // --- Stats ---
    getStats: async (): Promise<AdminStats> => {
        // Try dynamic roles; fallback to defaults if endpoint not available
        let pendingRoles: string[] = []
        try {
            const pr = await api.get<string[]>('/admin/pending-roles')
            pendingRoles = pr.data || []
        } catch {
            pendingRoles = [
                'expert_pending',
                'organizer_pending',
                'sponsor_pending',
                'committee_pending',
                'student_pending',
                'customer_support_pending',
                'content_moderator_pending'
            ]
        }

        const [users, orgs, logs, pendingCounts] = await Promise.all([
            api.get<{ total_count: number }>('/users/search/count'),
            api.get<{ total_count: number }>('/organizations/count'),
            api.get<{ total_count: number }>('/admin/audit-logs/count'),
            Promise.all(
                pendingRoles.map((role) =>
                    api.get<{ total_count: number }>('/users/search/count', { params: { role } })
                )
            )
        ])

        const pending_approvals = pendingCounts.reduce((sum, res) => sum + (res.data.total_count || 0), 0)

        return {
            total_users: users.data.total_count,
            total_organizations: orgs.data.total_count,
            total_audit_logs: logs.data.total_count,
            pending_approvals
        }
    },

    // --- Onboarding Settings ---
    getOnboardingSettings: async () => {
        const response = await api.get<{ enabled_fields: string[]; required_fields: string[] }>(
            '/profiles/onboarding/settings'
        )
        return response.data
    },
    updateOnboardingSettings: async (data: { enabled_fields: string[]; required_fields: string[] }) => {
        const response = await api.put<{ enabled_fields: string[]; required_fields: string[] }>(
            '/profiles/onboarding/settings',
            data
        )
        return response.data
    },

    updateUserProfile: async (userId: string, data: any) => {
        const response = await api.patch<import('./api.types').ProfileResponse>(`/admin/users/${userId}/profile`, data)
        return response.data
    },

    // --- Users ---
    getUsers: async (params?: {
        page?: number
        page_size?: number
        email?: string
        name?: string
        status?: string
        role?: string
        is_verified?: boolean
    }) => {
        const response = await api.get<UserResponse[]>('/users', { params })
        return response.data.map(u => ({
            ...u,
            roles: Array.isArray(u.roles)
                ? u.roles.map(r => typeof r === 'string' ? r : r.name)
                : []
        }))
    },

    getUser: async (userId: string) => {
        const response = await api.get<UserResponse>(`/users/${userId}`)
        return response.data
    },

    updateUser: async (userId: string, data: {
        email?: string
        is_verified?: boolean
        status?: string
    }) => {
        const response = await api.put<UserResponse>(`/users/${userId}`, data)
        return response.data
    },

    suspendUser: async (userId: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/suspend`)
        return response.data
    },

    activateUser: async (userId: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/activate`)
        return response.data
    },

    verifyExpert: async (userId: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/expert/verify`)
        return response.data
    },

    revokeExpert: async (userId: string) => {
        const response = await api.delete<UserResponse>(`/users/${userId}/expert/verify`)
        return response.data
    },

    assignRole: async (userId: string, roleName: string) => {
        const response = await api.post<UserResponse>(`/users/${userId}/roles/${roleName}`)
        return response.data
    },

    removeRole: async (userId: string, roleName: string) => {
        const response = await api.delete<UserResponse>(`/users/${userId}/roles/${roleName}`)
        return response.data
    },

    // --- Pending Roles (Onboarding) ---
    approvePendingRoles: async (userId: string) => {
        // Backend overview: POST /api/v1/admin/users/{user_id}/roles/approve
        const response = await api.post<UserResponse>(`/admin/users/${userId}/roles/approve`)
        return response.data
    },

    rejectPendingRoles: async (userId: string) => {
        // Backend overview: POST /api/v1/admin/users/{user_id}/roles/reject
        const response = await api.post<UserResponse>(`/admin/users/${userId}/roles/reject`)
        return response.data
    },

    // --- Organizations ---
    getOrganizations: async (params?: {
        page?: number
        page_size?: number
        name?: string
        visibility?: OrganizationVisibility
        type?: OrganizationType
        status?: string
    }) => {
        const queryParams = {
            ...params,
            q: params?.name,
            name: undefined
        }
        const response = await api.get<OrganizationResponse[]>('/admin/organizations', { params: queryParams })
        return response.data
    },

    getOrganization: async (orgId: string) => {
        const response = await api.get<OrganizationResponse>(`/organizations/${orgId}`)
        return response.data
    },

    updateOrganization: async (orgId: string, data: Partial<import('./api.types').OrganizationUpdate>) => {
        const response = await api.put<OrganizationResponse>(`/organizations/${orgId}`, data)
        return response.data
    },

    deleteOrganization: async (orgId: string) => {
        const response = await api.delete(`/organizations/${orgId}`)
        return response.data
    },

    approveOrganization: async (orgId: string) => {
        const response = await api.post<OrganizationResponse>(`/organizations/${orgId}/approve`)
        return response.data
    },

    rejectOrganization: async (orgId: string) => {
        const response = await api.post<OrganizationResponse>(`/organizations/${orgId}/reject`)
        return response.data
    },

    // --- Audit Logs ---
    getAuditLogs: async (params?: {
        page?: number
        page_size?: number
        action?: string
        actor_user_id?: string
        target_type?: string
        target_id?: string
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<AuditLog[]>('/admin/audit-logs', { params })
        return response.data
    },

    // --- Events ---
    getEvents: async (params?: {
        page?: number
        page_size?: number
        q_text?: string
        status?: string
        type?: string
        organizer_id?: string
        include_all_visibility?: boolean
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<EventDetails[]>('/admin/events', { params })
        return response.data
    },

    createEvent: async (data: any) => {
        const response = await api.post<import('./api.types').EventDetails>('/admin/events', data)
        return response.data
    },

    updateEvent: async (eventId: string, data: any) => {
        const response = await api.put<import('./api.types').EventDetails>(`/admin/events/${eventId}`, data)
        return response.data
    },

    deleteEvent: async (eventId: string) => {
        const response = await api.delete(`/events/${eventId}`)
        return response.data
    },

    publishEvent: async (eventId: string) => {
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/publish`)
        return response.data
    },

    unpublishEvent: async (eventId: string) => {
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/unpublish`)
        return response.data
    },

    openRegistration: async (eventId: string) => {
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/registration/open`)
        return response.data
    },

    closeRegistration: async (eventId: string) => {
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/registration/close`)
        return response.data
    },

    updateEventLogo: async (eventId: string, file: File) => {
        const fd = new FormData()
        fd.append('file', file)
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/images/logo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    },

    updateEventCover: async (eventId: string, file: File) => {
        const fd = new FormData()
        fd.append('file', file)
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/images/cover`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    },

    updateEventPaymentQR: async (eventId: string, file: File) => {
        const fd = new FormData()
        fd.append('file', file)
        const response = await api.put<EventDetails>(`/admin/events/${eventId}/images/payment-qr`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    },

    // --- Notifications ---
    broadcastNotification: async (data: BroadcastNotificationRequest) => {
        const response = await api.post<{ count: number }>('/admin/notifications/broadcast', data)
        return response.data
    },

    broadcastEmailTemplate: async (data: import('./api.types').BroadcastEmailTemplateRequest) => {
        const response = await api.post<{ count: number }>('/admin/email-templates/broadcast', data)
        return response.data
    },

    // --- Counts ---
    getUsersCount: async (params?: {
        email?: string
        name?: string
        status?: string
        role?: string
        is_verified?: boolean
    }) => {
        const response = await api.get<{ total_count: number }>('/users/search/count', { params })
        return response.data.total_count
    },

    getOrganizationsCount: async (params?: {
        name?: string
        visibility?: OrganizationVisibility
        type?: OrganizationType
        status?: string
    }) => {
        const queryParams = {
            ...params,
            q: params?.name,
            name: undefined
        }
        const response = await api.get<{ total_count: number }>('/admin/organizations/count', { params: queryParams })
        return response.data.total_count
    },

    getEventsCount: async (params?: {
        q_text?: string
        status?: string
        type?: string
        organizer_id?: string
        include_all_visibility?: boolean
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<{ total_count: number }>('/events/count', { params })
        return response.data.total_count
    },

    getAuditLogsCount: async (params?: {
        action?: string
        actor_user_id?: string
        target_type?: string
        target_id?: string
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<{ total_count: number }>('/admin/audit-logs/count', { params })
        return response.data.total_count
    },

    // --- Email Templates ---
    getEmailTemplates: async () => {
        const response = await api.get<import('./api.types').EmailTemplate[]>('/admin/email-templates')
        return response.data
    },

    createEmailTemplate: async (data: Partial<import('./api.types').EmailTemplate>) => {
        const response = await api.post<import('./api.types').EmailTemplate>('/admin/email-templates', data)
        return response.data
    },

    updateEmailTemplate: async (id: string, data: Partial<import('./api.types').EmailTemplate>) => {
        const response = await api.put<import('./api.types').EmailTemplate>(`/admin/email-templates/${id}`, data)
        return response.data
    },

    deleteEmailTemplate: async (id: string) => {
        const response = await api.delete<void>(`/admin/email-templates/${id}`)
        return response.data
    },

    testSendEmailTemplate: async (id: string, email: string, variables: Record<string, string>) => {
        const response = await api.post<void>(`/admin/email-templates/${id}/test-send`, { to_email: email, variables })
        return response.data
    },

    // --- Reviews ---
    getReviews: async (params?: {
        reviewer_email?: string
        reviewee_email?: string
        event_id?: string
        min_rating?: number
        max_rating?: number
        start_after?: string
        end_before?: string
        page?: number
        page_size?: number
    }) => {
        const response = await api.get<import('./api.types').ReviewResponse[]>(`/reviews`, { params })
        return response.data
    },

    getReviewsCount: async (params?: {
        reviewer_email?: string
        reviewee_email?: string
        event_id?: string
        min_rating?: number
        max_rating?: number
        start_after?: string
        end_before?: string
    }) => {
        const response = await api.get<{ total_count: number }>(`/reviews/count`, { params })
        return response.data.total_count
    },

    updateReview: async (reviewId: string, data: Partial<import('./api.types').ReviewCreate>) => {
        const response = await api.put<import('./api.types').ReviewResponse>(`/reviews/${reviewId}`, data)
        return response.data
    },

    deleteReview: async (reviewId: string, reason?: string) => {
        const response = await api.delete<import('./api.types').ReviewResponse>(`/reviews/${reviewId}`, { data: { reason } })
        return response.data
    },

    updateUserAvatar: async (userId: string, file: File) => {
        const formData = new FormData()
        formData.append('avatar', file)
        const response = await api.put(`/admin/users/${userId}/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    updateUserCover: async (userId: string, file: File) => {
        const formData = new FormData()
        formData.append('cover', file)
        const response = await api.put(`/admin/users/${userId}/cover`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    updateOrganizationLogo: async (orgId: string, file: File) => {
        const formData = new FormData()
        formData.append('logo', file)
        const response = await api.put(`/admin/organizations/${orgId}/logo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    updateOrganizationCover: async (orgId: string, file: File) => {
        const formData = new FormData()
        formData.append('cover', file)
        const response = await api.put(`/admin/organizations/${orgId}/cover`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    // --- Communications ---
    getCommunicationLogs: async (params?: {
        page?: number
        page_size?: number
        status?: string
    }) => {
        const response = await api.get<import('./api.types').CommunicationLog[]>('/admin/communications', { params })
        return response.data
    },

    resendCommunication: async (id: string) => {
        const response = await api.post<{ message: string; status: string }>(`/admin/communications/${id}/resend`)
        return response.data
    },

    // --- Skills Management ---
    getSkills: async () => {
        const response = await api.get<import('./api.types').SkillResponse[]>('/skills')
        return response.data
    },

    createSkill: async (data: import('./api.types').SkillCreate) => {
        const response = await api.post<import('./api.types').SkillResponse>('/skills', data)
        return response.data
    },

    updateSkill: async (skillId: string, data: import('./api.types').SkillCreate) => {
        const response = await api.put<import('./api.types').SkillResponse>(`/skills/${skillId}`, data)
        return response.data
    },

    deleteSkill: async (skillId: string) => {
        await api.delete(`/skills/${skillId}`)
    },

    // --- Tags Management ---
    getTags: async () => {
        const response = await api.get<import('./api.types').TagResponse[]>('/tags')
        return response.data
    },

    createTag: async (data: import('./api.types').TagCreate) => {
        const response = await api.post<import('./api.types').TagResponse>('/tags', data)
        return response.data
    },

    updateTag: async (tagId: string, data: import('./api.types').TagCreate) => {
        const response = await api.put<import('./api.types').TagResponse>(`/tags/${tagId}`, data)
        return response.data
    },

    deleteTag: async (tagId: string) => {
        await api.delete(`/tags/${tagId}`)
    }
}
