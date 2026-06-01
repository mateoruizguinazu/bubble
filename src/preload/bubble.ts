import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getCameraConfig: (): Promise<string | null> =>
    ipcRenderer.invoke('camera:get-config'),

  onCameraConfigChange: (handler: (deviceId: string | null) => void): void => {
    ipcRenderer.on('camera:configure', (_event, deviceId: string | null) => handler(deviceId))
  },
})
