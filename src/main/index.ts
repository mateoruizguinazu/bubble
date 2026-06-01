import { app, protocol, net, Tray, BrowserWindow, ipcMain, screen, Menu } from 'electron'
import { pathToFileURL } from 'url'
import { createControlWindow } from './windows/controlWindow'
import { createBubbleWindow } from './windows/bubbleWindow'
import { registerRecordingHandlers } from './ipc/handlers'
import { createTrayIcon } from './utils/trayIcon'

// Must be called before app.whenReady() — Chromium registers the scheme at startup
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { secure: true, standard: true, stream: true } },
])

let tray: Tray | null = null
let controlWindow: BrowserWindow | null = null
let sessionActive = false

function positionWindowUnderTray(win: BrowserWindow): void {
  if (!tray) return
  const tb = tray.getBounds()
  const [winW] = win.getSize()
  const { workArea } = screen.getDisplayNearestPoint({ x: tb.x, y: tb.y })

  // Center horizontally under the tray icon; clamp so the panel never clips off-screen
  let x = Math.round(tb.x + tb.width / 2 - winW / 2)
  const y = Math.round(tb.y + tb.height)
  x = Math.min(Math.max(workArea.x, x), workArea.x + workArea.width - winW)

  win.setPosition(x, y, false)
}

function buildTrayMenu(): Menu {
  const loginEnabled = app.getLoginItemSettings().openAtLogin
  return Menu.buildFromTemplate([
    {
      label: 'Open Bubble',
      click: () => {
        if (!controlWindow) return
        positionWindowUnderTray(controlWindow)
        controlWindow.show()
        controlWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: loginEnabled,
      // Menu is rebuilt fresh on every right-click, so no manual refresh needed
      click: () => app.setLoginItemSettings({ openAtLogin: !loginEnabled, openAsHidden: true }),
    },
    { type: 'separator' },
    { label: 'Quit Bubble', click: () => app.quit() },
  ])
}

app.whenReady().then(() => {
  // Pure menu-bar app — no Dock icon, no Cmd+Tab entry
  if (process.platform === 'darwin') app.dock.hide()

  // Serve temp WebM files to the renderer for the preview player.
  // stream: true (declared above) makes Chromium issue range requests,
  // which is required for the HTML5 video timeline scrubber to work.
  protocol.handle('local-file', (req) => {
    const filePath = decodeURIComponent(new URL(req.url).pathname)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  registerRecordingHandlers()
  createBubbleWindow()

  controlWindow = createControlWindow()

  tray = new Tray(createTrayIcon())
  tray.setToolTip('Bubble')

  // Left-click: toggle the control panel
  tray.on('click', () => {
    if (!controlWindow) return
    if (controlWindow.isVisible()) {
      controlWindow.hide()
    } else {
      positionWindowUnderTray(controlWindow)
      controlWindow.show()
      controlWindow.focus()
    }
  })

  // Right-click: context menu (rebuilt fresh each time to reflect latest login-item state)
  tray.on('right-click', () => tray?.popUpContextMenu(buildTrayMenu()))

  // Auto-hide when the panel loses focus — but never during an active session
  // (recording, preview, or compression) so the window can't vanish mid-clip.
  // The 150 ms delay lets the tray click handler run first; without it, clicking
  // the tray icon while the panel is open would trigger blur → hide and then the
  // click → show, causing a visible flicker.
  controlWindow.on('blur', () => {
    if (sessionActive) return
    setTimeout(() => {
      if (!controlWindow?.isFocused()) controlWindow?.hide()
    }, 150)
  })

  // Renderer signals when a recording session becomes active or returns to idle
  ipcMain.on('session:active', (_event, active: boolean) => {
    sessionActive = active
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
