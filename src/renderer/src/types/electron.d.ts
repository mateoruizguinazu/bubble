export interface ScreenSource {
  id: string
  name: string
  thumbnailDataUrl: string
}

export interface TranscodeOptions {
  inputPath: string
  startTime?: number
  endTime?: number
}

export interface ElectronAPI {
  getSources: () => Promise<ScreenSource[]>
  startRecording: () => Promise<void>
  sendChunk: (chunk: ArrayBuffer) => void
  stopRecording: () => Promise<string>
  transcodeRecording: (opts: TranscodeOptions) => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
