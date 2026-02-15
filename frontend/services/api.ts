import axios from 'axios'
import { isTokenExpired, logout as clientLogout } from '@/lib/auth'
import {
  AuthLogin,
  AuthRegister,
  LoginSuccessResponse,
  RegisterSuccessResponse,
  VerifyEmailSuccessResponse,
  OnboardingData,
  ProfileResponse,
  EventCreate,
  EventDetails,
  EventParticipantDetails,
  EventParticipantBulkCreate,
  EventParticipantCreate,
  EventParticipantRoleUpdate,
  EventParticipantResponseUpdate,
  AttendanceQRResponse,
  AttendanceScanRequest,
  EventReminderCreate,
  EventReminderResponse,
  MyEventItem,
  EventProposalCreate,
  EventProposalResponse,
  EventProposalCommentCreate,
  EventProposalCommentResponse,
  EventChecklistItemCreate,
  EventChecklistItemUpdate,
  EventChecklistItemResponse,
  CategoryResponse,
  EventCategoryAttach,
  UserMeResponse,

  EventAttendanceStats,
  CategoryCreate,
  EventType,
  EventFormat,
  EventRegistrationType,
  EventRegistrationStatus,
  FollowDetails,
  FollowerSummary,
  WalkInAttendanceRequest,
  EventWalkInTokenCreate,
  EventWalkInTokenResponse,
  WalkInRegistrationRequest,
} from './api.types'

// 1. Create an Axios instance
const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 2. --- Authentication Service ---

export const login = async ({ email, password }: AuthLogin) => {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)

  const response = await api.post<LoginSuccessResponse>(
    '/auth/login',
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )
  return response.data
}

export const register = async ({ email, password }: AuthRegister) => {
  const response = await api.post<RegisterSuccessResponse>('/auth/register', {
    email,
    password,
  })
  return response.data
}

export const resendVerification = async (email: string) => {
  const response = await api.post<{ message: string }>('/auth/resend-verification', { email })
  return response.data
}

export const verifyEmail = async (emailOrToken: string, code?: string) => {
  const response = await api.post<VerifyEmailSuccessResponse>(
    '/auth/verify',
    code ? { email: emailOrToken, code } : { email: '', code: emailOrToken }
  )
  return response.data
}

export const loginWithGoogle = async (idToken: string) => {
  const response = await api.post<LoginSuccessResponse>('/auth/google', { id_token: idToken })
  return response.data
}

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.post<{ message: string }>('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return response.data
}

export const deleteMyAccount = async () => {
  const response = await api.delete<{ message: string }>('/users/me')
  return response.data
}

export const forgotPassword = async (email: string) => {
  const response = await api.post<{ message: string }>('/email/forgot-password', { email })
  return response.data
}

export const resetPassword = async (data: import('./api.types').PasswordReset) => {
  const response = await api.post<{ message: string }>(
    `/email/reset-password`,
    data
  )
  return response.data
}

// 4. --- Onboarding Service ---

export const completeOnboarding = async (data: OnboardingData) => {
  const response = await api.put<ProfileResponse>('/profiles/me/onboarding', data)
  return response.data
}

export const getMyProfile = async () => {
  const response = await api.get<ProfileResponse>('/profiles/me')
  return response.data
}

export const updateProfile = async (data: import('./api.types').ProfileUpdate) => {
  const response = await api.put<ProfileResponse>('/profiles/me', data)
  return response.data
}

export const updateAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await api.put<ProfileResponse>('/profiles/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const updateCoverPicture = async (file: File) => {
  const formData = new FormData()
  formData.append('cover_picture', file)
  const response = await api.put<ProfileResponse>('/profiles/me/cover_picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// 5. --- API Interceptor ---

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('atas_token')
    if (token) {
      if (isTokenExpired(token)) {
        clientLogout()
      } else {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)


export const generateAiText = async (prompt: string, context?: string) => {
  const response = await api.post<{ result: string }>('/ai/generate-text', { prompt, context })
  return response.data
}

// --- Events Service ---

export const createEvent = async (data: EventCreate) => {
  const response = await api.post<EventDetails>('/events', data)
  return response.data
}

export const createEventProposal = async (eventId: string, data: EventProposalCreate) => {
  const response = await api.post<EventProposalResponse>(`/events/${eventId}/proposals`, data)
  return response.data
}

export const updateEvent = async (eventId: string, data: Partial<EventCreate>) => {
  const response = await api.put<EventDetails>(`/events/${eventId}`, data)
  return response.data
}

export const getPublicEvents = async (params?: {
  upcoming?: boolean
  q_text?: string
  type?: EventType
  format?: EventFormat
  registration_type?: EventRegistrationType
  registration_status?: EventRegistrationStatus
  category_name?: string
  start_after?: string
  end_before?: string
  page?: number
  page_size?: number
  friends_only?: boolean
}) => {
  const response = await api.get<EventDetails[]>('/events', { params })
  return response.data
}

export const getEventsCount = async (params?: {
  upcoming?: boolean
  q_text?: string
  type?: EventType
  format?: EventFormat
  registration_type?: EventRegistrationType
  registration_status?: EventRegistrationStatus
  category_name?: string
  start_after?: string
  end_before?: string
}) => {
  const response = await api.get<{ total_count: number }>('/events/count', { params })
  return response.data
}

export const semanticSearchEvents = async (params?: { q_text?: string; top_k?: number; embedding?: string }) => {
  const response = await api.get<EventDetails[]>('/events/semantic-search', { params })
  return response.data
}

export const getEventById = async (id: string) => {
  const response = await api.get<EventDetails>(`/events/${id}`)
  return response.data
}

export const getMyParticipationSummary = async (id: string) => {
  const response = await api.get<import('./api.types').EventParticipationSummary>(`/events/${id}/me`)
  return response.data
}

export const getProfileByUserId = async (userId: string) => {
  const response = await api.get<import('./api.types').ProfileResponse>(`/profiles/${userId}`)
  return response.data
}

export const getEventParticipants = async (eventId: string, params?: { role?: string, status?: string[], user_status?: string[], user_visibility?: string[] }) => {
  // Serialize arrays to query params
  const queryParams = new URLSearchParams()
  if (params?.role) queryParams.append('role', params.role)
  if (params?.status) params.status.forEach(s => queryParams.append('status', s))
  if (params?.user_status) params.user_status.forEach(s => queryParams.append('user_status', s))
  if (params?.user_visibility) params.user_visibility.forEach(s => queryParams.append('user_visibility', s))

  const response = await api.get<EventParticipantDetails[]>(`/events/${eventId}/participants`, { params: queryParams })
  return response.data
}

export const exportEventParticipants = async (eventId: string) => {
  const response = await api.get(`/events/${eventId}/export-participants`, {
    responseType: 'blob',
  })
  return response.data as Blob
}

export const inviteEventParticipants = async (eventId: string, items: EventParticipantCreate[]) => {
  const response = await api.post<EventParticipantDetails[]>(`/events/${eventId}/participants/bulk`, { items })
  return response.data
}

export const bulkInviteEventParticipants = async (id: string, body: EventParticipantBulkCreate) => {
  const response = await api.post<EventParticipantDetails[]>(`/events/${id}/participants/bulk`, body)
  return response.data
}

export const inviteEventParticipant = async (id: string, body: EventParticipantCreate) => {
  const response = await api.post<EventParticipantDetails>(`/events/${id}/participants`, body)
  return response.data
}

export const updateEventParticipantRole = async (eventId: string, participantId: string, body: EventParticipantRoleUpdate) => {
  const response = await api.put<EventParticipantDetails>(`/events/${eventId}/participants/${participantId}/role`, body)
  return response.data
}

export const removeEventParticipant = async (eventId: string, participantId: string) => {
  const response = await api.delete<{ detail: string }>(`/events/${eventId}/participants/${participantId}`)
  return response.data
}

export const respondInvitationMe = async (eventId: string, body: EventParticipantResponseUpdate) => {
  const response = await api.put<EventParticipantDetails>(`/events/${eventId}/participants/me/status`, body)
  return response.data
}

// --- Event History ---

export const getMyEventHistory = async (roleFilter?: 'organized' | 'participant' | 'speaker' | 'sponsor') => {
  const params = roleFilter ? { role_filter: roleFilter } : {}
  const response = await api.get<EventDetails[]>('/events/me/history', { params })
  return response.data
}

// --- QR Attendance (Participants - User-level QR) ---

export const generateMyQR = async (eventId: string) => {
  const response = await api.post<AttendanceQRResponse>(`/events/${eventId}/attendance/user_qr`)
  return response.data
}

export const getMyQRImageUrl = (eventId: string, minutesValid: number = 60) => {
  return `${api.defaults.baseURL}/events/${eventId}/attendance/user_qr.png?minutes_valid=${minutesValid}`
}

export const fetchMyQRImageBlob = async (eventId: string, minutesValid: number = 60) => {
  const response = await api.get(`/events/${eventId}/attendance/user_qr.png`, {
    params: { minutes_valid: minutesValid },
    responseType: 'blob',
  })
  return response.data as Blob
}

// --- QR Scanning (Organizers) ---

export interface ScanAttendanceRequest {
  token: string
}

export const scanAttendance = async (eventId: string, token: string) => {
  const response = await api.post<EventParticipantDetails>(`/events/${eventId}/attendance/scan_user`, { token })
  return response.data
}

export const walkInAttendance = async (eventId: string, data: FormData | import('./api.types').WalkInAttendanceRequest) => {
  const response = await api.post<EventParticipantDetails>(`/events/${eventId}/walk-in`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  })
  return response.data
}

export const organizerWalkInAttendance = async (eventId: string, data: import('./api.types').WalkInAttendanceRequest) => {
  const response = await api.post<EventParticipantDetails>(`/events/${eventId}/attendance/walk_in`, data)
  return response.data
}

export const createWalkInToken = async (eventId: string, data: EventWalkInTokenCreate) => {
  const response = await api.post<EventWalkInTokenResponse>(`/events/${eventId}/walk-in/tokens`, data)
  return response.data
}

export const getWalkInTokens = async (eventId: string) => {
  const response = await api.get<EventWalkInTokenResponse[]>(`/events/walk-in/tokens/${eventId}`)
  return response.data
}

export const validateWalkInToken = async (token: string) => {
  const response = await api.get<EventDetails>(`/events/walk-in/validate/${token}`)
  return response.data
}

export const registerWalkIn = async (token: string, data: WalkInRegistrationRequest, file?: File) => {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('email', data.email)
  if (file) {
    formData.append('file', file)
  }

  const response = await api.post<EventParticipantDetails>(`/events/walk-in/register/${token}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export interface AttendanceStats {
  total_participants: number
  total_attended: number
  audience_registered: number
  audience_attended: number
  attendance_rate: number
}

export const getAttendanceStats = async (eventId: string) => {
  const response = await api.get<AttendanceStats>(`/events/${eventId}/attendance/stats`)
  return response.data
}

export const updateEventParticipantStatus = async (eventId: string, participantId: string, body: EventParticipantResponseUpdate) => {
  const response = await api.put<EventParticipantDetails>(`/events/${eventId}/participants/${participantId}/status`, body)
  return response.data
}

export const joinPublicEvent = async (eventId: string) => {
  const response = await api.post<EventParticipantDetails>(`/events/${eventId}/join`)
  return response.data
}

export const leaveEvent = async (eventId: string) => {
  const response = await api.delete<void>(`/events/${eventId}/participants/me`)
  return response.data
}

// --- Attendance Service (Event-level QR - Legacy) ---

export const generateAttendanceQR = async (eventId: string) => {
  const response = await api.post<AttendanceQRResponse>(`/events/${eventId}/attendance/qr`)
  return response.data
}

export const markAttendance = async (data: AttendanceScanRequest) => {
  const response = await api.post<EventParticipantDetails>('/attendance/scan', data)
  return response.data
}

export const selfCheckIn = async (eventId: string) => {
  const response = await api.post<EventParticipantDetails>(`/events/${eventId}/self-checkin`)
  return response.data
}

export const getAttendanceQRPNG = async (eventId: string, minutesValid?: number) => {
  const url = minutesValid
    ? `/events/${eventId}/attendance/qr.png?minutes_valid=${encodeURIComponent(minutesValid)}`
    : `/events/${eventId}/attendance/qr.png`
  const response = await api.get<Blob>(url, { responseType: 'blob' })
  return response.data
}

export const uploadEventPaymentQR = async (eventId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.put<EventDetails>(`/events/${eventId}/payment_qr`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const getEventAttendanceStats = async (eventId: string) => {
  const response = await api.get<EventAttendanceStats>(`/events/${eventId}/attendance/stats`)
  return response.data
}

// --- Category Service ---

export const getCategories = async () => {
  const response = await api.get<CategoryResponse[]>('/categories')
  return response.data
}

// --- Reminder Service ---

export const setEventReminder = async (eventId: string, body: EventReminderCreate) => {
  const response = await api.post<EventReminderResponse>(`/events/${eventId}/reminders`, body)
  return response.data
}


export const runMyDueReminders = async (limit?: number) => {
  const url = limit ? `/events/reminders/run?limit=${encodeURIComponent(limit)}` : `/events/reminders/run`
  const response = await api.post<EventReminderResponse[]>(url)
  return response.data
}

export const getMyRequests = async (type: 'pending' | 'history' = 'pending') => {
  const response = await api.get<import('./api.types').EventInvitationResponse[]>(`/events/me/requests`, {
    params: { type }
  })
  return response.data
}


export const getRequestDetails = async (participantId: string) => {
  const response = await api.get<import('./api.types').EventInvitationResponse>(`/events/requests/${participantId}`)
  return response.data
}

export const getMyEvents = async () => {
  const response = await api.get<MyEventItem[]>(`/events/mine`)
  return response.data
}


export const getMe = async (skipRedirect = false) => {
  // Prevent 401 redirect loop for public pages by checking token first
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('atas_token')
    if (!token || isTokenExpired(token)) {
      throw new Error('No valid token')
    }
  }
  const response = await api.get<UserMeResponse>(`/users/me`, { skipAuthRedirect: skipRedirect } as any)
  return response.data
}

export const enableDashboardPro = async () => {
  const response = await api.post<{ dashboard_pro: boolean }>(`/users/me/enable-dashboard-pro`)
  return response.data
}

// --- Profiles Search ---

export const findProfiles = async (params: { email?: string; name?: string; skill?: string; role?: string }) => {
  try {
    const cleanParams: { email?: string; name?: string; skill?: string; role?: string } = {}
    if (params.email) cleanParams.email = params.email
    if (typeof params.name === 'string') cleanParams.name = params.name.trim()
    if (params.skill) cleanParams.skill = params.skill
    if (params.role) cleanParams.role = params.role
    const response = await api.get<import('./api.types').ProfileResponse[]>(`/profiles/find`, { params: cleanParams })
    return response.data
  } catch (error: unknown) {
    const isNetworkError = typeof error === 'object' && error !== null && (error as { message?: string }).message === 'Network Error'
    if (!isNetworkError) throw error
    const fallbackName = (typeof params.name === 'string' ? params.name.trim() : '') || undefined
    try {
      const fallback = await discoverProfiles({ name: fallbackName, page: 1 })
      return fallback
    } catch {
      return []
    }
  }
}

export const getPublicProfiles = async () => {
  const response = await api.get<import('./api.types').ProfileResponse[]>(`/profiles`)
  return response.data
}

export const discoverProfiles = async (params: { name?: string; role?: string; skill?: string; tag_ids?: string[]; skill_ids?: string[]; page?: number }) => {
  const response = await api.get<import('./api.types').ProfileResponse[]>(`/profiles/discover`, { params })
  return response.data
}

export const discoverProfilesCount = async (params: { name?: string; role?: string; skill?: string; tag_ids?: string[]; skill_ids?: string[] }) => {
  const response = await api.get<{ total_count: number }>(`/profiles/discover/count`, { params })
  return response.data
}

export const semanticSearchProfiles = async (params?: { q_text?: string; top_k?: number; embedding?: string; role?: string }) => {
  const response = await api.get<import('./api.types').ProfileResponse[]>(`/profiles/semantic-search`, { params })
  return response.data
}

// --- Reviews ---

export const getReviewsByUser = async (userId: string) => {
  const response = await api.get<import('./api.types').ReviewResponse[]>(`/reviews/by-user/${userId}`)
  return response.data
}

export const createReview = async (data: import('./api.types').ReviewCreate) => {
  const response = await api.post<import('./api.types').ReviewResponse>(`/reviews`, data)
  return response.data
}

export const getReviewsByEvent = async (eventId: string) => {
  const response = await api.get<import('./api.types').ReviewResponse[]>(`/reviews/event/${eventId}`)
  return response.data
}

export const deleteReview = async (reviewId: string) => {
  await api.delete(`/reviews/${reviewId}`)
}

export const getMyReview = async (eventId: string) => {
  const response = await api.get<import('./api.types').ReviewResponse | null>(`/reviews/me`, { params: { event_id: eventId } })
  return response.data
}

// --- My Checklist Items ---

export const getMyChecklistItems = async (onlyOpen: boolean = true) => {
  const response = await api.get<import('./api.types').EventChecklistItemResponse[]>(`/events/checklist/me`, { params: { only_open: onlyOpen } })
  return response.data
}

// --- Organizations ---

export const getMyOrganizations = async () => {
  const response = await api.get<import('./api.types').OrganizationResponse[]>('/me/organizations')
  return response.data
}

export const getPublicOrganizations = async (params?: { q?: string; type?: string; page?: number; page_size?: number }) => {
  const response = await api.get<import('./api.types').OrganizationResponse[]>(`/organizations`, { params })
  return response.data
}

export const getOrganizationsCount = async (params?: { q?: string; type?: string }) => {
  const response = await api.get<{ total_count: number }>('/organizations/count', { params })
  return response.data
}

export const getOrganizationById = async (id: string) => {
  const response = await api.get<import('./api.types').OrganizationResponse>(`/organizations/${id}`)
  return response.data
}

export const createOrganization = async (data: import('./api.types').OrganizationCreate) => {
  const response = await api.post<import('./api.types').OrganizationResponse>(`/organizations`, data)
  return response.data
}

export const updateOrganization = async (orgId: string, data: import('./api.types').OrganizationUpdate) => {
  const response = await api.put<import('./api.types').OrganizationResponse>(`/organizations/${orgId}`, data)
  return response.data
}

export const updateOrganizationLogo = async (orgId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.put<import('./api.types').OrganizationResponse>(`/organizations/${orgId}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const updateOrganizationCover = async (orgId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.put<import('./api.types').OrganizationResponse>(`/organizations/${orgId}/cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getOrganizationMembers = async (id: string) => {
  const response = await api.get<{ user_id: string; role: string }[]>(`/organizations/${id}/members`)
  return response.data
}

export const getMyOrganizationMembership = async (id: string) => {
  const response = await api.get<{ is_member: boolean; role?: string | null }>(`/organizations/${id}/members/me`)
  return response.data
}

export const joinOrganization = async (id: string) => {
  const response = await api.post<{ joined: boolean; role: string }>(`/organizations/${id}/members/me/join`)
  return response.data
}

export const leaveOrganization = async (id: string) => {
  const response = await api.delete<void>(`/organizations/${id}/members/me`)
  return response.data
}

// --- Proposals ---

export const getEventProposals = async (eventId: string) => {
  const response = await api.get<EventProposalResponse[]>(`/events/${eventId}/proposals`)
  return response.data
}

export const createEventProposalWithFile = async (eventId: string, data: EventProposalCreate, file?: File) => {
  const fd = new FormData()
  if (data.title) fd.append('title', data.title)
  if (data.description) fd.append('description', data.description)
  if (data.file_url) fd.append('file_url', data.file_url)
  if (file) fd.append('file', file)
  const response = await api.post<EventProposalResponse>(`/events/${eventId}/proposals`, fd)
  return response.data
}

export const getEventProposalComments = async (eventId: string, proposalId: string) => {
  const response = await api.get<EventProposalCommentResponse[]>(`/events/${eventId}/proposals/${proposalId}/comments`)
  return response.data
}

export const createEventProposalComment = async (eventId: string, proposalId: string, data: EventProposalCommentCreate) => {
  const response = await api.post<EventProposalCommentResponse>(`/events/${eventId}/proposals/${proposalId}/comments`, data)
  return response.data
}

export const updateEventProposal = async (eventId: string, proposalId: string, data: Partial<EventProposalCreate>) => {
  const response = await api.put<EventProposalResponse>(`/events/${eventId}/proposals/${proposalId}`, data)
  return response.data
}

export const deleteEventProposal = async (eventId: string, proposalId: string) => {
  const response = await api.delete<void>(`/events/${eventId}/proposals/${proposalId}`)
  return response.data
}

export const updateEventProposalComment = async (eventId: string, proposalId: string, commentId: string, data: EventProposalCommentCreate) => {
  const response = await api.put<EventProposalCommentResponse>(`/events/${eventId}/proposals/${proposalId}/comments/${commentId}`, data)
  return response.data
}


export const deleteEventProposalComment = async (eventId: string, proposalId: string, commentId: string) => {
  const response = await api.delete<void>(`/events/${eventId}/proposals/${proposalId}/comments/${commentId}`)
  return response.data
}

export const suggestEventProposal = async (eventId: string, body: import('./api.types').ProposalSuggestRequest) => {
  const response = await api.post<import('./api.types').ProposalSuggestResponse>(`/events/${eventId}/proposals/ai-suggest`, body)
  return response.data
}

// --- Checklist ---

export const getEventChecklist = async (eventId: string) => {
  const response = await api.get<EventChecklistItemResponse[]>(`/events/${eventId}/checklist`)
  return response.data
}

export const getEventExternalChecklist = async (eventId: string) => {
  const response = await api.get<EventChecklistItemResponse[]>(`/events/${eventId}/checklist/external`)
  return response.data
}

export const createEventChecklistItem = async (eventId: string, data: EventChecklistItemCreate) => {
  const response = await api.post<EventChecklistItemResponse>(`/events/${eventId}/checklist`, data)
  return response.data
}

export const updateEventChecklistItem = async (eventId: string, itemId: string, data: EventChecklistItemUpdate) => {
  const response = await api.put<EventChecklistItemResponse>(`/events/${eventId}/checklist/${itemId}`, data)
  return response.data
}

export const deleteEventChecklistItem = async (eventId: string, itemId: string) => {
  const response = await api.delete<void>(`/events/${eventId}/checklist/${itemId}`)
  return response.data
}

export const getEventCategories = async (eventId: string) => {
  const response = await api.get<CategoryResponse[]>(`/events/${eventId}/categories`)
  return response.data
}

export const attachEventCategories = async (eventId: string, body: EventCategoryAttach) => {
  const response = await api.post<CategoryResponse[]>(`/events/${eventId}/categories`, body)
  return response.data
}

export const listCategories = async () => {
  const response = await api.get<CategoryResponse[]>(`/categories`)
  return response.data
}

export const createCategory = async (body: CategoryCreate) => {
  const response = await api.post<CategoryResponse>(`/admin/categories`, body)
  return response.data
}

export const createCategoryPublic = async (body: CategoryCreate) => {
  const response = await api.post<CategoryResponse>(`/categories`, body)
  return response.data
}

export const updateCategory = async (categoryId: string, body: { name: string }) => {
  const response = await api.put<CategoryResponse>(`/admin/categories/${categoryId}`, body)
  return response.data
}

export const deleteCategory = async (categoryId: string) => {
  await api.delete(`/admin/categories/${categoryId}`)
}

export const deleteEventReminder = async (eventId: string) => {
  await api.delete(`/events/${eventId}/reminders`)
}

export const runEventScheduler = async (limit?: number) => {
  const url = limit ? `/events/scheduler/run?limit=${encodeURIComponent(limit)}` : `/events/scheduler/run`
  const response = await api.post<{ updated: number }>(url)
  return response.data
}

export const getMyReminders = async (upcomingOnly: boolean = true) => {
  const response = await api.get<EventReminderResponse[]>(`/events/reminders/me`, { params: { upcoming_only: upcomingOnly } })
  return response.data
}

export const updateEventLogo = async (eventId: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  const response = await api.put<EventDetails>(`/events/${eventId}/images/logo`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const updateEventCover = async (eventId: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  const response = await api.put<EventDetails>(`/events/${eventId}/images/cover`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const deleteEvent = async (eventId: string) => {
  const response = await api.delete<void>(`/events/${eventId}`)
  return response.data
}

export const uploadPaymentProof = async (eventId: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  const response = await api.put<EventParticipantDetails>(
    `/events/${eventId}/participants/me/payment`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return response.data
}

// --- AI Service ---

export const generateProposal = async (data: import('./api.types').ProposalSuggestRequest) => {
  const response = await api.post<import('./api.types').ProposalSuggestResponse>('/ai/generate-proposal', data)
  return response.data
}

export default api

export const logout = clientLogout

export const pingApi = async () => {
  const res = await api.get('/ping')
  return res.data
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error && error.message === 'Network Error') {
      // Normalize network errors to a consistent shape
      error.response = error.response || { status: 0, data: { detail: 'Network Error' } }
    }
    const msg = String(error?.response?.data?.detail || error?.message || '')
    const isTransient = error?.response?.status === 0 || msg.includes('SSL connection has been closed')
    const cfg = error?.config || {}
    if (isTransient && !cfg._retryOnce) {
      ; (cfg as any)._retryOnce = true
      return api.request(cfg)
    }
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('atas_token')
      } catch { }

      // Check if the request explicitly requested to skip redirect
      // @ts-ignore
      if (error.config?.skipAuthRedirect) {
        return Promise.reject(error)
      }

      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        // Don't redirect if already on login pages
        if (path !== '/login' && path !== '/admin/login') {
          // If on admin routes, redirect to admin login
          if (path.startsWith('/admin')) {
            window.location.href = '/admin/login'
          } else {
            // Otherwise redirect to main login
            const returnUrl = encodeURIComponent(path + window.location.search)
            window.location.href = `/login?redirect=${returnUrl}`
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export const openRegistration = async (eventId: string) => {
  const response = await api.put<EventDetails>(`/events/${eventId}/registration/open`)
  return response.data
}

export const closeRegistration = async (eventId: string) => {
  const response = await api.put<EventDetails>(`/events/${eventId}/registration/close`)
  return response.data
}

export const verifyParticipantPayment = async (eventId: string, participantId: string, status: 'accepted' | 'rejected') => {
  const response = await api.put<EventParticipantDetails>(
    `/events/${eventId}/participants/${participantId}/payment`,
    { status }
  )
  return response.data
}

export const publishEvent = async (eventId: string) => {
  const response = await api.put<EventDetails>(`/events/${eventId}/publish`)
  return response.data
}

export const unpublishEvent = async (eventId: string) => {
  const response = await api.put<EventDetails>(`/events/${eventId}/unpublish`)
  return response.data
}

export const endEvent = async (eventId: string) => {
  try {
    const response = await api.put<EventDetails>(`/events/${eventId}/end`)
    return response.data
  } catch {
    const response = await api.post<EventDetails>(`/events/${eventId}/end`)
    return response.data
  }
}

// --- Notification Service ---

export interface NotificationItem {
  id: string
  recipient_id: string
  actor_id?: string
  type: string
  title?: string
  content?: string // Backend uses 'content', frontend might expect 'message'. Adjusting to backend.
  message?: string // Keeping for compatibility, will map content to message
  link_url?: string
  link?: string // Added for frontend compatibility
  is_read: boolean
  read?: boolean // Compatibility
  created_at: string
}

export const getNotifications = async () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('atas_token')
    if (!token || isTokenExpired(token)) {
      return []
    }
  }
  const response = await api.get<NotificationItem[]>('/notifications/me')
  // Map backend response to frontend interface
  return response.data.map(n => {
    let title = 'Notification'
    switch (n.type) {
      case 'chat': title = 'New Message'; break;
      case 'event': title = 'Event Update'; break;
      case 'review': title = 'New Review'; break;
      case 'organization': title = 'Organization Update'; break;
      case 'system': title = 'System Notification'; break;
    }

    return {
      ...n,
      title, // Derived title
      message: n.content, // Backend uses content, frontend uses message
      read: n.is_read,
      link: n.link_url
    }
  })
}

export const markNotificationRead = async (id: string) => {
  const response = await api.put<NotificationItem>(`/notifications/${id}/read`)
  return response.data
}

export const markAllNotificationsRead = async () => {
  await api.put<{ updated_count: number }>(`/notifications/read-all`)
}

export const getUnreadNotificationCount = async () => {
  const response = await api.get<{ unread_count: number }>(`/notifications/me/unread-count`)
  return response.data
}
// --- Taxonomy ---
export const getTags = async () => {
  const response = await api.get<import('./api.types').TagResponse[]>('/tags')
  return response.data
}

export const createTag = async (data: import('./api.types').TagCreate) => {
  const response = await api.post<import('./api.types').TagResponse>('/tags', data)
  return response.data
}

export const attachMyTag = async (tagId: string) => {
  const response = await api.post('/profiles/me/tags', null, { params: { tag_id: tagId } })
  return response.data
}

export const detachMyTag = async (tagId: string) => {
  const response = await api.delete(`/profiles/me/tags/${tagId}`)
  return response.data
}

// --- Education ---
export const addMyEducation = async (data: import('./api.types').EducationCreate) => {
  const response = await api.post<import('./api.types').EducationResponse>('/profiles/me/educations', data)
  return response.data
}

export const deleteMyEducation = async (id: string) => {
  const response = await api.delete<void>(`/profiles/me/educations/${id}`)
  return response.data
}

// --- Job Experience ---
export const addMyJobExperience = async (data: import('./api.types').JobExperienceCreate) => {
  const response = await api.post<import('./api.types').JobExperienceResponse>('/profiles/me/job_experiences', data)
  return response.data
}

export const deleteMyJobExperience = async (id: string) => {
  const response = await api.delete<void>(`/profiles/me/job_experiences/${id}`)
  return response.data
}

// --- Follows ---

export const getMyFollows = async () => {
  const response = await api.get<FollowDetails[]>('/follows/me')
  return response.data
}

export const getMyFollowers = async () => {
  const response = await api.get<FollowDetails[]>('/followers/me')
  return response.data
}

export const getUserFollows = async (userId: string) => {
  const response = await api.get<FollowDetails[]>(`/users/${userId}/follows`)
  return response.data
}

export const getUserFollowers = async (userId: string) => {
  const response = await api.get<FollowDetails[]>(`/users/${userId}/followers`)
  return response.data
}


export const followUser = async (followeeId: string) => {
  const response = await api.post('/follows', { followee_id: followeeId })
  return response.data
}

export const unfollowUser = async (followeeId: string) => {
  const response = await api.delete(`/follows/${followeeId}`)
  return response.data
}

export const followOrganization = async (orgId: string) => {
  const response = await api.post('/follows', { org_id: orgId })
  return response.data
}

export const unfollowOrganization = async (orgId: string) => {
  const response = await api.delete(`/follows/${orgId}`)
  return response.data
}

export const getOrganizationFollowers = async (orgId: string) => {
  // Use generic followers endpoint or specific one if created
  // In Step 1362 we saw list_org_followers at /organizations/{org_id}/followers
  const response = await api.get<FollowDetails[]>(`/organizations/${orgId}/followers`)
  return response.data
}

export const getMyOrganizationFollowStatus = async (orgId: string) => {
  // In Step 1362 we added /organizations/{org_id}/followers/me
  const response = await api.get<{ is_following: boolean }>(`/organizations/${orgId}/followers/me`)
  return response.data
}


// --- Chat ---

export const createOrGetConversation = async (participantIds: string[]) => {
  const response = await api.post<import('./api.types').ChatConversation>('/chat/conversations', { participant_ids: participantIds })
  return response.data
}

export const getConversations = async (skip = 0, limit = 50) => {
  const response = await api.get<import('./api.types').ChatConversation[]>('/chat/conversations', { params: { skip, limit } })
  return response.data
}

export const createConversation = async (participantIds: string[]) => {
  const response = await api.post<import('./api.types').ChatConversation>('/chat/conversations', { participant_ids: participantIds })
  return response.data
}

export const getChatMessages = async (conversationId: string) => {
  const response = await api.get<import('./api.types').ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)
  return response.data
}


export const sendChatMessage = async (conversationId: string, content: string) => {
  const response = await api.post<import('./api.types').ChatMessage>(`/chat/conversations/${conversationId}/messages`, { content })
  return response.data
}

// GetStream Chat Token
export interface StreamTokenResponse {
  token: string
  user_id: string
  api_key: string
}

export const getStreamChatToken = async (): Promise<StreamTokenResponse> => {
  const response = await api.get<StreamTokenResponse>('/chat/stream/token')
  return response.data
}

// Ensure Stream conversation exists and members are upserted
export const ensureStreamConversation = async (conversationId: string): Promise<{ channel_id: string; member_ids: string[] }> => {
  const response = await api.post<{ channel_id: string; member_ids: string[] }>(`/chat/stream/conversations/${conversationId}/ensure`)
  return response.data
}






export const getProposalComments = async (proposalId: string) => {
  const response = await api.get<import('./api.types').EventProposalCommentResponse[]>(`/events/proposals/${proposalId}/comments`)
  return response.data
}

export const createProposalComment = async (proposalId: string, content: string) => {
  const response = await api.post<import('./api.types').EventProposalCommentResponse>(`/events/proposals/${proposalId}/comments`, { content })
  return response.data
}

// --- Chat ---
export interface MessageResponse {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}
export interface MessageCreate {
  content: string
}

export const getConversationMessages = async (conversationId: string): Promise<MessageResponse[]> => {
  const response = await api.get(`/chat/conversations/${conversationId}/messages`);
  return response.data;
}

export const sendDataMessage = async (conversationId: string, content: string): Promise<MessageResponse> => {
  const response = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
  return response.data;
}

// --- Skills ---

export const getSkills = async () => {
  const response = await api.get<import('./api.types').SkillResponse[]>('/skills')
  return response.data
}
