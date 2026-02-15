'use client'

import React, { useEffect, useState } from 'react'
import { listCategories, createCategory } from '@/services/api'
import { CategoryResponse } from '@/services/api.types'
import { toast } from 'react-hot-toast'

export default function CategoriesPage() {
  const [items, setItems] = useState<CategoryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await listCategories()
      setItems(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createCategory({ name: name.trim() })
      setName('')
      toast.success('Category created')
      await load()
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.response?.data?.detail || 'Failed to create category')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <div className="flex items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 px-3 py-2 border rounded" />
        <button onClick={handleCreate} className="px-3 py-2 rounded bg-primary-600 text-white">Create</button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="space-y-2">
          {items.map(c => (
            <li key={c.id} className="text-sm">{c.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

