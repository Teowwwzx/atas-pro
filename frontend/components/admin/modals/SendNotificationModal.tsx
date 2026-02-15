'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import useSWR from 'swr'
import { toast } from 'react-hot-toast'
import { adminService } from '@/services/admin.service'
import { URLPicker } from '@/components/admin/URLPicker'
import { PaperPlaneIcon } from '@radix-ui/react-icons'

interface SendNotificationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function SendNotificationModal({ isOpen, onClose, onSuccess }: SendNotificationModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_role: '',
        link_url: ''
    })
    const { data: templates } = useSWR('admin-email-templates', () => adminService.getEmailTemplates())
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [templateVars, setTemplateVars] = useState<string>('')
    const [alsoSendEmail, setAlsoSendEmail] = useState<boolean>(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate in-app notification fields (always required)
        if (!formData.title || !formData.content) {
            toast.error('Title and content are required')
            return
        }

        setIsLoading(true)
        try {
            // Always send in-app notification (primary action)
            const res = await adminService.broadcastNotification({
                title: formData.title,
                content: formData.content,
                target_role: formData.target_role || undefined,
                link_url: formData.link_url || undefined
            })
            toast.success(`Notification sent to ${res.count} users`)

            // Optionally send email if checkbox checked and template selected
            if (alsoSendEmail && selectedTemplateId) {
                let vars: Record<string, string> = {}
                try { vars = JSON.parse(templateVars || '{}') } catch { }
                const emailRes = await adminService.broadcastEmailTemplate({
                    template_id: selectedTemplateId,
                    variables: vars,
                    target_role: formData.target_role || undefined,
                })
                toast.success(`Email also sent to ${emailRes.count} users`)
            }

            // Reset form and close
            setFormData({ title: '', content: '', target_role: '', link_url: '' })
            setSelectedTemplateId('')
            setTemplateVars('')
            setAlsoSendEmail(false)
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Failed to send notification')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl z-50 max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                        Send Notification
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="e.g., System Maintenance"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Message Content *
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all h-32 resize-none"
                                placeholder="Type your message here..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Role (Optional)
                                </label>
                                <select
                                    value={formData.target_role}
                                    onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                                    className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                >
                                    <option value="">All Users</option>
                                    <option value="student">Students</option>
                                    <option value="teacher">Teachers</option>
                                    <option value="organizer">Organizers</option>
                                    <option value="admin">Admins</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Link URL (Optional)
                                </label>
                                <URLPicker
                                    value={formData.link_url}
                                    onChange={(url) => setFormData({ ...formData, link_url: url })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    id="alsoSendEmail"
                                    type="checkbox"
                                    checked={alsoSendEmail}
                                    onChange={(e) => setAlsoSendEmail(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="alsoSendEmail" className="text-sm font-medium text-gray-700">
                                    Also send as email (select template)
                                </label>
                            </div>

                            {alsoSendEmail && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Template
                                        </label>
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => {
                                                setSelectedTemplateId(e.target.value)
                                                // Auto-fill template variables based on template name
                                                const template = (templates || []).find(t => t.id === e.target.value)
                                                if (template) {
                                                    if (template.name.includes('verification')) {
                                                        setTemplateVars('{"user_name":"User","verification_link":"https://atas.com/verify"}')
                                                    } else if (template.name.includes('reset') || template.name.includes('password')) {
                                                        setTemplateVars('{"user_name":"User","reset_link":"https://atas.com/reset-password"}')
                                                    } else if (template.name.includes('event') || template.name.includes('invitation')) {
                                                        setTemplateVars('{"user_name":"User","event_title":"Event Name","event_link":"https://atas.com/events/123"}')
                                                    } else if (template.name.includes('moderation')) {
                                                        setTemplateVars('{"user_name":"User","event_title":"Event Name"}')
                                                    } else {
                                                        setTemplateVars('{"user_name":"User"}')
                                                    }
                                                }
                                            }}
                                            className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        >
                                            <option value="">Select template</option>
                                            {(templates || []).map(t => (
                                                <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedTemplateId && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-700">Template Variables <span className="text-gray-400 font-normal">(Auto-filled, edit if needed)</span></label>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTemplateVars('{"user_name":"User","event_title":"Event","event_link":"https://atas.com/events/123"}')}
                                                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                                        title="Event template"
                                                    >
                                                        Event
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTemplateVars('{"user_name":"User","verification_link":"https://atas.com/verify"}')}
                                                        className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                                        title="Verification template"
                                                    >
                                                        Verify
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTemplateVars('{"user_name":"User"}')}
                                                        className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                                                        title="Basic template"
                                                    >
                                                        Basic
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={templateVars}
                                                onChange={(e) => setTemplateVars(e.target.value)}
                                                className="text-gray-700 w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all h-20 font-mono text-xs"
                                                placeholder='{"user_name":"Alice","verification_link":"https://..."}'
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                💡 Use the preset buttons above or edit the JSON. Variables like <code className="bg-gray-100 px-1 rounded">user_name</code>, <code className="bg-gray-100 px-1 rounded">event_title</code>, <code className="bg-gray-100 px-1 rounded">event_link</code> will be replaced in the email.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    'Sending...'
                                ) : (
                                    <>
                                        <PaperPlaneIcon className="w-4 h-4" />
                                        Send Notification{alsoSendEmail && selectedTemplateId ? ' + Email' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
