import { useEffect, useRef, useCallback } from 'react'
import { serializeAsJSON } from '@excalidraw/excalidraw'
import { saveScribble } from './localStorage'

const AUTOSAVE_DELAY_MS = 3000

/**
 * Hook that autosaves the Excalidraw scene to localStorage.
 *
 * - Subscribes to excalidrawAPI.onChange() so it works independently of
 *   any onChange prop on the <Excalidraw> component.
 * - Debounces saves (default 3 s) so rapid edits don't thrash storage.
 * - For NEW scribbles, only persists once the user has drawn at least one
 *   non-locked element (avoids saving blank canvases).
 * - Flushes the pending save on component unmount and on beforeunload.
 */
export default function useAutosave({
  excalidrawAPI,
  scribbleId,
  scribbleTitle,
  templateId,
  formId,
  formIds, // Add formIds to props
  isNewScribble,
  enabled = true,
}) {
  const timeoutRef = useRef(null)
  const latestPropsRef = useRef({ scribbleId, scribbleTitle, templateId, formId, formIds, isNewScribble })

  // Keep a live reference so the debounced callback never uses stale values.
  useEffect(() => {
    latestPropsRef.current = { scribbleId, scribbleTitle, templateId, formId, formIds, isNewScribble }
  }, [scribbleId, scribbleTitle, templateId, formId, formIds, isNewScribble])

  // ---- core save logic (called when debounce fires) ----
  const performSave = useCallback(() => {
    if (!excalidrawAPI) return

    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      if (!elements || elements.length === 0) return

      const { isNewScribble: isNew } = latestPropsRef.current

      // For brand-new scribbles don't persist until the user actually draws
      // something. Background images + frames are all locked, so checking for
      // at least one unlocked, non-deleted element is a reliable signal.
      if (isNew) {
        const hasUserContent = elements.some(
          (el) => !el.locked && !el.isDeleted,
        )
        if (!hasUserContent) return
      }

      const serialized = serializeAsJSON(elements, appState, files, 'local')

      const { scribbleId: id, scribbleTitle: title, templateId: tpl, formId: fid, formIds: fids } =
        latestPropsRef.current

      saveScribble({
        id,
        title,
        scene: serialized,
        templateId: tpl,
        formId: fid,
        formIds: fids, // Pass formIds to save
      })
    } catch (err) {
      console.error('[useAutosave] save failed:', err)
    }
  }, [excalidrawAPI])

  // ---- debounced scheduler ----
  const scheduleAutosave = useCallback(() => {
    if (!enabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(performSave, AUTOSAVE_DELAY_MS)
  }, [enabled, performSave])

  // ---- subscribe to Excalidraw changes via imperative API ----
  useEffect(() => {
    if (!excalidrawAPI || !enabled) return

    const unsub = excalidrawAPI.onChange(() => {
      scheduleAutosave()
    })

    return () => {
      unsub()
    }
  }, [excalidrawAPI, enabled, scheduleAutosave])

  // ---- flush pending save on unmount ----
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
        performSave()
      }
    }
  }, [performSave])

  // ---- flush pending save on page unload ----
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
        performSave()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [performSave])

  return { performSave }
}
