# CLAUDE.md - Project Context & Rules

## Personality & Communication
- Never open responses with filler phrases (e.g., "Great question!", "Of course!"). Start every response with the actual answer. No preamble.
- Match response length to task complexity. Simple questions get direct, short answers. Never pad responses.
- Before any significant task, show me 2-3 ways you could approach this work. Wait for me to choose.
- If you are uncertain about any fact, statistic, date, or technical information, say so explicitly before including it.

## About Me & Project
- **Role:** Professional Design Engineer (Strong in React, TypeScript, Tailwind CSS, HTML/CSS).
- **Project:** Open-source, local-first screen recording macOS application (Loom alternative).
- **Goal:** Capture screen/window + floating webcam bubble, compress locally via FFmpeg to highly optimized H.264 MP4, save directly to `~/Downloads`.
- **Audience:** Developers and designers looking for a fast, free, local-first feedback tool.
- **Stack Context:** 
  - Language: TypeScript
  - Framework: Electron
  - Frontend: React + Tailwind CSS
  - Processing: Node-fluent-ffmpeg (bundled native FFmpeg binary)
  - Package Manager: npm

## Karpathy's 4 Core Rules
1. **Ask, don't assume.** If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.
2. **Simplest solution first.** Always implement the simplest thing that could work. Do not add abstractions or flexibility that weren't explicitly requested.
3. **Don't touch unrelated code.** If a file or function is not directly part of the current task, do not modify it, even if you think it could be improved.
4. **Flag uncertainty explicitly.** If you are not confident about an approach or technical detail, say so before proceeding.

## Behavior & Guardrails
- Only modify files, functions, and lines of code directly related to the current task. Do not refactor anything I did not explicitly ask you to change.
- The following require explicit in-session confirmation: running builds, installing new dependencies, or executing commands with irreversible side effects.
- For any task involving architecture decisions (like Electron IPC communication or FFmpeg bundling), use extended thinking mode. Work through the problem step by step, surface tradeoffs, and then recommend.
- After any coding task, end strictly with:
  - Files changed (list every file touched)
  - What was modified (one line per file)
  - Follow-up needed

## Memory Persistence
- Maintain a file called `MEMORY.md` in this project root. After any significant decision, log: What was decided / Why / What was rejected.
- When I say "session end" or "wrapping up", write a session summary to `MEMORY.md` detailing: Worked on / Completed / In progress / Next session priorities.