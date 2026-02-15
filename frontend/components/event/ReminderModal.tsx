'use client'

import React, { Fragment, useState } from 'react'
import { Dialog, Transition, RadioGroup, Switch } from '@headlessui/react'

interface ReminderModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (option: string | null) => void // null means remove/disable
    onRemove?: () => void
    currentReminderId?: string
    isLoading?: boolean
    eventTitle: string
    eventStart: string
    eventEnd: string
    eventDescription?: string
    eventLocation?: string
}

const reminderOptions = [
    { id: 'one_day', title: '1 Day Before', description: '24 hours before event.' },
    { id: 'three_days', title: '3 Days Before', description: '3 days before event.' },
    { id: 'one_week', title: '1 Week Before', description: '7 days before event.' },
]

// Helper to format dates for .ics / links
const formatDate = (dateStr: string) => dateStr.replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function ReminderModal({
    isOpen,
    onClose,
    onConfirm,
    currentReminderId,
    isLoading = false,
    eventTitle,
    eventStart,
    eventEnd,
    eventDescription = '',
    eventLocation = ''
}: ReminderModalProps) {
    const [enabled, setEnabled] = useState(!!currentReminderId)
    const [selected, setSelected] = useState(
        currentReminderId
            ? reminderOptions.find(o => o.id === currentReminderId) || reminderOptions[0]
            : reminderOptions[0]
    )

    // Sync state
    React.useEffect(() => {
        setEnabled(!!currentReminderId)
        if (currentReminderId) {
            const match = reminderOptions.find(o => o.id === currentReminderId)
            if (match) setSelected(match)
        }
    }, [currentReminderId, isOpen])

    const handleSave = () => {
        if (enabled) {
            onConfirm(selected.id)
        } else {
            // If disabled but had one, remove it. If didn't have one, just close.
            if (currentReminderId) onConfirm(null)
            else onClose()
        }
    }

    const downloadIcs = () => {
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${typeof window !== 'undefined' ? window.location.href : ''}
DTSTART:${formatDate(eventStart)}
DTEND:${formatDate(eventEnd)}
SUMMARY:${eventTitle}
DESCRIPTION:${eventDescription}
LOCATION:${eventLocation}
END:VEVENT
END:VCALENDAR`
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${eventTitle}.ics`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatDate(eventStart)}/${formatDate(eventEnd)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`

    // Outlook online format
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${eventStart}&enddt=${eventEnd}&subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-zinc-100">
                                <Dialog.Title as="h3" className="text-xl font-black text-zinc-900 mb-6">
                                    Add to Calendar
                                </Dialog.Title>

                                {/* 1. External Calendars */}
                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all group">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-8 h-8 group-hover:scale-110 transition-transform" alt="Google" />
                                        <span className="text-xs font-bold text-zinc-600">Google</span>
                                    </a>
                                    <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all group">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" className="w-8 h-8 group-hover:scale-110 transition-transform" alt="Outlook" />
                                        <span className="text-xs font-bold text-zinc-600">Outlook</span>
                                    </a>
                                    <button onClick={downloadIcs} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all group">
                                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform">iCal</div>
                                        <span className="text-xs font-bold text-zinc-600">Apple/iCal</span>
                                    </button>
                                </div>

                                <div className="h-px bg-zinc-100 mb-6"></div>

                                {/* 2. Internal Email Reminder */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-zinc-900">Email Reminder</h4>
                                            <p className="text-xs text-zinc-500">Get a notification from us via email.</p>
                                        </div>
                                        <Switch
                                            checked={enabled}
                                            onChange={setEnabled}
                                            className={`${enabled ? 'bg-amber-500' : 'bg-zinc-200'}
                                                relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
                                        >
                                            <span className="sr-only">Use setting</span>
                                            <span
                                                aria-hidden="true"
                                                className={`${enabled ? 'translate-x-6' : 'translate-x-0'}
                                                    pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                                            />
                                        </Switch>
                                    </div>

                                    <Transition
                                        show={enabled}
                                        enter="transition ease-out duration-200"
                                        enterFrom="opacity-0 -translate-y-2"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 -translate-y-2"
                                    >
                                        <RadioGroup value={selected} onChange={setSelected}>
                                            <RadioGroup.Label className="sr-only">Reminder Option</RadioGroup.Label>
                                            <div className="space-y-2">
                                                {reminderOptions.map((option) => (
                                                    <RadioGroup.Option
                                                        key={option.id}
                                                        value={option}
                                                        className={({ active, checked }) =>
                                                            `${active ? 'ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-amber-300' : ''}
                                                            ${checked ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-white border-zinc-200 text-zinc-900'}
                                                            relative flex cursor-pointer rounded-xl border p-3 shadow-sm focus:outline-none transition-all`
                                                        }
                                                    >
                                                        {({ checked }) => (
                                                            <div className="flex w-full items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <div className="text-sm">
                                                                        <RadioGroup.Label
                                                                            as="p"
                                                                            className={`font-bold  ${checked ? 'text-amber-900' : 'text-zinc-900'}`}
                                                                        >
                                                                            {option.title}
                                                                        </RadioGroup.Label>
                                                                    </div>
                                                                </div>
                                                                {checked && (
                                                                    <div className="shrink-0 text-amber-600">
                                                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                                                                            <circle cx="12" cy="12" r="12" fill="currentColor" fillOpacity="0.2" />
                                                                            <path d="M7 13l3 3 7-7" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </RadioGroup.Option>
                                                ))}
                                            </div>
                                        </RadioGroup>
                                    </Transition>
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-xl border border-transparent bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 transition-colors"
                                        onClick={onClose}
                                        disabled={isLoading}
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-xl border border-transparent bg-amber-500 px-6 py-2 text-sm font-bold text-white hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors shadow-md hover:shadow-lg"
                                        onClick={handleSave}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
