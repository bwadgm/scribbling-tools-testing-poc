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
import { generatePageElements } from '../utils/imageHelpers'
import ToolbarButton from './ToolbarButton'
import useAutosave from '../utils/useAutosave'

const GAP_BETWEEN_IMAGES = 20
const EXTRA_PAGE_PATH = '/images/extra_page.png'

// Helper to load image and get dimensions
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight})
    img.onerror = reject
    img.src = src
  })
}

export default function ScribbleCanvas({ initialScribble, onClose, formId = DEFAULT_TEMPLATE_ID, formIds }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [minZoom, setMinZoom] = useState(1)
  const [imagePaths, setImagePaths] = useState([])
  const [scrollSensitivity, setScrollSensitivity] = useState(() => {
    const saved = localStorage.getItem('scrollSensitivity')
    return saved ? Number(saved) : 2
  })
  const [isSensitivityPanelOpen, setIsSensitivityPanelOpen] = useState(false)
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const lastViewportRef = useRef({ zoom: 1, scrollX: 0, scrollY: 0 })

  // ---- Autosave setup ----
  // Stable ID: reuse existing or generate once for a new scribble.
  const scribbleIdRef = useRef(initialScribble?.id || `scribble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const isNewScribble = !initialScribble?.id
  const scribbleTitle = initialScribble?.title || 'Untitled Scribble'
  const effectiveTemplateId = initialScribble?.templateId || formId

  useAutosave({
    excalidrawAPI,
    scribbleId: scribbleIdRef.current,
    scribbleTitle,
    templateId: effectiveTemplateId,
    formId,
    formIds,
    isNewScribble,
    enabled: true,
  })

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

  useEffect(() => {
    if (form && form.images) {
      setImagePaths(form.images)
    } else {
      console.error(`Form not found or has no images: ${formId}`)
      setImagePaths([])
    }
  }, [form])

  const applySceneData = (parsedScene) => {
    if (!excalidrawAPI || !imageData || !parsedScene) {
      return
    }

    const restoredElements = restoreElements(parsedScene.elements, null)
    const restoredAppState = restoreAppState(parsedScene.appState, null)
    const nextZoom = minZoom || 1
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
    }
  }, [excalidrawAPI, imageData, parsedInitialScene])

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
  const elements = generatePageElements(imageData)

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
          zoom: { value: minZoom },
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
      {/* Sensitivity panel overlay */}
      {imageData && imageData.images.length > 0 && isSensitivityPanelOpen && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 10000,
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
            min="0.4"
            max="6"
            step="0.2"
            value={scrollSensitivity}
            onChange={(event) => setScrollSensitivity(Number(event.target.value))}
            style={{ width: '180px' }}
          />
        </div>
      )}

      <Excalidraw
        key={`${initialScribble?.id || 'new-scribble'}-${imagePaths.length}`}
        onExcalidrawAPI={(api) => {
          console.log("API RECEIVED excalidrawAPI: ", api)
          setExcalidrawAPI(api)
        }}
        // onChange={handleExcalidrawChange}
        // onScrollChange={handleScrollChange}
        initialData={initialData}
        strokeWidthSlider={true}
        scrollSensitivity={scrollSensitivity}
        minZoom={minZoom}
        renderTopRightUI={() => (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {imageData && imageData.images.length > 0 && (
              <>
                <ToolbarButton 
                  onClick={() => setImagePaths((prev) => [...prev, EXTRA_PAGE_PATH])}
                  title="Add blank page"
                  icon="📄"
                />
                {/* <ToolbarButton 
                  onClick={saveSceneAsJSON}
                  title="Save"
                  icon="💾"
                /> */}
                {/* <ToolbarButton 
                  onClick={exportAllImages}
                  title="Export"
                  icon="📤"
                /> */}
              </>
            )}
            <ToolbarButton 
              onClick={() => setIsSensitivityPanelOpen(true)}
              title="Scroll sensitivity"
              icon="🖱️"
            />
          </div>
        )}
      />
    </div>
  )
}