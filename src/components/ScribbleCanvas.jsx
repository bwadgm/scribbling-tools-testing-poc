import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Excalidraw,
  restoreAppState,
  restoreElements,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { DEFAULT_TEMPLATE_ID, getFormById } from '../utils/templates'
import { createPageElements, generatePageElements } from '../utils/imageHelpers'
import ToolbarButton from './ToolbarButton'
import useAutosave from '../utils/useAutosave'

const GAP_BETWEEN_IMAGES = 20
const EXTRA_PAGE_IMAGE_PATH = '/images/extra_page.png'

// Helper to load image and get dimensions
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight})
    img.onerror = reject
    img.src = src
  })
}

const imageUrlToDataUrl = async (src) => {
  const response = await fetch(src)

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${src}`)
  }

  const blob = await response.blob()

  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const StatusMessage = ({ text }) => {
  return (
    <div className="flex h-full items-center justify-center">
      <p>{text}</p>
    </div>
  )
}

export default function ScribbleCanvas({ initialScribble, onClose, formId = DEFAULT_TEMPLATE_ID, formIds }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [minZoom, setMinZoom] = useState(1)
  const [scrollSensitivity, setScrollSensitivity] = useState(() => {
    const saved = localStorage.getItem('scrollSensitivity')
    return saved ? Number(saved) : 2
  })
  const [lockZoomInEditingMode, setLockZoomInEditingMode] = useState(() => {
    const saved = localStorage.getItem('lockZoomInEditingMode')
    return saved ? JSON.parse(saved) : false
  })
  const [lockZoomInHandMode, setLockZoomInHandMode] = useState(() => {
    const saved = localStorage.getItem('lockZoomInHandMode')
    return saved ? JSON.parse(saved) : false
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const lastViewportRef = useRef({ zoom: 1, scrollX: 0, scrollY: 0 })

  // ---- Autosave setup ----
  // Stable ID: reuse existing or generate once for a new scribble.
  const scribbleIdRef = useRef(initialScribble?.id || `scribble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const isNewScribble = !initialScribble?.id
  const scribbleTitle = initialScribble?.title || 'Untitled Scribble'
  const effectiveTemplateId = initialScribble?.templateId || formId

  // If formIds not provided, default to current formId
  const effectiveFormIds = formIds || [formId]

  useAutosave({
    excalidrawAPI,
    scribbleId: scribbleIdRef.current,
    scribbleTitle,
    templateId: effectiveTemplateId,
    formId,
    formIds: effectiveFormIds, // Pass effectiveFormIds to autosave
    isNewScribble,
    enabled: true,
  })

  useEffect(() => {
    localStorage.setItem('scrollSensitivity', String(scrollSensitivity))
  }, [scrollSensitivity])

  const handleToggleLockZoom = () => {
    const newValue = !lockZoomInEditingMode
    setLockZoomInEditingMode(newValue)
    localStorage.setItem('lockZoomInEditingMode', JSON.stringify(newValue))
  }

  const handleToggleLockZoomInHandMode = () => {
    const newValue = !lockZoomInHandMode
    setLockZoomInHandMode(newValue)
    localStorage.setItem('lockZoomInHandMode', JSON.stringify(newValue))
  }

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
  const imagePaths = form?.images || []

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

  const handleAddExtraPage = async () => {
    if (!excalidrawAPI || !imageData) {
      return
    }

    try {
      const [loadedImage, imageDataUrl] = await Promise.all([
        loadImage(EXTRA_PAGE_IMAGE_PATH),
        imageUrlToDataUrl(EXTRA_PAGE_IMAGE_PATH),
      ])
      const scale = imageData.minWidth / loadedImage.width
      const scaledHeight = loadedImage.height * scale
      const scaledWidth = imageData.minWidth
      const sceneElements = excalidrawAPI.getSceneElements()

      const pageFrames = sceneElements
        .filter((element) => element.type === 'frame' && !element.isDeleted)
        .sort((first, second) => first.y - second.y)
      const pageCount = pageFrames.length
      const lastFrame = pageFrames[pageFrames.length - 1]
      const uniqueSuffix = `${Date.now()}-${pageCount + 1}`
      const nextImage = {
        id: `image-extra-${uniqueSuffix}`,
        src: loadedImage.src,
        x: 0,
        y: lastFrame ? lastFrame.y + lastFrame.height + GAP_BETWEEN_IMAGES : 0,
        width: scaledWidth,
        height: scaledHeight,
        originalWidth: loadedImage.width,
        originalHeight: loadedImage.height,
      }
      const appendedElements = createPageElements(nextImage, pageCount, pageCount + 1, {
        frameId: `frame-extra-${uniqueSuffix}`,
        textId: `text-extra-${uniqueSuffix}`,
      })
      const frameMap = new Map(pageFrames.map((frame, index) => [frame.id, index]))
      const nextElements = sceneElements.map((element) => {
        if (element.type !== 'text' || element.isDeleted || !element.frameId) {
          return element
        }

        const pageIndex = frameMap.get(element.frameId)
        if (pageIndex === undefined) {
          return element
        }

        const pageLabel = `Page ${pageIndex + 1} of ${pageCount + 1}`

        return {
          ...element,
          text: pageLabel,
          originalText: pageLabel,
          version: element.version + 1,
          updated: Date.now(),
        }
      })

      excalidrawAPI.updateScene({
        elements: [...nextElements, ...appendedElements],
      })

      excalidrawAPI.addFiles([
        {
          mimeType: 'image/png',
          id: nextImage.id,
          dataURL: imageDataUrl,
          created: Date.now(),
          lastRetrieved: Date.now(),
        },
      ])
    } catch (error) {
      console.error('Failed to add extra page:', error)
    }
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
    return <StatusMessage text="Loading images..." />
  }

  if (!imageData) {
    return <StatusMessage text="Failed to load images" />
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
           frameRendering: {
            name: false,
            outline: false,
          },
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
          frameRendering: {
            name: false,
            outline: false,
          },
          viewBackgroundColor: 'transparent',
        },
        files,
      }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden relative"
    >
      {isMenuOpen && (
        <>
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 z-[10000] bg-black/35"
          />
          <div className="fixed right-0 top-0 z-[10001] flex h-screen w-[min(320px,85vw)] flex-col gap-4 bg-white p-4 shadow-[-4px_0_16px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="cursor-pointer border-none bg-transparent p-0 text-[20px] leading-none text-gray-500"
              >
                ×
              </button>
            </div>

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

            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <label className="mb-0 block text-xs font-semibold text-gray-700">
                Scroll Sensitivity: {scrollSensitivity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.4"
                max="6"
                step="0.2"
                value={scrollSensitivity}
                onChange={(event) => setScrollSensitivity(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleLockZoom}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 text-left"
            >
              <span className="text-xs font-semibold text-gray-700">
                Lock Zoom in Editing Mode
              </span>
              <span
                className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${lockZoomInEditingMode ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${lockZoomInEditingMode ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleLockZoomInHandMode}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 text-left"
            >
              <span className="text-xs font-semibold text-gray-700">
                Lock Zoom in Hand Mode
              </span>
              <span
                className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${lockZoomInHandMode ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${lockZoomInHandMode ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </span>
            </button>
          </div>
        </>
      )}

      <Excalidraw
        key={initialScribble?.id || 'new-scribble'}
        onExcalidrawAPI={(api) => {
          console.log("API RECEIVED excalidrawAPI: ", api)
          setExcalidrawAPI(api)
        }}
        // onChange={handleExcalidrawChange}
        // onScrollChange={handleScrollChange}
        hideMainMenu={true}
        hideLibrary={true}
        hideHelp={true}
        initialData={initialData}
        strokeWidthSlider={true}
        scrollSensitivity={scrollSensitivity}
        minZoom={minZoom}
        lockZoomInEditingMode={lockZoomInEditingMode}
        lockZoomInHandMode={lockZoomInHandMode}
        renderTopRightUI={() => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddExtraPage}
              className="flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-white px-2 text-sm font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
              title="Add new page"
            >
              <span aria-hidden="true">📄</span>
              <span>Add</span>
            </button>
            <ToolbarButton
              onClick={() => setIsMenuOpen(true)}
              title="Menu"
              icon="☰"
            />
          </div>
        )}
      />
    </div>
  )
}