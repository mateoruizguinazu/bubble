# Bubble — Project Memory

## [Step 2] Recording architecture: streaming chunks via IPC (Option B)

**Decided:** Raw `MediaRecorder` chunks are sent from the renderer to the main process immediately on each `ondataavailable` event via `ipcRenderer.send('recording:chunk', buffer)`. The main process holds an open `fs.WriteStream` and appends each chunk as it arrives.

**Why:** Memory-safe regardless of recording length. Buffering the full recording in renderer RAM (Option A) would break on recordings longer than ~5 minutes.

**Rejected:**
- Option A (buffer-then-send): Full recording in renderer memory, risky for long clips.
- Option C (preload-exposed `fs.appendFile`): Bypasses the main-process IPC boundary, exposes a Node.js write surface directly to the renderer — wrong for an open-source app.

**Ordering guarantee:** Electron IPC is FIFO within a renderer–main pair. `recording:chunk` messages are always processed before the subsequent `recording:stop` invoke, so no chunk-loss race condition exists.

**Pending chunk safety:** The renderer awaits all in-flight `arrayBuffer()` promises via `Promise.all(pendingChunks.current)` inside `recorder.onstop` before calling `stopRecording()`, ensuring the last chunk is always dispatched before the write stream is closed.
