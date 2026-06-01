import { app, protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { createControlWindow } from './windows/controlWindow'
import { createBubbleWindow } from './windows/bubbleWindow'
import { registerRecordingHandlers } from './ipc/handlers'

// Must be called before app.whenReady() — Chromium registers the scheme at startup
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { secure: true, standard: true, stream: true } },
])

app.whenReady().then(() => {
  // Serve temp files to the renderer for the preview player.
  // stream: true (declared above) makes Chromium issue range requests,
  // which is required for the HTML5 video timeline scrubber to work.
  protocol.handle('local-file', (req) => {
    // Use the URL parser rather than string slicing — standard-scheme normalisation
    // can mangle a bare triple-slash URL, but a host ("localhost") is always kept.
    // pathname gives the absolute path with its leading slash intact.
    const filePath = decodeURIComponent(new URL(req.url).pathname)
    console.log('[Main] Protocol intercepting path:', filePath)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  registerRecordingHandlers()
  createControlWindow()
  createBubbleWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
