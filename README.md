<p align="center">
  <a href="https://github.com/mateoruizguinazu/bubble">
    <img src="resources/icon.icns" alt="Bubble" width="96" />
  </a>
</p>

<h1 align="center">Bubble — local-first screen recorder for macOS</h1>

<p align="center">
  Record your screen and webcam, trim the clip, compress to H.264. No accounts. No cloud. No subscription.
  <br />
  <a href="https://github.com/mateoruizguinazu/bubble">Website</a>
  ·
  <a href="https://github.com/mateoruizguinazu/bubble/issues">Issues</a>
  ·
  <a href="https://github.com/mateoruizguinazu/bubble/releases">Releases</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/mateoruizguinazu/bubble?labelColor=000000&style=for-the-badge&color=ea580c" alt="Stars" />
  <img src="https://img.shields.io/github/forks/mateoruizguinazu/bubble?labelColor=000000&style=for-the-badge&color=ea580c" alt="Forks" />
  <img src="https://img.shields.io/github/license/mateoruizguinazu/bubble?labelColor=000000&style=for-the-badge&color=ea580c" alt="License" />
</p>

<p align="center">
  <img src=".github/screenshots/preview.png" alt="Bubble recorder preview" width="100%" />
</p>

---

## Mission

Give developers and designers a fast, free, zero-friction way to record a screen clip with their face on it — like Loom, but private, offline, and open source.

---

## Features

- **Floating webcam bubble** — transparent, always-on-top circle visible across all Spaces and full-screen apps; drag it anywhere on screen
- **Screen & window capture** — live thumbnail picker for any display or app window; your last selection is remembered
- **Camera control** — choose a specific device, use the system default, or go camera-off
- **Mic control** — choose a specific microphone, use the system default, or record silently
- **Quality presets** — pick compression at export time: High (CRF 16, crisp text), Medium (CRF 22, balanced), Low (CRF 28, smallest file)
- **Preview & trim** — dual-range scrubber with live timestamps; fine-tune start/end to the decimal second
- **Custom save path** — export anywhere; defaults to `~/Downloads`
- **Settings persistence** — camera, mic, save path, and last-used source remembered between sessions
- **Permission onboarding** — friendly screen with a direct deep-link into macOS System Settings when access is blocked
- **Fully local** — nothing leaves your machine; no telemetry, no servers, no sign-up

---

## Screenshots

|                   Pre-flight panel                   |                  Recording + Bubble                  |
| :--------------------------------------------------: | :--------------------------------------------------: |
| ![](.github/screenshots/source-picker.png)           | ![](.github/screenshots/recording.png)               |
|                   **Preview & Trim**                 |                     **Done**                         |
| ![](.github/screenshots/preview-trim.png)            | ![](.github/screenshots/done.png)                    |

> Screenshots coming soon — contributions welcome!

---

## Getting started

### Install the app

Download the latest DMG from [Releases](https://github.com/mateoruizguinazu/bubble/releases) and drag **Bubble** to your Applications folder.

> macOS will prompt for Screen Recording and Camera/Microphone access on first launch.

### Run from source

**Prerequisites:** Node.js 18+, npm 9+

```bash
git clone https://github.com/mateoruizguinazu/bubble.git
cd bubble
npm install
npm run dev
```

### Build a distributable DMG

```bash
npm run dist
```

Produces signed-ready arm64 + x64 DMGs in `dist/`:

```
dist/Bubble-0.1.1-arm64.dmg   ← Apple Silicon
dist/Bubble-0.1.1.dmg         ← Intel
```

For notarised distribution you'll need an Apple Developer certificate — see [electron-builder code signing](https://www.electron.build/code-signing).

---

## How it works

1. **Source picker** — `desktopCapturer.getSources` runs in the main process and returns serialised thumbnails over IPC.
2. **Capture** — renderer calls `getUserMedia` with `chromeMediaSource: 'desktop'` + source ID, plus an optional mic stream, combined into a single `MediaStream`.
3. **Streaming chunks** — `MediaRecorder` fires `ondataavailable` every second; chunks are sent via IPC and appended to an `fs.WriteStream` targeting a temp `.webm`. Renderer memory stays flat for long recordings.
4. **Preview** — write stream closes; temp path returned to renderer and served via a custom `local-file://` protocol with range-request support for the HTML5 seek bar.
5. **Trim & compress** — FFmpeg transcodes with optional `-ss`/`-t` for frame-accurate trimming, encodes to H.264 at the chosen CRF, and saves to the configured folder.

---

## Built with

- [Electron](https://www.electronjs.org/)
- [electron-vite](https://electron-vite.org/)
- [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) + [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static)
- [TypeScript 5](https://www.typescriptlang.org/)

---

## Star history

<a href="https://star-history.com/#mateoruizguinazu/bubble&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=mateoruizguinazu/bubble&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=mateoruizguinazu/bubble&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=mateoruizguinazu/bubble&type=Date" width="100%" />
  </picture>
</a>

---

## Contributors

<a href="https://github.com/mateoruizguinazu/bubble/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=mateoruizguinazu/bubble" width="100%" />
</a>

---

## Contributing

Contributions are welcome. Open an [issue](https://github.com/mateoruizguinazu/bubble/issues) before starting a large PR so we can discuss the approach.

```bash
git checkout -b feat/your-feature
npm run dev       # develop
npm run dist      # verify the production build
```

Guidelines:
- One feature or fix per PR
- Don't add dependencies without prior discussion
- Test on macOS — the only supported platform

---

## Roadmap

- [ ] Code signing + notarisation
- [ ] System audio capture (ScreenCaptureKit)
- [ ] Keyboard shortcut to start/stop
- [ ] Adjustable bubble size
- [ ] GIF export

---

## License

MIT — see [LICENSE](LICENSE).
