import { ipcMain, desktopCapturer, systemPreferences, shell } from 'electron'
import { createWriteStream, WriteStream } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { transcode, TranscodeOptions } from '../ffmpeg/transcode'

let activeStream: WriteStream | null = null
let activePath: string | null = null

export function registerRecordingHandlers(): void {
  ipcMain.handle('sources:get', async () => {
    // On macOS, 'denied' means getSources would return blank thumbnails — throw early.
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen')
      if (status === 'denied') {
        throw new Error(
          'Screen recording permission denied. Enable it in System Settings → Privacy & Security → Screen Recording, then restart.'
        )
      }
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    })

    // NativeImage must be serialised to a data URL before crossing the IPC boundary
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnailDataUrl: s.thumbnail.toDataURL(),
    }))
  })

  ipcMain.handle('recording:start', () => {
    activePath = join(tmpdir(), `bubble-${Date.now()}.webm`)
    activeStream = createWriteStream(activePath)
  })

  // Fire-and-forget — IPC ordering guarantees all chunks arrive before recording:stop
  ipcMain.on('recording:chunk', (_event, chunk: Buffer) => {
    if (activeStream && !activeStream.destroyed) {
      activeStream.write(Buffer.from(chunk))
    }
  })

  // Returns the raw .webm path — no transcoding here so the renderer can show a preview
  ipcMain.handle('recording:stop', () =>
    new Promise<string>((resolve, reject) => {
      if (!activeStream || !activePath) {
        reject(new Error('No active recording session'))
        return
      }
      const webmPath = activePath
      activeStream.end(() => {
        activeStream = null
        activePath = null
        resolve(webmPath)
      })
    })
  )

  // Called after the user has reviewed and optionally trimmed the preview
  ipcMain.handle('recording:transcode', (_event, opts: TranscodeOptions) =>
    transcode(opts)
  )

  // Fire-and-forget — opens the file's parent folder with the file selected
  ipcMain.on('shell:show-in-folder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
