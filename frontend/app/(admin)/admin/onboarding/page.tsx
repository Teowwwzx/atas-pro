'use client'

import React, { useEffect, useState } from 'react'
import useSWR from 'swr'
import { adminService } from '@/services/admin.service'
import { toast } from 'react-hot-toast'

const FIELD_OPTIONS = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'role', label: 'Primary Role' },
  { key: 'bio', label: 'Bio' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'github_url', label: 'GitHub URL' },
  { key: 'instagram_url', label: 'Instagram URL' },
  { key: 'twitter_url', label: 'Twitter URL' },
  { key: 'website_url', label: 'Website URL' },
]

export default function AdminOnboardingSettingsPage() {
  const { data, mutate, isLoading } = useSWR('onboarding-settings', () => adminService.getOnboardingSettings())
  const [enabled, setEnabled] = useState<string[]>([])
  const [required, setRequired] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled_fields || [])
      setRequired(data.required_fields || [])
    }
  }, [data])

  const toggleList = (list: string[], key: string) => list.includes(key) ? list.filter(k => k !== key) : [...list, key]

  const save = async () => {
    setSaving(true)
    try {
      await adminService.updateOnboardingSettings({ enabled_fields: enabled, required_fields: required })
      toast.success('Onboarding settings saved')
      mutate()
    } catch (e) {
      const err = e as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Settings</h1>
        <p className="text-gray-500 mt-1">Control which fields appear and which are required in the user onboarding form.</p>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4">Enabled Fields</h2>
            <div className="space-y-2">
              {FIELD_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabled.includes(opt.key)}
                    onChange={() => setEnabled(prev => toggleList(prev, opt.key))}
                  />
                  <span className="text-gray-800 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4">Required Fields</h2>
            <div className="space-y-2">
              {FIELD_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={required.includes(opt.key)}
                    onChange={() => setRequired(prev => toggleList(prev, opt.key))}
                    disabled={!enabled.includes(opt.key)}
                  />
                  <span className="text-gray-800 font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
