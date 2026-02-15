'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, getMyProfile, getTags } from '@/services/api'
import type { OnboardingData } from '@/services/api.types'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'
import { Combobox, Transition, Listbox, Switch } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon, ClockIcon } from '@radix-ui/react-icons'

import { APU_DEGREES, COUNTRIES } from '@/lib/constants'

import { OrganizationSearchCombobox } from '@/components/profile/OrganizationSearchCombobox'

// Intent mapping: Frontend labels -> Backend enum values
// 6 Standardized Intent Options
const INTENT_MAP: Record<string, string> = {
  'Open to Speak': 'open_to_speak',
  'Open to Sponsor': 'open_to_sponsor',
  'Looking for Sponsor': 'looking_for_sponsor',
  'Looking for Speaker': 'looking_for_speaker',
  'Hiring Talent': 'hiring_talent',
  'Open to Job': 'open_to_job',
}

// --- Components ---

function CountryCombobox({ value, onChange, disabled, placeholder }: { value: string, onChange: (val: string | null) => void, disabled?: boolean, placeholder?: string }) {
  const [query, setQuery] = useState('')
  const filtered = query === ''
    ? COUNTRIES
    : COUNTRIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))

  return (
    <Combobox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative mt-1">
        <Combobox.Input
          className={`block w-full px-4 py-3 rounded-xl border-zinc-200 bg-zinc-50 text-black focus:bg-white focus:ring-2 focus:ring-yellow-400/50 outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder || "Select Country..."}
          onChange={(event) => setQuery(event.target.value)}
        />
        {!disabled && (
          <Combobox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filtered.length === 0 && query !== '' ? (
              <div className="cursor-default select-none relative py-2 px-4 text-gray-700">Nothing found.</div>
            ) : (
              filtered.map((c) => (
                <Combobox.Option
                  key={c}
                  value={c}
                  className={({ active }) =>
                    `cursor-default select-none relative py-2 pl-4 pr-4 ${active ? 'text-white bg-yellow-500' : 'text-black'
                    }`
                  }
                >
                  {c}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  )
}

function DegreeSelector({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [query, setQuery] = useState('')
  const filtered = query === ''
    ? APU_DEGREES
    : APU_DEGREES.filter((d) => d.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="relative">
      <Combobox value={value} onChange={(val) => onChange(val || '')}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white text-left border border-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-yellow-300 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-3 pl-4 pr-10 text-sm leading-5 text-black focus:ring-0 outline-none"
              displayValue={(val: string) => val}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your degree..."
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
              {filtered.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-zinc-700">
                  Nothing found.
                </div>
              ) : (
                filtered.map((degree) => (
                  <Combobox.Option
                    key={degree}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-yellow-100 text-yellow-900' : 'text-black'
                      }`
                    }
                    value={degree}
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {degree}
                        </span>
                        {selected ? (
                          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-yellow-600' : 'text-yellow-600'}`}>
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  )
}

function TagSelector({ selectedIds, onChange }: { selectedIds: string[], onChange: (ids: string[]) => void }) {
  const [tags, setTags] = useState<{ id: string, name: string }[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    getTags().then(setTags).catch(() => { })
  }, [])

  const filtered = query === ''
    ? tags
    : tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))

  const toggleTag = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedIds.map(id => {
          const t = tags.find(x => x.id === id)
          return t ? (
            <span key={id} onClick={() => toggleTag(id)} className="cursor-pointer inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-red-100 hover:text-red-800 transition-colors">
              {t.name} ✕
            </span>
          ) : null
        })}
      </div>

      <div className="relative">
        <Combobox value={null} onChange={(t: any) => t && toggleTag(t.id)}>
          <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white text-left border border-zinc-200 sm:text-sm">
            <div className="flex items-center pl-3">
              <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400" />
              <Combobox.Input
                className="w-full border-none py-3 pl-2 pr-10 text-sm leading-5 text-black focus:ring-0 outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search specialities (e.g. AI, Blockchain)..."
              />
            </div>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
              {filtered.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-zinc-700">
                  No tags found.
                </div>
              ) : (
                filtered.map((tag) => (
                  <Combobox.Option
                    key={tag.id}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-yellow-50 text-yellow-900' : 'text-black'
                      }`
                    }
                    value={tag}
                  >
                    {({ selected, active }) => (
                      <span className={`block truncate ${selectedIds.includes(tag.id) ? 'font-bold' : 'font-normal'}`}>
                        {tag.name}
                      </span>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </Combobox>
      </div>
    </div>
  )
}


export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [otherIntent, setOtherIntent] = useState('')
  const [step, setStep] = useState(1)

  // Form State
  const [form, setForm] = useState<OnboardingData>({ full_name: '', role: 'student', country: 'Malaysia', origin_country: 'Malaysia', same_as_origin: true })

  // Initialize defaults based on role
  useEffect(() => {
    if (form.role === 'student' && (!form.intents || form.intents.length === 0)) {
      updateField('intents', ['Looking for Speaker'])
    }
    if (form.role === 'expert') {
      const currentIntents = form.intents || [];
      if (!currentIntents.includes('Open to Speaking')) {
        updateField('intents', [...currentIntents, 'Open to Speaking'])
      }
      if (!form.can_be_speaker) {
        updateField('can_be_speaker', true)
      }
    }
  }, [form.role])

  const updateField = (key: keyof OnboardingData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Nested updates
  const updateEducation = (key: string, value: string) => {
    setForm(prev => ({
      ...prev,
      education: { ...prev.education, [key]: value }
    }))
  }

  const toggleIntent = (intent: string) => {
    const current = form.intents || []
    if (current.includes(intent)) {
      updateField('intents', current.filter(i => i !== intent))
    } else {
      updateField('intents', [...current, intent])
    }
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name) {
      toast.error('Please enter your name')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Logic for Specialist mapping
      const payload = { ...form }

      if (form.role === 'student' && form.education?.field_of_study) {
        payload.specialist = form.education.field_of_study
      }

      // Handle Other Intent
      // Note: Backend strictly validates intents against IntentType enum.
      // We need to map UI friendly strings to backend enum values.

      // Use the global INTENT_MAP for consistency
      const INTENT_MAPPING = INTENT_MAP

      const finalIntents = new Set<string>()

      // Process selected intents
      payload.intents?.forEach(intent => {
        if (intent === 'Other') {
          // 'Other' isn't supported by backend enum, we map it to open_to_collaborate 
          // or just ignore it if we can't store the custom text in intents.
          // For now, let's map it to open_to_collaborate as a fallback.
          finalIntents.add('open_to_collaborate')
        } else if (INTENT_MAPPING[intent]) {
          finalIntents.add(INTENT_MAPPING[intent])
        }
      })

      // Overwrite payload with mapped intents
      payload.intents = Array.from(finalIntents)

      if (form.role === 'expert') {
        const intents = payload.intents || []
        payload.can_be_speaker = intents.includes('open_to_speak')
      }


      await completeOnboarding(payload)
      await getMyProfile()
      toast.success('Welcome to ATAS!')

      // Check for redirect URL from query params (e.g., booking page with saved draft)
      const params = new URLSearchParams(window.location.search)
      let redirectUrl = params.get('redirect') || '/dashboard'

      // Check localStorage for pending redirect (Lazy Login)
      if (redirectUrl === '/dashboard') {
        const pending = localStorage.getItem('pending_redirect')
        if (pending) {
          redirectUrl = pending
          localStorage.removeItem('pending_redirect')
        }
      }

      // Fallback: check localStorage for booking drafts if no explicit redirect
      if (redirectUrl === '/dashboard') {
        try {
          const keys = Object.keys(localStorage)
          const draftKey = keys.find(key => key.startsWith('booking_draft_'))
          if (draftKey) {
            const expertId = draftKey.replace('booking_draft_', '')
            redirectUrl = `/book/${expertId}`
          }
        } catch (e) {
          // localStorage not available
        }
      }

      window.location.href = redirectUrl
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FFFDF5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-y-auto">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300" />



      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            {step === 1 ? "Let's get you started" : "Tell us a bit more"}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Step {step} of 2
          </p>
          {/* Progress Bar */}
          <div className="w-24 h-1.5 bg-zinc-100 rounded-full mx-auto mt-4 overflow-hidden">
            <div className={`h-full bg-yellow-400 transition-all duration-500 ease-out ${step === 1 ? 'w-1/2' : 'w-full'}`} />
          </div>
        </div>

        <div className="bg-white py-10 px-8 shadow-xl shadow-zinc-200/50 rounded-3xl border border-zinc-100/50 relative overflow-hidden">
          {/* Decor */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-yellow-50 blur-2xl opacity-50" />

          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6 relative">

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">What should we call you?</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={form.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    className="block w-full px-4 py-3 rounded-xl border-zinc-200 bg-zinc-50 text-black focus:bg-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all outline-none"
                    placeholder="e.g. Alex Chen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-3">Which describes you best?</label>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'student', title: 'Student', icon: '🎓', desc: 'I am studying and looking for opportunities' },
                      { id: 'expert', title: 'Expert', icon: '💼', desc: 'I want to share knowledge or mentor' },
                      { id: 'sponsor', title: 'Sponsor', icon: '🚀', desc: 'I want to support events and students' },
                    ].map((roleOption) => (
                      <div
                        key={roleOption.id}
                        onClick={() => updateField('role', roleOption.id)}
                        className={`cursor-pointer group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${form.role === roleOption.id
                          ? 'border-yellow-400 bg-yellow-50/50'
                          : 'border-zinc-100 hover:border-zinc-200 bg-white'
                          }`}
                      >
                        <span className="text-2xl mr-4 group-hover:scale-110 transition-transform">{roleOption.icon}</span>
                        <div className="flex-1">
                          <h3 className={`font-bold ${form.role === roleOption.id ? 'text-black' : 'text-zinc-700'}`}>
                            {roleOption.title}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{roleOption.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.role === roleOption.id ? 'border-yellow-500' : 'border-zinc-200'
                          }`}>
                          {form.role === roleOption.id && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

                {/* STUDENT FIELDS */}
                {form.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Education</label>
                      <input
                        type="text"
                        value="Asia Pacific University"
                        readOnly
                        className="block w-full px-4 py-3 rounded-xl border-zinc-200 bg-zinc-100 text-black cursor-not-allowed mb-3"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          className="block w-full px-4 py-3 rounded-xl border-zinc-200 bg-zinc-50 text-black focus:bg-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 outline-none p-2.5"
                          value={form.education?.remark || "Year 2"}
                          onChange={(e) => updateEducation('remark', e.target.value)}
                        >
                          <option value="Foundation (Year 1)">Foundation (Year 1)</option>
                          <option value="Year 2">Year 2</option>
                          <option value="Year 3">Year 3</option>
                        </select>
                        {/* Default Sem logic can go here if needed, keeping it simple for now */}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Degree / Specialism</label>
                      <DegreeSelector
                        value={form.education?.field_of_study || ''}
                        onChange={(val) => updateEducation('field_of_study', val)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-black mb-3">I am looking for...</label>
                      <div className="grid grid-cols-2 gap-4">
                        {['Looking for Speaker', 'Looking for Sponsor', 'Open to Job'].map(intent => (
                          <label
                            key={intent}
                            className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer ${form.intents?.includes(intent) ? 'bg-yellow-50 border-yellow-400' : 'border-zinc-100 hover:bg-zinc-50'}`}
                          >
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500 border-gray-300 flex-shrink-0"
                              checked={!!form.intents?.includes(intent)}
                              onChange={() => toggleIntent(intent)}
                            />
                            <span className="text-sm font-medium text-black">{intent}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* EXPERT FIELDS */}
                {form.role === 'expert' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Area of Expertise</label>
                      <p className="text-xs text-zinc-600 mb-2">Select tags that describe your skills.</p>
                      <TagSelector
                        selectedIds={form.tag_ids || []}
                        onChange={(ids) => updateField('tag_ids', ids)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2 h-6">
                          <label className="block text-sm font-bold text-black">Current Location</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">I'm from here</span>
                            <Switch
                              checked={!!form.same_as_origin}
                              onChange={(checked) => {
                                updateField('same_as_origin', checked);
                                if (checked) updateField('origin_country', form.country || '');
                              }}
                              className={`${form.same_as_origin ? 'bg-yellow-500' : 'bg-zinc-200'
                                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2`}
                            >
                              <span
                                className={`${form.same_as_origin ? 'translate-x-6' : 'translate-x-1'
                                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </div>
                        </div>
                        <CountryCombobox
                          value={form.country || ''}
                          onChange={(val) => {
                            updateField('country', val);
                            if (form.same_as_origin) updateField('origin_country', val);
                          }}
                          placeholder="Select Current Location..."
                        />
                      </div>

                      {!form.same_as_origin && (
                        <div>
                          <div className="flex justify-between items-center mb-2 h-6">
                            <label className="block text-sm font-bold text-black">Origin Country</label>
                          </div>
                          <CountryCombobox
                            value={form.origin_country || ''}
                            onChange={(val) => updateField('origin_country', val)}
                            placeholder="Select Origin..."
                          />
                        </div>
                      )}
                    </div>


                    <div>
                      <label className="block text-sm font-bold text-black mb-2 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-zinc-500" />
                        Availability & Preferred Time
                      </label>
                      <p className="text-xs text-zinc-500 mb-3">
                        Describe when you are free. Our AI uses this to match you with event organizers.
                      </p>

                      <div className="space-y-3">
                        <textarea
                          value={form.availability || ''}
                          onChange={(e) => updateField('availability', e.target.value)}
                          placeholder="e.g. I am usually available on Weekdays after 6pm. I can also do weekends if booked in advance."
                          className="block w-full px-4 py-3 rounded-xl border-zinc-200 bg-zinc-50 text-black focus:bg-white focus:ring-2 focus:ring-yellow-400/50 outline-none min-h-[100px] resize-none text-sm border"
                        />

                        <div className="flex flex-wrap gap-2">
                          {['Prefer Weekend', 'Weekdays after 6pm', 'Flexible', 'Remote Only', 'TBD'].map(opt => {
                            const isIncluded = form.availability?.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  let current = form.availability || '';
                                  if (isIncluded) {
                                    // Simple remove attempt: remove text and cleanup commas
                                    current = current.replace(opt, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
                                  } else {
                                    current = current.trim() ? `${current}, ${opt}` : opt;
                                  }
                                  updateField('availability', current);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${isIncluded
                                  ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-yellow-300'
                                  }`}
                              >
                                {isIncluded ? <CheckIcon className="w-3 h-3" /> : <span>+</span>} {opt}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-black mb-3">I am open to...</label>
                      <div className="grid grid-cols-2 gap-4">
                        {['Open to Speak', 'Open to Sponsor', 'Hiring Talent'].map(intent => {
                          const isSelected = form.intents?.includes(intent);

                          return (
                            <div key={intent} className="h-full">
                              <label className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer h-full ${isSelected ? 'bg-yellow-50 border-yellow-400' : 'border-zinc-100 hover:bg-zinc-50'
                                }`}>
                                <input
                                  type="checkbox"
                                  className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500 border-gray-300 flex-shrink-0"
                                  checked={!!isSelected}
                                  onChange={() => toggleIntent(intent)}
                                />
                                <span className="text-sm font-medium text-black">{intent}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )
                }

                {/* SPONSOR FIELDS */}
                {
                  form.role === 'sponsor' && (
                    <>
                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <label className="block text-sm font-bold text-black">Company Name</label>
                          <span className="text-xs text-zinc-500">(Can be edited later)</span>
                        </div>
                        <OrganizationSearchCombobox
                          value={form.specialist || ''}
                          onChange={(val) => updateField('specialist', val)}
                          onSelect={(org) => updateField('specialist', org.name)} // Or store org_id if backend supports it
                          placeholder="Search or create your company..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-black mb-3">Our goals...</label>
                        <div className="grid grid-cols-2 gap-4">
                          {['Open to Sponsor', 'Hiring Talent', 'Looking for Speaker'].map(intent => {
                            const isSelected = form.intents?.includes(intent);
                            const isOther = intent === 'Other';

                            return (
                              <div key={intent} className="h-full">
                                <label className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer h-full ${isSelected ? 'bg-yellow-50 border-yellow-400' : 'border-zinc-100 hover:bg-zinc-50'
                                  }`}>
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500 border-gray-300 flex-shrink-0"
                                    checked={!!isSelected}
                                    onChange={() => toggleIntent(intent)}
                                  />
                                  <span className="text-sm font-medium text-black">{intent}</span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )
                }

              </div >
            )}

            <div className="pt-6 flex items-center justify-between gap-4">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl text-zinc-500 font-bold hover:bg-zinc-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3.5 rounded-xl font-bold text-zinc-900 shadow-lg shadow-yellow-200 transition-all transform active:scale-[0.98] ${loading ? 'bg-zinc-100 text-zinc-400' : 'bg-yellow-400 hover:bg-yellow-300 hover:shadow-yellow-300 hover:-translate-y-0.5'
                  }`}
              >
                {loading ? 'Saving...' : step === 1 ? 'Continue' : 'Complete Setup'}
              </button>
            </div>

          </form >
        </div >

        {step === 2 && (
          <p className="text-center text-xs text-zinc-400 mt-6">
            You can edit these details later in your profile.
          </p>
        )}
      </div >
    </div >
  )
}
