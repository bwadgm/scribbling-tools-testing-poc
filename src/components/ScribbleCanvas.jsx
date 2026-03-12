import { useState, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

const IMAGE_WIDTH = 785
const IMAGE_HEIGHT = 866
const MIN_ZOOM = 1

export default function ScribbleCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const bgRef = useRef(null)

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

    // 1️⃣ Clamp zoom
    if (currentZoom < MIN_ZOOM) {
      currentZoom = MIN_ZOOM
      updates.zoom = { value: MIN_ZOOM }
      updates.scrollX = 0
      updates.scrollY = 0
      needsUpdate = true
    } else {
      // 2️⃣ Clamp pan to image bounds at current zoom
      const minScrollX = -((IMAGE_WIDTH * currentZoom) - IMAGE_WIDTH) / currentZoom
      const minScrollY = -((IMAGE_HEIGHT * currentZoom) - IMAGE_HEIGHT) / currentZoom

      const clampedX = Math.max(minScrollX, Math.min(0, scrollX))
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

    // 3️⃣ Sync background image with camera
    syncBackground(
      updates.scrollX ?? scrollX,
      updates.scrollY ?? scrollY,
      currentZoom
    )
  }

  return (
    <div style={{
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      overflow: 'hidden',
      position: 'relative',
      margin: '0 auto',
    }}>

      {/* Background image synced with camera */}
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

      {/* Excalidraw transparent on top */}
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