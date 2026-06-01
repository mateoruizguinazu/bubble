import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createBubbleWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 160,
    height: 160,
    x: 40,
    y: 40,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    // Disable native macOS corner rounding — CSS handles the circular clip
    roundedCorners: false,
    webPreferences: {
      preload: join(__dirname, '../preload/bubble.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/bubble.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/bubble.html'))
  }

  return win
}
