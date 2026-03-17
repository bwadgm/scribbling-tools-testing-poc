import { useState, useRef, useEffect } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { exportToBlob } from '@excalidraw/excalidraw'
import {
  restoreAppState,
  restoreElements,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

const GAP_BETWEEN_IMAGES = 20

// List of images to load from public/images folder
const IMAGE_PATHS = [
  '/images/image2.png',
  '/images/image4.png',
]

// Helper to load image and get dimensions
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight})
    img.onerror = reject
    img.src = src
  })
}

export default function ScribbleCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [minZoom, setMinZoom] = useState(1)
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load all images and calculate dimensions
  useEffect(() => {
    const loadAllImages = async () => {
      try {
        const loadedImages = await Promise.all(
          IMAGE_PATHS.map(path => loadImage(path))
        )

        // Find minimum width across all images
        const minWidth = Math.min(...loadedImages.map(img => img.width))

        // Scale all images to minWidth and calculate positions
        let currentY = 0
        const scaledImages = loadedImages.map((img, index) => {
          const scale = minWidth / img.width
          const scaledHeight = img.height * scale
          const scaledWidth = minWidth

          const imageInfo = {
            id: `image-${index}`,
            src: img.src,
            x: 0,
            y: currentY,
            width: scaledWidth,
            height: scaledHeight,
            originalWidth: img.width,
            originalHeight: img.height,
          }

          currentY += scaledHeight + GAP_BETWEEN_IMAGES

          return imageInfo
        })

        const totalHeight = currentY - GAP_BETWEEN_IMAGES // Remove last gap

        setImageData({
          images: scaledImages,
          minWidth,
          totalHeight,
        })
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load images:', error)
        setIsLoading(false)
      }
    }

    loadAllImages()
  }, [])

  // Calculate dynamic MIN_ZOOM based on container width
  useEffect(() => {
    if (!imageData || !containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const calculatedMinZoom = containerWidth / imageData.minWidth
    setMinZoom(calculatedMinZoom)
  }, [imageData])

  const handleScrollChange = (scrollX, scrollY) => {
    if (!excalidrawAPI || !imageData) return
    const { zoom } = excalidrawAPI.getAppState()
    let currentZoom = zoom.value
    const updates = {}

    let needsUpdate = false

    const containerW = containerRef.current?.offsetWidth || imageData.minWidth
    const containerH = containerRef.current?.offsetHeight || imageData.totalHeight

    // Clamp zoom - cannot go below minZoom (dynamically calculated)
    if (currentZoom < minZoom) {
      currentZoom = minZoom
      const minScrollX = -((imageData.minWidth * currentZoom) - containerW) / currentZoom
      const minScrollY = -((imageData.totalHeight * currentZoom) - containerH) / currentZoom
      const clampedX = Math.max(minScrollX, Math.min(0, scrollX))
      const clampedY = Math.max(minScrollY, Math.min(0, scrollY))

      updates.zoom = { value: minZoom }
      updates.scrollX = clampedX
      updates.scrollY = clampedY
      needsUpdate = true
    } else {
      // Clamp X - prevent panning outside image bounds horizontally
      const minScrollX = -((imageData.minWidth * currentZoom) - containerW) / currentZoom
      const clampedX = Math.max(minScrollX, Math.min(0, scrollX))

      // Clamp Y - prevent panning outside combined image bounds vertically
      const minScrollY = -((imageData.totalHeight * currentZoom) - containerH) / currentZoom
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

  const saveSceneAsJSON = () => {
    if (!excalidrawAPI) return

    const serializedScene = serializeAsJSON(
      excalidrawAPI.getSceneElements(),
      excalidrawAPI.getAppState(),
      excalidrawAPI.getFiles(),
      'local',
    )

    const blob = new Blob([serializedScene], {
      type: 'application/json',
    })

    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'scribble-scene.excalidraw'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const loadSceneFromFile = async (event) => {
    const file = event.target.files?.[0]

    if (!file || !excalidrawAPI || !imageData) {
      return
    }

    try {
      const fileText = await file.text()
      const parsedScene = JSON.parse(fileText)
      const restoredElements = restoreElements(parsedScene.elements, null)
      const restoredAppState = restoreAppState(parsedScene.appState, null)
      const nextZoom = Math.max(restoredAppState.zoom.value, minZoom)
      const containerW = containerRef.current?.offsetWidth || imageData.minWidth
      const containerH = containerRef.current?.offsetHeight || imageData.totalHeight
      const minScrollX = -((imageData.minWidth * nextZoom) - containerW) / nextZoom
      const minScrollY = -((imageData.totalHeight * nextZoom) - containerH) / nextZoom

      excalidrawAPI.updateScene({
        elements: restoredElements,
        appState: {
          ...restoredAppState,
          zoom: { value: nextZoom },
          scrollX: Math.max(minScrollX, Math.min(0, restoredAppState.scrollX)),
          scrollY: Math.max(minScrollY, Math.min(0, restoredAppState.scrollY)),
          viewBackgroundColor: 'transparent',
        },
        files: parsedScene.files || {},
      })
    } catch (error) {
      console.error('Failed to load saved scene:', error)
    } finally {
      event.target.value = ''
    }
  }

  // Export individual image with its annotations using frame
  const exportImage = async (imageIndex) => {
    if (!excalidrawAPI || !imageData) return

    const targetFrameId = `frame-${imageIndex}`
    const allElements = excalidrawAPI.getSceneElements()

    // Filter elements: include frame + all elements bound to this frame
    const elementsToExport = allElements.filter(el => {
      // Include the frame itself
      if (el.id === targetFrameId) return true
      // Include all elements that are children of this frame
      if (el.frameId === targetFrameId) return true
      return false
    })

    try {
      const blob = await exportToBlob({
        elements: elementsToExport,
        appState: {
          ...excalidrawAPI.getAppState(),
          exportBackground: true,
          exportWithDarkMode: false,
        },
        files: excalidrawAPI.getFiles(),
      })

      // Download
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `annotated-image-${imageIndex + 1}.png`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Export all images at once
  const exportAllImages = async () => {
    if (!imageData) return
    for (let i = 0; i < imageData.images.length; i++) {
      await exportImage(i)
      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>Loading images...</p>
      </div>
    )
  }

  if (!imageData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>Failed to load images</p>
      </div>
    )
  }

  // Generate Excalidraw elements with frames
  const elements = []

  // Create frame and image for each image in the list
  // IMPORTANT: Children must come BEFORE frame in array (Excalidraw requirement)
  imageData.images.forEach((img, index) => {
    const frameId = `frame-${index}`

    // 1. Create image element FIRST (child comes before frame)
    elements.push({
      id: img.id,
      type: 'image',
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
      angle: 0,
      strokeColor: 'transparent',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 0,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: frameId, // Bind image to its frame
      roundness: null,
      seed: index * 100 + 2,
      version: 1,
      versionNonce: index * 100 + 2,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: true,
      fileId: img.id,
      scale: [1, 1],
      status: 'saved',
    })

    // 2. Create frame element AFTER children
    elements.push({
      id: frameId,
      type: 'frame',
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
      angle: 0,
      strokeColor: '#868e96',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: index * 100 + 1,
      version: 1,
      versionNonce: index * 100 + 1,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: true,
      name: `Image ${index + 1}`,
      children: [img.id], // Frame contains the image as child
    })
  })

  // Generate files object
  const files = imageData.images.reduce((acc, img) => {
    acc[img.id] = {
      mimeType: 'image/png',
      id: img.id,
      dataURL: img.src,
      created: Date.now(),
    }
    return acc
  }, {})

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
      {/* Export buttons overlay */}
      {imageData && imageData.images.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <button
            onClick={saveSceneAsJSON}
            style={{
              padding: '8px 16px',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Save JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Load JSON
          </button>

          <input
            ref={fileInputRef}
            type='file'
            accept='.excalidraw,.json'
            onChange={loadSceneFromFile}
            style={{ display: 'none' }}
          />

          {/* Export All button */}
          <button
            onClick={exportAllImages}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Export All ({imageData.images.length})
          </button>
          
          {/* Individual export buttons */}
          {imageData.images.map((_, index) => (
            <button
              key={index}
              onClick={() => exportImage(index)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              Export #{index + 1}
            </button>
          ))}
        </div>
      )}

      <Excalidraw
        onExcalidrawAPI={(api) => {
          console.log("API RECEIVED excalidrawAPI: ", api)
          setExcalidrawAPI(api)
        }}
        onScrollChange={handleScrollChange}
        initialData={{
          elements,
          appState: {
            scrollX: 0,
            scrollY: 0,
            zoom: { value: minZoom },
            viewBackgroundColor: 'transparent',
          },
          files,
        }}
      />
    </div>
  )
}