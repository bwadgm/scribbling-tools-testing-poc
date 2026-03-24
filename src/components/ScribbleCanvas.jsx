import { useState, useRef, useEffect, useMemo } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { exportToBlob } from '@excalidraw/excalidraw'
import {
  restoreAppState,
  restoreElements,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { saveScribble } from '../utils/localStorage'
import { DEFAULT_TEMPLATE_ID, getFormById } from '../utils/templates'

const GAP_BETWEEN_IMAGES = 20

// Helper to load image and get dimensions
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight})
    img.onerror = reject
    img.src = src
  })
}

export default function ScribbleCanvas({ initialScribble, onClose, formId = DEFAULT_TEMPLATE_ID }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [minZoom, setMinZoom] = useState(1)
  const [scrollSensitivity, setScrollSensitivity] = useState(() => {
    const saved = localStorage.getItem('scrollSensitivity')
    return saved ? Number(saved) : 2
  })
  const [isSensitivityPanelOpen, setIsSensitivityPanelOpen] = useState(false)
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const lastViewportRef = useRef({ zoom: 1, scrollX: 0, scrollY: 0 })

  useEffect(() => {
    localStorage.setItem('scrollSensitivity', String(scrollSensitivity))
  }, [scrollSensitivity])

  const parsedInitialScene = useMemo(() => {
    // Handle new scenes object structure (per form)
    if (initialScribble?.scenes && initialScribble.scenes[formId]) {
      try {
        return JSON.parse(initialScribble.scenes[formId])
      } catch (error) {
        console.error('Failed to parse saved scene for form:', formId, error)
        return null
      }
    }

    return null
  }, [initialScribble, formId])

  // Get form images based on formId
  const form = useMemo(() => getFormById(formId), [formId])
  const imagePaths = form.images

  const applySceneData = (parsedScene) => {
    if (!excalidrawAPI || !imageData || !parsedScene) {
      return
    }

    const restoredElements = restoreElements(parsedScene.elements, null)
    const restoredAppState = restoreAppState(parsedScene.appState, null)
    const nextZoom = Math.max(restoredAppState.zoom?.value || 1, minZoom)
    const containerW = containerRef.current?.offsetWidth || imageData.minWidth
    const containerH = containerRef.current?.offsetHeight || imageData.totalHeight
    const minScrollX = -((imageData.minWidth * nextZoom) - containerW) / nextZoom
    const minScrollY = -((imageData.totalHeight * nextZoom) - containerH) / nextZoom

    excalidrawAPI.updateScene({
      elements: restoredElements,
      appState: {
        ...restoredAppState,
        zoom: { value: nextZoom },
        scrollX: Math.max(minScrollX, Math.min(0, restoredAppState.scrollX || 0)),
        scrollY: Math.max(minScrollY, Math.min(0, restoredAppState.scrollY || 0)),
        viewBackgroundColor: 'transparent',
      },
      files: parsedScene.files || {},
    })
  }

  // Load all images and calculate dimensions
  useEffect(() => {
    const loadAllImages = async () => {
      try {
        const loadedImages = await Promise.all(
          imagePaths.map(path => loadImage(path))
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
  }, [imagePaths])

  // Calculate dynamic MIN_ZOOM based on container width
  useEffect(() => {
    if (!imageData || !containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const calculatedMinZoom = containerWidth / imageData.minWidth
    setMinZoom(calculatedMinZoom)
  }, [imageData])

  // Apply saved scene data with minZoom when opening a saved scribble
  useEffect(() => {
    if (excalidrawAPI && imageData && parsedInitialScene) {
      applySceneData(parsedInitialScene)
      // Add smooth zoom animation after applying scene data
      // setTimeout(() => {
      //   excalidrawAPI.scrollToContent(undefined, {
      //     animate: true,
      //     duration: 300
      //   })
      // }, 100)
    }
  }, [excalidrawAPI, imageData, parsedInitialScene])

  const handleScrollChange = (scrollX, scrollY) => {
    if (!excalidrawAPI || !imageData) return
    const { zoom } = excalidrawAPI.getAppState()
    const currentZoom = Math.max(zoom.value, minZoom)
    const updates = {}

    let needsUpdate = false

    const containerW = containerRef.current?.offsetWidth || imageData.minWidth
    const containerH = containerRef.current?.offsetHeight || imageData.totalHeight

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

    if (needsUpdate) {
      excalidrawAPI.updateScene({ appState: updates })
    }
  }

  const handleExcalidrawChange = (_elements, appState) => {
    if (!excalidrawAPI || !imageData || !containerRef.current) return

    const zoomValue = appState.zoom?.value || 1
    const containerW = containerRef.current.offsetWidth || imageData.minWidth
    const containerH = containerRef.current.offsetHeight || imageData.totalHeight
    const effectiveZoom = Math.max(zoomValue, minZoom)
    const minScrollX = -((imageData.minWidth * effectiveZoom) - containerW) / effectiveZoom
    const minScrollY = -((imageData.totalHeight * effectiveZoom) - containerH) / effectiveZoom

    if (zoomValue < minZoom) {
      const restoredScrollX = Math.max(minScrollX, Math.min(0, lastViewportRef.current.scrollX || 0))
      const restoredScrollY = Math.max(minScrollY, Math.min(0, lastViewportRef.current.scrollY || 0))

      excalidrawAPI.updateScene({
        appState: {
          zoom: { value: minZoom },
          scrollX: restoredScrollX,
          scrollY: restoredScrollY,
        },
      })
      return
    }

    lastViewportRef.current = {
      zoom: zoomValue,
      scrollX: Math.max(minScrollX, Math.min(0, appState.scrollX || 0)),
      scrollY: Math.max(minScrollY, Math.min(0, appState.scrollY || 0)),
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

    const isExistingScribble = Boolean(initialScribble?.id && initialScribble?.title)
    let nextTitle

    if (isExistingScribble) {
      nextTitle = initialScribble.title
      // Save directly and show feedback
      saveScribble({
        id: initialScribble.id,
        title: nextTitle,
        scene: serializedScene,
        templateId: initialScribble.templateId, // Preserve existing templateId
        formId: formId, // Save scene for current form
      })
      alert('Scribble saved successfully!')
      onClose()
    } else {
      // Prompt for title for new scribbles
      nextTitle = window.prompt('Enter scribble title', 'Untitled Scribble')

      if (!nextTitle || !nextTitle.trim()) {
        return
      }

      saveScribble({
        id: initialScribble?.id,
        title: nextTitle,
        scene: serializedScene,
        templateId: formId, // Save formId as templateId for new scribbles
        formId: formId, // Save scene for current form
      })
      onClose()
    }
  }

  const loadSceneFromFile = async (event) => {
    const file = event.target.files?.[0]

    if (!file || !excalidrawAPI || !imageData) {
      return
    }

    try {
      const fileText = await file.text()
      const parsedScene = JSON.parse(fileText)
      applySceneData(parsedScene)
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
    const frame = allElements.find(el => el.id === targetFrameId)
    
    if (!frame) return

    // Filter elements: include frame + frame children + free-floating scribbles within frame bounds
    const elementsToExport = allElements.filter(el => {
      // Include the frame itself
      if (el.id === targetFrameId) return true
      // Include all elements that are children of this frame
      if (el.frameId === targetFrameId) return true
      // Include all free-floating scribbles within frame bounds
      if (el.x >= frame.x && 
          el.y >= frame.y && 
          el.x + (el.width || 0) <= frame.x + frame.width &&
          el.y + (el.height || 0) <= frame.y + frame.height) {
        return true
      }
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

  const initialData = parsedInitialScene
    ? {
        elements: parsedInitialScene.elements || [],
        appState: {
          ...(parsedInitialScene.appState || {}),
          viewBackgroundColor: 'transparent',
        },
        files: parsedInitialScene.files || {},
      }
    : {
        elements,
        appState: {
          scrollX: 0,
          scrollY: 0,
          zoom: { value: minZoom },
          viewBackgroundColor: 'transparent',
        },
        files,
      }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        // Performance optimizations for smooth zoom/pan
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
      }}
    >
      {/* Export buttons overlay */}
      {imageData && imageData.images.length > 0 && (
        <div
          style={{
            display:'flex',
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 10000,
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
            Save
          </button>

          <button
            onClick={() => setIsSensitivityPanelOpen(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Sensitivity
          </button>

          {isSensitivityPanelOpen && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '6px',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0',
                  }}
                >
                  Scroll Sensitivity: {scrollSensitivity.toFixed(1)}
                </label>
                <button
                  onClick={() => setIsSensitivityPanelOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '700',
                    lineHeight: 1,
                    padding: '0',
                  }}
                >
                  ×
                </button>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={scrollSensitivity}
                onChange={(event) => setScrollSensitivity(Number(event.target.value))}
                style={{ width: '180px' }}
              />
            </div>
          )}

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
            Export
          </button>
        </div>
      )}

      <Excalidraw
        key={initialScribble?.id || 'new-scribble'}
        onExcalidrawAPI={(api) => {
          console.log("API RECEIVED excalidrawAPI: ", api)
          setExcalidrawAPI(api)
        }}
        // onChange={handleExcalidrawChange}
        // onScrollChange={handleScrollChange}
        initialData={initialData}
        scrollSensitivity={scrollSensitivity}
      />
    </div>
  )
}