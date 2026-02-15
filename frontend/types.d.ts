declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string)
    start(
      cameraId: string | MediaTrackConstraints,
      config?: { fps?: number; qrbox?: number; disableFlip?: boolean },
      onSuccess?: (decodedText: string) => void,
      onError?: (errorMessage: string) => void
    ): Promise<void>
    stop(): Promise<void>
    clear(): void
    static getCameras(): Promise<Array<{ id: string; label: string }>>
  }
}

declare module 'qrcode.react' {
  export const QRCodeSVG: any
}
