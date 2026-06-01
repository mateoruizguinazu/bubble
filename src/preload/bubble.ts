import { contextBridge } from 'electron'

// IPC surface for the bubble window — expanded in future steps
contextBridge.exposeInMainWorld('electronAPI', {})
