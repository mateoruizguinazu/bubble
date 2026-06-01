export interface ScreenSource {
  id: string
  name: string
  thumbnailDataUrl: string
}

export type QualityProfile = 'high' | 'medium' | 'low'

export interface TranscodeOptions {
  inputPath: string
  startTime?: number
  endTime?: number
  qualityProfile?: QualityProfile
  savePath?: string
}

export interface ElectronAPI {
  getSources: () => Promise<ScreenSource[]>
  startRecording: () => Promise<void>
  sendChunk: (chunk: ArrayBuffer) => void
  stopRecording: () => Promise<string>
  transcodeRecording: (opts: TranscodeOptions) => Promise<string>
  setSessionActive: (active: boolean) => void
  showInFinder: (filePath: string) => void
  openScreenRecordingSettings: () => void
  selectDirectory: () => Promise<string | null>
  setCameraConfig: (deviceId: string | null) => void
  // Bubble-window only — optional so the control window's TS stays valid
  getCameraConfig?: () => Promise<string | null>
  onCameraConfigChange?: (handler: (deviceId: string | null) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
