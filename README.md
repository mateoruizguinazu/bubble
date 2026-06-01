# Bubble

A free, open-source, local-first screen recorder for macOS. Record your screen and webcam together, trim the clip, and export a highly optimised H.264 MP4 directly to `~/Downloads` — no accounts, no cloud, no subscription.

Think of it as a self-hosted Loom.

![Bubble recorder UI](https://github.com/mateoruizguinazu/bubble/assets/placeholder.png)

---

## Features

- **Floating webcam bubble** — transparent, always-on-top circular overlay you can drag anywhere on screen
- **Screen or window capture** — pick any display or application window from a live thumbnail picker
- **Mic audio** — system microphone mixed in automatically
- **Preview & trim** — scrub the recording before exporting; set precise start/end times
- **FFmpeg compression** — libx264 CRF 18, `+faststart`, yuv420p — small files that play everywhere
- **Saves to `~/Downloads`** — no configuration, just record and share
- **Interactive notification** — "Show in Finder" / "Play Video" action buttons after export
- **Fully local** — nothing leaves your machine

---

## Requirements

- macOS 12 Monterey or later (arm64 or x64)
- Node.js 18+
- npm 9+

> Screen recording and camera/microphone permissions are requested at runtime by macOS.

---

## Getting started

```bash
# 1. Clone
git clone https://github.com/mateoruizguinazu/bubble.git
cd bubble

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run dev
```

The app opens two windows:
- **Control window** — source picker, recording timer, preview & trim, compression progress
- **Bubble window** — small floating webcam circle (drag it anywhere)

---

## Build a distributable DMG

```bash
npm run build
```

This produces a signed-ready `out/` directory. To package into a `.dmg`:

```bash
npx electron-builder --mac dmg
```

Output lands in `dist/`. For a notarised, signed build you'll need an Apple Developer certificate — see [electron-builder code signing docs](https://www.electron.build/code-signing).

---

## Project structure

```
src/
  main/
    index.ts              # App entry — registers local-file:// protocol, creates windows
    windows/
      controlWindow.ts    # 360×560 recording control panel
      bubbleWindow.ts     # 160×160 transparent floating bubble
    ipc/
      handlers.ts         # IPC bridge: desktopCapturer, WriteStream, chunk handling
    ffmpeg/
      transcode.ts        # fluent-ffmpeg wrapper — libx264 CRF 18, trim, notification
  preload/
    index.ts              # contextBridge for control window
    bubble.ts             # contextBridge for bubble window
  renderer/
    index.html            # Control window entry
    bubble.html           # Bubble window entry
    src/
      App.tsx             # 7-state recording machine (loading → sources → recording → ...)
      BubbleApp.tsx       # Webcam feed + drag overlay
      types/
        electron.d.ts     # ElectronAPI interface declarations
      styles/
        index.css         # Tailwind + -webkit-app-region utilities
```

---

## How it works

1. **Source picker** — `desktopCapturer.getSources` runs in the main process (Electron restriction) and returns serialised thumbnails over IPC.
2. **Capture** — renderer calls `getUserMedia` with `chromeMediaSource: 'desktop'` + the chosen source ID, plus a separate mic stream. Both are combined into a `MediaStream`.
3. **Streaming chunks** — `MediaRecorder` fires `ondataavailable` every second. Each chunk is sent immediately to the main process via `ipcRenderer.send`, which appends it to an `fs.WriteStream` targeting a temp `.webm` file. This keeps renderer memory flat for arbitrarily long recordings.
4. **Stop & preview** — the write stream is closed and the temp path is returned to the renderer, which displays the file via a custom `local-file://` protocol with range-request support (required for the HTML5 seek bar).
5. **Trim & compress** — FFmpeg transcodes the clip with optional `-ss`/`-t` output flags for frame-accurate trimming, encodes to H.264, and saves to `~/Downloads`.
6. **Cleanup** — the temp `.webm` is deleted after a successful transcode.

---

## Stack

| Layer | Technology |
|---|---|
| Shell | Electron 31 |
| Build | electron-vite 2 |
| Frontend | React 18 + Tailwind CSS 3 |
| Video processing | fluent-ffmpeg + ffmpeg-static (bundled) |
| Language | TypeScript 5 |

---

## Contributing

Contributions are welcome. Please open an issue before starting a large PR so we can discuss the approach.

```bash
# Fork → clone → branch
git checkout -b feat/your-feature

# Make changes, then
npm run dev   # verify it works

# Push and open a PR against main
```

A few guidelines:
- Keep changes focused — one feature or fix per PR
- Don't add dependencies without discussing first
- Test on macOS (the only supported platform)

---

## Roadmap

- [ ] electron-builder code signing + notarisation for a distributable DMG
- [ ] GIF export option
- [ ] Adjustable bubble size
- [ ] Keyboard shortcut to start/stop recording
- [ ] System audio capture (via a virtual audio device or ScreenCaptureKit)

---

## License

MIT — see [LICENSE](LICENSE).
