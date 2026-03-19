const SCRIBBLES_STORAGE_KEY = 'scribbler.savedScribbles'

const readScribbles = () => {
  try {
    const raw = window.localStorage.getItem(SCRIBBLES_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to read scribbles from localStorage:', error)
    return []
  }
}

const writeScribbles = (scribbles) => {
  window.localStorage.setItem(
    SCRIBBLES_STORAGE_KEY,
    JSON.stringify(scribbles),
  )
}

export const getSavedScribbles = () => {
  return readScribbles()
}

export const getSavedScribbleById = (id) => {
  return readScribbles().find((scribble) => scribble.id === id) || null
}

export const saveScribble = ({ id, title, scene, templateId }) => {
  const scribbles = readScribbles()
  const now = new Date().toISOString()
  const trimmedTitle = title.trim()

  const existing = scribbles.find((scribble) => scribble.id === id)

  if (existing) {
    const updated = scribbles.map((scribble) =>
      scribble.id === id
        ? {
            ...scribble,
            title: trimmedTitle,
            scene,
            templateId: templateId || scribble.templateId, // Preserve existing templateId if not provided
            updatedAt: now,
          }
        : scribble,
    )

    writeScribbles(updated)
    return id
  }

  const nextId = id || crypto.randomUUID()
  const nextScribble = {
    id: nextId,
    title: trimmedTitle,
    scene,
    templateId, // Save templateId for new scribbles
    createdAt: now,
    updatedAt: now,
  }

  writeScribbles([nextScribble, ...scribbles])
  return nextId
}

export const deleteScribble = (id) => {
  const scribbles = readScribbles()
  writeScribbles(scribbles.filter((scribble) => scribble.id !== id))
}
