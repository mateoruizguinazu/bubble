import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('sources:get'),

  startRecording: (): Promise<void> =>
    ipcRenderer.invoke('recording:start'),

  sendChunk: (chunk: ArrayBuffer): void =>
    ipcRenderer.send('recording:chunk', chunk),

  stopRecording: (): Promise<string> =>
    ipcRenderer.invoke('recording:stop'),

  transcodeRecording: (opts: { inputPath: string; startTime?: number; endTime?: number }): Promise<string> =>
    ipcRenderer.invoke('recording:transcode', opts),
})
