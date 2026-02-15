'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'react-hot-toast'
import { adminService } from '@/services/admin.service'
import type { EmailTemplate } from '@/services/api.types'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { Pagination } from '@/components/ui/Pagination'

export default function AdminEmailTemplatesPage() {
  const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const { data, error, isLoading, mutate } = useSWR('admin-email-templates', async () => {
    try {
      return await adminService.getEmailTemplates()
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 404) return []
      throw e
    }
  })
  const [search, setSearch] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [testSend, setTestSend] = useState<{ id: string; email: string; vars: string } | null>(null)
  const [form, setForm] = useState<{ name: string; subject: string; body_html: string; sample_vars: string }>({ name: '', subject: '', body_html: '', sample_vars: '{"user_name":"Alice","event_title":"Tech Week"}' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const templates = (data || []) as EmailTemplate[]
  const filtered = useMemo(() => templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())), [templates, search])

  // Client-side pagination
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const totalPages = Math.ceil(filtered.length / pageSize)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        subject: editing.subject,
        body_html: editing.body_html,
        sample_vars: '{"user_name":"Alice","event_title":"Tech Week"}'
      })
    } else {
      setForm({ name: '', subject: '', body_html: '', sample_vars: '{"user_name":"Alice","event_title":"Tech Week"}' })
    }
  }, [editing])

  const compilePreview = () => {
    let html = form.body_html || ''
    let vars: Record<string, string> = {}
    try {
      vars = JSON.parse(form.sample_vars || '{}')
      Object.entries(vars).forEach(([k, v]) => {
        html = html.replaceAll(`{{${k}}}`, String(v))
      })
    } catch { }
    const cta = vars['verification_link']
      ? `<p style="text-align:center;margin-top:16px;"><a href="${vars['verification_link']}" style="display:inline-block;background:#facc15;color:#0f172a;padding:12px 20px;border-radius:9999px;font-weight:800;text-decoration:none">Verify Email</a></p>`
      : vars['reset_link']
        ? `<p style="text-align:center;margin-top:16px;"><a href="${vars['reset_link']}" style="display:inline-block;background:#facc15;color:#0f172a;padding:12px 20px;border-radius:9999px;font-weight:800;text-decoration:none">Reset Password</a></p>`
        : ''
    const wrapped = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="color-scheme" content="light"/><title>${form.subject || 'ATAS'}</title></head>
    <body style="background:#fafafa;margin:0;padding:24px;font-family:Inter,Arial,sans-serif;color:#0f172a">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;padding:0;border:1px solid #e5e7eb">
        <div style="display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid #f1f5f9;background:#fef3c7;border-radius:16px 16px 0 0">
          <div style="width:36px;height:36px;border-radius:9999px;background:#18181b;color:#facc15;display:flex;align-items:center;justify-content:center;font-weight:800">A</div>
          <div style="font-weight:900;font-size:18px;color:#0f172a">ATAS</div>
        </div>
        <div style="padding:24px">
          <div style="font-weight:800;font-size:18px;margin-bottom:12px">${form.subject || ''}</div>
          <div style="font-size:16px;line-height:1.6">${html}</div>
          ${cta}
          <div style="font-size:12px;color:#475569;margin-top:24px;border-top:1px solid #f1f5f9;padding-top:12px">This email was sent by ATAS. If you did not request this, you can safely ignore it.</div>
        </div>
      </div>
    </body></html>`
    setPreviewHtml(wrapped)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (editing?.id) {
        await adminService.updateEmailTemplate(editing.id, { subject: form.subject, body_html: form.body_html })
        toast.success('Template updated')
      } else {
        await adminService.createEmailTemplate({ name: form.name, subject: form.subject, body_html: form.body_html })
        toast.success('Template created')
      }
      setEditing(null)
      mutate()
    } catch (err) {
      toast.error('Failed to save template')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminService.deleteEmailTemplate(deleteId)
      toast.success('Template deleted')
      setDeleteId(null)
      mutate()
    } catch (err) {
      toast.error('Failed to delete template')
      console.error(err)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Email Templates</h1>
          <p className="text-gray-700 mt-2">Manage and preview email templates used by the system</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 text-base focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
          />
        </div>
        <button
          onClick={() => setEditing({ id: '', name: '', subject: '', body_html: '', variables: [] })}
          className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-xl font-bold hover:bg-yellow-300"
        >
          + New Template
        </button>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
          className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-medium"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Name</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Subject</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Updated</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={4} className="px-6 py-6 text-gray-700">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={4} className="px-6 py-6 text-gray-700">No templates available</td></tr>
              )}
              {paginated.map(t => (
                <tr key={t.id}>
                  <td className="px-6 py-4 text-gray-900 font-medium">{toTitle(t.name)}</td>
                  <td className="px-6 py-4 text-gray-800">{t.subject}</td>
                  <td className="px-6 py-4 text-gray-700 text-sm">{t.updated_at ? new Date(t.updated_at).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditing(t) }} className="px-3 py-2 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
                      <button onClick={() => { setForm({ name: t.name, subject: t.subject, body_html: t.body_html, sample_vars: form.sample_vars }); compilePreview() }} className="px-3 py-2 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">Preview</button>
                      <button onClick={() => setTestSend({ id: t.id, email: '', vars: '{\"user_name\":\"Alice\",\"verification_link\":\"https://example.com/verify\"}' })} className="px-3 py-2 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50">Send Test</button>
                      <button onClick={() => setDeleteId(t.id)} className="px-3 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && !isLoading && !error && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-700">No templates</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={pageSize}
        />
      </div>

      <Dialog.Root open={!!editing} onOpenChange={() => setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-2xl outline-none">
            <Dialog.Title className="text-xl font-black text-gray-900 mb-4 tracking-tight">{editing?.id ? 'Edit Template' : 'New Template'}</Dialog.Title>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {!editing?.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="welcome_email" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Subject</label>
                <input value={form.subject} onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="Welcome to ATAS" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Body HTML</label>
                <textarea value={form.body_html} onChange={(e) => setForm(prev => ({ ...prev, body_html: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-48 font-mono text-sm text-gray-900" placeholder="<p>Hello {{user_name}}</p>" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Sample Variables (JSON)</label>
                <textarea value={form.sample_vars} onChange={(e) => setForm(prev => ({ ...prev, sample_vars: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 font-mono text-sm text-gray-900" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={compilePreview} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900">Preview</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-lg font-bold hover:bg-yellow-300">
                  {isSubmitting ? (editing?.id ? 'Updating...' : 'Creating...') : (editing?.id ? 'Save' : 'Create Template')}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-3xl outline-none">
            <Dialog.Title className="text-xl font-black text-gray-900 mb-4 tracking-tight">Preview</Dialog.Title>
            <div className="border border-gray-200 rounded-xl p-5 prose prose-sm md:prose text-gray-900 max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Delete this template?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <Dialog.Root open={!!testSend} onOpenChange={() => setTestSend(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl z-50 w-full max-w-xl outline-none">
            <Dialog.Title className="text-xl font-black text-gray-900 mb-4 tracking-tight">Send Test Email</Dialog.Title>
            {testSend && (
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const vars = JSON.parse(testSend.vars || '{}')
                  // @ts-ignore - implement endpoint server-side
                  await adminService.testSendEmailTemplate(testSend.id, testSend.email, vars)
                  toast.success('Test email sent')
                  setTestSend(null)
                } catch (err) {
                  toast.error('Failed to send test')
                  console.error(err)
                }
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Recipient Email</label>
                  <input value={testSend.email} onChange={(e) => setTestSend(prev => prev ? { ...prev, email: e.target.value } : prev)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" type="email" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Variables (JSON)</label>
                  <textarea value={testSend.vars} onChange={(e) => setTestSend(prev => prev ? { ...prev, vars: e.target.value } : prev)} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 font-mono text-sm text-gray-900" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setTestSend(null)} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-yellow-400 text-zinc-900 rounded-lg font-bold hover:bg-yellow-300">Send</button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
