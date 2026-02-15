import React, { useRef, useState } from 'react'
import { ProfileUpdate, ProfileResponse, EducationCreate, JobExperienceCreate, OrganizationResponse } from '@/services/api.types'

interface ProfileEditProps {
    formData: ProfileUpdate
    setFormData: (data: ProfileUpdate) => void
    profile: ProfileResponse

    // Education Props
    newEducation: EducationCreate & { school?: string }
    setNewEducation: (data: EducationCreate & { school?: string }) => void
    onAddEducation: (e: React.FormEvent) => void
    onDeleteEducation: (id: string) => void
    addingEdu: boolean

    // Job Props
    newJob: JobExperienceCreate
    setNewJob: (data: JobExperienceCreate) => void
    onAddJob: (e: React.FormEvent) => void
    onDeleteJob: (id: string) => void
    addingJob: boolean

    // Org Props
    orgSearch: string
    setOrgSearch: (s: string) => void
    orgOptions: OrganizationResponse[]
    orgLoading: boolean
    selectedOrg: OrganizationResponse | null
    setSelectedOrg: (org: OrganizationResponse | null) => void
    showCreateOrg: boolean
    setShowCreateOrg: (show: boolean) => void
    newOrgName: string
    setNewOrgName: (name: string) => void
    newOrgType: any
    setNewOrgType: (type: any) => void
    onCreateOrg: () => void
    creatingOrg: boolean

    // Tags
    availableTags: { id: string, name: string }[]
    onTagToggle: (id: string) => void
    onCreateTag: (name: string) => void
    myTags: { id: string, name: string }[]

    // Actions
    onSave: (e: React.FormEvent) => void
    onCancel: () => void
    saving: boolean
}

export function ProfileEdit(props: ProfileEditProps) {
    const {
        formData, setFormData, profile,
        newEducation, setNewEducation, onAddEducation, onDeleteEducation, addingEdu,
        newJob, setNewJob, onAddJob, onDeleteJob, addingJob,
        orgSearch, setOrgSearch, orgOptions, orgLoading, selectedOrg, setSelectedOrg,
        showCreateOrg, setShowCreateOrg, newOrgName, setNewOrgName, newOrgType, setNewOrgType, onCreateOrg, creatingOrg,
        availableTags, onTagToggle, onCreateTag, myTags,
        onSave, onCancel, saving
    } = props

    const [deleteModal, setDeleteModal] = useState<{ id: string, type: 'job' | 'edu' } | null>(null)
    const [tagSearch, setTagSearch] = useState('')

    const QUALIFICATION_OPTIONS = [
        "High School / Secondary",
        "Diploma / Associate Degree",
        "Bachelor's Degree",
        "Master's Degree",
        "PhD / Doctorate",
        "Professional Certificate",
        "Other"
    ]

    const INTENT_OPTIONS = [
        {
            value: 'open_to_speak',
            label: 'Open to Speaking',
            color: 'text-blue-700',
            bgColor: 'bg-blue-100',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
        },
        {
            value: 'looking_for_speaker',
            label: 'Looking for Speaker',
            color: 'text-blue-700',
            bgColor: 'bg-blue-100',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        },
        {
            value: 'open_to_sponsor',
            label: 'Open to Sponsor',
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-100',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            value: 'looking_for_sponsor',
            label: 'Seeking Sponsor',
            color: 'text-purple-700',
            bgColor: 'bg-purple-100',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            value: 'open_to_job',
            label: 'Open to Job',
            color: 'text-indigo-700',
            bgColor: 'bg-indigo-100',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-2 10H6a2 2 0 01-2-2V7h16v8a2 2 0 01-2 2z" /></svg>,
        },
        {
            value: 'hiring_talent',
            label: 'Hiring Talent',
            color: 'text-green-700',
            bgColor: 'bg-green-100',
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        },
    ]

    const filteredTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(tagSearch.toLowerCase())
    )

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100 // offset for sticky header
            window.scrollTo({ top: y, behavior: 'smooth' })
        }
    }

    const sections = [
        { id: 'section-basic', label: 'Basic Info', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'section-experience', label: 'Work Experience', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { id: 'section-education', label: 'Education', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.5c-2.177 0-4.316-.559-6.16-1.922L12 14z' },
        { id: 'section-skills', label: 'Skills & Tags', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'section-social', label: 'Social Links', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    ]

    return (
        <div className="pb-32 px-4 sm:px-8">
            {/* Deletion Modal */}
            {deleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100 transform scale-100 transition-all">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Confirm Deletion</h3>
                        <p className="text-zinc-600 font-medium mb-8">
                            Are you sure you want to delete this {deleteModal.type === 'job' ? 'experience' : 'education'} entry? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal(null)}
                                className="flex-1 py-3 bg-gray-100 text-zinc-700 font-bold rounded-xl hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteModal.type === 'job') onDeleteJob(deleteModal.id)
                                    else onDeleteEducation(deleteModal.id)
                                    setDeleteModal(null)
                                }}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-7xl mx-auto">
                {/* Desktop Sticky Sidebar Navigation */}
                <aside className="hidden md:block md:col-span-3 lg:col-span-3">
                    <div className="sticky top-28 space-y-1">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4 px-3">Edit Sections</h3>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-600 hover:bg-white hover:shadow-sm hover:text-zinc-900 transition-all text-left"
                            >
                                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={section.icon} />
                                </svg>
                                {section.label}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Edit Column */}
                <div className="md:col-span-9 lg:col-span-8 space-y-12">
                    {/* Basic Info */}
                    <div id="section-basic" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Basic Info</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name || ''}
                                        maxLength={100}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-bold py-3 px-4"
                                    />
                                    <div className="text-xs text-gray-500 mt-1 ml-1">{formData.full_name?.length || 0}/100</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Job Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        maxLength={60}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Software Engineer"
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    />
                                    <div className="text-xs text-gray-500 mt-1 ml-1">{formData.title?.length || 0}/60</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Bio</label>
                                <textarea
                                    rows={4}
                                    value={formData.bio || ''}
                                    maxLength={500}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    placeholder="Tell us about yourself..."
                                />
                                <div className="text-xs text-gray-500 mt-1 ml-1">{formData.bio?.length || 0}/500 characters</div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">Location (City, Country)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.city || ''}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="City"
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    />
                                    <input
                                        type="text"
                                        value={formData.country || ''}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        placeholder="Country"
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="font-bold text-zinc-900 text-sm uppercase tracking-wider mb-4">Profile Badges & Intents</h4>
                                <p className="text-sm text-zinc-500 mb-4">Select an intent to display a badge on your profile picture.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {INTENT_OPTIONS.map((intent) => {
                                        const isSelected = formData.intents?.includes(intent.value)
                                        return (
                                            <button
                                                key={intent.value}
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.intents || []
                                                    let newIntents
                                                    if (current.includes(intent.value)) {
                                                        newIntents = current.filter(i => i !== intent.value)
                                                    } else {
                                                        // Optional: Limit to 1 badge if desired, but multiple is fine for logic
                                                        // newIntents = [intent.value] 
                                                        newIntents = [...current, intent.value]
                                                    }

                                                    const updates: any = { intents: newIntents }

                                                    // Sync can_be_speaker if specific intent is toggled
                                                    if (intent.value === 'open_to_speak') {
                                                        updates.can_be_speaker = newIntents.includes('open_to_speak')
                                                    }

                                                    setFormData({ ...formData, ...updates })
                                                }}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected
                                                        ? `bg-white border-zinc-900 shadow-md ring-1 ring-zinc-900`
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full ${isSelected ? intent.bgColor + ' ' + intent.color : 'bg-gray-100 text-gray-400'}`}>
                                                    {intent.icon}
                                                </div>
                                                <span className={`font-bold text-sm ${isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>
                                                    {intent.label}
                                                </span>
                                                {isSelected && (
                                                    <div className="ml-auto text-zinc-900">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Experience */}
                    <div id="section-experience" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Work Experience</h3>
                        </div>

                        {profile.job_experiences && profile.job_experiences.length > 0 && (
                            <div className="space-y-4 mb-8">
                                {profile.job_experiences.map(job => (
                                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div>
                                            <div className="font-bold text-zinc-900">{job.title}</div>
                                            <div className="text-sm text-zinc-500">{job.description}</div>
                                        </div>
                                        <button
                                            onClick={() => setDeleteModal({ id: job.id, type: 'job' })}
                                            className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Job Form */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h4 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider">Add New Experience</h4>
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Job Title / Role"
                                        required
                                        className="w-full bg-white border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                        value={newJob.title}
                                        onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-zinc-900 ml-1">Organization (optional)</label>
                                    {selectedOrg ? (
                                        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center overflow-hidden">
                                                    {selectedOrg?.logo_url ? (
                                                        <img src={selectedOrg?.logo_url || ''} alt={selectedOrg?.name || ''} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-zinc-900 font-bold text-sm">{selectedOrg?.name?.charAt(0) || ''}</span>
                                                    )}
                                                </div>
                                                <div className="text-sm font-bold text-zinc-900">{selectedOrg?.name || ''}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedOrg(null); setNewJob({ ...newJob, org_id: undefined }); setOrgSearch(''); }}
                                                className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-zinc-600 hover:bg-gray-50"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : showCreateOrg ? (
                                        <div className="space-y-3 bg-white rounded-xl border border-gray-200 p-4 animate-fadeIn">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="font-bold text-sm text-zinc-900">Create New Organization</h5>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCreateOrg(false)}
                                                    className="text-xs font-bold text-zinc-500 hover:text-zinc-700"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Organization Name"
                                                    className="bg-gray-50 border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-400"
                                                    value={newOrgName}
                                                    onChange={e => setNewOrgName(e.target.value)}
                                                />
                                                <select
                                                    className="bg-gray-50 border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 focus:ring-2 focus:ring-yellow-400"
                                                    value={newOrgType}
                                                    onChange={e => setNewOrgType(e.target.value as any)}
                                                >
                                                    <option value="company">Company</option>
                                                    <option value="university">University</option>
                                                    <option value="community">Community</option>
                                                    <option value="nonprofit">Nonprofit</option>
                                                    <option value="government">Government</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={creatingOrg || !newOrgName.trim()}
                                                onClick={onCreateOrg}
                                                className="w-full py-3 rounded-xl bg-zinc-900 text-yellow-400 text-sm font-bold disabled:opacity-50 hover:bg-zinc-800 transition-all"
                                            >
                                                {creatingOrg ? 'Creating...' : 'Create & Select'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 relative">
                                            <input
                                                type="text"
                                                placeholder="Search organization..."
                                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                                                value={orgSearch}
                                                onChange={e => setOrgSearch(e.target.value)}
                                            />
                                            {orgLoading && <div className="absolute right-4 top-3.5 text-xs text-zinc-400">Searching...</div>}

                                            {/* Dropdown Results */}
                                            {orgSearch && !selectedOrg && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden max-h-60 overflow-y-auto">
                                                    {orgOptions.length > 0 ? (
                                                        <>
                                                            {orgOptions.map(o => (
                                                                <button
                                                                    key={o.id}
                                                                    type="button"
                                                                    onClick={() => { setSelectedOrg(o); setNewJob({ ...newJob, org_id: o.id }); setOrgSearch(''); }}
                                                                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-yellow-50 transition-colors border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center overflow-hidden shrink-0">
                                                                        {o.logo_url ? <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover" /> : <span className="text-zinc-900 font-bold text-sm">{o.name.charAt(0)}</span>}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-bold text-zinc-900">{o.name}</div>
                                                                        <div className="text-xs text-zinc-500 capitalize">{o.type}</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                            {/* Option to create even if results exist, in case user doesn't see theirs */}
                                                            <button
                                                                type="button"
                                                                onClick={() => { setNewOrgName(orgSearch); setShowCreateOrg(true); }}
                                                                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-zinc-600 border-t border-gray-100 flex items-center gap-2"
                                                            >
                                                                <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">+</span>
                                                                Not found? Create "{orgSearch}"
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setNewOrgName(orgSearch); setShowCreateOrg(true); }}
                                                            className="w-full text-left p-4 hover:bg-gray-50 transition-colors group"
                                                        >
                                                            <div className="text-sm text-zinc-500 mb-1">No organization found matching "{orgSearch}"</div>
                                                            <div className="text-yellow-600 font-bold flex items-center gap-2 group-hover:underline">
                                                                Create "{orgSearch}" as a new organization
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <textarea
                                        placeholder="Description (e.g. Responsibilities, Achievements)"
                                        className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400 mt-2 min-h-[80px]"
                                        value={newJob.description || ''}
                                        onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={onAddJob}
                                    disabled={addingJob || !newJob.title}
                                    className="w-full py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    {addingJob ? 'Adding...' : 'Add Position'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Education */}
                    <div id="section-education" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Education</h3>
                        </div>

                        {profile.educations && profile.educations.length > 0 && (
                            <div className="space-y-4 mb-8">
                                {profile.educations.map(edu => (
                                    <div key={edu.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div>
                                            <div className="font-bold text-zinc-900">{edu.qualification}</div>
                                            <div className="text-sm text-zinc-500">{edu.field_of_study}</div>
                                            {edu.school && <div className="text-xs text-zinc-400 font-medium">at {edu.school}</div>}
                                        </div>
                                        <button
                                            onClick={() => setDeleteModal({ id: edu.id, type: 'edu' })}
                                            className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <select
                                    value={newEducation.qualification || ''}
                                    onChange={e => setNewEducation({ ...newEducation, qualification: e.target.value })}
                                    className="w-full bg-white border-0 rounded-xl px-4 py-3 font-bold text-zinc-900 focus:ring-2 focus:ring-yellow-400 appearance-none"
                                >
                                    <option value="" disabled>Select Qualification</option>
                                    {QUALIFICATION_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Field of Study (e.g. Computer Science)"
                                value={newEducation.field_of_study}
                                onChange={e => setNewEducation({ ...newEducation, field_of_study: e.target.value })}
                                className="w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                            />
                            <input
                                type="text"
                                placeholder="School / University"
                                value={newEducation.school || ''}
                                onChange={e => setNewEducation({ ...newEducation, school: e.target.value })}
                                className="md:col-span-2 w-full bg-white border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-yellow-400"
                            />
                            <button
                                onClick={onAddEducation}
                                disabled={addingEdu || !newEducation.qualification}
                                className="md:col-span-2 w-full py-3 bg-zinc-900 text-yellow-400 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50"
                            >
                                {addingEdu ? 'Adding...' : 'Add Education'}
                            </button>
                        </div>
                    </div>

                    {/* Skills & Tags */}
                    <div id="section-skills" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Skills & Tags</h3>
                        </div>

                        {/* Tags Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-zinc-900">Tags (Max 3)</label>
                                <span className={`text-xs font-bold ${myTags.length >= 3 ? 'text-red-600' : 'text-zinc-400'}`}>
                                    {myTags.length}/3 selected
                                </span>
                            </div>

                            {/* Selected Tags */}
                            {myTags.length > 0 && (
                                <div className="mb-4 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                                    <div className="text-xs font-bold text-yellow-700 mb-2">Selected Tags:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {myTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => onTagToggle(tag.id)}
                                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900 text-yellow-400 border border-zinc-900 hover:bg-zinc-800 transition-all flex items-center gap-1"
                                            >
                                                {tag.name}
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tag Search */}
                            <div className="mb-3">
                                <input
                                    type="text"
                                    placeholder="Search tags..."
                                    className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 font-medium text-zinc-900 focus:ring-2 focus:ring-yellow-400"
                                    value={tagSearch}
                                    onChange={(e) => setTagSearch(e.target.value)}
                                />
                            </div>

                            {/* Available Tags */}
                            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {filteredTags.map(tag => {
                                    const isSelected = myTags.some(t => t.id === tag.id)
                                    const isDisabled = !isSelected && myTags.length >= 3
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => !isDisabled && onTagToggle(tag.id)}
                                            disabled={isDisabled}
                                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${isSelected
                                                ? 'bg-zinc-900 text-yellow-400 border-zinc-900'
                                                : isDisabled
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'bg-white text-zinc-500 border-gray-200 hover:border-zinc-300'
                                                }`}
                                        >
                                            {tag.name} {isSelected && '✓'}
                                        </button>
                                    )
                                })}
                                {tagSearch && !availableTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                                    <button
                                        type="button"
                                        onClick={() => { onCreateTag(tagSearch); setTagSearch(''); }}
                                        className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-zinc-600 border border-gray-100 rounded-xl flex items-center gap-2 mt-2"
                                    >
                                        <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600">+</span>
                                        Create new tag "{tagSearch}"
                                    </button>
                                )}
                                {filteredTags.length === 0 && !tagSearch && (
                                    <div className="text-sm text-zinc-400 italic p-4">Type to search or create tags...</div>
                                )}
                            </div>
                        </div>

                        {/* Intents Section - Deleted (Moved to Basic Info) */}
                    </div>

                    {/* Social Links */}
                    <div id="section-social" className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 scroll-mt-28">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900">Social Links</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { key: 'website_url', label: 'Website' },
                                { key: 'github_url', label: 'GitHub' },
                                { key: 'linkedin_url', label: 'LinkedIn' },
                                { key: 'twitter_url', label: 'Twitter' },
                            ].map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-bold text-zinc-900 mb-2 ml-1">{field.label}</label>
                                    <input
                                        type="url"
                                        value={(formData as any)[field.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-3 px-4"
                                        placeholder="https://..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-2xl z-50 flex justify-end gap-3 md:pr-10">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-white border border-gray-200 text-zinc-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="px-8 py-3 bg-zinc-900 text-yellow-400 font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-zinc-900/20"
                >
                    {saving ? 'Saving Changes...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    )
}
