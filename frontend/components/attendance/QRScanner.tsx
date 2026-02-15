'use client'

import React, { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
    fps?: number
    qrbox?: number
    disableFlip?: boolean
    qrCodeSuccessCallback: (decodedText: string) => void
}

export default function QRScanner({
    fps = 10,
    qrbox = 250,
    disableFlip = false,
    qrCodeSuccessCallback
}: QRScannerProps) {
    const callbackRef = useRef(qrCodeSuccessCallback)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const isScanning = useRef(false)

    useEffect(() => {
        callbackRef.current = qrCodeSuccessCallback
    }, [qrCodeSuccessCallback])

    useEffect(() => {
        const startScanner = async () => {
            // Prevent duplicate initialization
            if (isScanning.current) return

            try {
                // Ensure previous instance is cleaned up if any (safety check)
                if (scannerRef.current) {
                    await scannerRef.current.stop().catch(() => { })
                    scannerRef.current.clear()
                }

                const scanner = new Html5Qrcode('qr-reader')
                scannerRef.current = scanner

                // Get available cameras
                const cameras = await Html5Qrcode.getCameras() as Array<{ id: string; label: string }>

                if (cameras && cameras.length > 0) {
                    // Prefer back camera for mobile devices
                    const backCamera = cameras.find((camera: { id: string; label: string }) =>
                        camera.label.toLowerCase().includes('back') ||
                        camera.label.toLowerCase().includes('rear')
                    )
                    const cameraId = backCamera ? backCamera.id : cameras[0].id

                    isScanning.current = true

                    await scanner.start(
                        cameraId,
                        {
                            fps: fps,
                            qrbox: qrbox,
                        },
                        (decodedText: string) => {
                            // Success callback using the Ref
                            if (callbackRef.current) {
                                callbackRef.current(decodedText)
                            }
                        },
                        (errorMessage: string) => {
                            // Error callback (can be ignored for continuous scanning)
                            // Only log critical errors
                            // dbg: check if error is just 'not found'
                        }
                    )
                } else {
                    console.error('No cameras found')
                }
            } catch (err: unknown) {
                console.error('Failed to start QR scanner:', err)
                isScanning.current = false
            }
        }

        // Slight delay to ensure DOM is ready and prevent rapid mount/unmount issues
        const timer = setTimeout(startScanner, 100)

        // Cleanup on unmount
        return () => {
            clearTimeout(timer)
            if (scannerRef.current) {
                const scanner = scannerRef.current
                scannerRef.current = null // Detach immediately
                isScanning.current = false

                scanner.stop()
                    .then(() => scanner.clear())
                    .catch((err: unknown) => console.warn('Scanner stop error:', err))
            }
        }
    }, [fps, qrbox]) // Removed qrCodeSuccessCallback dependency

    return (
        <div className="relative">
            <div
                id="qr-reader"
                className="rounded-2xl overflow-hidden shadow-lg border-4 border-blue-200"
            />
            <div className="mt-4 text-center">
                <p className="text-xs text-zinc-500 font-medium">
                    📸 Camera active - position QR code in the frame
                </p>
            </div>
        </div>
    )
}
