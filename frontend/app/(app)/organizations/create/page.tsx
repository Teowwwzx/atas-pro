'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganization } from '@/services/api'
import { OrganizationCreate } from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function OrganizationCreatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<OrganizationCreate>({
    name: '',
    description: '',
    type: 'community',
    website_url: '',
    location: '',
    visibility: 'public',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setLoading(true)
    try {
      const org = await createOrganization(form)
      toast.success('Organization created')
      router.push(`/organizations/${org.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-transparent">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-[2rem] shadow-sm border border-zinc-100 p-8">
          <h1 className="text-2xl font-black text-zinc-900 mb-6">Create Organization</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5"
                placeholder="e.g. APU Computing Club"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5"
                >
                  <option value="company">Company</option>
                  <option value="university">University</option>
                  <option value="community">Community</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="government">Government</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Visibility</label>
                <select
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                  className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Website</label>
              <input
                name="website_url"
                value={form.website_url || ''}
                onChange={handleChange}
                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5"
                placeholder="https://example.org"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Location</label>
              <input
                name="location"
                value={form.location || ''}
                onChange={handleChange}
                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Description</label>
              <textarea
                name="description"
                value={form.description || ''}
                onChange={handleChange}
                rows={4}
                className="block w-full rounded-2xl bg-gray-50 border-transparent focus:border-yellow-400 focus:bg-white focus:ring-0 text-zinc-900 font-medium py-4 px-5"
                placeholder="About this organization"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-white text-zinc-900 rounded-full font-bold shadow-sm hover:bg-gray-50 border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-yellow-400 text-zinc-900 rounded-full shadow-lg font-bold hover:bg-yellow-300 disabled:opacity-70"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
