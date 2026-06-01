# Bubble

A free, open-source, local-first screen recorder for macOS. Record your screen and webcam together, trim the clip, and export a highly optimised H.264 MP4 directly to a folder of your choice — no accounts, no cloud, no subscription.

Think of it as a self-hosted Loom.

![Bubble recorder UI](https://github.com/mateoruizguinazu/bubble/assets/placeholder.png)

---

## Features

- **Floating webcam bubble** — transparent, always-on-top circular overlay visible across all Spaces and full-screen apps; drag it anywhere
- **Screen or window capture** — pick any display or application window from a live thumbnail picker; selection is remembered between sessions
- **Camera control** — choose a specific camera device or turn the webcam off entirely
- **Mic control** — choose a specific microphone, use the system default, or record silently
- **Quality presets** — choose compression at export time: High (CRF 16, crisp text), Medium (CRF 22, balanced), or Low (CRF 28, smallest file)
- **Preview & trim** — dual-range scrubber to set precise start/end times before exporting
- **Custom save path** — choose any folder; defaults to `~/Downloads`
- **Settings persistence** — camera, mic, save path, and last-used source are remembered via `localStorage`
- **Permission onboarding** — friendly screen-recording permission screen with a direct deep-link into System Settings
- **FFmpeg compression** — libx264, `+faststart`, yuv420p — small files that play everywhere
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
- **Control window** — source picker, pre-flight settings, recording timer, preview & trim, compression progress
- **Bubble window** — small floating webcam circle (drag it anywhere)

---

## Build a distributable DMG

```bash
npm run dist
```

Compiles all sources with electron-vite and packages both arm64 and x64 DMGs via electron-builder. Output lands in `dist/`:

```
dist/Bubble-0.1.1-arm64.dmg   ← Apple Silicon
dist/Bubble-0.1.1.dmg         ← Intel
```

For a notarised, signed build you'll need an Apple Developer certificate — see [electron-builder code signing docs](https://www.electron.build/code-signing).

---

## Project structure

```
resources/
  trayIconTemplate.png          # 1× menu-bar icon (template image)
  trayIconTemplate-2x.png       # 2× retina menu-bar icon
  icon.icns                     # App icon for the DMG

src/
  main/
    index.ts                    # App entry — tray, protocol, window lifecycle
    windows/
      controlWindow.ts          # 360×560 recording control panel
      bubbleWindow.ts           # 160×160 transparent floating bubble
    ipc/
      handlers.ts               # IPC: desktopCapturer, WriteStream, camera config, dialogs
    ffmpeg/
      transcode.ts              # fluent-ffmpeg — QualityProfile CRF map, trim, savePath
  preload/
    index.ts                    # contextBridge for the control window
    bubble.ts                   # contextBridge for the bubble window (camera IPC)
  renderer/
    index.html                  # Control window entry
    bubble.html                 # Bubble window entry
    src/
      App.tsx                   # 8-state machine: loading → sources → recording → previewing → done
      BubbleApp.tsx             # Webcam feed with live camera-config IPC + drag overlay
      hooks/
        useRecording.ts         # MediaRecorder + mic stream + chunk IPC
      components/
        SourcePicker.tsx        # Pre-flight panel: source, camera, mic, save path
        PreviewTrim.tsx         # Dual-range trim slider + quality selector
        PermissionScreen.tsx    # Permission onboarding with System Settings deep-link
      types/
        electron.d.ts           # ElectronAPI interface + QualityProfile type
      styles/
        index.css               # Tailwind + drag-region utility (control window)
        bubble.css              # Isolated Tailwind for bubble window (pins 160×160 layout)
```

---

## How it works

1. **Source picker** — `desktopCapturer.getSources` runs in the main process (Electron restriction) and returns serialised thumbnails over IPC.
2. **Pre-flight** — user picks camera device, mic device, save path, and screen source; all choices persist to `localStorage`.
3. **Capture** — renderer calls `getUserMedia` with `chromeMediaSource: 'desktop'` + the chosen source ID, plus an optional mic stream. Both are combined into a single `MediaStream`.
4. **Streaming chunks** — `MediaRecorder` fires `ondataavailable` every second. Each chunk is sent immediately to the main process via `ipcRenderer.send`, which appends it to an `fs.WriteStream` targeting a temp `.webm` file. This keeps renderer memory flat for arbitrarily long recordings.
5. **Stop & preview** — the write stream is closed and the temp path is returned to the renderer, which displays the file via a custom `local-file://` protocol with range-request support (required for the HTML5 seek bar).
6. **Trim & compress** — user picks quality preset; FFmpeg transcodes the clip with optional `-ss`/`-t` output flags for frame-accurate trimming, encodes to H.264 at the chosen CRF, and saves to the configured folder.
7. **Cleanup** — the temp `.webm` is deleted after a successful transcode.

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

- [ ] Code signing + notarisation for a distributable DMG
- [ ] System audio capture (via a virtual audio device or ScreenCaptureKit)
- [ ] Keyboard shortcut to start/stop recording
- [ ] Adjustable bubble size
- [ ] GIF export option

---

## License

MIT — see [LICENSE](LICENSE).
