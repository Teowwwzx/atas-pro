// frontend/services/api.types.ts

// --- Auth Schemas ---

export interface AuthLogin {
    email: string
    password: string
}

export interface AuthRegister {
    email: string
    password: string
}

export interface ApiErrorResponse {
    detail: string
}

export interface PasswordResetRequest {
    email: string
}

export interface PasswordReset {
    email: string
    code: string
    password: string
}

// --- Auth Responses ---

export interface LoginSuccessResponse {
    access_token: string
    token_type: 'bearer'
}

// Based on your user_schema.py -> UserResponse
export interface RegisterSuccessResponse {
    id: string // uuid
    email: string
    is_verified: boolean
    status: 'active' | 'inactive' | 'frozen' | 'suspended'
}

export type RoleItem = string | { id: string; name: string }

export interface UserResponse {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    is_verified: boolean
    status: 'active' | 'inactive' | 'frozen' | 'suspended'
    roles: RoleItem[]
    created_at: string
}

export interface VerifyEmailSuccessResponse {
    message: string
    access_token?: string
    refresh_token?: string
    token_type?: string
}

export interface OnboardingData {
    full_name: string
    role: 'student' | 'expert' | 'sponsor'
    bio?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string

    // New Fields
    country?: string
    city?: string
    origin_country?: string
    can_be_speaker?: boolean
    intents?: string[]
    specialist?: string // Maps to field_of_study (student) or title (expert)

    // For Student
    education?: {
        qualification?: string
        field_of_study?: string
        start_datetime?: string
        end_datetime?: string
        remark?: string // Used for 'Year'
    }

    // For Expert Tags
    tag_ids?: string[]
    availability?: string
    same_as_origin?: boolean
}

export interface TagCreate {
    name: string
}

export interface SkillResponse {
    id: string
    name: string
}

export interface TagResponse {
    id: string
    name: string
}

export interface SkillCreate {
    name: string
}

// Removed duplicate/incorrect EducationBase - it's defined properly later in the file

// Based on your profile_schema.py -> ProfileResponse
export interface EducationCreate {
    org_id?: string
    qualification?: string
    field_of_study?: string
    school?: string // Frontend only, mapped to field_of_study on submit
    start_datetime?: string
    end_datetime?: string
    resume_url?: string
    remark?: string
}

export interface JobExperienceCreate {
    org_id?: string
    title: string
    description?: string
    start_datetime?: string
    end_datetime?: string
}

export interface EducationResponse {
    id: string
    user_id: string
    org_id?: string
    qualification?: string // Degree
    field_of_study?: string // Major
    school?: string
    start_datetime?: string
    end_datetime?: string
    resume_url?: string
    remark?: string
}

export interface JobExperienceResponse {
    id: string
    user_id: string
    org_id?: string
    title: string
    description?: string
    start_datetime?: string
    end_datetime?: string
}

export interface ProfileResponse {
    id: string
    user_id: string
    full_name: string
    email?: string
    bio?: string
    avatar_url?: string
    cover_url?: string
    phone_number?: string
    date_of_birth?: string
    gender?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string
    visibility: 'public' | 'private'
    tags?: { id: string; name: string }[]
    skills_list?: string[]
    educations?: EducationResponse[]
    job_experiences?: JobExperienceResponse[]
    average_rating?: number
    reviews_count?: number
    is_onboarded: boolean
    title?: string // e.g. "Senior Engineer"
    availability?: string // e.g. "Weekdays after 6pm"
    can_be_speaker?: boolean
    intents?: string[]

    // New fields
    country?: string
    city?: string
    origin_country?: string
    today_status?: string
    skills?: { id: string; name: string }[]
    followers_count?: number
    following_count?: number
    sponsor_tier?: string | null
}

export interface ProfileUpdate {
    full_name?: string
    bio?: string
    linkedin_url?: string
    github_url?: string
    instagram_url?: string
    twitter_url?: string
    website_url?: string
    visibility?: 'public' | 'private'
    title?: string
    availability?: string

    // New fields
    country?: string
    city?: string
    origin_country?: string
    can_be_speaker?: boolean
    intents?: string[]
    today_status?: string
}

// --- Event Types ---

export type EventFormat =
    | 'panel_discussion'
    | 'workshop'
    | 'webinar'
    | 'seminar'
    | 'club_event'
    | 'conference'
    | 'other'

export type EventType = 'online' | 'physical' | 'hybrid'
export type EventRegistrationType = 'free' | 'paid'
export type EventStatus = 'draft' | 'published' | 'declined' | 'ended'
export type EventRegistrationStatus = 'opened' | 'closed'
export type EventVisibility = 'public' | 'private'

export interface EventCreate {
    title: string
    description?: string
    logo_url?: string
    cover_url?: string | null
    meeting_url?: string | null
    payment_qr_url?: string | null
    format: EventFormat
    type: EventType
    start_datetime: string // ISO string
    end_datetime: string // ISO string
    registration_type: EventRegistrationType
    visibility: EventVisibility
    auto_accept_registration?: boolean
    is_attendance_enabled?: boolean
    max_participant?: number | null
    venue_place_id?: string | null
    venue_remark?: string | null
    venue_name?: string | null
    remark?: string | null
    price?: number | null
    currency?: string
    organization_id?: string
}

export interface EventDetails extends EventCreate {
    id: string
    organizer_id: string
    status: EventStatus
    registration_status?: EventRegistrationStatus
    category?: { id: string; name: string }
    categories?: any[]
    created_at: string
    updated_at?: string | null
    deleted_at?: string | null
    auto_accept_registration: boolean
    is_attendance_enabled: boolean
    // View-specific fields (often joined)
    my_role?: EventParticipantRole | null
    my_status?: EventParticipantStatus | null
    payment_proof_url?: string | null
    payment_status?: string | null
    location?: string | null
    organizer_name?: string | null
    organizer_avatar?: string | null
    participant_count?: number
    reviews_count?: number
    average_rating?: number
    sponsors?: EventParticipantDetails[]
    meeting_url?: string | null
    currency?: string
    organization_name?: string
}

// --- Organization Types (Moved to bottom) ---

// --- Participant Types ---

export type EventParticipantRole =
    | 'organizer'
    | 'committee'
    | 'speaker'
    | 'sponsor'
    | 'audience'
    | 'student'
    | 'teacher'

export type EventParticipantStatus =
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'attended'
    | 'absent'
    | 'interviewing'

export interface EventParticipantDetails {
    id: string
    event_id: string
    user_id: string | null
    name?: string | null
    email?: string | null
    role: EventParticipantRole
    description?: string | null
    join_method?: string
    status: EventParticipantStatus
    created_at: string
    updated_at?: string
    conversation_id?: string
    proposal_id?: string
    payment_proof_url?: string | null
    payment_status?: string | null
    promo_link?: string | null
    promo_image_url?: string | null

    // User details (joined)
    user_avatar?: string | null
    user_full_name?: string | null
    user_title?: string | null
    user_status?: string | null
    user_visibility?: string | null
}

export interface EventParticipationSummary {
    is_participant: boolean
    my_role?: EventParticipantRole | null
    my_status?: 'pending' | 'accepted' | 'rejected' | 'attended' | 'absent' | null
}

export interface EventParticipantResponseUpdate {
    status: Extract<EventParticipantStatus, 'accepted' | 'rejected'>
}

export interface EventParticipantRoleUpdate {
    role: EventParticipantRole
}

export interface EventCategoryAttach {
    category_ids: string[]
}

export interface EventParticipantCreate {
    user_id: string
    role: EventParticipantRole
    description?: string | null
    proposal_id?: string
    promo_link?: string | null
    promo_image_url?: string | null
}

export interface EventParticipantBulkCreate {
    items: EventParticipantCreate[]
}

// --- Attendance Types ---

export interface WalkInAttendanceRequest {
    name: string
    email: string
}

// --- Walk-in Types ---

export interface EventWalkInTokenCreate {
    label?: string
    max_uses?: number | null
}

export interface EventWalkInTokenResponse {
    id: string
    event_id: string
    token: string
    label?: string | null
    max_uses?: number | null
    current_uses: number
    is_active: boolean
    created_at: string
}

export interface WalkInRegistrationRequest {
    name: string
    email: string
    payment_proof_url?: string | null
}

export interface AttendanceQRResponse {
    token: string
    expires_at: string // ISO string
}

export interface EventAttendanceStats {
    event_id: string
    total_audience: number
    attended_audience: number
    absent_audience: number
    total_participants: number
    attended_total: number
}

export interface AttendanceScanRequest {
    token: string
    email?: string // If not signed in, provide the registration email
    walk_in?: boolean // If physical event and not pre-joined, mark as walk-in attendance
}

// --- Reminder Types ---

export type EventReminderOption = 'one_week' | 'three_days' | 'one_day'

export interface EventReminderCreate {
    option: EventReminderOption
}

export interface EventReminderResponse {
    id: string
    event_id: string
    user_id: string
    option: EventReminderOption
    remind_at: string
    is_sent: boolean
    sent_at?: string | null
}

// --- My Events (Dashboard) ---

export interface MyEventItem {
    event_id: string
    title: string
    start_datetime: string
    end_datetime: string
    type: EventType
    status: EventStatus
    my_role?: EventParticipantRole | null
    my_status?: EventParticipantStatus | null
    cover_url?: string | null
    venue_remark?: string | null
    format?: EventFormat | null
    description?: string | null
    participant_count?: number | null
}

export interface EventProposalCreate {
    title?: string | null
    description?: string | null
    file_url?: string | null
}

export interface EventProposalResponse {
    id: string
    event_id: string
    created_by_user_id: string
    title?: string | null
    description?: string | null
    file_url?: string | null
    created_at: string
    updated_at?: string | null
    conversation_id?: string | null
}

export interface EventProposalCommentCreate {
    content: string
}

export interface EventProposalCommentResponse {
    id: string
    proposal_id: string
    user_id: string
    content: string
    created_at: string
    updated_at?: string | null
}

export interface CategoryCreate {
    name: string
}

export interface CategoryResponse {
    id: string
    name: string
    created_at?: string
}

// --- Checklist Types ---

export interface EventChecklistItemCreate {
    title: string
    description?: string | null
    assigned_user_id?: string | null // Deprecated
    assigned_user_ids?: string[]
    due_datetime?: string | null
    visibility?: 'internal' | 'external'
    audience_role?: EventParticipantRole | null
    link_url?: string | null
    file_ids?: string[]
}

export interface EventChecklistItemUpdate {
    title?: string | null
    description?: string | null
    is_completed?: boolean | null
    assigned_user_id?: string | null // Deprecated
    assigned_user_ids?: string[]
    sort_order?: number | null
    due_datetime?: string | null
    visibility?: 'internal' | 'external' | null
    audience_role?: EventParticipantRole | null
    link_url?: string | null
    file_ids?: string[]
}

// --- Review Types ---

export interface ReviewCreate {
    event_id: string
    reviewee_id: string
    rating: number
    comment?: string | null
}

export interface ReviewResponse {
    id: string
    event_id: string
    org_id?: string | null
    reviewer_id: string
    reviewer_name?: string | null
    reviewer_avatar?: string | null
    is_anonymous?: boolean
    reviewee_id: string
    rating: number
    comment?: string | null
    created_at: string
    updated_at?: string | null
}

export interface EventChecklistItemResponse {
    id: string
    event_id: string
    title: string
    description?: string | null
    is_completed: boolean
    assigned_user_id?: string | null
    assigned_user_ids: string[]
    sort_order: number
    due_datetime?: string | null
    created_by_user_id: string
    created_at: string
    updated_at?: string | null
    visibility: string
    audience_role?: EventParticipantRole | null
    link_url?: string | null
    files?: EventProposalResponse[]
}
export interface UserMeResponse {
    id: string
    email: string
    full_name?: string | null
    roles: string[]
    is_dashboard_pro: boolean
}

// --- Organization Types ---

export type OrganizationVisibility = 'public' | 'private'
export type OrganizationType = 'company' | 'university' | 'education' | 'community' | 'nonprofit' | 'non_profit' | 'government'
export type OrganizationStatus = 'pending' | 'approved' | 'rejected'

export interface OrganizationCreate {
    name: string
    description?: string
    type: OrganizationType
    website_url?: string
    location?: string
    visibility: OrganizationVisibility
    logo_url?: string
    cover_url?: string
}

export interface OrganizationUpdate {
    name?: string
    description?: string
    type?: OrganizationType
    website_url?: string
    location?: string
    visibility?: OrganizationVisibility
    logo_url?: string
    cover_url?: string
}

export interface OrganizationResponse {
    id: string
    owner_id: string
    owner?: {
        id: string
        email: string
        full_name?: string
        avatar_url?: string
    }
    name: string
    logo_url?: string
    cover_url?: string
    description?: string
    type: OrganizationType
    website_url?: string
    location?: string
    visibility: OrganizationVisibility
    status: OrganizationStatus
    created_at?: string
}

// --- Audit Log Types ---

export interface AuditLog {
    id: string
    actor_user_id?: string | null
    actor_email?: string | null
    action: string
    target_type: string
    target_id?: string | null
    details?: string | null
    created_at: string
}

export interface AuditLogListResponse {
    items: AuditLog[]
    total: number
}

export interface BroadcastNotificationRequest {
    title: string
    content: string
    target_role?: string
    target_user_id?: string
    link_url?: string
}

export interface BroadcastEmailTemplateRequest {
    template_id: string
    variables: Record<string, string>
    target_role?: string
    target_user_id?: string
}

export interface EmailTemplate {
    id: string
    name: string
    subject: string
    body_html: string
    variables: string[]
    created_at?: string
    updated_at?: string
}

export interface EmailTemplateCreate {
    name: string
    subject: string
    body_html: string
    variables: string[]
}

export interface EmailTemplateUpdate {
    name?: string
    subject?: string
    body_html?: string
    variables?: string[]
}

// --- AI Proposal Types ---

export interface ProposalSuggestRequest {
    tone?: string
    length_hint?: string
    audience_level?: string
    language?: string
    sections?: string[]
    expert_id?: string
}

export interface ProposalSuggestResponse {
    title: string
    description: string
}

export interface ProposalSuggestRequest {
    expert_name: string
    topic: string
    student_name?: string
}

export interface ProposalRequest {
    title?: string
    description?: string
    topic?: string
    expertId?: string
    expert_name?: string
}

export interface ProposalResponse {
    content: string
    description?: string
}

// --- Notification Types ---

export interface NotificationItem {
    id: string
    user_id: string
    title: string
    message: string
    link?: string | null
    read: boolean
    created_at: string
}

export interface CommunicationLog {
    id: string
    type: 'email' | 'notification'
    recipient: string
    subject?: string
    status: 'pending' | 'sent' | 'failed'
    created_at: string
    error_message?: string
    metadata_payload?: Record<string, unknown>
    content?: string
}

// --- Chat Types ---

export interface ChatParticipant {
    user_id: string
    full_name?: string
    avatar_url?: string
    last_read_at?: string
}

export interface ChatMessage {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_read: boolean
    created_at: string
    sender_name?: string
    sender_avatar?: string
}

export interface ChatConversation {
    id: string
    created_at: string
    updated_at: string
    participants: ChatParticipant[]
    last_message?: ChatMessage | null
    unread_count: number
}

// --- Event Invitation ---

export interface EventInvitationResponse {
    id: string
    event: EventDetails
    role: string
    status: string
    created_at: string
    description?: string
    conversation_id?: string
    proposal_id?: string
    proposal?: EventProposalResponse
}

export interface FollowerSummary {
    id: string
    full_name: string | null
    avatar_url: string | null
    visibility?: string | null
}

export interface OrganizationSummary {
    id: string
    name: string
    logo_url?: string | null
}

export interface FollowDetails {
    id: string
    follower_id: string
    followee_id?: string | null
    org_id?: string | null
    created_at?: string
    follower?: FollowerSummary | null
    followee?: FollowerSummary | null
    organization?: OrganizationSummary | null
}
