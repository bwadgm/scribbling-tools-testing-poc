import { useMemo, useState } from 'react'
import ScribbleModal from './ScribbleModal'
import TemplateSelector from './TemplateSelector'
import { deleteScribble, getSavedScribbles } from '../utils/localStorage'

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedScribbleId, setSelectedScribbleId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const scribbles = useMemo(() => {
    return getSavedScribbles().sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
    )
  }, [refreshKey])

  const selectedScribble = scribbles.find(
    (scribble) => scribble.id === selectedScribbleId,
  ) || null

  const openNewScribble = () => {
    setSelectedScribbleId(null)
    setIsTemplateSelectorOpen(true)
  }

  const selectTemplate = (template) => {
    setSelectedTemplate(template)
    setIsTemplateSelectorOpen(false)
    setIsModalOpen(true)
  }

  const openSavedScribble = (scribbleId) => {
    setSelectedScribbleId(scribbleId)
    const scribble = scribbles.find(s => s.id === scribbleId)
    setSelectedTemplate(null) // Clear template for saved scribbles
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedScribbleId(null)
    setSelectedTemplate(null)
    setRefreshKey((value) => value + 1)
  }

  const closeTemplateSelector = () => {
    setIsTemplateSelectorOpen(false)
  }

  const handleDelete = (event, scribbleId) => {
    event.stopPropagation()
    deleteScribble(scribbleId)
    setRefreshKey((value) => value + 1)
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Scribbles</h1>
            <p className="mt-1 text-sm text-gray-600">
              Open an existing scribble or create a new one.
            </p>
          </div>

          <button
            onClick={openNewScribble}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95 cursor-pointer"
          >
            Add Scribble
          </button>
        </div>

        {scribbles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">
            No saved scribbles yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scribbles.map((scribble) => (
              <div
                key={scribble.id}
                onClick={() => openSavedScribble(scribble.id)}
                className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    openSavedScribble(scribble.id)
                  }
                }}
              >
                <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-gray-50 text-sm font-medium text-gray-400">
                  Saved Scribble
                </div>

                <div className="mb-2 truncate text-base font-semibold text-gray-900">
                  {scribble.title}
                </div>

                <div className="mb-4 text-xs text-gray-500">
                  Updated {new Date(scribble.updatedAt).toLocaleString()}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(event) => handleDelete(event, scribble.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScribbleModal
        isOpen={isModalOpen}
        onClose={closeModal}
        initialScribble={selectedScribble}
        templateId={selectedTemplate?.id}
      />

      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={closeTemplateSelector}
        onSelectTemplate={selectTemplate}
      />
    </div>
  )
}
