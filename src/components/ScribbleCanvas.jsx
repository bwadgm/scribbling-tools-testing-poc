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
  const [isDeleteMenuOpen, setIsDeleteMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pageToDelete, setPageToDelete] = useState(null)
  const [extraPages, setExtraPages] = useState([])
  const [scrollSensitivity, setScrollSensitivity] = useState(() => {
    const saved = localStorage.getItem('scrollSensitivity')
    return saved ? Number(saved) : 2
  })
  const [pinchPanSensitivity, setPinchPanSensitivity] = useState(() => {
    const saved = localStorage.getItem('pinchPanSensitivity')
    return saved ? Number(saved) : 5
  })
  const [zoomStep, setZoomStep] = useState(() => {
    const saved = localStorage.getItem('zoomStep')
    return saved ? Number(saved) : 10
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

  useEffect(() => {
    localStorage.setItem('pinchPanSensitivity', String(pinchPanSensitivity))
  }, [pinchPanSensitivity])

  useEffect(() => {
    localStorage.setItem('zoomStep', String(zoomStep))
  }, [zoomStep])

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

  const getPagesFromElements = (elements) => {
    const pageFrames = elements
      .filter((element) => element.type === 'frame' && !element.isDeleted)
      .sort((first, second) => first.y - second.y)

    return pageFrames
      .map((frame) => ({
        id: frame.id,
        label: `Page ${pageFrames.findIndex((pageFrame) => pageFrame.id === frame.id) + 1}`,
        isDeletable: frame.id.startsWith('frame-extra-'),
      }))
  }

  const updateExtraPages = (elements) => {
    setExtraPages(getPagesFromElements(elements))
  }

  const updatePageNumbers = (elements) => {
    const pageFrames = elements
      .filter((element) => element.type === 'frame' && !element.isDeleted)
      .sort((first, second) => first.y - second.y)
    const frameMap = new Map(pageFrames.map((frame, index) => [frame.id, index]))

    return elements.map((element) => {
      if (element.type !== 'text' || element.isDeleted || !element.frameId) {
        return element
      }

      const pageIndex = frameMap.get(element.frameId)
      if (pageIndex === undefined) {
        return element
      }

      const pageLabel = `Page ${pageIndex + 1} of ${pageFrames.length}`

      return {
        ...element,
        text: pageLabel,
        originalText: pageLabel,
        version: element.version + 1,
        updated: Date.now(),
      }
    })
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
        frameRendering: {
          enabled: true,
          clip: true,
          name: false,
          outline: false,
        },
        zoom: { value: nextZoom },
        scrollX: Math.max(minScrollX, Math.min(0, restoredAppState.scrollX || 0)),
        scrollY: Math.max(minScrollY, Math.min(0, restoredAppState.scrollY || 0)),
        viewBackgroundColor: '#f1f1f1',
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
        y: lastFrame ? lastFrame.y + lastFrame.height : 0,
        width: scaledWidth,
        height: scaledHeight,
        originalWidth: loadedImage.width,
        originalHeight: loadedImage.height,
      }
      const appendedElements = createPageElements(nextImage, pageCount, pageCount + 1, {
        frameId: `frame-extra-${uniqueSuffix}`,
        textId: `text-extra-${uniqueSuffix}`,
      })
      
      // Use restoreElements to properly initialize the new elements
      const restoredAppended = restoreElements(appendedElements, null)
      const nextElements = updatePageNumbers([...sceneElements, ...restoredAppended])

      excalidrawAPI.updateScene({
        elements: nextElements,
      })
      updateExtraPages(nextElements)
      setIsDeleteMenuOpen(false)

      // Scroll to the newly added page
      const newFrame = appendedElements.find(el => el.type === 'frame')
      if (newFrame) {
        excalidrawAPI.scrollToContent(newFrame, {
          fitToContent: false,
          animate: true,
        })
      }

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

  const handleDeleteExtraPage = (frameIdToDelete) => {
    if (!excalidrawAPI) {
      return
    }

    const sceneElements = excalidrawAPI.getSceneElements()
    const frameToDelete = sceneElements.find(
      (element) =>
        element.type === 'frame' &&
        !element.isDeleted &&
        element.id === frameIdToDelete,
    )

    if (!frameToDelete || !frameIdToDelete.startsWith('frame-extra-')) {
      return
    }

    const childIds = new Set(frameToDelete.children || [])
    const shiftAmount = frameToDelete.height + GAP_BETWEEN_IMAGES
    const affectedFrameIds = new Set(
      sceneElements
        .filter(
          (element) =>
            element.type === 'frame' &&
            !element.isDeleted &&
            element.y > frameToDelete.y,
        )
        .map((element) => element.id),
    )

    const remainingElements = sceneElements.filter((element) => {
      if (element.id === frameIdToDelete) {
        return false
      }

      if (childIds.has(element.id)) {
        return false
      }

      return true
    })

    const shiftedElements = remainingElements.map((element) => {
      const shouldShift =
        affectedFrameIds.has(element.id) ||
        (element.frameId && affectedFrameIds.has(element.frameId))

      if (!shouldShift) {
        return element
      }

      return {
        ...element,
        y: element.y - shiftAmount,
        version: element.version + 1,
        updated: Date.now(),
      }
    })

    const nextElements = updatePageNumbers(shiftedElements)

    excalidrawAPI.updateScene({
      elements: nextElements,
    })
    updateExtraPages(nextElements)
    setIsDeleteMenuOpen(false)
  }

  const hasUserContentInFrame = (frameId) => {
    if (!excalidrawAPI || !frameId) {
      return false
    }

    const sceneElements = excalidrawAPI.getSceneElements()

    return sceneElements.some(
      (element) =>
        element.frameId === frameId &&
        !element.isDeleted &&
        !element.locked,
    )
  }

  const requestDeleteExtraPage = (page) => {
    if (!page?.isDeletable) {
      return
    }

    if (!hasUserContentInFrame(page.id)) {
      handleDeleteExtraPage(page.id)
      return
    }

    setPageToDelete(page)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteExtraPage = () => {
    if (!pageToDelete) {
      return
    }

    handleDeleteExtraPage(pageToDelete.id)
    setShowDeleteConfirm(false)
    setPageToDelete(null)
  }

  const cancelDeleteExtraPage = () => {
    setShowDeleteConfirm(false)
    setPageToDelete(null)
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

          currentY += scaledHeight + 20

          return imageInfo
        })

        const totalHeight = currentY - 20 // Remove last extra frame height

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
      updateExtraPages(parsedInitialScene.elements || [])
    }
  }, [excalidrawAPI, imageData, parsedInitialScene])

  useEffect(() => {
    if (!parsedInitialScene) {
      setExtraPages([])
      setIsDeleteMenuOpen(false)
    }
  }, [parsedInitialScene])

  useEffect(() => {
    if (!imageData) {
      return
    }

    updateExtraPages(parsedInitialScene?.elements || generatePageElements(imageData))

    if (!parsedInitialScene) {
      setIsDeleteMenuOpen(false)
    }
  }, [imageData, parsedInitialScene])

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
            enabled: true,
            clip: true,
            name: false,
            outline: false,
          },
          viewBackgroundColor: '#f1f1f1',
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
            enabled: true,
            clip: true,
            name: false,
            outline: false,
          },
          viewBackgroundColor: '#f1f1f1',
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

            {/* Hand Tool */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1">Hand Tool</h3>
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <label className="mb-0 block text-xs font-semibold text-gray-700">
                  Hand Tool Scroll Sensitivity: {scrollSensitivity.toFixed(1)}
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

            {/* Editing Tools */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1">Editing Tools</h3>
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
            </div>

            {/* All Tools */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1">All Tools</h3>
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <label className="mb-0 block text-xs font-semibold text-gray-700">
                  Pinch Pan Sensitivity: {pinchPanSensitivity.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="0.5"
                  value={pinchPanSensitivity}
                  onChange={(event) => setPinchPanSensitivity(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <label className="mb-0 block text-xs font-semibold text-gray-700">
                  Zoom Step: {zoomStep}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={zoomStep}
                  onChange={(event) => setZoomStep(Number(event.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Excalidraw
        key={initialScribble?.id || 'new-scribble'}
        onExcalidrawAPI={(api) => {
          setExcalidrawAPI(api)
        }}
        hideMainMenu={true}
        hideLibrary={true}
        hideHelp={true}
        initialData={initialData}
        strokeWidthSlider={true}
        scrollSensitivity={scrollSensitivity}
        pinchPanSensitivity={pinchPanSensitivity}
        zoomStep={zoomStep / 100}
        minZoom={minZoom}
        lockZoomInEditingMode={lockZoomInEditingMode}
        lockZoomInHandMode={lockZoomInHandMode}
        renderTopRightUI={() => (
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddExtraPage}
              className="flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-white px-2 text-sm font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
              title="Add new page"
            >
              <span aria-hidden="true">📄</span>
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteMenuOpen((current) => !current)}
              className="flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
              title="Delete extra page"
            >
              📑
            </button>
            {isDeleteMenuOpen && (
              <div className="absolute right-10 top-10 z-[10002] min-w-[150px] rounded-md border border-gray-200 bg-white p-1 shadow-lg">
                {extraPages.length > 0 ? (
                  extraPages.map((page) => (
                    <div
                      key={page.id}
                      className={`flex w-full px-3 items-center justify-between py-1 mb-1 text-left text-sm ${page.isDeletable ? 'hover:bg-red-50' : 'bg-[#f3f4f6]'}`}
                    >
                      <span className={page.isDeletable ? 'text-gray-600' : 'text-gray-400'}>
                        {page.label}
                      </span>
                      {page.isDeletable && (
                        <button
                          type="button"
                          onClick={() => requestDeleteExtraPage(page)}
                          className="ml-3 px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                          title={`Delete ${page.label}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No pages</div>
                )}
              </div>
            )}
            <ToolbarButton
              onClick={() => setIsMenuOpen(true)}
              title="Menu"
              icon="☰"
            />
          </div>
        )}
      />
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Page</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {pageToDelete?.label?.toLowerCase() || 'this page'}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteExtraPage}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExtraPage}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}