import { app, Notification, shell } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { join, basename } from 'path'
import { unlink } from 'fs/promises'

export interface TranscodeOptions {
  inputPath: string
  startTime?: number // seconds; output option — frame-accurate
  endTime?: number   // seconds; output option — relative to input timeline
}

function resolveFFmpegPath(): string {
  const raw = ffmpegStatic
  if (!raw) throw new Error('ffmpeg-static: no binary found for this platform')
  // electron-builder extracts asarUnpack entries to app.asar.unpacked at runtime
  return app.isPackaged ? raw.replace('app.asar', 'app.asar.unpacked') : raw
}

export async function transcode({ inputPath, startTime, endTime }: TranscodeOptions): Promise<string> {
  const mp4Path = join(app.getPath('downloads'), `bubble-${Date.now()}.mp4`)

  await new Promise<void>((resolve, reject) => {
    // Trim flags are placed as OUTPUT options for frame-accurate cutting.
    // -ss skips N seconds at the start of the decoded stream.
    // -t writes exactly (endTime - startTime) seconds of output.
    const trimOpts: string[] = []
    if (startTime !== undefined && startTime > 0) {
      trimOpts.push(`-ss ${startTime}`)
    }
    if (endTime !== undefined) {
      const duration = endTime - (startTime ?? 0)
      if (duration > 0) trimOpts.push(`-t ${duration}`)
    }

    ffmpeg(inputPath)
      .setFfmpegPath(resolveFFmpegPath())
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        ...trimOpts,
        '-crf 18',              // higher fidelity for text/UI subpixel clarity
        '-preset fast',
        '-movflags +faststart', // moov atom first — instant playback on Drive/browser
        '-pix_fmt yuv420p',     // QuickTime + browser compatibility
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(mp4Path)
  })

  await unlink(inputPath)

  const notification = new Notification({
    title: 'Bubble',
    subtitle: basename(mp4Path),
    body: 'Saved to Downloads — ready to upload.',
    actions: [
      { type: 'button', text: 'Show in Finder' },
      { type: 'button', text: 'Play Video' },
    ],
  })

  notification.on('action', (_event, index) => {
    if (index === 0) {
      shell.showItemInFolder(mp4Path)
    } else {
      shell.openPath(mp4Path)
    }
  })

  notification.on('click', () => {
    shell.showItemInFolder(mp4Path)
  })

  notification.show()

  return mp4Path
}
