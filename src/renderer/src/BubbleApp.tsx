import React, { useEffect, useRef, useState } from 'react'

export default function BubbleApp(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraOff, setCameraOff] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  // Ref so the live-config handler always has the latest stream to stop
  const activeStreamRef = useRef<MediaStream | null>(null)

  const startCamera = async (deviceId: string | null): Promise<void> => {
    // Stop whatever was running
    activeStreamRef.current?.getTracks().forEach((t) => t.stop())
    activeStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null

    if (deviceId === null) {
      setCameraOff(true)
      setCameraError(false)
      return
    }

    setCameraOff(false)
    setCameraError(false)

    try {
      const constraints: MediaStreamConstraints =
        deviceId === ''
          ? { video: true, audio: false }
          : { video: { deviceId: { exact: deviceId } }, audio: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      activeStreamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setCameraError(true)
    }
  }

  useEffect(() => {
    // Read initial config from main process, then start the appropriate camera
    const init = async (): Promise<void> => {
      const deviceId = await window.electronAPI.getCameraConfig?.() ?? ''
      await startCamera(deviceId)
    }
    init()

    // Listen for live config changes (e.g. user changed camera during a session)
    window.electronAPI.onCameraConfigChange?.(startCamera)

    return () => {
      activeStreamRef.current?.getTracks().forEach((t) => t.stop())
      const video = videoRef.current
      if (video) video.srcObject = null
    }
  }, [])

  return (
    <div className="w-40 h-40 rounded-full overflow-hidden bg-black relative ring-1 ring-white/30">
      {cameraOff ? (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950">
          <p className="text-[10px] text-zinc-600 text-center px-4 leading-relaxed">Camera off</p>
        </div>
      ) : cameraError ? (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
          <p className="text-[10px] text-zinc-600 text-center px-4 leading-relaxed">
            Camera unavailable
          </p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
      )}
      {/* Primary glossy crescent — top-right quadrant */}
      <div className="absolute top-1.5 right-3 w-7 h-3 rounded-full bg-gradient-to-b from-white/55 to-transparent rotate-[15deg] blur-[0.5px] pointer-events-none" />
      {/* Secondary specular dot */}
      <div className="absolute top-2.5 right-7 w-1.5 h-1.5 rounded-full bg-white/70 blur-[0.2px] pointer-events-none" />
      {/* Bottom-left inner reflection */}
      <div className="absolute bottom-1.5 left-3 w-5 h-2 rounded-full bg-white/10 blur-[1px] pointer-events-none" />
      {/*
        Transparent drag layer on top of everything.
        Without this, the video element blocks all drag events since it fills the
        entire circle and -webkit-app-region: no-drag is its default behaviour.
      */}
      <div className="absolute inset-0 rounded-full drag-region cursor-move" />
    </div>
  )
}
