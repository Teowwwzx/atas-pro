import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface EventCheckInQRModalProps {
    isOpen: boolean
    onClose: () => void
    eventTitle: string
    checkInUrl: string
}

export function EventCheckInQRModal({ isOpen, onClose, eventTitle, checkInUrl }: EventCheckInQRModalProps) {

    const downloadQR = async () => {
        try {
            const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(checkInUrl)}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `checkin-qr-${eventTitle}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed', error);
        }
    }

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
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2rem] bg-white shadow-xl transition-all">
                                {/* Header */}
                                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-fuchsia-50">
                                    <div>
                                        <h3 className="text-xl font-black text-zinc-900">Event Check-in QR</h3>
                                        <p className="text-sm text-zinc-500 mt-1">{eventTitle}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-zinc-400 hover:text-zinc-600 p-2 hover:bg-white/50 rounded-full transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-8 flex flex-col items-center">
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-violet-100 mb-6">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`}
                                            alt="Check-in QR"
                                            className="w-[240px] h-[240px]"
                                        />
                                    </div>

                                    <div className="bg-zinc-50 rounded-xl p-4 w-full space-y-2 border-2 border-zinc-200 text-center mb-6">
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Direct Link</p>
                                        <p className="font-mono text-xs text-zinc-600 break-all bg-white p-2 rounded border border-zinc-200">
                                            {checkInUrl}
                                        </p>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(checkInUrl);
                                            }}
                                            className="text-xs font-bold text-violet-600 hover:underline"
                                        >
                                            Copy Link
                                        </button>
                                    </div>

                                    <div className="bg-blue-50 rounded-xl p-4 w-full border border-blue-100">
                                        <p className="text-sm text-blue-800 font-medium text-center">
                                            Share this QR code on your screen. <br /> Participants can scan to mark their attendance.
                                        </p>
                                    </div>

                                    <div className="w-full mt-6">
                                        <button
                                            onClick={downloadQR}
                                            className="w-full px-4 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download QR Image
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
