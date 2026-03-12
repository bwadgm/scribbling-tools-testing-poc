import { useState, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

const IMAGE_WIDTH = 785
const IMAGE_HEIGHT = 866
const MIN_ZOOM = 1
const IMAGE_ID = 'background-image'

export default function ScribbleCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const containerRef = useRef(null)

  const handleScrollChange = (scrollX, scrollY) => {
    if (!excalidrawAPI) return
    const { zoom } = excalidrawAPI.getAppState()
    let currentZoom = zoom.value
    const updates = {}
    let needsUpdate = false

    const containerW = containerRef.current?.offsetWidth || IMAGE_WIDTH
    const containerH = containerRef.current?.offsetHeight || IMAGE_HEIGHT

    // Clamp zoom - cannot go below MIN_ZOOM
    if (currentZoom < MIN_ZOOM) {
      currentZoom = MIN_ZOOM
      updates.zoom = { value: MIN_ZOOM }
      updates.scrollX = 0
      updates.scrollY = 0
      needsUpdate = true
    } else {
      // Clamp X - prevent panning outside image bounds horizontally
      const minScrollX = -((IMAGE_WIDTH * currentZoom) - containerW) / currentZoom
      const clampedX = Math.max(minScrollX, Math.min(0, scrollX))

      // Clamp Y - prevent panning outside image bounds vertically
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
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => {
          setExcalidrawAPI(api)
        }}
        onScrollChange={handleScrollChange}
        initialData={{
          elements: [
            {
              id: IMAGE_ID,
              type: 'image',
              x: 0,
              y: 0,
              width: IMAGE_WIDTH,
              height: IMAGE_HEIGHT,
              angle: 0,
              strokeColor: 'transparent',
              backgroundColor: 'transparent',
              fillStyle: 'solid',
              strokeWidth: 0,
              strokeStyle: 'solid',
              roughness: 0,
              opacity: 100,
              groupIds: [],
              frameId: null,
              roundness: null,
              seed: 1,
              version: 1,
              versionNonce: 1,
              isDeleted: false,
              boundElements: null,
              updated: Date.now(),
              link: null,
              locked: true,
              fileId: 'image2',
              scale: [1, 1],
              status: 'saved',
            },
          ],
          appState: {
            scrollX: 0,
            scrollY: 0,
            zoom: { value: MIN_ZOOM },
            viewBackgroundColor: 'transparent',
          },
          files: {
            'image2': {
              mimeType: 'image/png',
              id: 'image2',
              dataURL: '/images/image2.png',
              created: Date.now(),
            },
          },
        }}
      />
    </div>
  )
}