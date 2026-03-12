import { useState, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

const IMAGE_WIDTH = 785
const IMAGE_HEIGHT = 866
const MIN_ZOOM = 1

export default function ScribbleCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const bgRef = useRef(null)
  const containerRef = useRef(null) // 👈 track actual container size

  const syncBackground = (scrollX, scrollY, zoom) => {
    if (!bgRef.current) return
    bgRef.current.style.transform = `translate(${scrollX * zoom}px, ${scrollY * zoom}px) scale(${zoom})`
  }

  const handleScrollChange = (scrollX, scrollY) => {
    if (!excalidrawAPI) return
    const { zoom } = excalidrawAPI.getAppState()
    let currentZoom = zoom.value
    const updates = {}
    let needsUpdate = false

    // 👇 use actual container dimensions, not IMAGE dimensions
    const containerW = containerRef.current?.offsetWidth || IMAGE_WIDTH
    const containerH = containerRef.current?.offsetHeight || IMAGE_HEIGHT

    // 1️⃣ Clamp zoom
    if (currentZoom < MIN_ZOOM) {
      currentZoom = MIN_ZOOM
      updates.zoom = { value: MIN_ZOOM }
      updates.scrollX = 0
      updates.scrollY = 0
      needsUpdate = true
    } else {
      // 2️⃣ Clamp X — horizontal stays exactly as before
      const minScrollX = -((IMAGE_WIDTH * currentZoom) - containerW) / currentZoom
      const clampedX = Math.max(minScrollX, Math.min(0, scrollX))

      // 3️⃣ Clamp Y — use containerH so bottom of image is reachable
      const minScrollY = -((IMAGE_HEIGHT * currentZoom) - containerH) / currentZoom
      const clampedY = Math.max(minScrollY, Math.min(0, scrollY))

      if (clampedX !== scrollX || clampedY !== scrollY) {
        updates.scrollX = clampedX
        updates.scrollY = clampedY
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      excalidrawAPI.updateScene({ appState: updates })
    }

    syncBackground(
      updates.scrollX ?? scrollX,
      updates.scrollY ?? scrollY,
      currentZoom
    )
  }

  return (
    <div
      ref={containerRef} // 👈 ref to get actual size
      style={{
        width: '100%',   // 👈 fill modal width
        height: '100%',  // 👈 fill modal canvas area
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <img
        ref={bgRef}
        src="/images/image2.png"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Excalidraw
          excalidrawAPI={(api) => {
            setExcalidrawAPI(api)
            syncBackground(0, 0, MIN_ZOOM)
          }}
          onScrollChange={handleScrollChange}
          initialData={{
            appState: {
              scrollX: 0,
              scrollY: 0,
              zoom: { value: MIN_ZOOM },
              viewBackgroundColor: 'transparent',
            }
          }}
        />
      </div>
    </div>
  )
}