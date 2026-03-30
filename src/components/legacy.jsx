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

   // Export all images at once
  const exportAllImages = async () => {
    if (!imageData) return
    for (let i = 0; i < imageData.images.length; i++) {
      await exportImage(i)
      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 100))
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