import React, { useEffect, useRef } from 'react'

export default function BubbleApp(): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(console.error)
  }, [])

  return (
    // relative container — the video fills the circle, the overlay sits on top
    <div className="w-40 h-40 rounded-full overflow-hidden bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover scale-x-[-1]"
      />
      {/*
        Transparent drag layer on top of the video.
        no-drag-region on the video element would block dragging because the video
        fills the entire circle — there is no exposed outer div edge to grab.
        An absolute overlay with drag-region fixes this without interfering with rendering.
      */}
      <div className="absolute inset-0 rounded-full drag-region cursor-move" />
    </div>
  )
}
